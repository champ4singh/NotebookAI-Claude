import google.generativeai as genai
from typing import List, Dict, Any
import uuid
import asyncio
from app.core.config import settings
from app.models.database import supabase_admin

# Configure Google AI
genai.configure(api_key=settings.google_api_key)

class EmbeddingService:
    
    def __init__(self):
        pass  # We'll use genai.embed_content directly
    
    async def create_embeddings(self, document_id: str, content: str) -> str:
        """Create embeddings for document content and store in vector database"""
        
        try:
            print(f"Creating embeddings for document: {document_id}")
            # Split content into chunks
            chunks = self._split_into_chunks(content)
            print(f"Split content into {len(chunks)} chunks")
            
            embedding_id = str(uuid.uuid4())
            
            # Process chunks and create embeddings
            for i, chunk in enumerate(chunks):
                print(f"Processing chunk {i+1}/{len(chunks)}")
                # Generate embedding
                embedding = self._generate_embedding(chunk)
                print(f"Generated embedding with {len(embedding)} dimensions")
                
                # Store in Supabase vector table
                chunk_data = {
                    "id": str(uuid.uuid4()),
                    "embedding_id": embedding_id,
                    "document_id": document_id,
                    "chunk_index": i,
                    "content": chunk,
                    "embedding": embedding
                }
                
                result = supabase_admin.table("document_embeddings").insert(chunk_data).execute()
                if not result.data:
                    print(f"Failed to insert embedding chunk {i}: {result}")
                else:
                    print(f"Successfully inserted chunk {i}")
            
            print(f"Created embeddings with ID: {embedding_id}")
            return embedding_id
            
        except Exception as e:
            print(f"Error creating embeddings: {str(e)}")
            import traceback
            traceback.print_exc()
            raise Exception(f"Failed to create embeddings: {str(e)}")
    
    async def search_similar(self, query: str, notebook_id: str, user_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Search for similar document chunks using vector similarity"""
        
        try:
            print(f"=== EMBEDDING SEARCH DEBUG ===")
            print(f"Query: {query}")
            print(f"Notebook ID: {notebook_id}")
            print(f"User ID: {user_id}")
            print(f"Limit: {limit}")
            
            # First, let's check what documents exist for this notebook
            docs_result = supabase_admin.table("documents").select("id, filename, embedding_id").eq("notebook_id", notebook_id).execute()
            print(f"Documents in notebook: {docs_result.data}")
            
            # Check if there are embeddings for these documents
            if docs_result.data:
                doc_ids = [doc['id'] for doc in docs_result.data]
                embeddings_for_notebook = supabase_admin.table("document_embeddings").select("document_id, content").in_("document_id", doc_ids).execute()
                print(f"Embeddings for this notebook: {len(embeddings_for_notebook.data)} chunks")
                for emb in embeddings_for_notebook.data[:2]:
                    print(f"  - Doc ID: {emb['document_id']}, Content: {emb['content'][:50]}...")
            
            # Generate query embedding
            print("Generating query embedding...")
            query_embedding = self._generate_embedding(query)
            print(f"Query embedding generated: {len(query_embedding)} dimensions")
            
            # Perform vector search using Supabase RPC function
            print("Performing vector search...")
            result = supabase_admin.rpc(
                'match_documents',
                {
                    'query_embedding': query_embedding,
                    'p_notebook_id': notebook_id,
                    'p_user_id': user_id,
                    'match_threshold': 0.3,  # Lower threshold for debugging
                    'match_count': limit
                }
            ).execute()
            
            print(f"RPC result: {result}")
            print(f"Found {len(result.data)} matches")
            
            return result.data
            
        except Exception as e:
            print(f"Vector search error: {str(e)}")
            import traceback
            traceback.print_exc()
            raise Exception(f"Vector search failed: {str(e)}")
    
    async def delete_embeddings(self, embedding_id: str):
        """Delete embeddings for a document"""
        try:
            supabase_admin.table("document_embeddings").delete().eq("embedding_id", embedding_id).execute()
        except Exception as e:
            raise Exception(f"Failed to delete embeddings: {str(e)}")
    
    def _split_into_chunks(self, content: str) -> List[str]:
        """Split content into overlapping chunks"""
        
        # Simple word-based chunking
        words = content.split()
        chunks = []
        
        chunk_size = settings.chunk_size
        overlap = settings.chunk_overlap
        
        for i in range(0, len(words), chunk_size - overlap):
            chunk = ' '.join(words[i:i + chunk_size])
            if chunk.strip():
                chunks.append(chunk)
        
        return chunks
    
    def _generate_embedding(self, text: str) -> List[float]:
        """Generate embedding for text using Google AI"""
        
        try:
            # Use Google's embedding model
            result = genai.embed_content(
                model="models/text-embedding-004",
                content=text,
                task_type="retrieval_document"
            )
            
            return result['embedding']
            
        except Exception as e:
            raise Exception(f"Failed to generate embedding: {str(e)}")
