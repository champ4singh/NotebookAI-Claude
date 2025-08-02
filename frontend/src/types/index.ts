export interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

export interface Notebook {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
}

export interface Document {
  id: string;
  notebook_id: string;
  filename: string;
  file_type: string;
  content: string;
  embedding_id?: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  notebook_id: string;
  user_prompt: string;
  ai_response: string;
  metadata?: {
    citations?: Citation[];
    retrieved_chunks?: number;
    documents_referenced?: string[];
  };
  created_at: string;
}

export interface Note {
  id: string;
  notebook_id: string;
  content: string;
  source_type: 'manual' | 'ai_generated';
  linked_chat_id?: string;
  created_at: string;
}

export interface Citation {
  type: string;
  reference: string;
}

export interface SearchResult {
  document_id: string;
  document_name: string;
  content_snippet: string;
  similarity_score: number;
}

export interface AuthResponse {
  user: User;
  access_token: string;
  token_type: string;
}