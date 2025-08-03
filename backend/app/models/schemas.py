from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class SourceType(str, Enum):
    manual = "manual"
    ai_generated = "ai_generated"

class FileType(str, Enum):
    pdf = "PDF"
    docx = "DOCX"
    excel = "EXCEL"
    ppt = "PPT"
    txt = "TXT"
    md = "MD"
    url = "URL"
    youtube = "youtube"

# User schemas
class UserBase(BaseModel):
    email: EmailStr
    name: str

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(UserBase):
    id: str
    created_at: datetime

class UserResponse(BaseModel):
    user: User
    access_token: str
    token_type: str = "bearer"

# Notebook schemas
class NotebookBase(BaseModel):
    title: str

class NotebookCreate(NotebookBase):
    pass

class NotebookUpdate(BaseModel):
    title: Optional[str] = None

class Notebook(NotebookBase):
    id: str
    user_id: str
    created_at: datetime

# Document schemas
class DocumentBase(BaseModel):
    filename: str
    file_type: FileType

class DocumentCreate(DocumentBase):
    content: str
    notebook_id: str

class DocumentUpdate(BaseModel):
    filename: Optional[str] = None

class Document(DocumentBase):
    id: str
    notebook_id: str
    content: str
    embedding_id: Optional[str] = None
    created_at: datetime

# Chat schemas
class ChatMessage(BaseModel):
    user_prompt: str
    notebook_id: str
    selected_document_ids: Optional[List[str]] = []

class ChatResponse(BaseModel):
    id: str
    notebook_id: str
    user_prompt: str
    ai_response: str
    metadata: Optional[Dict[str, Any]] = None
    created_at: datetime

# Note schemas
class NoteBase(BaseModel):
    content: str

class NoteCreate(NoteBase):
    notebook_id: str
    source_type: SourceType = SourceType.manual
    linked_chat_id: Optional[str] = None

class NoteUpdate(BaseModel):
    content: Optional[str] = None

class Note(NoteBase):
    id: str
    notebook_id: str
    source_type: SourceType
    linked_chat_id: Optional[str] = None
    created_at: datetime

# Search schemas
class SearchQuery(BaseModel):
    query: str
    notebook_id: str
    limit: Optional[int] = 10

class SearchResult(BaseModel):
    document_id: str
    document_name: str
    content_snippet: str
    similarity_score: float