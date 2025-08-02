from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
from app.models.schemas import NoteCreate, NoteUpdate, Note
from app.models.database import supabase_admin
from app.core.security import get_current_user
import uuid
from datetime import datetime

router = APIRouter()

@router.post("/", response_model=Note)
async def create_note(
    note: NoteCreate,
    current_user: dict = Depends(get_current_user)
):
    # Verify notebook belongs to user
    notebook_check = supabase_admin.table("notebooks").select("*").eq("id", note.notebook_id).eq("user_id", current_user["id"]).execute()
    if not notebook_check.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notebook not found"
        )
    
    # If linked to chat, verify chat exists and belongs to same notebook
    if note.linked_chat_id:
        chat_check = supabase_admin.table("chat_history").select("*").eq("id", note.linked_chat_id).eq("notebook_id", note.notebook_id).execute()
        if not chat_check.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Linked chat message not found"
            )
    
    note_id = str(uuid.uuid4())
    
    new_note = {
        "id": note_id,
        "notebook_id": note.notebook_id,
        "content": note.content,
        "source_type": note.source_type,
        "linked_chat_id": note.linked_chat_id,
        "created_at": datetime.utcnow().isoformat()
    }
    
    result = supabase_admin.table("notes").insert(new_note).execute()
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create note"
        )
    
    return Note(**result.data[0])

@router.get("/{notebook_id}", response_model=List[Note])
async def get_notes(
    notebook_id: str,
    current_user: dict = Depends(get_current_user)
):
    # Verify notebook belongs to user
    notebook_check = supabase_admin.table("notebooks").select("*").eq("id", notebook_id).eq("user_id", current_user["id"]).execute()
    if not notebook_check.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notebook not found"
        )
    
    result = supabase_admin.table("notes").select("*").eq("notebook_id", notebook_id).order("created_at", desc=True).execute()
    return [Note(**note) for note in result.data]

@router.get("/note/{note_id}", response_model=Note)
async def get_note(
    note_id: str,
    current_user: dict = Depends(get_current_user)
):
    # Get note and verify access through notebook ownership
    result = supabase_admin.table("notes").select("*, notebooks!inner(user_id)").eq("id", note_id).execute()
    if not result.data or result.data[0]["notebooks"]["user_id"] != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found"
        )
    
    note_data = result.data[0]
    del note_data["notebooks"]  # Remove joined data
    return Note(**note_data)

@router.put("/note/{note_id}", response_model=Note)
async def update_note(
    note_id: str,
    note_update: NoteUpdate,
    current_user: dict = Depends(get_current_user)
):
    # Get note and verify access
    result = supabase_admin.table("notes").select("*, notebooks!inner(user_id)").eq("id", note_id).execute()
    if not result.data or result.data[0]["notebooks"]["user_id"] != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found"
        )
    
    # Update note
    update_data = {k: v for k, v in note_update.dict().items() if v is not None}
    result = supabase_admin.table("notes").update(update_data).eq("id", note_id).execute()
    
    return Note(**result.data[0])

@router.delete("/note/{note_id}")
async def delete_note(
    note_id: str,
    current_user: dict = Depends(get_current_user)
):
    # Get note and verify access
    result = supabase_admin.table("notes").select("*, notebooks!inner(user_id)").eq("id", note_id).execute()
    if not result.data or result.data[0]["notebooks"]["user_id"] != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found"
        )
    
    # Delete note
    supabase_admin.table("notes").delete().eq("id", note_id).execute()
    
    return {"message": "Note deleted successfully"}

@router.post("/from-chat/{chat_id}", response_model=Note)
async def create_note_from_chat(
    chat_id: str,
    current_user: dict = Depends(get_current_user)
):
    # Get chat and verify access through notebook ownership
    result = supabase_admin.table("chat_history").select("*, notebooks!inner(user_id)").eq("id", chat_id).execute()
    if not result.data or result.data[0]["notebooks"]["user_id"] != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat message not found"
        )
    
    chat_data = result.data[0]
    note_id = str(uuid.uuid4())
    
    new_note = {
        "id": note_id,
        "notebook_id": chat_data["notebook_id"],
        "content": chat_data["ai_response"],
        "source_type": "ai_generated",
        "linked_chat_id": chat_id,
        "created_at": datetime.utcnow().isoformat()
    }
    
    result = supabase_admin.table("notes").insert(new_note).execute()
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create note from chat"
        )
    
    return Note(**result.data[0])