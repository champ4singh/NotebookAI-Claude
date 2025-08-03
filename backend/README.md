# NotebookAI Backend

FastAPI backend for the NotebookAI application.

## Features

- User authentication with JWT tokens
- Document upload and processing (PDF, DOCX, Excel, PowerPoint, Text, Markdown, URLs, YouTube)
- Vector embeddings with Google AI
- RAG-based chat system
- Semantic search
- Notes management
- Supabase integration for database and vector storage

## Setup

1. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

2. **Environment Configuration**
   - Copy `.env.example` to `.env`
   - Fill in your configuration values:
     - Supabase project URL and keys
     - Google AI API key
     - JWT secret key

3. **Database Setup**
   - Create a new Supabase project
   - Enable the `vector` extension in your Supabase project
   - Run the SQL commands in `database_setup.sql` in your Supabase SQL editor

4. **Run the Application**
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```@Snip.png

## API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login

### Notebooks
- `GET /api/notebooks/` - List user's notebooks
- `POST /api/notebooks/` - Create new notebook
- `GET /api/notebooks/{notebook_id}` - Get notebook details
- `PUT /api/notebooks/{notebook_id}` - Update notebook
- `DELETE /api/notebooks/{notebook_id}` - Delete notebook

### Documents
- `POST /api/documents/upload/{notebook_id}` - Upload document
- `GET /api/documents/{notebook_id}` - List documents in notebook
- `GET /api/documents/document/{document_id}` - Get document details
- `PUT /api/documents/document/{document_id}` - Update document
- `DELETE /api/documents/document/{document_id}` - Delete document

### Chat
- `POST /api/chat/` - Send chat message
- `GET /api/chat/{notebook_id}` - Get chat history
- `DELETE /api/chat/{chat_id}` - Delete chat message

### Notes
- `POST /api/notes/` - Create note
- `GET /api/notes/{notebook_id}` - List notes in notebook
- `GET /api/notes/note/{note_id}` - Get note details
- `PUT /api/notes/note/{note_id}` - Update note
- `DELETE /api/notes/note/{note_id}` - Delete note
- `POST /api/notes/from-chat/{chat_id}` - Create note from chat response

### Search
- `POST /api/search/` - Semantic search across documents

## Architecture

- **FastAPI** - Web framework
- **Supabase** - Database and vector storage
- **Google AI** - Embeddings and LLM
- **JWT** - Authentication
- **Pydantic** - Data validation and serialization

## File Structure

```
backend/
├── app/
│   ├── api/
│   │   └── routes/          # API route definitions
│   ├── core/                # Core functionality (config, security)
│   ├── models/              # Data models and database connection
│   ├── services/            # Business logic services
│   └── main.py              # FastAPI application entry point
├── requirements.txt         # Python dependencies
├── database_setup.sql       # Database schema and setup
├── .env.example            # Environment variables template
└── README.md               # This file
```