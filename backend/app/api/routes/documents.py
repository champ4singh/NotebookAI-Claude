from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File
from typing import List
from app.models.schemas import Document, DocumentUpdate
from app.models.database import supabase_admin
from app.core.security import get_current_user
from app.services.document_processor import DocumentProcessor
from app.services.embedding_service import EmbeddingService
import uuid
from datetime import datetime

router = APIRouter()
doc_processor = DocumentProcessor()
embedding_service = EmbeddingService()

@router.get("/test-embeddings-table")
async def test_embeddings_table():
    """Test if document_embeddings table exists and is accessible"""
    try:
        # Try to query the document_embeddings table
        result = supabase_admin.table("document_embeddings").select("id").limit(1).execute()
        return {
            "status": "success",
            "message": "document_embeddings table is accessible",
            "data": result.data,
            "error": result.error if hasattr(result, 'error') else None
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Failed to access document_embeddings table: {str(e)}",
            "error": str(e)
        }

@router.get("/test-google-ai")
async def test_google_ai():
    """Test Google AI API connectivity"""
    try:
        test_embedding = embedding_service._generate_embedding("This is a test")
        return {
            "status": "success",
            "message": "Google AI API is working",
            "embedding_dimensions": len(test_embedding)
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Google AI API failed: {str(e)}",
            "error": str(e)
        }

@router.post("/upload/{notebook_id}", response_model=Document)
async def upload_document(
    notebook_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    print(f"=== DOCUMENT UPLOAD STARTED ===")
    print(f"Notebook ID: {notebook_id}")
    print(f"File: {file.filename}")
    print(f"User: {current_user['email']}")
    
    # Verify notebook belongs to user
    print(f"Checking notebook ownership...")
    notebook_check = supabase_admin.table("notebooks").select("*").eq("id", notebook_id).eq("user_id", current_user["id"]).execute()
    print(f"Notebook check result: {notebook_check}")
    if not notebook_check.data:
        print(f"Notebook not found or not owned by user")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notebook not found"
        )
    
    try:
        # Process document
        print(f"Processing file...")
        content, file_type = await doc_processor.process_file(file)
        print(f"File processed. Type: {file_type}, Content length: {len(content)}")
        
        document_id = str(uuid.uuid4())
        print(f"Generated document ID: {document_id}")
        
        # Create document record
        new_document = {
            "id": document_id,
            "notebook_id": notebook_id,
            "filename": file.filename,
            "file_type": file_type,
            "content": content,
            "created_at": datetime.utcnow().isoformat()
        }
        
        print(f"Inserting document into database...")
        result = supabase_admin.table("documents").insert(new_document).execute()
        print(f"Document insert result: {result}")
        if not result.data:
            print(f"Failed to insert document")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to save document"
            )
        
        # Generate embeddings asynchronously
        print(f"Starting embedding creation for document {document_id}")
        try:
            print(f"Content length: {len(content)} characters")
            embedding_id = await embedding_service.create_embeddings(document_id, content)
            print(f"Embeddings created successfully with ID: {embedding_id}")
            
            update_result = supabase_admin.table("documents").update({"embedding_id": embedding_id}).eq("id", document_id).execute()
            print(f"Document updated with embedding_id: {update_result}")
        except Exception as e:
            print(f"Failed to create embeddings: {e}")
            import traceback
            traceback.print_exc()
            raise e
        
        print(f"=== DOCUMENT UPLOAD COMPLETED ===")
        return Document(**result.data[0])
        
    except Exception as e:
        print(f"=== DOCUMENT UPLOAD FAILED ===")
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to process document: {str(e)}"
        )

@router.get("/{notebook_id}", response_model=List[Document])
async def get_documents(
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
    
    result = supabase_admin.table("documents").select("*").eq("notebook_id", notebook_id).execute()
    return [Document(**doc) for doc in result.data]

@router.get("/document/{document_id}", response_model=Document)
async def get_document(
    document_id: str,
    current_user: dict = Depends(get_current_user)
):
    # Get document and verify access through notebook ownership
    result = supabase_admin.table("documents").select("*, notebooks!inner(user_id)").eq("id", document_id).execute()
    if not result.data or result.data[0]["notebooks"]["user_id"] != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    doc_data = result.data[0]
    del doc_data["notebooks"]  # Remove joined data
    return Document(**doc_data)

@router.put("/document/{document_id}", response_model=Document)
async def update_document(
    document_id: str,
    document_update: DocumentUpdate,
    current_user: dict = Depends(get_current_user)
):
    # Get document and verify access
    result = supabase_admin.table("documents").select("*, notebooks!inner(user_id)").eq("id", document_id).execute()
    if not result.data or result.data[0]["notebooks"]["user_id"] != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Update document
    update_data = {k: v for k, v in document_update.dict().items() if v is not None}
    result = supabase_admin.table("documents").update(update_data).eq("id", document_id).execute()
    
    return Document(**result.data[0])

@router.delete("/document/{document_id}")
async def delete_document(
    document_id: str,
    current_user: dict = Depends(get_current_user)
):
    # Get document and verify access
    result = supabase_admin.table("documents").select("*, notebooks!inner(user_id)").eq("id", document_id).execute()
    if not result.data or result.data[0]["notebooks"]["user_id"] != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Delete embeddings if they exist
    document_data = result.data[0]
    if document_data.get("embedding_id"):
        try:
            await embedding_service.delete_embeddings(document_data["embedding_id"])
        except Exception as e:
            print(f"Failed to delete embeddings: {e}")
    
    # Delete document
    supabase_admin.table("documents").delete().eq("id", document_id).execute()
    
    return {"message": "Document deleted successfully"}
