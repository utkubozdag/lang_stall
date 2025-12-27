import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Vocabulary as VocabType } from '../types';

export default function Vocabulary() {
  const navigate = useNavigate();
  const [vocabulary, setVocabulary] = useState<VocabType[]>([]);
  const [loading, setLoading] = useState(true);

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

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this word?')) return;

    try {
      await api.delete(`/vocabulary/${id}`);
      setVocabulary(vocabulary.filter((v) => v.id !== id));
    } catch (error) {
      console.error('Error deleting vocabulary:', error);
      alert('Failed to delete word');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center text-gray-600 hover:text-gray-900 transition"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <button
            onClick={() => navigate('/flashcards')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm"
          >
            Practice
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Vocabulary</h1>
          <p className="text-gray-600">{vocabulary.length} words saved</p>
        </div>

        {vocabulary.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No vocabulary yet</h3>
            <p className="text-gray-500">Start reading and save words to build your vocabulary!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {vocabulary.map((word) => (
              <div key={word.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-gray-900">{word.word}</h3>
                      <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-md font-medium">
                        {word.language}
                      </span>
                    </div>
                    <p className="text-gray-700 mb-3 whitespace-pre-wrap leading-relaxed">{word.translation}</p>
                    {word.context && (
                      <p className="text-sm text-gray-500 italic mb-3 p-3 bg-gray-50 rounded-md">
                        "{word.context.substring(0, 120)}..."
                      </p>
                    )}
                    <div className="flex gap-4 text-xs text-gray-500">
                      <span>Reviews: {word.review_count}</span>
                      <span>•</span>
                      <span>Next: {new Date(word.next_review).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(word.id)}
                    className="text-gray-400 hover:text-red-500 transition ml-4 p-1"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
