from typing import List
from app.models.schemas import SearchResult
from app.services.embedding_service import EmbeddingService
from app.models.database import supabase

class SearchService:
    
    def __init__(self):
        self.embedding_service = EmbeddingService()
    
    async def search(self, query: str, notebook_id: str, limit: int = 10) -> List[SearchResult]:
        """Perform semantic search across notebook documents"""
        
        try:
            # Get similar chunks using vector search
            similar_chunks = await self.embedding_service.search_similar(
                query=query,
                notebook_id=notebook_id,
                limit=limit
            )
            
            # Get document information
            document_info = await self._get_document_info(notebook_id)
            
            # Convert to SearchResult objects
            results = []
            for chunk in similar_chunks:
                document_id = chunk.get("document_id")
                doc_info = document_info.get(document_id, {})
                
                result = SearchResult(
                    document_id=document_id,
                    document_name=doc_info.get("filename", "Unknown Document"),
                    content_snippet=chunk.get("content", "")[:500] + "..." if len(chunk.get("content", "")) > 500 else chunk.get("content", ""),
                    similarity_score=chunk.get("similarity", 0.0)
                )
                results.append(result)
            
            return results
            
        except Exception as e:
            raise Exception(f"Search failed: {str(e)}")
    
    async def _get_document_info(self, notebook_id: str) -> dict:
        """Get document information for the notebook"""
        
        result = supabase.table("documents").select("id, filename, file_type").eq("notebook_id", notebook_id).execute()
        
        document_info = {}
        for doc in result.data:
            document_info[doc["id"]] = {
                "filename": doc["filename"],
                "file_type": doc["file_type"]
            }
        
        return document_info