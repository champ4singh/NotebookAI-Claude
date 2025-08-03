import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import type { Notebook, Document, ChatMessage, Note } from '../types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  ArrowLeft, 
  Upload, 
  Send, 
  Save, 
  FileText, 
  StickyNote, 
  Brain,
  Plus,
  Trash2,
  Download,
  Eye,
  Sparkles,
  Users,
  Clock,
  CheckCircle2,
  X,
  Check,
  BookOpenCheck,
  FileBarChart,
  HelpCircle,
  Calendar
} from 'lucide-react';

// Utility function to strip markdown for preview
const stripMarkdown = (text: string): string => {
  return text
    .replace(/#{1,6}\s+/g, '') // Remove headers
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
    .replace(/\*(.*?)\*/g, '$1') // Remove italic
    .replace(/`(.*?)`/g, '$1') // Remove code
    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links
    .replace(/^\s*[\*\-\+]\s+/gm, '') // Remove list markers
    .replace(/^\s*\d+\.\s+/gm, '') // Remove numbered lists
    .replace(/\n+/g, ' ') // Replace newlines with spaces
    .trim();
};

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
  const [generatingNote, setGeneratingNote] = useState<string | null>(null);
  
  // Upload state
  const [uploading, setUploading] = useState(false);
  
  // Document selection state
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [selectAllDocuments, setSelectAllDocuments] = useState(false);
  
  // Document viewer state
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [documentContent, setDocumentContent] = useState<string>('');
  const [loadingContent, setLoadingContent] = useState(false);
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);
  
  // Note viewer state
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [showNoteViewer, setShowNoteViewer] = useState(false);

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
      // Send selected document IDs with the message
      const selectedDocIds = Array.from(selectedDocuments);
      console.log('Sending message with selected documents:', selectedDocIds);
      
      const response = await apiService.sendMessage(id!, userMessage, selectedDocIds);
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

  // Note generation functions
  const generateStudyGuide = async () => {
    if (selectedDocuments.size === 0) {
      alert('Please select at least one document to generate a study guide.');
      return;
    }

    setGeneratingNote('Study Guide');
    try {
      const selectedDocIds = Array.from(selectedDocuments);
      console.log('🔍 Generating Study Guide with documents:', selectedDocIds);
      
      const prompt = `Create a comprehensive Study Guide based on the selected documents. Structure it with the following sections:

1. **Core Concepts & Functionality** - Key concepts, definitions, and how things work
2. **Applications** - Practical uses, implementation examples, and real-world scenarios  
3. **Limitations & Best Practices** - What to avoid, constraints, and recommended approaches
4. **Quiz** - 5-10 questions to test understanding (with answers)
5. **Glossary** - Important terms and their definitions

Make it educational and well-structured for learning purposes.`;

      console.log('🔍 Sending chat message...');
      const response = await apiService.sendMessage(id!, prompt, selectedDocIds);
      console.log('✅ Chat response received:', response);
      
      // Add to chat history first (this part we know works)
      setChatHistory(prevHistory => [...prevHistory, response]);
      
      // Create a note from the response
      console.log('🔍 Creating note with AI response...');
      console.log('🔍 Note content length:', response.ai_response?.length);
      console.log('🔍 Notebook ID:', id);
      
      // Truncate content if it's too long (some databases have limits)
      let noteContent = response.ai_response;
      if (noteContent && noteContent.length > 10000) {
        noteContent = noteContent.substring(0, 10000) + '\n\n... (Content truncated due to length)';
        console.log('⚠️ Content truncated due to length');
      }
      
      const note = await apiService.createNote(id!, noteContent, 'ai_generated');
      console.log('✅ Note created:', note);
      
      setNotes([note, ...notes]);
      console.log('✅ Study Guide generation completed successfully');
    } catch (error) {
      console.error('❌ Failed to generate study guide:', error);
      console.error('❌ Error details:', {
        name: (error as any)?.name,
        message: (error as any)?.message,
        stack: (error as any)?.stack,
        response: (error as any)?.response?.data
      });
      alert(`Failed to generate study guide: ${(error as any)?.message || 'Unknown error'}. Please try again.`);
    } finally {
      setGeneratingNote(null);
    }
  };

  const generateBriefingDoc = async () => {
    if (selectedDocuments.size === 0) {
      alert('Please select at least one document to generate a briefing document.');
      return;
    }

    setGeneratingNote('Briefing Doc');
    try {
      const selectedDocIds = Array.from(selectedDocuments);
      const prompt = `Create a concise Management Briefing Document based on the selected documents. This should be:

- **Executive Summary** - Key points in 2-3 sentences
- **Main Findings** - Most important insights and information
- **Business Impact** - How this affects operations, strategy, or decisions
- **Recommendations** - Actionable next steps
- **Risk Considerations** - Potential issues or concerns

Keep it professional, concise, and suitable for management review. Focus on business value and decision-making insights.`;

      const response = await apiService.sendMessage(id!, prompt, selectedDocIds);
      
      // Create a note from the response
      const note = await apiService.createNote(id!, response.ai_response, 'ai_generated');
      setNotes([note, ...notes]);
    } catch (error) {
      console.error('Failed to generate briefing document:', error);
      alert('Failed to generate briefing document. Please try again.');
    } finally {
      setGeneratingNote(null);
    }
  };

  const generateFAQ = async () => {
    if (selectedDocuments.size === 0) {
      alert('Please select at least one document to generate an FAQ.');
      return;
    }

    setGeneratingNote('FAQ');
    try {
      const selectedDocIds = Array.from(selectedDocuments);
      const prompt = `Create a comprehensive FAQ (Frequently Asked Questions) with exactly 15 questions based on the selected documents. Structure it as follows:

## **EASY LEVEL QUESTIONS (5 Questions)**
Create 5 basic, fundamental questions that beginners would ask. These should cover:
- Basic definitions and concepts
- Simple "what is" questions
- Getting started information
- Basic functionality

## **MEDIUM LEVEL QUESTIONS (5 Questions)** 
Create 5 intermediate questions that require some understanding. These should cover:
- How-to questions with multiple steps
- Practical implementation scenarios
- Common use cases and applications
- Comparison questions

## **DIFFICULT LEVEL QUESTIONS (5 Questions)**
Create 5 advanced, complex questions for experts. These should cover:
- Advanced troubleshooting scenarios
- Complex integration challenges
- Edge cases and limitations
- Performance optimization
- Advanced configuration

**Format Requirements:**
- Each section must have exactly 5 questions
- Use clear Q&A format: **Q:** followed by **A:**
- Number each question within its difficulty level (1-5)
- Provide detailed, accurate answers based on the document content
- Make answers practical and actionable

Total: 15 questions (5 Easy + 5 Medium + 5 Difficult)`;

      const response = await apiService.sendMessage(id!, prompt, selectedDocIds);
      
      // Create a note from the response
      let noteContent = response.ai_response;
      if (noteContent && noteContent.length > 10000) {
        noteContent = noteContent.substring(0, 10000) + '\n\n... (Content truncated due to length)';
      }
      
      const note = await apiService.createNote(id!, noteContent, 'ai_generated');
      setNotes([note, ...notes]);
    } catch (error) {
      console.error('Failed to generate FAQ:', error);
      alert('Failed to generate FAQ. Please try again.');
    } finally {
      setGeneratingNote(null);
    }
  };

  const generateTimeline = async () => {
    if (selectedDocuments.size === 0) {
      alert('Please select at least one document to generate a timeline.');
      return;
    }

    setGeneratingNote('Timeline');
    try {
      const selectedDocIds = Array.from(selectedDocuments);
      const prompt = `Create a chronological Timeline based on the selected documents. Include:

- **Key Events** - Important dates, milestones, or developments
- **Evolution** - How things changed over time
- **Milestones** - Significant achievements or turning points
- **Future Outlook** - Projected developments or trends (if mentioned)

Format as a clear timeline with dates/periods and descriptions. Focus on the temporal progression of events, ideas, or developments mentioned in the documents.`;

      const response = await apiService.sendMessage(id!, prompt, selectedDocIds);
      
      // Create a note from the response
      const note = await apiService.createNote(id!, response.ai_response, 'ai_generated');
      setNotes([note, ...notes]);
    } catch (error) {
      console.error('Failed to generate timeline:', error);
      alert('Failed to generate timeline. Please try again.');
    } finally {
      setGeneratingNote(null);
    }
  };

  // Document selection handlers
  const handleDocumentSelect = (docId: string, isSelected: boolean) => {
    const newSelected = new Set(selectedDocuments);
    if (isSelected) {
      newSelected.add(docId);
    } else {
      newSelected.delete(docId);
    }
    setSelectedDocuments(newSelected);
    
    // Update select all state
    setSelectAllDocuments(newSelected.size === documents.length && documents.length > 0);
  };

  const handleSelectAllDocuments = (isSelected: boolean) => {
    if (isSelected) {
      setSelectedDocuments(new Set(documents.map(doc => doc.id)));
    } else {
      setSelectedDocuments(new Set());
    }
    setSelectAllDocuments(isSelected);
  };

  // Update select all state when documents change
  useEffect(() => {
    if (documents.length === 0) {
      setSelectAllDocuments(false);
      setSelectedDocuments(new Set());
    } else {
      setSelectAllDocuments(selectedDocuments.size === documents.length);
    }
  }, [documents.length, selectedDocuments.size]);

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

            {/* Quick Actions with Upload */}
            <div className="flex items-center space-x-6">
              {/* Workspace Overview Stats */}
              <div className="flex items-center space-x-6 bg-white rounded-2xl px-6 py-3 shadow-sm border border-gray-200">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-900">{documents.length} Documents</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-purple-600 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-900">{chatHistory.length} Chats</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-yellow-600 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-900">{notes.length} Notes</span>
                </div>
              </div>
              
              {/* Upload Button */}
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
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-8">

        {/* Three-Pane Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[600px]">
          {/* Left Pane - Documents */}
          <div className="lg:col-span-3">
            <div className="card-modern h-full flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl">
                    <FileText className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">Sources</h3>
                  </div>
                </div>
                <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                  {documents.length} sources
                </span>
              </div>
              
              {/* Select All Option */}
              {documents.length > 0 && (
                <div className="p-4 border-b border-gray-100">
                  <label className="flex items-center space-x-3 cursor-pointer group">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={selectAllDocuments}
                        onChange={(e) => handleSelectAllDocuments(e.target.checked)}
                        className="sr-only"
                      />
                      <div className={`flex items-center justify-center w-5 h-5 border-2 rounded transition-all ${
                        selectAllDocuments 
                          ? 'bg-blue-600 border-blue-600' 
                          : 'border-gray-300 group-hover:border-blue-400'
                      }`}>
                        {selectAllDocuments && <Check className="w-3 h-3 text-white" />}
                      </div>
                    </div>
                    <span className="text-sm font-medium text-gray-900">Select all sources</span>
                  </label>
                </div>
              )}
              
              <div className="flex-1 overflow-y-auto p-3" style={{scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 #f1f5f9'}}>
                {documents.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 opacity-20">
                      <FileText className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-sm font-bold text-gray-900 mb-2">No documents yet</h3>
                    <p className="text-gray-600 text-xs mb-4">
                      Upload your first document to start building your knowledge base.
                    </p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="btn-primary btn-sm"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Document
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {documents.map((doc) => {
                      const isSelected = selectedDocuments.has(doc.id);
                      return (
                        <div
                          key={doc.id}
                          className={`border-2 rounded-lg p-3 transition-all duration-200 cursor-pointer ${
                            isSelected ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                          onClick={() => handleDocumentSelect(doc.id, !isSelected)}
                        >
                          <div className="flex items-center space-x-3">
                            {/* Checkbox */}
                            <div className="relative">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}}
                                className="sr-only"
                              />
                              <div className={`flex items-center justify-center w-5 h-5 border-2 rounded transition-all ${
                                isSelected 
                                  ? 'bg-blue-600 border-blue-600' 
                                  : 'border-gray-300 hover:border-blue-400'
                              }`}>
                                {isSelected && <Check className="w-3 h-3 text-white" />}
                              </div>
                            </div>
                            
                            {/* Document Info */}
                            <div className="flex items-center space-x-2 flex-1 min-w-0">
                              <FileText className="w-4 h-4 text-red-500 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-gray-900 text-sm truncate">{doc.filename}</h4>
                              </div>
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="flex space-x-1 flex-shrink-0">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  viewDocument(doc);
                                }}
                                className="p-1 hover:bg-blue-100 hover:text-blue-600 rounded transition-colors"
                                title="View"
                              >
                                <Eye className="w-4 h-4 text-gray-500" />
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteDocument(doc.id);
                                }}
                                className="p-1 hover:bg-red-100 hover:text-red-600 rounded transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4 text-gray-500" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Center Pane - Chat */}
          <div className="lg:col-span-6">
            <div className="card-modern h-full flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl">
                    <Brain className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">AI Chat</h3>
                    <p className="text-sm text-gray-500">
                      {selectedDocuments.size > 0 
                        ? `Using ${selectedDocuments.size} selected source${selectedDocuments.size !== 1 ? 's' : ''}`
                        : 'Ask about your documents'
                      }
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  {chatHistory.length > 0 && (
                    <button
                      onClick={clearChatHistory}
                      disabled={clearingChat}
                      className="flex items-center space-x-1 px-2 py-1 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Clear chat history"
                    >
                      {clearingChat ? (
                        <div className="w-3 h-3 border border-red-600 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Trash2 className="w-3 h-3" />
                      )}
                      <span className="hidden sm:inline">Clear</span>
                    </button>
                  )}
                  <div className="flex items-center space-x-1 text-xs text-gray-500">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Online</span>
                  </div>
                </div>
              </div>

              {/* Chat Messages */}
              <div 
                ref={chatContainerRef}
                className="overflow-y-scroll p-4 space-y-4 scrollbar-chat"
                style={{ height: '400px', minHeight: '400px', paddingBottom: '100px' }}
              >
                {chatHistory.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 opacity-20">
                      <Sparkles className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Start a conversation</h3>
                    <p className="text-gray-600 text-sm">
                      Ask questions about your documents or get AI insights.
                    </p>
                    {documents.length === 0 && (
                      <div className="mt-4 p-3 bg-blue-50 rounded-xl">
                        <p className="text-xs text-blue-700 font-medium">
                          💡 Upload documents first to unlock AI-powered analysis!
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  chatHistory.map((chat, index) => (
                    <div key={chat.id} className="space-y-3 animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                      {/* User Message */}
                      <div className="flex justify-end items-start space-x-2">
                        <div className="max-w-[85%] bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl rounded-tr-lg overflow-hidden">
                          <div className="px-5 py-4">
                            <div className="flex items-center space-x-2 mb-2">
                              <div className="w-1.5 h-1.5 bg-white/40 rounded-full"></div>
                              <span className="text-xs font-medium text-white/80 uppercase tracking-wide">You</span>
                            </div>
                            <p className="text-white text-xs whitespace-pre-wrap leading-relaxed">{chat.user_prompt}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-center w-6 h-6 bg-white border border-blue-200 rounded-full flex-shrink-0 mt-1">
                          <div className="w-3 h-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full"></div>
                        </div>
                      </div>
                      
                      {/* AI Response */}
                      <div className="flex justify-start items-start space-x-2">
                        <div className="flex items-center justify-center w-6 h-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex-shrink-0 mt-1">
                          <Brain className="w-3 h-3 text-white" />
                        </div>
                        <div className="max-w-[85%] bg-gradient-to-br from-slate-50 to-gray-50 border border-gray-200 rounded-2xl rounded-tl-lg overflow-hidden">
                          <div className="px-5 py-4">
                            <div className="flex items-center space-x-2 mb-3">
                              <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">AI Assistant</span>
                              <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                            </div>
                            <div className="text-gray-900 text-sm leading-relaxed">
                              <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-headings:font-bold prose-p:text-gray-800 prose-p:leading-relaxed prose-strong:text-gray-900 prose-strong:font-bold prose-ul:list-disc prose-ol:list-decimal prose-li:text-gray-800 prose-blockquote:border-l-blue-500 prose-blockquote:bg-blue-50 prose-blockquote:pl-4 prose-code:bg-gray-100 prose-code:px-1 prose-code:rounded">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                  {chat.ai_response}
                                </ReactMarkdown>
                              </div>
                            </div>
                          </div>
                          <div className="px-5 py-3 bg-white border-t border-gray-100 flex items-center justify-between">
                            <div className="flex items-center space-x-3 text-xs text-gray-500">
                              <div className="flex items-center space-x-1">
                                <Clock className="w-3 h-3" />
                                <span>{new Date(chat.created_at).toLocaleString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  hour12: true
                                })}</span>
                              </div>
                            </div>
                            <button
                              onClick={() => saveAsNote(chat.id)}
                              className="flex items-center space-x-1 px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-all duration-200"
                            >
                              <Save className="w-3 h-3" />
                              <span className="hidden sm:inline">Save</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                
                {/* Loading indicator for new message */}
                {sendingMessage && (
                  <div className="flex justify-start items-start space-x-2 animate-fade-in">
                    <div className="flex items-center justify-center w-6 h-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex-shrink-0 mt-1">
                      <Brain className="w-3 h-3 text-white animate-pulse" />
                    </div>
                    <div className="max-w-[85%] bg-gradient-to-br from-slate-50 to-gray-50 border border-gray-200 rounded-2xl rounded-tl-lg overflow-hidden">
                      <div className="px-4 py-3">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">AI Assistant</span>
                          <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse"></div>
                        </div>
                        <div className="flex items-center space-x-2 text-gray-500">
                          <div className="flex space-x-1">
                            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></div>
                            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                          <span className="text-sm font-medium">AI is thinking...</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input - Sticky at bottom */}
              <div className="border-t border-gray-100 p-4 bg-white mt-auto">
                {/* Selected Documents Indicator */}
                {selectedDocuments.size > 0 && (
                  <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center space-x-2 text-sm">
                      <div className="flex items-center justify-center w-4 h-4 bg-blue-600 rounded">
                        <span className="text-white font-bold text-xs">{selectedDocuments.size}</span>
                      </div>
                      <span className="text-blue-700 font-medium">
                        {selectedDocuments.size} source{selectedDocuments.size !== 1 ? 's' : ''} selected for this query
                      </span>
                    </div>
                  </div>
                )}
                
                <form onSubmit={sendMessage} className="flex items-end space-x-3">
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
                      placeholder={selectedDocuments.size > 0 
                        ? `Ask about your ${selectedDocuments.size} selected source${selectedDocuments.size !== 1 ? 's' : ''}...`
                        : "Ask about your documents..."
                      }
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl resize-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all duration-200 text-sm shadow-sm"
                      rows={1}
                      style={{ minHeight: '40px', maxHeight: '120px' }}
                      disabled={sendingMessage}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!message.trim() || sendingMessage}
                    className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sendingMessage ? (
                      <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </form>
                <p className="text-xs text-gray-500 mt-1.5">
                  Press Enter to send • Shift + Enter for new line
                  {selectedDocuments.size === 0 && documents.length > 0 && (
                    <span className="text-amber-600 ml-2">• Select sources in the left panel to focus your query</span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Right Pane - Notes */}
          <div className="lg:col-span-3">
            <div className="card-modern h-full flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl">
                    <StickyNote className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-xs">Notes</h3>
                    <p className="text-xs text-gray-500">Capture your insights</p>
                  </div>
                </div>
                <span className="text-xs font-medium text-yellow-600 bg-yellow-50 px-1.5 py-0.5 rounded">
                  {notes.length}
                </span>
              </div>
              
              {/* Action Buttons */}
              <div className="p-4 border-b border-gray-100">
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <button
                    onClick={generateStudyGuide}
                    disabled={generatingNote !== null}
                    className="flex items-center justify-center px-2 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed min-w-0"
                  >
                    {generatingNote === 'Study Guide' ? (
                      <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2"></div>
                    ) : (
                      <BookOpenCheck className="w-4 h-4 mr-2 text-gray-600" />
                    )}
                    <span className="text-gray-700 font-bold whitespace-nowrap" style={{ fontSize: '10px' }}>Study guide</span>
                  </button>
                  
                  <button
                    onClick={generateBriefingDoc}
                    disabled={generatingNote !== null}
                    className="flex items-center justify-center px-2 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed min-w-0"
                  >
                    {generatingNote === 'Briefing Doc' ? (
                      <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2"></div>
                    ) : (
                      <FileBarChart className="w-4 h-4 mr-2 text-gray-600" />
                    )}
                    <span className="text-gray-700 font-bold whitespace-nowrap" style={{ fontSize: '10px' }}>Briefing doc</span>
                  </button>
                  
                  <button
                    onClick={generateFAQ}
                    disabled={generatingNote !== null}
                    className="flex items-center justify-center px-2 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed min-w-0"
                  >
                    {generatingNote === 'FAQ' ? (
                      <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2"></div>
                    ) : (
                      <HelpCircle className="w-4 h-4 mr-2 text-gray-600" />
                    )}
                    <span className="text-gray-700 font-bold whitespace-nowrap" style={{ fontSize: '10px' }}>FAQ</span>
                  </button>
                  
                  <button
                    onClick={generateTimeline}
                    disabled={generatingNote !== null}
                    className="flex items-center justify-center px-2 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed min-w-0"
                  >
                    {generatingNote === 'Timeline' ? (
                      <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2"></div>
                    ) : (
                      <Calendar className="w-4 h-4 mr-2 text-gray-600" />
                    )}
                    <span className="text-gray-700 font-bold whitespace-nowrap" style={{ fontSize: '10px' }}>Timeline</span>
                  </button>
                </div>
              </div>

              {/* Create Note Form */}
              <div className="p-4 border-b border-gray-100">
                <form onSubmit={createNote} className="space-y-3">
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Write your note here..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl resize-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500/20 focus:outline-none transition-all duration-200 text-sm"
                    rows={3}
                  />
                  <button
                    type="submit"
                    disabled={!newNote.trim() || creatingNote}
                    className="w-full flex items-center justify-center px-3 py-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-medium rounded-xl hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creatingNote ? (
                      <div className="flex items-center">
                        <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        <span className="text-xs">Creating...</span>
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <Plus className="w-3 h-3 mr-1.5" />
                        <span className="text-xs">Create Note</span>
                      </div>
                    )}
                  </button>
                </form>
              </div>

              {/* Notes List */}
              <div className="overflow-y-scroll p-3 scrollbar-notes" style={{ height: '400px', minHeight: '400px', paddingBottom: '100px' }}>
                {notes.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4 opacity-20">
                      <StickyNote className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-sm font-bold text-gray-900 mb-2">No notes yet</h3>
                    <p className="text-gray-600 text-xs">
                      Create your first note or save AI responses as notes.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {notes.map((note) => (
                      <div
                        key={note.id}
                        className="bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-3 group hover:shadow-md transition-all duration-200 relative"
                      >
                        <div className="mb-3">
                          <p className="text-gray-900 text-xs leading-relaxed">
                            {(() => {
                              const stripped = stripMarkdown(note.content);
                              return stripped.length > 140 ? `${stripped.substring(0, 140)}...` : stripped;
                            })()}
                          </p>
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                            <button 
                              onClick={() => viewNote(note)}
                              className="p-1 hover:bg-yellow-100 rounded-lg transition-colors"
                              title="View full note"
                            >
                              <Eye className="w-3 h-3 text-gray-500" />
                            </button>
                            <button 
                              onClick={() => deleteNote(note.id)}
                              className="p-1 hover:bg-red-100 hover:text-red-600 rounded-lg transition-colors"
                              title="Delete note"
                            >
                              <Trash2 className="w-3 h-3 text-gray-500" />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2 text-xs text-gray-500">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-lg font-medium ${
                              note.source_type === 'ai_generated' 
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-green-100 text-green-700'
                            }`}>
                              {note.source_type === 'ai_generated' ? (
                                <>
                                  <Brain className="w-2.5 h-2.5 mr-1" />
                                  AI
                                </>
                              ) : (
                                <>
                                  <Users className="w-2.5 h-2.5 mr-1" />
                                  Manual
                                </>
                              )}
                            </span>
                            <div className="flex items-center space-x-1">
                              <Clock className="w-2.5 h-2.5" />
                              <span>
                                {new Date(note.created_at).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </span>
                            </div>
                          </div>
                          {note.content.length > 140 && (
                            <button 
                              onClick={() => viewNote(note)}
                              className="text-xs text-yellow-700 hover:text-yellow-800 font-medium"
                            >
                              Read more
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
                        <div className="text-gray-900 leading-relaxed whitespace-pre-wrap text-sm">
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
                    <div className="text-gray-900 leading-relaxed text-sm">
                      <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-headings:font-bold prose-p:text-gray-800 prose-p:leading-relaxed prose-strong:text-gray-900 prose-strong:font-bold prose-ul:list-disc prose-ol:list-decimal prose-li:text-gray-800 prose-blockquote:border-l-yellow-500 prose-blockquote:bg-yellow-50 prose-blockquote:pl-4 prose-code:bg-yellow-100 prose-code:px-1 prose-code:rounded">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {selectedNote.content}
                        </ReactMarkdown>
                      </div>
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
