import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { Text } from '../types';
import Logo from '../components/Logo';
import ConfirmDialog from '../components/ConfirmDialog';
import Toast from '../components/Toast';
import { LANGUAGES } from '../constants/languages';

interface SustainabilityStats {
  month: string;
  costs: number;
  requestCount: number;
  donations: number;
  kofiUrl: string | null;
}

export default function Home() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();

  // Data state
  const [texts, setTexts] = useState<Text[]>([]);
  const [stats, setStats] = useState<SustainabilityStats | null>(null);

  // New text form state
  const [showNewText, setShowNewText] = useState(false);
  const [uploadMode, setUploadMode] = useState<'paste' | 'file' | 'url'>('paste');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [language, setLanguage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [creating, setCreating] = useState(false);

  // Edit modal state
  const [editingText, setEditingText] = useState<Text | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editLanguage, setEditLanguage] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // UI feedback state
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    loadTexts();
    loadStats();
  }, []);

  const loadTexts = async () => {
    try {
      const response = await api.get('/texts');
      setTexts(response.data);
    } catch (error) {
      console.error('Error loading texts:', error);
    }
  };

  const loadStats = async () => {
    try {
      const response = await api.get('/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const resetForm = () => {
    setTitle('');
    setContent('');
    setLanguage('');
    setSelectedFile(null);
    setUrlInput('');
    setUploadMode('paste');
    setShowNewText(false);
  };

  const handleCreateText = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      let response;

      if (uploadMode === 'file' && selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('title', title);
        formData.append('language', language);

        response = await api.post('/texts/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else if (uploadMode === 'url') {
        response = await api.post('/texts/from-url', {
          url: urlInput,
          title: title || undefined,
          language,
        });
      } else {
        response = await api.post('/texts', { title, content, language });
      }

      setTexts([response.data, ...texts]);
      resetForm();
      setToast({ message: 'Text created successfully', type: 'success' });
    } catch (error: any) {
      console.error('Error creating text:', error);
      setToast({ message: error.response?.data?.error || 'Failed to create text', type: 'error' });
    } finally {
      setCreating(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const ext = file.name.toLowerCase();
      if (!ext.endsWith('.txt') && !ext.endsWith('.epub')) {
        setToast({ message: 'Only .txt and .epub files are allowed', type: 'error' });
        return;
      }
      setSelectedFile(file);
      if (!title) {
        setTitle(file.name.replace(/\.(txt|epub)$/i, ''));
      }
    }
  };

  const handleDeleteText = async () => {
    if (!deleteConfirm) return;

    try {
      await api.delete(`/texts/${deleteConfirm}`);
      setTexts(texts.filter((t) => t.id !== deleteConfirm));
      setToast({ message: 'Text deleted', type: 'success' });
    } catch (error) {
      console.error('Error deleting text:', error);
      setToast({ message: 'Failed to delete text', type: 'error' });
    } finally {
      setDeleteConfirm(null);
    }
  };

  const handleEditClick = (text: Text, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingText(text);
    setEditTitle(text.title);
    setEditContent(text.content);
    setEditLanguage(text.language);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingText) return;

    setEditLoading(true);
    try {
      const response = await api.patch(`/texts/${editingText.id}`, {
        title: editTitle,
        content: editContent,
        language: editLanguage,
      });
      setTexts(texts.map((t) => (t.id === editingText.id ? response.data : t)));
      setEditingText(null);
      setToast({ message: 'Text updated', type: 'success' });
    } catch (error: any) {
      console.error('Error updating text:', error);
      setToast({ message: error.response?.data?.error || 'Failed to update text', type: 'error' });
    } finally {
      setEditLoading(false);
    }
  };

  const closeEditModal = () => {
    setEditingText(null);
    setEditTitle('');
    setEditContent('');
    setEditLanguage('');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex justify-between items-center h-14">
            <Logo size="sm" />

            {/* Desktop navigation */}
            <nav className="hidden md:flex items-center gap-1">
              <button
                onClick={() => navigate('/guide')}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded font-medium transition"
              >
                Guide
              </button>
              <button
                onClick={() => navigate('/vocabulary')}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded font-medium transition"
              >
                Vocabulary
              </button>
              <button
                onClick={() => navigate('/flashcards')}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded font-medium transition"
              >
                Practice
              </button>
              <button
                onClick={() => navigate('/about')}
                className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded transition"
              >
                About
              </button>
              {token ? (
                <button
                  onClick={logout}
                  className="px-3 py-2 text-sm text-gray-400 hover:text-gray-600 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded transition"
                >
                  Logout
                </button>
              ) : (
                <button
                  onClick={() => navigate('/login')}
                  className="px-3 py-2 text-sm text-blue-600 hover:text-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded font-medium transition"
                >
                  Login
                </button>
              )}
            </nav>

            {/* Mobile navigation */}
            <nav className="md:hidden flex items-center gap-1">
              <button
                onClick={() => navigate('/vocabulary')}
                className="p-2 text-gray-600 hover:text-gray-900 focus-visible:ring-2 focus-visible:ring-blue-500 rounded transition"
                aria-label="Vocabulary"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </button>
              <button
                onClick={() => navigate('/flashcards')}
                className="p-2 text-gray-600 hover:text-gray-900 focus-visible:ring-2 focus-visible:ring-blue-500 rounded transition"
                aria-label="Practice flashcards"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </button>
              {token ? (
                <button
                  onClick={logout}
                  className="p-2 text-gray-400 hover:text-gray-600 focus-visible:ring-2 focus-visible:ring-blue-500 rounded transition"
                  aria-label="Logout"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              ) : (
                <button
                  onClick={() => navigate('/login')}
                  className="p-2 text-blue-600 hover:text-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 rounded transition"
                  aria-label="Login"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                </button>
              )}
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Welcome Section */}
        <div className="mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
            {token ? `Welcome back, ${user?.name}` : 'Welcome'}
          </h2>
          <p className="text-gray-600">Continue your language learning journey</p>
        </div>

        {/* Public space notice for anonymous users */}
        {!token && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            <p className="text-sm text-amber-800">
              This is a shared public space. Anyone can view, edit, or remove texts.{' '}
              <button
                onClick={() => navigate('/register')}
                className="font-medium text-amber-900 underline hover:text-amber-700"
              >
                Sign up for free
              </button>
              {' '}to get your own private library.
            </p>
          </div>
        )}

        {/* Support Banner - only show if Ko-fi URL is configured */}
        {stats && stats.kofiUrl && (
          <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-800">Support Lang Stall</h3>
                <p className="text-xs text-gray-600 mt-0.5">
                  {stats.requestCount.toLocaleString()} translations this month
                  {stats.costs > 0 && ` • $${stats.costs.toFixed(2)} in costs`}
                  {stats.donations > 0 && ` • $${stats.donations.toFixed(2)} donated`}
                </p>
              </div>
              <a
                href={stats.kofiUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-4 py-2 bg-[#FF5E5B] text-white text-sm rounded-lg hover:bg-[#e54e4b] focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 transition font-medium shadow-sm"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.881 8.948c-.773-4.085-4.859-4.593-4.859-4.593H.723c-.604 0-.679.798-.679.798s-.082 7.324-.022 11.822c.164 2.424 2.586 2.672 2.586 2.672s8.267-.023 11.966-.049c2.438-.426 2.683-2.566 2.658-3.734 4.352.24 7.422-2.831 6.649-6.916zm-11.062 3.511c-1.246 1.453-4.011 3.976-4.011 3.976s-.121.119-.31.023c-.076-.057-.108-.09-.108-.09-.443-.441-3.368-3.049-4.034-3.954-.709-.965-1.041-2.7-.091-3.71.951-1.01 3.005-1.086 4.363.407 0 0 1.565-1.782 3.468-.963 1.904.82 1.832 3.011.723 4.311zm6.173.478c-.928.116-1.682.028-1.682.028V7.284h1.77s1.971.551 1.971 2.638c0 1.913-.985 2.667-2.059 3.015z"/>
                </svg>
                Support on Ko-fi
              </a>
            </div>
          </div>
        )}

        {/* New Text Button / Form */}
        {!showNewText ? (
          <div className="mb-6">
            <button
              onClick={() => setShowNewText(true)}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition font-medium flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Text
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sm:p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Add New Text</h3>
              <button
                onClick={resetForm}
                className="text-gray-400 hover:text-gray-600 focus-visible:ring-2 focus-visible:ring-gray-500 rounded p-1 transition"
                aria-label="Close form"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Mode Toggle */}
            <div className="flex gap-2 mb-4 flex-wrap">
              {(['paste', 'file', 'url'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setUploadMode(mode)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    uploadMode === mode
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {mode === 'paste' ? 'Paste Text' : mode === 'file' ? 'Upload File' : 'From URL'}
                </button>
              ))}
            </div>

            <form onSubmit={handleCreateText} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Title {uploadMode === 'url' && <span className="text-gray-400 font-normal">(optional)</span>}
                  </label>
                  <input
                    id="title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required={uploadMode !== 'url'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder={uploadMode === 'url' ? 'Auto-detected from page' : 'My Hungarian Article'}
                  />
                </div>

                <div>
                  <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Language
                  </label>
                  <select
                    id="language"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm"
                  >
                    <option value="">Select language...</option>
                    {LANGUAGES.map((lang) => (
                      <option key={lang} value={lang}>{lang}</option>
                    ))}
                  </select>
                </div>
              </div>

              {uploadMode === 'paste' && (
                <div>
                  <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Text Content
                  </label>
                  <textarea
                    id="content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    required
                    rows={6}
                    placeholder="Paste your text here..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                  />
                </div>
              )}

              {uploadMode === 'file' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Upload File (.txt or .epub)
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 transition cursor-pointer">
                    <input
                      id="file"
                      type="file"
                      accept=".txt,.epub"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <label htmlFor="file" className="cursor-pointer block">
                      {selectedFile ? (
                        <div className="text-gray-700">
                          <svg className="w-6 h-6 mx-auto mb-1 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="font-medium text-sm">{selectedFile.name}</span>
                          <p className="text-xs text-gray-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                        </div>
                      ) : (
                        <div className="text-gray-500">
                          <svg className="w-8 h-8 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <span className="font-medium text-blue-600 text-sm">Click to upload</span>
                          <p className="text-xs mt-0.5">TXT or EPUB (max 5MB)</p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>
              )}

              {uploadMode === 'url' && (
                <div>
                  <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Page URL
                  </label>
                  <input
                    id="url"
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    required
                    placeholder="https://example.com/article"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">We'll extract the article content from the page</p>
                </div>
              )}

              <button
                type="submit"
                disabled={creating || (uploadMode === 'file' && !selectedFile) || (uploadMode === 'url' && !urlInput)}
                className="w-full bg-blue-600 text-white py-2.5 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium flex items-center justify-center gap-2"
              >
                {creating && (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                {creating ? 'Creating...' : 'Create Text'}
              </button>
            </form>
          </div>
        )}

        {/* Texts Grid */}
        {texts.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 sm:p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 text-blue-400 mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No texts yet</h3>
            <p className="text-gray-500 mb-4">Add your first text to start learning!</p>
            {!showNewText && (
              <button
                onClick={() => setShowNewText(true)}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 rounded transition"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add your first text
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {texts.map((text) => (
              <div
                key={text.id}
                onClick={() => navigate(`/read/${text.id}`)}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 hover:shadow-md hover:border-blue-200 transition cursor-pointer group"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition line-clamp-1 pr-2">
                    {text.title}
                  </h3>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button
                      onClick={(e) => handleEditClick(text, e)}
                      className="text-gray-400 hover:text-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500 rounded p-1 transition"
                      aria-label="Edit text"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirm(text.id); }}
                      className="text-gray-400 hover:text-red-500 focus-visible:ring-2 focus-visible:ring-red-500 rounded p-1 transition"
                      aria-label="Delete text"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                    {text.language}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(text.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-gray-500 text-sm line-clamp-2">{text.content}</p>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Edit Modal */}
      {editingText && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={closeEditModal}>
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 sm:p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Edit Text</h3>
                <button
                  onClick={closeEditModal}
                  className="text-gray-400 hover:text-gray-600 focus-visible:ring-2 focus-visible:ring-gray-500 rounded p-1 transition"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="editTitle" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Title
                    </label>
                    <input
                      id="editTitle"
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="editLanguage" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Language
                    </label>
                    <select
                      id="editLanguage"
                      value={editLanguage}
                      onChange={(e) => setEditLanguage(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm"
                    >
                      <option value="">Select language...</option>
                      {LANGUAGES.map((lang) => (
                        <option key={lang} value={lang}>{lang}</option>
                      ))}
                      {/* Keep current language if not in list */}
                      {editLanguage && !LANGUAGES.includes(editLanguage as any) && (
                        <option value={editLanguage}>{editLanguage}</option>
                      )}
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="editContent" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Content
                  </label>
                  <textarea
                    id="editContent"
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    required
                    rows={10}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={editLoading}
                    className="flex-1 bg-blue-600 text-white py-2.5 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition font-medium flex items-center justify-center gap-2"
                  >
                    {editLoading && (
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    )}
                    {editLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={closeEditModal}
                    className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 transition font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirm !== null}
        onConfirm={handleDeleteText}
        onCancel={() => setDeleteConfirm(null)}
        title="Delete Text"
        message="Are you sure you want to delete this text? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />

      {/* Toast notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          isVisible={!!toast}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
