from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
from app.models.schemas import SearchQuery, SearchResult
from app.models.database import supabase_admin
from app.core.security import get_current_user
from app.services.search_service import SearchService

router = APIRouter()
search_service = SearchService()

@router.post("/", response_model=List[SearchResult])
async def search_documents(
    search_query: SearchQuery,
    current_user: dict = Depends(get_current_user)
):
    # Verify notebook belongs to user
    notebook_check = supabase_admin.table("notebooks").select("*").eq("id", search_query.notebook_id).eq("user_id", current_user["id"]).execute()
    if not notebook_check.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notebook not found"
        )
    
    try:
        results = await search_service.search(
            query=search_query.query,
            notebook_id=search_query.notebook_id,
            limit=search_query.limit
        )
        
        return results
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Search failed: {str(e)}"
        )