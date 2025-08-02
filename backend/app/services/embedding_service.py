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
            # Generate query embedding
            query_embedding = self._generate_embedding(query)
            
            # Perform vector search using Supabase RPC function
            result = supabase_admin.rpc(
                'match_documents',
                {
                    'query_embedding': query_embedding,
                    'p_notebook_id': notebook_id,
                    'p_user_id': user_id,
                    'match_threshold': 0.7,
                    'match_count': limit
                }
            ).execute()
            
            return result.data
            
        except Exception as e:
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
