import google.generativeai as genai
from typing import Dict, Any, Tuple, List
from app.core.config import settings
from app.services.embedding_service import EmbeddingService
from app.models.database import supabase

# Configure Google AI
genai.configure(api_key=settings.google_api_key)

class RAGService:
    
    def __init__(self):
        self.embedding_service = EmbeddingService()
        self.llm_model = genai.GenerativeModel(settings.llm_model)
    
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
                "documents_referenced": list(set([chunk.get("document_id") for chunk in relevant_chunks]))
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
        """Generate response using LLM with context"""
        
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

        try:
            response = await self.llm_model.generate_content_async(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    max_output_tokens=settings.max_tokens,
                    temperature=settings.temperature,
                )
            )
            
            response_text = response.text
            
            # Extract citations from response
            citations = self._extract_citations(response_text)
            
            return response_text, citations
            
        except Exception as e:
            raise Exception(f"LLM generation failed: {str(e)}")
    
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
