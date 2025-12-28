import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { Text } from '../types';
import Logo from '../components/Logo';

interface SustainabilityStats {
  month: string;
  costs: number;
  requestCount: number;
  donations: number;
  kofiUrl: string | null;
}

export default function Home() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [texts, setTexts] = useState<Text[]>([]);
  const [showNewText, setShowNewText] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [language, setLanguage] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadMode, setUploadMode] = useState<'paste' | 'file' | 'url'>('paste');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [editingText, setEditingText] = useState<Text | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editLanguage, setEditLanguage] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [stats, setStats] = useState<SustainabilityStats | null>(null);

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

  const handleCreateText = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let response;

      if (uploadMode === 'file' && selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('title', title);
        formData.append('language', language);

        response = await api.post('/texts/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
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
      setTitle('');
      setContent('');
      setLanguage('');
      setSelectedFile(null);
      setUrlInput('');
      setUploadMode('paste');
      setShowNewText(false);
    } catch (error: any) {
      console.error('Error creating text:', error);
      alert(error.response?.data?.error || 'Failed to create text');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const ext = file.name.toLowerCase();
      if (!ext.endsWith('.txt') && !ext.endsWith('.epub')) {
        alert('Only .txt and .epub files are allowed');
        return;
      }
      setSelectedFile(file);
      // Auto-fill title from filename if empty
      if (!title) {
        setTitle(file.name.replace(/\.(txt|epub)$/i, ''));
      }
    }
  };

  const handleDeleteText = async (id: number) => {
    if (!confirm('Delete this text?')) return;

    try {
      await api.delete(`/texts/${id}`);
      setTexts(texts.filter((t) => t.id !== id));
    } catch (error) {
      console.error('Error deleting text:', error);
      alert('Failed to delete text');
    }
  };

  const handleEditClick = (text: Text) => {
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
    } catch (error: any) {
      console.error('Error updating text:', error);
      alert(error.response?.data?.error || 'Failed to update text');
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
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Logo size="sm" />
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/guide')}
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 font-medium transition"
              >
                Guide
              </button>
              <button
                onClick={() => navigate('/vocabulary')}
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 font-medium transition"
              >
                Vocabulary
              </button>
              <button
                onClick={() => navigate('/flashcards')}
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 font-medium transition"
              >
                Practice
              </button>
              <button
                onClick={() => navigate('/about')}
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 font-medium transition"
              >
                About
              </button>
              <button
                onClick={logout}
                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.name || 'Reader'}
          </h2>
          <p className="text-gray-600">Continue your language learning journey</p>
        </div>

        {/* Support Banner - only show if Ko-fi URL is configured */}
        {stats && stats.kofiUrl && (
          <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-4">
            <div className="flex items-center justify-between">
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
                className="flex items-center gap-2 px-4 py-2 bg-[#FF5E5B] text-white text-sm rounded-lg hover:bg-[#e54e4b] transition font-medium shadow-sm"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.881 8.948c-.773-4.085-4.859-4.593-4.859-4.593H.723c-.604 0-.679.798-.679.798s-.082 7.324-.022 11.822c.164 2.424 2.586 2.672 2.586 2.672s8.267-.023 11.966-.049c2.438-.426 2.683-2.566 2.658-3.734 4.352.24 7.422-2.831 6.649-6.916zm-11.062 3.511c-1.246 1.453-4.011 3.976-4.011 3.976s-.121.119-.31.023c-.076-.057-.108-.09-.108-.09-.443-.441-3.368-3.049-4.034-3.954-.709-.965-1.041-2.7-.091-3.71.951-1.01 3.005-1.086 4.363.407 0 0 1.565-1.782 3.468-.963 1.904.82 1.832 3.011.723 4.311zm6.173.478c-.928.116-1.682.028-1.682.028V7.284h1.77s1.971.551 1.971 2.638c0 1.913-.985 2.667-2.059 3.015z"/>
                </svg>
                Support on Ko-fi
              </a>
            </div>
          </div>
        )}

        {/* New Text Button */}
        <div className="mb-6">
          <button
            onClick={() => setShowNewText(!showNewText)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium shadow-sm"
          >
            {showNewText ? 'Cancel' : '+ Add Text'}
          </button>
        </div>

        {/* New Text Form */}
        {showNewText && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Text</h3>

            {/* Mode Toggle */}
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setUploadMode('paste')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  uploadMode === 'paste'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Paste Text
              </button>
              <button
                type="button"
                onClick={() => setUploadMode('file')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  uploadMode === 'file'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Upload File
              </button>
              <button
                type="button"
                onClick={() => setUploadMode('url')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  uploadMode === 'url'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                From URL
              </button>
            </div>

            <form onSubmit={handleCreateText} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                    Title {uploadMode === 'url' && <span className="text-gray-400 font-normal">(optional)</span>}
                  </label>
                  <input
                    id="title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required={uploadMode !== 'url'}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={uploadMode === 'url' ? 'Auto-detected from page' : 'My Hungarian Article'}
                  />
                </div>

                <div>
                  <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-2">
                    Language
                  </label>
                  <input
                    id="language"
                    type="text"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    required
                    placeholder="e.g., Hungarian"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {uploadMode === 'paste' && (
                <div>
                  <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
                    Text Content
                  </label>
                  <textarea
                    id="content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    required
                    rows={8}
                    placeholder="Paste your text here..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>
              )}

              {uploadMode === 'file' && (
                <div>
                  <label htmlFor="file" className="block text-sm font-medium text-gray-700 mb-2">
                    Upload File (.txt or .epub)
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition">
                    <input
                      id="file"
                      type="file"
                      accept=".txt,.epub"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <label htmlFor="file" className="cursor-pointer">
                      {selectedFile ? (
                        <div className="text-gray-700">
                          <svg className="w-8 h-8 mx-auto mb-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="font-medium">{selectedFile.name}</span>
                          <p className="text-sm text-gray-500 mt-1">
                            {(selectedFile.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      ) : (
                        <div className="text-gray-500">
                          <svg className="w-10 h-10 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <span className="font-medium text-blue-600">Click to upload</span>
                          <p className="text-sm mt-1">TXT or EPUB (max 5MB)</p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>
              )}

              {uploadMode === 'url' && (
                <div>
                  <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
                    Page URL
                  </label>
                  <input
                    id="url"
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    required
                    placeholder="https://example.com/article"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    We'll extract the article content from the page
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || (uploadMode === 'file' && !selectedFile) || (uploadMode === 'url' && !urlInput)}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition font-medium"
              >
                {loading ? 'Creating...' : 'Create Text'}
              </button>
            </form>
          </div>
        )}

        {/* Texts Grid */}
        {texts.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No texts yet</h3>
            <p className="text-gray-500">Add your first text to start learning!</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {texts.map((text) => (
              <div key={text.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition group">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition">
                    {text.title}
                  </h3>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEditClick(text)}
                      className="text-gray-400 hover:text-blue-500 transition p-1"
                      title="Edit"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteText(text.id)}
                      className="text-gray-400 hover:text-red-500 transition p-1"
                      title="Delete"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                  <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-medium">
                    {text.language}
                  </span>
                  <span>•</span>
                  <span>{new Date(text.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-gray-600 text-sm line-clamp-3 mb-4">{text.content}</p>
                <button
                  onClick={() => navigate(`/read/${text.id}`)}
                  className="w-full bg-blue-50 text-blue-600 py-2 px-4 rounded-lg hover:bg-blue-100 transition font-medium"
                >
                  Read
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingText && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Edit Text</h3>
                <button
                  onClick={closeEditModal}
                  className="text-gray-400 hover:text-gray-600 transition"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="editTitle" className="block text-sm font-medium text-gray-700 mb-2">
                      Title
                    </label>
                    <input
                      id="editTitle"
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label htmlFor="editLanguage" className="block text-sm font-medium text-gray-700 mb-2">
                      Language
                    </label>
                    <input
                      id="editLanguage"
                      type="text"
                      value={editLanguage}
                      onChange={(e) => setEditLanguage(e.target.value)}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="editContent" className="block text-sm font-medium text-gray-700 mb-2">
                    Content
                  </label>
                  <textarea
                    id="editContent"
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    required
                    rows={12}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={editLoading}
                    className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition font-medium"
                  >
                    {editLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={closeEditModal}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
