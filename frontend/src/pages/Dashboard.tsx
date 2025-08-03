import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { apiService } from '../services/api';
import type { Notebook } from '../types';
import { 
  Plus, 
  BookOpen, 
  Trash2, 
  Edit2, 
  LogOut, 
  Sparkles, 
  Brain,
  Calendar,
  Search,
  Grid3X3,
  List
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newNotebookTitle, setNewNotebookTitle] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  
  const { user, logout, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && user) {
      loadNotebooks();
    }
  }, [authLoading, user]);

  const loadNotebooks = async () => {
    try {
      const data = await apiService.getNotebooks();
      setNotebooks(data);
    } catch (error) {
      console.error('Failed to load notebooks:', error);
    } finally {
      setLoading(false);
    }
  };

  const createNotebook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNotebookTitle.trim()) return;

    setCreating(true);
    try {
      const notebook = await apiService.createNotebook(newNotebookTitle);
      setNotebooks([notebook, ...notebooks]);
      setNewNotebookTitle('');
    } catch (error) {
      console.error('Failed to create notebook:', error);
    } finally {
      setCreating(false);
    }
  };

  const updateNotebook = async (id: string, title: string) => {
    try {
      await apiService.updateNotebook(id, title);
      setNotebooks(notebooks.map(nb => 
        nb.id === id ? { ...nb, title } : nb
      ));
      setEditingId(null);
      setEditTitle('');
    } catch (error) {
      console.error('Failed to update notebook:', error);
    }
  };

  const deleteNotebook = async (id: string) => {
    if (!confirm('Are you sure you want to delete this notebook? This action cannot be undone.')) {
      return;
    }

    try {
      await apiService.deleteNotebook(id);
      setNotebooks(notebooks.filter(nb => nb.id !== id));
    } catch (error) {
      console.error('Failed to delete notebook:', error);
    }
  };

  const startEditing = (notebook: Notebook) => {
    setEditingId(notebook.id);
    setEditTitle(notebook.title);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditTitle('');
  };

  const filteredNotebooks = notebooks.filter(notebook =>
    notebook.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center animate-slide-up">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl mb-4 shadow-lg animate-pulse">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Loading your workspace</h2>
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
            {/* Logo and Welcome */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gradient">NotebookAI</h1>
                <p className="text-gray-600 font-medium">Welcome back, {user?.name}</p>
              </div>
            </div>

            {/* User Actions */}
            <div className="flex items-center space-x-4">
              <button className="btn-ghost">
                <Search className="w-4 h-4 mr-2" />
                Search
              </button>
              <button
                onClick={logout}
                className="btn-secondary"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-12">
        {/* Create New Notebook Section */}
        <div className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Your AI-Powered Workspace
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Create, organize, and interact with your documents using the power of artificial intelligence.
            </p>
          </div>

          <div className="max-w-2xl mx-auto">
            <div className="glass-card">
              <div className="flex items-center mb-6">
                <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl mr-4">
                  <Plus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Create New Notebook</h3>
                  <p className="text-gray-600">Start organizing your thoughts and documents</p>
                </div>
              </div>

              <form onSubmit={createNotebook} className="space-y-4">
                <input
                  type="text"
                  placeholder="Enter notebook title..."
                  value={newNotebookTitle}
                  onChange={(e) => setNewNotebookTitle(e.target.value)}
                  className="input-modern"
                  required
                />
                <button
                  type="submit"
                  disabled={creating}
                  className="btn-primary w-full group"
                >
                  {creating ? (
                    <div className="flex items-center">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Creating...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <Sparkles className="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform" />
                      Create Notebook
                    </div>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Notebooks Section */}
        <div>
          {/* Section Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Your Notebooks</h3>
              <p className="text-gray-600">
                {filteredNotebooks.length} {filteredNotebooks.length === 1 ? 'notebook' : 'notebooks'}
              </p>
            </div>
            
            {notebooks.length > 0 && (
              <div className="flex items-center space-x-4">
                {/* Search */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search notebooks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input-modern w-64 pl-10"
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>

                {/* View Toggle */}
                <div className="flex bg-gray-100 rounded-xl p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-lg transition-all ${
                      viewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
                    }`}
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-lg transition-all ${
                      viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
                    }`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Notebooks Grid/List */}
          {filteredNotebooks.length === 0 ? (
            <div className="text-center py-20">
              <div className="glass-card max-w-md mx-auto">
                <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl mx-auto mb-6 opacity-50">
                  <BookOpen className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {searchQuery ? 'No notebooks found' : 'No notebooks yet'}
                </h3>
                <p className="text-gray-600 mb-6">
                  {searchQuery 
                    ? `No notebooks match "${searchQuery}". Try a different search term.`
                    : 'Create your first notebook to start organizing your AI-powered workspace.'
                  }
                </p>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="btn-secondary"
                  >
                    Clear search
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className={`grid gap-6 ${
              viewMode === 'grid' 
                ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
                : 'grid-cols-1 max-w-4xl mx-auto'
            }`}>
              {filteredNotebooks.map((notebook, index) => (
                <div
                  key={notebook.id}
                  className="card-modern group cursor-pointer animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                  onClick={() => !editingId && navigate(`/notebook/${notebook.id}`)}
                >
                  {editingId === notebook.id ? (
                    <div className="space-y-4">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            updateNotebook(notebook.id, editTitle);
                          } else if (e.key === 'Escape') {
                            cancelEditing();
                          }
                        }}
                        className="input-modern"
                        autoFocus
                      />
                      <div className="flex space-x-3">
                        <button
                          onClick={() => updateNotebook(notebook.id, editTitle)}
                          className="btn-primary flex-1"
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="btn-secondary flex-1"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl">
                            <BookOpen className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                              {notebook.title}
                            </h4>
                          </div>
                        </div>
                        
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditing(notebook);
                            }}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4 text-gray-500" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotebook(notebook.id);
                            }}
                            className="p-2 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {new Date(notebook.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1 text-blue-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                          <span>Open notebook</span>
                          <BookOpen className="w-4 h-4" />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};