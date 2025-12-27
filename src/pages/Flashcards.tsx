import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Vocabulary } from '../types';

export default function Flashcards() {
  const navigate = useNavigate();
  const [dueCards, setDueCards] = useState<Vocabulary[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDueCards();
  }, []);

  const loadDueCards = async () => {
    try {
      const response = await api.get('/vocabulary/due');
      setDueCards(response.data);
    } catch (error) {
      console.error('Error loading due cards:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (quality: number) => {
    const card = dueCards[currentIndex];
    if (!card) return;

    try {
      await api.post(`/vocabulary/${card.id}/review`, { quality });

      if (currentIndex < dueCards.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setShowAnswer(false);
      } else {
        setDueCards([]);
        setCurrentIndex(0);
      }
    } catch (error) {
      console.error('Error reviewing card:', error);
      alert('Failed to save review');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  const currentCard = dueCards[currentIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center text-gray-600 hover:text-gray-900 transition"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          {dueCards.length > 0 && (
            <span className="text-sm text-gray-600 font-medium">
              {currentIndex + 1} / {dueCards.length}
            </span>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-12">
        {dueCards.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <div className="text-green-500 mb-6">
              <svg className="w-20 h-20 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">All done!</h2>
            <p className="text-gray-600 mb-8 text-lg">
              No cards due for review right now. Great work!
            </p>
            <button
              onClick={() => navigate('/vocabulary')}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium shadow-sm"
            >
              View Vocabulary
            </button>
          </div>
        ) : (
          <div>
            {/* Progress Bar */}
            <div className="mb-6">
              <div className="bg-white/50 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-2 transition-all duration-300"
                  style={{ width: `${((currentIndex + 1) / dueCards.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Flashcard */}
            <div className="bg-white rounded-2xl shadow-2xl p-12 min-h-[400px] flex flex-col justify-center items-center">
              {!showAnswer ? (
                <div className="text-center w-full">
                  <div className="mb-6">
                    <span className="text-xs px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full font-semibold">
                      {currentCard.language}
                    </span>
                  </div>
                  <h2 className="text-5xl font-bold text-gray-900 mb-10">{currentCard.word}</h2>
                  {currentCard.context && (
                    <p className="text-gray-500 italic mb-10 text-lg max-w-xl mx-auto">
                      "{currentCard.context.substring(0, 150)}..."
                    </p>
                  )}
                  <button
                    onClick={() => setShowAnswer(true)}
                    className="px-10 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition text-lg font-medium shadow-lg hover:shadow-xl"
                  >
                    Show Answer
                  </button>
                </div>
              ) : (
                <div className="text-center w-full">
                  <div className="mb-4">
                    <span className="text-xs px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full font-semibold">
                      {currentCard.language}
                    </span>
                  </div>
                  <h2 className="text-4xl font-bold text-gray-900 mb-6">{currentCard.word}</h2>
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-8 mb-10 max-w-2xl mx-auto">
                    <p className="text-xl text-gray-800 whitespace-pre-wrap leading-relaxed">
                      {currentCard.translation}
                    </p>
                  </div>

                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-5 font-medium">How well did you remember?</p>
                    <div className="flex gap-3 justify-center flex-wrap">
                      <button
                        onClick={() => handleReview(0)}
                        className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition font-medium shadow-sm"
                      >
                        Again
                      </button>
                      <button
                        onClick={() => handleReview(2)}
                        className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition font-medium shadow-sm"
                      >
                        Hard
                      </button>
                      <button
                        onClick={() => handleReview(3)}
                        className="px-6 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition font-medium shadow-sm"
                      >
                        Good
                      </button>
                      <button
                        onClick={() => handleReview(4)}
                        className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-medium shadow-sm"
                      >
                        Easy
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
