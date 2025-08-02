from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
from app.models.schemas import NotebookCreate, NotebookUpdate, Notebook
from app.models.database import supabase_admin
from app.core.security import get_current_user
import uuid
from datetime import datetime

router = APIRouter()

@router.post("/", response_model=Notebook)
async def create_notebook(
    notebook: NotebookCreate,
    current_user: dict = Depends(get_current_user)
):
    notebook_id = str(uuid.uuid4())
    
    new_notebook = {
        "id": notebook_id,
        "user_id": current_user["id"],
        "title": notebook.title,
        "created_at": datetime.utcnow().isoformat()
    }
    
    result = supabase_admin.table("notebooks").insert(new_notebook).execute()
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create notebook"
        )
    
    return Notebook(**result.data[0])

@router.get("/", response_model=List[Notebook])
async def get_notebooks(current_user: dict = Depends(get_current_user)):
    result = supabase_admin.table("notebooks").select("*").eq("user_id", current_user["id"]).execute()
    return [Notebook(**notebook) for notebook in result.data]

@router.get("/{notebook_id}", response_model=Notebook)
async def get_notebook(
    notebook_id: str,
    current_user: dict = Depends(get_current_user)
):
    result = supabase_admin.table("notebooks").select("*").eq("id", notebook_id).eq("user_id", current_user["id"]).execute()
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notebook not found"
        )
    
    return Notebook(**result.data[0])

@router.put("/{notebook_id}", response_model=Notebook)
async def update_notebook(
    notebook_id: str,
    notebook_update: NotebookUpdate,
    current_user: dict = Depends(get_current_user)
):
    # Check if notebook exists and belongs to user
    existing = supabase_admin.table("notebooks").select("*").eq("id", notebook_id).eq("user_id", current_user["id"]).execute()
    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notebook not found"
        )
    
    # Update notebook
    update_data = {k: v for k, v in notebook_update.dict().items() if v is not None}
    result = supabase_admin.table("notebooks").update(update_data).eq("id", notebook_id).execute()
    
    return Notebook(**result.data[0])

@router.delete("/{notebook_id}")
async def delete_notebook(
    notebook_id: str,
    current_user: dict = Depends(get_current_user)
):
    # Check if notebook exists and belongs to user
    existing = supabase_admin.table("notebooks").select("*").eq("id", notebook_id).eq("user_id", current_user["id"]).execute()
    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notebook not found"
        )
    
    # Delete associated documents, chat history, and notes first
    supabase_admin.table("documents").delete().eq("notebook_id", notebook_id).execute()
    supabase_admin.table("chat_history").delete().eq("notebook_id", notebook_id).execute()
    supabase_admin.table("notes").delete().eq("notebook_id", notebook_id).execute()
    
    # Delete notebook
    supabase_admin.table("notebooks").delete().eq("id", notebook_id).execute()
    
    return {"message": "Notebook deleted successfully"}