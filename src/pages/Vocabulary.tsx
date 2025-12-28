import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Vocabulary as VocabType } from '../types';
import Header from '../components/Header';
import Toast from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';

export default function Vocabulary() {
  const navigate = useNavigate();
  const [vocabulary, setVocabulary] = useState<VocabType[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [languageFilter, setLanguageFilter] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; wordId: number | null; wordText: string }>({
    isOpen: false,
    wordId: null,
    wordText: '',
  });

  useEffect(() => {
    loadVocabulary();
  }, []);

  const loadVocabulary = async () => {
    try {
      const response = await api.get('/vocabulary');
      setVocabulary(response.data);
    } catch (error) {
      console.error('Error loading vocabulary:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get unique languages from vocabulary
  const languages = useMemo(() => {
    const langs = new Set(vocabulary.map((v) => v.language));
    return Array.from(langs).sort();
  }, [vocabulary]);

  // Filter vocabulary based on search and language
  const filteredVocabulary = useMemo(() => {
    return vocabulary.filter((word) => {
      const matchesSearch =
        !searchQuery ||
        word.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
        word.translation.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesLanguage = !languageFilter || word.language === languageFilter;
      return matchesSearch && matchesLanguage;
    });
  }, [vocabulary, searchQuery, languageFilter]);

  const handleDeleteClick = (id: number, wordText: string) => {
    setDeleteConfirm({ isOpen: true, wordId: id, wordText });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.wordId) return;

    try {
      await api.delete(`/vocabulary/${deleteConfirm.wordId}`);
      setVocabulary(vocabulary.filter((v) => v.id !== deleteConfirm.wordId));
      setToast({ message: `"${deleteConfirm.wordText}" deleted`, type: 'success' });
    } catch (error) {
      console.error('Error deleting vocabulary:', error);
      setToast({ message: 'Failed to delete word', type: 'error' });
    } finally {
      setDeleteConfirm({ isOpen: false, wordId: null, wordText: '' });
    }
  };

  const handleExport = async () => {
    if (vocabulary.length === 0) {
      setToast({ message: 'No vocabulary to export', type: 'error' });
      return;
    }

    setExporting(true);
    try {
      const response = await api.get('/vocabulary/export', {
        responseType: 'blob',
      });

      // Create download link
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `vocabulary-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setToast({ message: `Exported ${vocabulary.length} words`, type: 'success' });
    } catch (error) {
      console.error('Error exporting vocabulary:', error);
      setToast({ message: 'Failed to export vocabulary', type: 'error' });
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-600">
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        showBackButton
        backTo="/"
        maxWidth="5xl"
        rightContent={
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              disabled={exporting || vocabulary.length === 0}
              className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium text-sm flex items-center gap-1.5"
              title="Export vocabulary as CSV"
            >
              {exporting ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              )}
              <span className="hidden sm:inline">Export</span>
            </button>
            <button
              onClick={() => navigate('/flashcards')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition font-medium text-sm"
            >
              Practice
            </button>
          </div>
        }
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">My Vocabulary</h1>
          <p className="text-gray-600">
            {filteredVocabulary.length === vocabulary.length
              ? `${vocabulary.length} words saved`
              : `${filteredVocabulary.length} of ${vocabulary.length} words`}
          </p>
        </div>

        {/* Search and Filter */}
        {vocabulary.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search words or translations..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              />
            </div>
            {languages.length > 1 && (
              <select
                value={languageFilter}
                onChange={(e) => setLanguageFilter(e.target.value)}
                className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition bg-white cursor-pointer"
              >
                <option value="">All Languages</option>
                {languages.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {vocabulary.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 sm:p-12 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No vocabulary yet</h3>
            <p className="text-gray-500 mb-6">Start reading and save words to build your vocabulary!</p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition font-medium"
            >
              Start Reading
            </button>
          </div>
        ) : filteredVocabulary.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <p className="text-gray-500">No words match your search</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setLanguageFilter('');
              }}
              className="mt-3 text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredVocabulary.map((word) => (
              <div
                key={word.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 hover:shadow-md transition group"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 sm:gap-3 mb-2 flex-wrap">
                      <h3 className="text-lg sm:text-xl font-semibold text-gray-900">{word.word}</h3>
                      <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-md font-medium">
                        {word.language}
                      </span>
                    </div>
                    <p className="text-gray-700 mb-3 whitespace-pre-wrap leading-relaxed text-sm sm:text-base">
                      {word.translation}
                    </p>
                    {word.context && (
                      <p className="text-sm text-gray-500 italic mb-3 p-3 bg-gray-50 rounded-md">
                        "{word.context.substring(0, 120)}..."
                      </p>
                    )}
                    {word.mnemonic && (
                      <div className="mb-3 p-3 bg-purple-50 rounded-md border border-purple-100">
                        <div className="flex items-start gap-2">
                          <svg className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                          <p className="text-purple-800 text-sm leading-relaxed">{word.mnemonic}</p>
                        </div>
                      </div>
                    )}
                    <div className="flex gap-3 sm:gap-4 text-xs text-gray-500">
                      <span>Reviews: {word.review_count}</span>
                      <span className="hidden sm:inline">•</span>
                      <span>Next: {new Date(word.next_review).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteClick(word.id, word.word)}
                    className="text-gray-400 hover:text-red-500 focus-visible:ring-2 focus-visible:ring-red-500 rounded transition ml-3 sm:ml-4 p-1 opacity-60 sm:opacity-0 sm:group-hover:opacity-100"
                    aria-label={`Delete ${word.word}`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteConfirm({ isOpen: false, wordId: null, wordText: '' })}
        title="Delete Word"
        message={`Are you sure you want to delete "${deleteConfirm.wordText}" from your vocabulary?`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />

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
