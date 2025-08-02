# NotebookAI

An AI-powered web application for document management, semantic search, and interactive knowledge extraction.

## Features

- Document upload and parsing (PDF, DOCX, EXCEL, PPT, TXT, Markdown, WebURL, YouTube)
- AI-powered chat interface with document-aware responses
- Semantic search across document contents
- Note-taking and organization
- Export capabilities (Markdown/PDF)

## Tech Stack

- **Frontend**: React.js + Tailwind CSS + shadcn/ui
- **Backend**: Python FastAPI
- **Database**: Supabase
- **Vector DB**: Supabase (pgvector)
- **Embeddings**: Google Gemini (gemini-embedding-exp-03-07)
- **LLM**: Google Gemini (gemini-2.5-pro)

## Project Structure

```
NotebookAI/
├── backend/           # FastAPI backend
├── frontend/          # React frontend
└── README.md
```

## Getting Started

1. Set up backend (see backend/README.md)
2. Set up frontend (see frontend/README.md)
3. Configure environment variables
4. Run the application

## Development

This application is designed for local development on Windows systems.