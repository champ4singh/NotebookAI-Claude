import axios from 'axios';
import type { AxiosInstance } from 'axios';
import type { AuthResponse, Notebook, Document, ChatMessage, Note, SearchResult } from '../types';
import { apiConfig } from '../config/api';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create(apiConfig);

    // Add auth token to requests
    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('access_token');
      console.log('Request interceptor - Token:', token ? 'Found' : 'Not found');
      console.log('Request URL:', config.url);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log('Authorization header set:', config.headers.Authorization);
      }
      return config;
    });

    // Handle token expiration
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async signup(email: string, name: string, password: string): Promise<AuthResponse> {
    try {
      console.log('API Service: Making signup request to:', `${this.api.defaults.baseURL}/auth/signup`);
      console.log('Request data:', { email, name, password });
      
      const response = await this.api.post('/auth/signup', { email, name, password });
      console.log('Signup response:', response);
      return response.data;
    } catch (error: any) {
      console.error('API Service signup error:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: error.config
      });
      throw error;
    }
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      console.log('API Service: Making login request to:', `${this.api.defaults.baseURL}/auth/login`);
      console.log('Login request data:', { email, password: '***' });
      
      const response = await this.api.post('/auth/login', { email, password });
      console.log('Login response:', response);
      return response.data;
    } catch (error: any) {
      console.error('API Service login error:', error);
      console.error('Login error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: error.config
      });
      throw error;
    }
  }

  // Notebook endpoints
  async getNotebooks(): Promise<Notebook[]> {
    const response = await this.api.get('/notebooks/');
    return response.data;
  }

  async createNotebook(title: string): Promise<Notebook> {
    const response = await this.api.post('/notebooks/', { title });
    return response.data;
  }

  async getNotebook(id: string): Promise<Notebook> {
    const response = await this.api.get(`/notebooks/${id}`);
    return response.data;
  }

  async updateNotebook(id: string, title: string): Promise<Notebook> {
    const response = await this.api.put(`/notebooks/${id}`, { title });
    return response.data;
  }

  async deleteNotebook(id: string): Promise<void> {
    await this.api.delete(`/notebooks/${id}`);
  }

  // Document endpoints
  async uploadDocument(notebookId: string, file: File): Promise<Document> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await this.api.post(`/documents/upload/${notebookId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async processUrl(notebookId: string, url: string, filename: string): Promise<Document> {
    // For URL processing, we'll send as JSON
    const response = await this.api.post(`/documents/process-url/${notebookId}`, {
      url,
      filename
    });
    return response.data;
  }

  async getDocuments(notebookId: string): Promise<Document[]> {
    const response = await this.api.get(`/documents/${notebookId}`);
    return response.data;
  }

  async getDocument(id: string): Promise<Document> {
    const response = await this.api.get(`/documents/document/${id}`);
    return response.data;
  }

  async updateDocument(id: string, filename: string): Promise<Document> {
    const response = await this.api.put(`/documents/document/${id}`, { filename });
    return response.data;
  }

  async deleteDocument(id: string): Promise<void> {
    await this.api.delete(`/documents/document/${id}`);
  }

  async getDocumentContent(id: string): Promise<{ content: string }> {
    const response = await this.api.get(`/documents/content/${id}`);
    return response.data;
  }

  // Chat endpoints
  async sendMessage(notebookId: string, message: string, selectedDocumentIds?: string[]): Promise<ChatMessage> {
    const response = await this.api.post('/chat/', {
      user_prompt: message,
      notebook_id: notebookId,
      selected_document_ids: selectedDocumentIds || [],
    });
    return response.data;
  }

  async getChatHistory(notebookId: string): Promise<ChatMessage[]> {
    const response = await this.api.get(`/chat/${notebookId}`);
    return response.data;
  }

  async deleteChatMessage(id: string): Promise<void> {
    await this.api.delete(`/chat/${id}`);
  }

  async clearChatHistory(notebookId: string): Promise<void> {
    await this.api.delete(`/chat/clear/${notebookId}`);
  }

  // Notes endpoints
  async createNote(notebookId: string, content: string, sourceType: 'manual' | 'ai_generated' = 'manual', linkedChatId?: string): Promise<Note> {
    const response = await this.api.post('/notes/', {
      notebook_id: notebookId,
      content,
      source_type: sourceType,
      linked_chat_id: linkedChatId,
    });
    return response.data;
  }

  async getNotes(notebookId: string): Promise<Note[]> {
    const response = await this.api.get(`/notes/${notebookId}`);
    return response.data;
  }

  async getNote(id: string): Promise<Note> {
    const response = await this.api.get(`/notes/note/${id}`);
    return response.data;
  }

  async updateNote(id: string, content: string): Promise<Note> {
    const response = await this.api.put(`/notes/note/${id}`, { content });
    return response.data;
  }

  async deleteNote(id: string): Promise<void> {
    await this.api.delete(`/notes/note/${id}`);
  }

  async createNoteFromChat(chatId: string): Promise<Note> {
    const response = await this.api.post(`/notes/from-chat/${chatId}`);
    return response.data;
  }

  // Search endpoints
  async search(notebookId: string, query: string, limit: number = 10): Promise<SearchResult[]> {
    const response = await this.api.post('/search/', {
      query,
      notebook_id: notebookId,
      limit,
    });
    return response.data;
  }
}

export const apiService = new ApiService();