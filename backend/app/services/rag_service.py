import google.generativeai as genai
from typing import Dict, Any, Tuple, List
from app.core.config import settings
from app.services.embedding_service import EmbeddingService
from app.models.database import supabase
import asyncio

# Configure Google AI
genai.configure(api_key=settings.google_api_key)

class RAGService:
    
    def __init__(self):
        self.embedding_service = EmbeddingService()
        # Define fallback models in order of preference
        self.model_fallbacks = [
            settings.llm_model,  # Primary model from config
            "gemini-2.5-pro",    # High-quality fallback
            "gemini-2.5-flash",  # Fast fallback
            "gemini-2.5-flash-lite"  # Lightweight fallback
        ]
        self.current_model = None
    
    async def generate_response(self, question: str, notebook_id: str, user_id: str, selected_document_ids: List[str] = None) -> Tuple[str, Dict[str, Any]]:
        """Generate AI response using RAG (Retrieval-Augmented Generation)"""
        
        try:
            print(f"=== RAG SERVICE DEBUG ===")
            print(f"Question: {question}")
            print(f"Notebook ID: {notebook_id}")
            print(f"User ID: {user_id}")
            print(f"Selected document IDs: {selected_document_ids}")
            
            # 1. Retrieve relevant document chunks
            print("Step 1: Retrieving relevant document chunks...")
            relevant_chunks = await self.embedding_service.search_similar(
                query=question,
                notebook_id=notebook_id,
                user_id=user_id,
                limit=5,
                selected_document_ids=selected_document_ids
            )
            print(f"Found {len(relevant_chunks)} relevant chunks")
            if relevant_chunks:
                print("Sample chunk content:", relevant_chunks[0].get('content', '')[:100] + "...")
            
            # Fallback: If no chunks found, get document content directly
            if not relevant_chunks:
                print("No chunks found via vector search, trying fallback...")
                relevant_chunks = await self._fallback_document_search(notebook_id, question, selected_document_ids)
                print(f"Fallback found {len(relevant_chunks)} chunks")
            
            # 2. Get document information for citations
            print("Step 2: Getting document information...")
            document_info = await self._get_document_info(notebook_id)
            print(f"Found {len(document_info)} documents: {list(document_info.values())}")
            
            # 3. Prepare context from retrieved chunks
            print("Step 3: Preparing context...")
            context = self._prepare_context(relevant_chunks, document_info)
            print(f"Context length: {len(context)} characters")
            if context:
                print("Context preview:", context[:200] + "...")
            
            # 4. Generate response using LLM
            print("Step 4: Generating LLM response...")
            response, citations = await self._generate_llm_response(question, context)
            
            # 5. Prepare metadata
            metadata = {
                "citations": citations,
                "retrieved_chunks": len(relevant_chunks),
                "documents_referenced": list(set([chunk.get("document_id") for chunk in relevant_chunks])),
                "model_used": getattr(self, 'current_model', 'unknown')
            }
            
            print(f"=== RAG SERVICE COMPLETE ===")
            return response, metadata
            
        except Exception as e:
            print(f"RAG Service Error: {str(e)}")
            import traceback
            traceback.print_exc()
            raise Exception(f"Failed to generate RAG response: {str(e)}")
    
    async def _fallback_document_search(self, notebook_id: str, question: str, selected_document_ids: List[str] = None) -> List[Dict[str, Any]]:
        """Fallback: Get document content directly when vector search fails"""
        from app.models.database import supabase_admin
        
        # Get documents for this notebook, filtered by selection if provided
        query = supabase_admin.table("documents").select("id, filename, content").eq("notebook_id", notebook_id)
        
        # If specific documents are selected, filter to only those
        if selected_document_ids:
            query = query.in_("id", selected_document_ids)
            print(f"Fallback filtering to selected documents: {selected_document_ids}")
        
        result = query.execute()
        
        chunks = []
        for doc in result.data:
            # For now, just return the full document content as chunks
            # In a more sophisticated version, we could do text search or split into chunks
            content = doc.get("content", "")
            if content and len(content) > 100:  # Only include documents with substantial content
                chunks.append({
                    "document_id": doc["id"],
                    "content": content[:2000],  # Limit to first 2000 chars for context window
                    "similarity": 0.5  # Default similarity score
                })
        
        return chunks
    
    async def _get_document_info(self, notebook_id: str) -> Dict[str, Dict[str, Any]]:
        """Get document information for citation purposes"""
        from app.models.database import supabase_admin
        
        result = supabase_admin.table("documents").select("id, filename, file_type").eq("notebook_id", notebook_id).execute()
        
        document_info = {}
        for doc in result.data:
            document_info[doc["id"]] = {
                "filename": doc["filename"],
                "file_type": doc["file_type"]
            }
        
        return document_info
    
    def _prepare_context(self, chunks: List[Dict[str, Any]], document_info: Dict[str, Dict[str, Any]]) -> str:
        """Prepare context string from retrieved chunks"""
        
        context_parts = []
        
        for i, chunk in enumerate(chunks):
            document_id = chunk.get("document_id")
            doc_name = document_info.get(document_id, {}).get("filename", "Unknown Document")
            
            context_parts.append(
                f"[Document: {doc_name}]\n"
                f"{chunk.get('content', '')}\n"
            )
        
        return "\n---\n".join(context_parts)
    
    async def _generate_llm_response(self, question: str, context: str) -> Tuple[str, List[Dict[str, Any]]]:
        """Generate response using LLM with context and fallback mechanism"""
        
        prompt = f"""You are an AI assistant helping users understand and analyze their documents. Based on the provided context from the user's documents, answer the following question.

IMPORTANT INSTRUCTIONS:
1. Only use information from the provided context
2. If you cannot answer based on the context, say so clearly
3. Include citations in your response using this format: [Document: filename]
4. Be accurate and concise
5. If referencing specific information, cite the source document

CONTEXT:
{context}

QUESTION: {question}

RESPONSE:"""

        last_error = None
        
        # Try each model in the fallback sequence
        for i, model_name in enumerate(self.model_fallbacks):
            try:
                print(f"Attempting LLM generation with model: {model_name} (attempt {i+1}/{len(self.model_fallbacks)})")
                
                # Create model instance for this attempt
                llm_model = genai.GenerativeModel(model_name)
                
                # Add timeout wrapper for the API call
                try:
                    response = await asyncio.wait_for(
                        llm_model.generate_content_async(
                            prompt,
                            generation_config=genai.types.GenerationConfig(
                                max_output_tokens=settings.max_tokens,
                                temperature=settings.temperature,
                            )
                        ),
                        timeout=60.0  # 60 second timeout
                    )
                except asyncio.TimeoutError:
                    raise Exception(f"Request timeout after 60 seconds for model {model_name}")
                
                response_text = response.text
                
                # If we get here, the request was successful
                print(f"✅ Successfully generated response using model: {model_name}")
                self.current_model = model_name
                
                # Extract citations from response
                citations = self._extract_citations(response_text)
                
                return response_text, citations
                
            except Exception as e:
                last_error = e
                error_msg = str(e).lower()
                print(f"❌ Model {model_name} failed: {str(e)}")
                
                # Check for specific error types that indicate we should try the next model
                if any(keyword in error_msg for keyword in ['timeout', 'rate limit', 'quota', 'unavailable', 'service unavailable', '503', '429', '500']):
                    print(f"⚠️  Detected timeout/rate limit/service error, trying next model...")
                    continue
                elif 'not found' in error_msg or '404' in error_msg:
                    print(f"⚠️  Model not found, trying next model...")
                    continue
                else:
                    # For other errors, also try the next model
                    print(f"⚠️  Unknown error, trying next model...")
                    continue
        
        # If all models failed, raise the last error
        raise Exception(f"All LLM models failed. Last error: {str(last_error)}")
    
    def _extract_citations(self, response_text: str) -> List[Dict[str, Any]]:
        """Extract citations from the response text"""
        
        import re
        
        # Look for citation patterns like [Document: filename]
        citation_pattern = r'\[Document: ([^\]]+)\]'
        matches = re.findall(citation_pattern, response_text)
        
        citations = []
        for match in matches:
            citations.append({
                "type": "document",
                "reference": match.strip()
            })
        
        return citations
