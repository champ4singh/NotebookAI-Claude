import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import type { Notebook, Document, ChatMessage, Note } from '../types';
import { 
  ArrowLeft, 
  Upload, 
  Send, 
  Save, 
  FileText, 
  MessageSquare, 
  StickyNote, 
  Brain,
  Plus,
  Trash2,
  Download,
  Eye,
  Sparkles,
  Paperclip,
  Zap,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  X
} from 'lucide-react';

export const NotebookPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [notebook, setNotebook] = useState<Notebook | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Chat state
  const [message, setMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [clearingChat, setClearingChat] = useState(false);
  
  // Note state
  const [newNote, setNewNote] = useState('');
  const [creatingNote, setCreatingNote] = useState(false);
  
  // Upload state
  const [uploading, setUploading] = useState(false);
  
  // Document viewer state
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [documentContent, setDocumentContent] = useState<string>('');
  const [loadingContent, setLoadingContent] = useState(false);
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);
  
  // Note viewer state
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [showNoteViewer, setShowNoteViewer] = useState(false);
  
  // Active tab state
  const [activeTab, setActiveTab] = useState<'chat' | 'documents' | 'notes'>('chat');

  useEffect(() => {
    if (id) {
      loadNotebook();
      loadDocuments();
      loadChatHistory();
      loadNotes();
    }
  }, [id]);

  useEffect(() => {
    // Auto-scroll chat to bottom when new messages arrive
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  useEffect(() => {
    // Handle keyboard shortcuts for viewers
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (showDocumentViewer) {
          closeDocumentViewer();
        } else if (showNoteViewer) {
          closeNoteViewer();
        }
      }
    };

    if (showDocumentViewer || showNoteViewer) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [showDocumentViewer, showNoteViewer]);

  const loadNotebook = async () => {
    try {
      const data = await apiService.getNotebook(id!);
      setNotebook(data);
    } catch (error) {
      console.error('Failed to load notebook:', error);
      navigate('/');
    }
  };

  const loadDocuments = async () => {
    try {
      const data = await apiService.getDocuments(id!);
      setDocuments(data);
    } catch (error) {
      console.error('Failed to load documents:', error);
    }
  };

  const loadChatHistory = async () => {
    try {
      const data = await apiService.getChatHistory(id!);
      setChatHistory(data);
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  };

  const loadNotes = async () => {
    try {
      const data = await apiService.getNotes(id!);
      setNotes(data);
    } catch (error) {
      console.error('Failed to load notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const document = await apiService.uploadDocument(id!, file);
      setDocuments([document, ...documents]);
      
      // Clear the input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Failed to upload document:', error);
    } finally {
      setUploading(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || sendingMessage) return;

    const userMessage = message;
    setMessage('');
    setSendingMessage(true);

    try {
      const response = await apiService.sendMessage(id!, userMessage);
      // Add the new message to chat history and refresh the display
      setChatHistory(prevHistory => [...prevHistory, response]);
    } catch (error) {
      console.error('Failed to send message:', error);
      // Restore message on error
      setMessage(userMessage);
    } finally {
      setSendingMessage(false);
    }
  };

  const createNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || creatingNote) return;

    setCreatingNote(true);
    try {
      const note = await apiService.createNote(id!, newNote);
      setNotes([note, ...notes]);
      setNewNote('');
    } catch (error) {
      console.error('Failed to create note:', error);
    } finally {
      setCreatingNote(false);
    }
  };

  const saveAsNote = async (chatId: string) => {
    try {
      const note = await apiService.createNoteFromChat(chatId);
      setNotes([note, ...notes]);
    } catch (error) {
      console.error('Failed to save as note:', error);
    }
  };

  const clearChatHistory = async () => {
    if (!confirm('Are you sure you want to clear all chat history? This action cannot be undone.')) return;
    
    setClearingChat(true);
    try {
      // Clear chat history from backend
      await apiService.clearChatHistory(id!);
      
      // Clear chat history from state for immediate UI update
      setChatHistory([]);
      
    } catch (error) {
      console.error('Failed to clear chat history:', error);
      // Reload chat history if clearing failed
      loadChatHistory();
    } finally {
      setClearingChat(false);
    }
  };

  const deleteDocument = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    
    try {
      await apiService.deleteDocument(docId);
      setDocuments(documents.filter(doc => doc.id !== docId));
    } catch (error) {
      console.error('Failed to delete document:', error);
    }
  };

  const viewDocument = async (document: Document) => {
    setSelectedDocument(document);
    setLoadingContent(true);
    setShowDocumentViewer(true);
    
    try {
      const response = await apiService.getDocumentContent(document.id);
      setDocumentContent(response.content);
    } catch (error) {
      console.error('Failed to load document content:', error);
      setDocumentContent('Error loading document content. Please try again.');
    } finally {
      setLoadingContent(false);
    }
  };

  const closeDocumentViewer = () => {
    setShowDocumentViewer(false);
    setSelectedDocument(null);
    setDocumentContent('');
    setLoadingContent(false);
  };

  const viewNote = (note: Note) => {
    setSelectedNote(note);
    setShowNoteViewer(true);
  };

  const closeNoteViewer = () => {
    setShowNoteViewer(false);
    setSelectedNote(null);
  };

  const deleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note? This action cannot be undone.')) return;
    
    try {
      await apiService.deleteNote(noteId);
      setNotes(notes.filter(note => note.id !== noteId));
      
      // Close note viewer if the deleted note is currently being viewed
      if (selectedNote?.id === noteId) {
        closeNoteViewer();
      }
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center animate-slide-up">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl mb-4 shadow-lg animate-pulse">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Loading workspace...</h2>
          <div className="w-32 h-1 bg-gray-200 rounded-full mx-auto overflow-hidden">
            <div className="w-full h-full bg-gradient-to-r from-blue-600 to-purple-600 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <div className="flex items-center justify-between py-6">
            {/* Navigation */}
            <div className="flex items-center space-x-6">
              <button
                onClick={() => navigate('/')}
                className="btn-ghost"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Dashboard
              </button>
              
              <div className="h-8 w-px bg-gray-200"></div>
              
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">{notebook?.title}</h1>
                  <p className="text-sm text-gray-500 font-medium">AI-Powered Workspace</p>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center space-x-6 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4" />
                <span className="font-medium">{documents.length} docs</span>
              </div>
              <div className="flex items-center space-x-2">
                <MessageSquare className="w-4 h-4" />
                <span className="font-medium">{chatHistory.length} chats</span>
              </div>
              <div className="flex items-center space-x-2">
                <StickyNote className="w-4 h-4" />
                <span className="font-medium">{notes.length} notes</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-8">
        {/* Quick Actions */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Quick Actions</h2>
            <div className="flex space-x-3">
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileUpload}
                className="hidden"
                accept=".pdf,.docx,.xlsx,.pptx,.txt,.md"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="btn-primary"
              >
                {uploading ? (
                  <div className="flex items-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Uploading...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Document
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="bg-white rounded-2xl p-2 shadow-sm border border-gray-200 mb-6">
            <div className="flex space-x-1">
              {[
                { id: 'chat', label: 'AI Chat', icon: MessageSquare },
                { id: 'documents', label: 'Documents', icon: FileText },
                { id: 'notes', label: 'Notes', icon: StickyNote },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Content Area */}
          <div className="lg:col-span-8">
            {activeTab === 'chat' && (
              <div className="space-y-6">
                {/* Chat Interface */}
                <div className="card-modern h-[600px] flex flex-col">
                  <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl">
                        <Brain className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">AI Assistant</h3>
                        <p className="text-sm text-gray-500">Powered by advanced AI</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      {chatHistory.length > 0 && (
                        <button
                          onClick={clearChatHistory}
                          disabled={clearingChat}
                          className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Clear chat history"
                        >
                          {clearingChat ? (
                            <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                          <span>Clear Chat</span>
                        </button>
                      )}
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>Online</span>
                      </div>
                    </div>
                  </div>

                  {/* Chat Messages */}
                  <div 
                    ref={chatContainerRef}
                    className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-custom"
                  >
                    {chatHistory.length === 0 ? (
                      <div className="text-center py-16">
                        <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 opacity-20">
                          <Sparkles className="w-10 h-10 text-white" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-3">Start a conversation</h3>
                        <p className="text-gray-600 max-w-md mx-auto text-balance">
                          Ask questions about your documents, get insights, or chat about anything related to your workspace.
                        </p>
                        {documents.length === 0 && (
                          <div className="mt-6 p-4 bg-blue-50 rounded-xl max-w-md mx-auto">
                            <p className="text-sm text-blue-700 font-medium">
                              💡 Upload documents first to unlock AI-powered document analysis!
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      chatHistory.map((chat, index) => (
                        <div key={chat.id} className="space-y-4 animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                          {/* User Message */}
                          <div className="flex justify-end items-start space-x-3">
                            <div className="max-w-[75%] bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl rounded-tr-lg shadow-lg overflow-hidden">
                              <div className="px-6 py-4">
                                <div className="flex items-center space-x-2 mb-2">
                                  <div className="w-2 h-2 bg-white/40 rounded-full"></div>
                                  <span className="text-xs font-medium text-white/80 uppercase tracking-wide">You</span>
                                </div>
                                <p className="text-white leading-relaxed text-sm whitespace-pre-wrap">{chat.user_prompt}</p>
                              </div>
                            </div>
                            <div className="flex items-center justify-center w-8 h-8 bg-white border-2 border-blue-200 rounded-full flex-shrink-0 mt-1">
                              <div className="w-4 h-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full"></div>
                            </div>
                          </div>
                          
                          {/* AI Response */}
                          <div className="flex justify-start items-start space-x-3">
                            <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex-shrink-0 mt-1">
                              <Brain className="w-4 h-4 text-white" />
                            </div>
                            <div className="max-w-[80%] bg-gradient-to-br from-slate-50 to-gray-50 border border-gray-200 rounded-2xl rounded-tl-lg shadow-sm overflow-hidden">
                              <div className="px-6 py-4">
                                <div className="flex items-center space-x-2 mb-3">
                                  <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">AI Assistant</span>
                                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                </div>
                                <div className="prose prose-sm max-w-none">
                                  <div className="text-gray-900 leading-relaxed whitespace-pre-wrap text-sm">
                                    {chat.ai_response}
                                  </div>
                                </div>
                              </div>
                              <div className="px-6 py-3 bg-white border-t border-gray-100 flex items-center justify-between">
                                <div className="flex items-center space-x-4 text-xs text-gray-500">
                                  <div className="flex items-center space-x-1">
                                    <Clock className="w-3 h-3" />
                                    <span>{new Date(chat.created_at).toLocaleString('en-US', {
                                      hour: 'numeric',
                                      minute: '2-digit',
                                      hour12: true
                                    })}</span>
                                  </div>
                                  <div className="w-px h-3 bg-gray-300"></div>
                                  <div className="flex items-center space-x-1">
                                    <Sparkles className="w-3 h-3" />
                                    <span>AI Generated</span>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => saveAsNote(chat.id)}
                                    className="flex items-center space-x-1 px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-all duration-200 hover:scale-105"
                                  >
                                    <Save className="w-3 h-3" />
                                    <span>Save as Note</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                    
                    {/* Loading indicator for new message */}
                    {sendingMessage && (
                      <div className="flex justify-start items-start space-x-3 animate-fade-in">
                        <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex-shrink-0 mt-1">
                          <Brain className="w-4 h-4 text-white animate-pulse" />
                        </div>
                        <div className="max-w-[80%] bg-gradient-to-br from-slate-50 to-gray-50 border border-gray-200 rounded-2xl rounded-tl-lg shadow-sm overflow-hidden">
                          <div className="px-6 py-4">
                            <div className="flex items-center space-x-2 mb-3">
                              <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">AI Assistant</span>
                              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                            </div>
                            <div className="flex items-center space-x-3 text-gray-500">
                              <div className="flex space-x-1">
                                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                              </div>
                              <span className="text-sm font-medium">AI is thinking...</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Chat Input */}
                  <div className="border-t border-gray-100 p-6">
                    <form onSubmit={sendMessage} className="flex items-end space-x-4">
                      <div className="flex-1">
                        <textarea
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              sendMessage(e);
                            }
                          }}
                          placeholder="Ask about your documents or chat with AI..."
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl resize-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all duration-200"
                          rows={1}
                          style={{ minHeight: '44px', maxHeight: '120px' }}
                          disabled={sendingMessage}
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={!message.trim() || sendingMessage}
                        className="btn-primary h-11 px-6"
                      >
                        {sendingMessage ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </button>
                    </form>
                    <p className="text-xs text-gray-500 mt-2">
                      Press Enter to send • Shift + Enter for new line
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'documents' && (
              <div className="space-y-6">
                {documents.length === 0 ? (
                  <div className="card-modern text-center py-16">
                    <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 opacity-20">
                      <FileText className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">No documents yet</h3>
                    <p className="text-gray-600 max-w-md mx-auto text-balance mb-6">
                      Upload your first document to start building your AI-powered knowledge base.
                    </p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="btn-primary"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Your First Document
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {documents.map((doc, index) => (
                      <div
                        key={doc.id}
                        className="card-modern group animate-fade-in"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl">
                              <FileText className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-gray-900 truncate">{doc.filename}</h4>
                              <p className="text-sm text-gray-500 uppercase tracking-wide">{doc.file_type}</p>
                            </div>
                          </div>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                            <button 
                              onClick={() => viewDocument(doc)}
                              className="p-2 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
                              title="View document"
                            >
                              <Eye className="w-4 h-4 text-gray-500" />
                            </button>
                            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                              <Download className="w-4 h-4 text-gray-500" />
                            </button>
                            <button
                              onClick={() => deleteDocument(doc.id)}
                              className="p-2 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-sm text-gray-500">
                          <span>
                            Uploaded {new Date(doc.created_at).toLocaleDateString()}
                          </span>
                          <div className="flex items-center space-x-1 text-green-600">
                            <CheckCircle2 className="w-4 h-4" />
                            <span className="font-medium">Processed</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'notes' && (
              <div className="space-y-6">
                {/* Create Note Form */}
                <div className="card-modern">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl">
                      <Plus className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">Create New Note</h3>
                      <p className="text-sm text-gray-500">Capture your thoughts and insights</p>
                    </div>
                  </div>
                  
                  <form onSubmit={createNote} className="space-y-4">
                    <textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Write your note here..."
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl resize-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all duration-200"
                      rows={4}
                    />
                    <button
                      type="submit"
                      disabled={!newNote.trim() || creatingNote}
                      className="btn-primary w-full"
                    >
                      {creatingNote ? (
                        <div className="flex items-center">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          Creating...
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <Plus className="w-4 h-4 mr-2" />
                          Create Note
                        </div>
                      )}
                    </button>
                  </form>
                </div>

                {/* Notes List */}
                {notes.length === 0 ? (
                  <div className="card-modern text-center py-16">
                    <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 opacity-20">
                      <StickyNote className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">No notes yet</h3>
                    <p className="text-gray-600 max-w-md mx-auto text-balance">
                      Create your first note or save AI responses as notes to build your knowledge collection.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {notes.map((note, index) => (
                      <div
                        key={note.id}
                        className="card-modern group animate-fade-in"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <div className="flex items-start space-x-4">
                          <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl flex-shrink-0">
                            <StickyNote className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-3">
                              <p className="text-gray-900 leading-relaxed line-clamp-3 flex-1">
                                {note.content.length > 150 ? `${note.content.substring(0, 150)}...` : note.content}
                              </p>
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1 ml-3">
                                <button 
                                  onClick={() => viewNote(note)}
                                  className="p-2 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
                                  title="View full note"
                                >
                                  <Eye className="w-4 h-4 text-gray-500" />
                                </button>
                                <button 
                                  onClick={() => deleteNote(note.id)}
                                  className="p-2 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                                  title="Delete note"
                                >
                                  <Trash2 className="w-4 h-4 text-gray-500" />
                                </button>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4 text-xs text-gray-500">
                                <span className={`inline-flex items-center px-2 py-1 rounded-lg font-medium ${
                                  note.source_type === 'ai_generated' 
                                    ? 'bg-purple-100 text-purple-700'
                                    : 'bg-green-100 text-green-700'
                                }`}>
                                  {note.source_type === 'ai_generated' ? (
                                    <>
                                      <Brain className="w-3 h-3 mr-1" />
                                      From AI
                                    </>
                                  ) : (
                                    <>
                                      <Users className="w-3 h-3 mr-1" />
                                      Manual
                                    </>
                                  )}
                                </span>
                                <div className="flex items-center space-x-1">
                                  <Clock className="w-3 h-3" />
                                  <span>
                                    {new Date(note.created_at).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric'
                                    })}
                                  </span>
                                </div>
                              </div>
                              {note.content.length > 150 && (
                                <button 
                                  onClick={() => viewNote(note)}
                                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                                >
                                  Read more
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            {/* Workspace Stats */}
            <div className="card-modern">
              <h3 className="font-bold text-gray-900 mb-4">Workspace Overview</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                      <FileText className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-medium text-gray-900">Documents</span>
                  </div>
                  <span className="text-2xl font-bold text-blue-600">{documents.length}</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                      <MessageSquare className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-medium text-gray-900">AI Chats</span>
                  </div>
                  <span className="text-2xl font-bold text-purple-600">{chatHistory.length}</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-yellow-600 rounded-lg flex items-center justify-center">
                      <StickyNote className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-medium text-gray-900">Notes</span>
                  </div>
                  <span className="text-2xl font-bold text-yellow-600">{notes.length}</span>
                </div>
              </div>
            </div>

            {/* Quick Tips */}
            <div className="card-modern">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center">
                <Zap className="w-5 h-5 mr-2 text-yellow-500" />
                Pro Tips
              </h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl">
                  <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Sparkles className="w-3 h-3 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Ask specific questions</p>
                    <p className="text-xs text-gray-600">Get better AI responses by being specific about what you want to know.</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl">
                  <div className="w-6 h-6 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <FileText className="w-3 h-3 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Upload quality docs</p>
                    <p className="text-xs text-gray-600">Better document quality leads to more accurate AI insights.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl">
                  <div className="w-6 h-6 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Save className="w-3 h-3 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Save important insights</p>
                    <p className="text-xs text-gray-600">Convert AI responses to notes for future reference.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Document Viewer Modal */}
      {showDocumentViewer && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full h-[90vh] max-h-[90vh] flex flex-col animate-fade-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-4">
                <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedDocument?.filename}</h2>
                  <p className="text-sm text-gray-500 uppercase tracking-wide">
                    {selectedDocument?.file_type} • {selectedDocument && new Date(selectedDocument.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <button
                onClick={closeDocumentViewer}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-hidden">
              {loadingContent ? (
                <div className="flex flex-col items-center justify-center h-96 space-y-4">
                  <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <div className="text-center">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Loading document...</h3>
                    <p className="text-sm text-gray-500">Please wait while we prepare your document</p>
                  </div>
                </div>
              ) : (
                <div className="h-full overflow-y-auto scrollbar-document p-6">
                  <div className="prose prose-slate max-w-none">
                    {selectedDocument?.file_type === 'pdf' || selectedDocument?.file_type === 'txt' || selectedDocument?.file_type === 'md' ? (
                      <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm min-h-[400px]">
                        <div className="text-gray-900 leading-relaxed whitespace-pre-wrap text-base">
                          {documentContent || 'No content available'}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-50 rounded-xl p-6 font-mono text-sm leading-relaxed whitespace-pre-wrap min-h-[400px]">
                        {documentContent || 'No content available'}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span>Processed & Ready</span>
                </div>
                <div className="w-px h-4 bg-gray-300"></div>
                <div className="flex items-center space-x-2">
                  <span>📜</span>
                  <span>Scroll to read complete document</span>
                </div>
                <div className="w-px h-4 bg-gray-300"></div>
                <span>Press Esc to close</span>
              </div>
              <div className="flex space-x-3">
                <button className="btn-ghost">
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </button>
                <button 
                  onClick={closeDocumentViewer}
                  className="btn-primary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Note Viewer Modal */}
      {showNoteViewer && selectedNote && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full h-[80vh] max-h-[80vh] flex flex-col animate-fade-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-4">
                <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl">
                  <StickyNote className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Note Details</h2>
                  <div className="flex items-center space-x-3 text-sm text-gray-500">
                    <span className={`inline-flex items-center px-2 py-1 rounded-lg font-medium ${
                      selectedNote.source_type === 'ai_generated' 
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {selectedNote.source_type === 'ai_generated' ? (
                        <>
                          <Brain className="w-3 h-3 mr-1" />
                          AI Generated
                        </>
                      ) : (
                        <>
                          <Users className="w-3 h-3 mr-1" />
                          Manual
                        </>
                      )}
                    </span>
                    <span>•</span>
                    <span>{new Date(selectedNote.created_at).toLocaleDateString('en-US', {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={closeNoteViewer}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-hidden">
              <div className="h-full overflow-y-auto scrollbar-document p-6">
                <div className="prose prose-slate max-w-none">
                  <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-8 shadow-sm min-h-[400px]">
                    <div className="text-gray-900 leading-relaxed whitespace-pre-wrap text-base">
                      {selectedNote.content}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span>Note Ready</span>
                </div>
                <div className="w-px h-4 bg-gray-300"></div>
                <div className="flex items-center space-x-2">
                  <span>📝</span>
                  <span>Full note content displayed</span>
                </div>
                <div className="w-px h-4 bg-gray-300"></div>
                <span>Press Esc to close</span>
              </div>
              <div className="flex space-x-3">
                <button className="btn-ghost">
                  <Save className="w-4 h-4 mr-2" />
                  Edit
                </button>
                <button 
                  onClick={() => selectedNote && deleteNote(selectedNote.id)}
                  className="btn-ghost text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </button>
                <button 
                  onClick={closeNoteViewer}
                  className="btn-primary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};