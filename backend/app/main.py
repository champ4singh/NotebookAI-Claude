from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import auth, notebooks, documents, chat, notes, search
from app.core.config import settings
import time

app = FastAPI(
    title="NotebookAI API",
    description="AI-powered document management and knowledge extraction API",
    version="1.0.0"
)

# Add request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    print(f"🚀 {request.method} {request.url.path} - Query: {request.url.query}")
    
    response = await call_next(request)
    
    process_time = time.time() - start_time
    print(f"✅ {request.method} {request.url.path} - Status: {response.status_code} - Time: {process_time:.2f}s")
    
    return response

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://127.0.0.1:3000", 
        "http://localhost:5173", 
        "http://127.0.0.1:5173",
        "http://localhost:5174", 
        "http://127.0.0.1:5174"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["authentication"])
app.include_router(notebooks.router, prefix="/api/notebooks", tags=["notebooks"])
app.include_router(documents.router, prefix="/api/documents", tags=["documents"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(notes.router, prefix="/api/notes", tags=["notes"])
app.include_router(search.router, prefix="/api/search", tags=["search"])

@app.get("/")
async def root():
    return {"message": "NotebookAI API is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.get("/test-embeddings")
async def test_embeddings_table_public():
    """Test if document_embeddings table exists (public endpoint)"""
    try:
        from app.models.database import supabase_admin
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

@app.get("/test-google-ai")
async def test_google_ai_public():
    """Test Google AI API (public endpoint)"""
    try:
        from app.services.embedding_service import EmbeddingService
        embedding_service = EmbeddingService()
        test_embedding = embedding_service._generate_embedding("This is a test")
        return {
            "status": "success",
            "message": "Google AI API is working", 
            "embedding_dimensions": len(test_embedding)
        }
    except Exception as e:
        import traceback
        return {
            "status": "error",
            "message": f"Google AI API failed: {str(e)}",
            "error": str(e),
            "traceback": traceback.format_exc()
        }

@app.post("/test-signup")
async def test_signup():
    """Simple test endpoint to debug signup issues"""
    try:
        from app.models.database import supabase_admin
        from app.core.security import get_password_hash
        import uuid
        from datetime import datetime
        
        # Test data
        test_user = {
            "id": str(uuid.uuid4()),
            "email": "simple-test@example.com",
            "name": "Simple Test",
            "password_hash": get_password_hash("testpass"),
            "created_at": datetime.utcnow().isoformat()
        }
        
        # Try to insert
        result = supabase_admin.table("users").insert(test_user).execute()
        
        return {
            "status": "success",
            "message": "Test signup worked",
            "result": result.data,
            "error": getattr(result, 'error', None)
        }
    except Exception as e:
        import traceback
        return {
            "status": "error",
            "message": str(e),
            "traceback": traceback.format_exc()
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
