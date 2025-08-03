from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
from app.models.schemas import ChatMessage, ChatResponse
from app.models.database import supabase_admin
from app.core.security import get_current_user
from app.services.rag_service import RAGService
import uuid
from datetime import datetime

router = APIRouter()
rag_service = RAGService()

@router.post("/", response_model=ChatResponse)
async def send_message(
    message: ChatMessage,
    current_user: dict = Depends(get_current_user)
):
    # Verify notebook belongs to user
    notebook_check = supabase_admin.table("notebooks").select("*").eq("id", message.notebook_id).eq("user_id", current_user["id"]).execute()
    if not notebook_check.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notebook not found"
        )
    
    try:
        # Generate AI response using RAG with selected documents
        ai_response, metadata = await rag_service.generate_response(
            question=message.user_prompt,
            notebook_id=message.notebook_id,
            user_id=current_user["id"],
            selected_document_ids=message.selected_document_ids
        )
        
        chat_id = str(uuid.uuid4())
        
        # Save chat history
        chat_record = {
            "id": chat_id,
            "notebook_id": message.notebook_id,
            "user_prompt": message.user_prompt,
            "ai_response": ai_response,
            "metadata": metadata,
            "created_at": datetime.utcnow().isoformat()
        }
        
        result = supabase_admin.table("chat_history").insert(chat_record).execute()
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to save chat history"
            )
        
        return ChatResponse(**result.data[0])
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate response: {str(e)}"
        )

@router.get("/{notebook_id}", response_model=List[ChatResponse])
async def get_chat_history(
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
    
    result = supabase_admin.table("chat_history").select("*").eq("notebook_id", notebook_id).order("created_at").execute()
    return [ChatResponse(**chat) for chat in result.data]

@router.delete("/{chat_id}")
async def delete_chat_message(
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
    
    # Delete chat message
    supabase_admin.table("chat_history").delete().eq("id", chat_id).execute()
    
    return {"message": "Chat message deleted successfully"}

@router.delete("/clear/{notebook_id}")
async def clear_chat_history(
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
    
    # Delete all chat history for the notebook
    supabase_admin.table("chat_history").delete().eq("notebook_id", notebook_id).execute()
    
    return {"message": "Chat history cleared successfully"}
