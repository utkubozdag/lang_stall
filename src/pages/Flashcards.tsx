import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Vocabulary } from '../types';
import Header from '../components/Header';
import Toast from '../components/Toast';

export default function Flashcards() {
  const navigate = useNavigate();
  const [dueCards, setDueCards] = useState<Vocabulary[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

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

  // Calculate next interval based on SM-2 algorithm
  const getNextInterval = (quality: number): string => {
    const card = dueCards[currentIndex];
    if (!card) return '';

    let interval = card.interval || 0;
    let easeFactor = card.ease_factor || 2.5;
    const reviewCount = card.review_count || 0;

    if (quality >= 3) {
      if (reviewCount === 0) {
        interval = 1;
      } else if (reviewCount === 1) {
        interval = 6;
      } else {
        interval = Math.round(interval * easeFactor);
      }
    } else {
      interval = 1;
    }

    // Format the interval
    if (interval < 1) return '< 1 day';
    if (interval === 1) return '1 day';
    if (interval < 7) return `${interval} days`;
    if (interval < 30) return `${Math.round(interval / 7)} week${interval >= 14 ? 's' : ''}`;
    if (interval < 365) return `${Math.round(interval / 30)} month${interval >= 60 ? 's' : ''}`;
    return `${Math.round(interval / 365)} year${interval >= 730 ? 's' : ''}`;
  };

  const handleReview = async (quality: number) => {
    const card = dueCards[currentIndex];
    if (!card || reviewing) return;

    setReviewing(true);
    try {
      await api.post(`/vocabulary/${card.id}/review`, { quality });

      if (currentIndex < dueCards.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setShowAnswer(false);
        setShowMnemonic(false);
      } else {
        setDueCards([]);
        setCurrentIndex(0);
      }
    } catch (error) {
      console.error('Error reviewing card:', error);
      setToast({ message: 'Failed to save review', type: 'error' });
    } finally {
      setReviewing(false);
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

  const currentCard = dueCards[currentIndex];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        showBackButton
        backTo="/"
        maxWidth="3xl"
        rightContent={
          dueCards.length > 0 && (
            <span className="text-sm text-gray-600 font-medium bg-gray-100 px-3 py-1 rounded-full">
              {currentIndex + 1} / {dueCards.length}
            </span>
          )
        }
      />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {dueCards.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 sm:p-12 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 text-green-500 mb-6">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">All done!</h2>
            <p className="text-gray-600 mb-8 text-lg">
              No cards due for review right now.
            </p>
            <button
              onClick={() => navigate('/vocabulary')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition font-medium"
            >
              View Vocabulary
            </button>
          </div>
        ) : (
          <div>
            {/* Progress Bar */}
            <div className="mb-6">
              <div className="bg-gray-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-blue-600 h-1.5 transition-all duration-300"
                  style={{ width: `${((currentIndex + 1) / dueCards.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Flashcard */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-12 min-h-[400px] flex flex-col justify-center items-center">
              {!showAnswer ? (
                <div className="text-center w-full">
                  <div className="mb-6">
                    <span className="text-xs px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full font-medium">
                      {currentCard.language}
                    </span>
                  </div>
                  <h2 className="text-3xl sm:text-5xl font-bold text-gray-900 mb-8">{currentCard.word}</h2>
                  {currentCard.context && (
                    <p className="text-gray-500 italic mb-8 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
                      "{currentCard.context.substring(0, 150)}..."
                    </p>
                  )}
                  <button
                    onClick={() => setShowAnswer(true)}
                    className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition text-lg font-medium"
                  >
                    Show Answer
                  </button>
                </div>
              ) : (
                <div className="text-center w-full">
                  <div className="mb-4">
                    <span className="text-xs px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full font-medium">
                      {currentCard.language}
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-6">{currentCard.word}</h2>
                  <div className="bg-gray-50 rounded-xl p-6 sm:p-8 mb-4 max-w-2xl mx-auto">
                    <p className="text-lg sm:text-xl text-gray-800 whitespace-pre-wrap leading-relaxed">
                      {currentCard.translation}
                    </p>
                  </div>

                  {/* Mnemonic Section */}
                  {currentCard.mnemonic && (
                    <div className="mb-8 max-w-2xl mx-auto">
                      <button
                        onClick={() => setShowMnemonic(!showMnemonic)}
                        className="flex items-center gap-1.5 mx-auto px-3 py-1.5 text-sm text-purple-600 hover:text-purple-700 transition"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        {showMnemonic ? 'Hide' : 'Show'} Memory Aid
                      </button>
                      {showMnemonic && (
                        <div className="mt-3 bg-purple-50 rounded-lg p-4 border border-purple-100">
                          <p className="text-purple-800 text-sm leading-relaxed">{currentCard.mnemonic}</p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="text-center">
                    <p className="text-sm text-gray-500 mb-4">How well did you remember?</p>
                    <div className="flex gap-2 sm:gap-3 justify-center flex-wrap">
                      <button
                        onClick={() => handleReview(0)}
                        disabled={reviewing}
                        className="flex flex-col items-center px-4 sm:px-5 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:opacity-50 transition font-medium min-w-[70px]"
                        aria-label="Again - show this card soon"
                      >
                        <span>Again</span>
                        <span className="text-xs opacity-75 mt-0.5">1 day</span>
                      </button>
                      <button
                        onClick={() => handleReview(2)}
                        disabled={reviewing}
                        className="flex flex-col items-center px-4 sm:px-5 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:opacity-50 transition font-medium min-w-[70px]"
                        aria-label="Hard - show this card soon"
                      >
                        <span>Hard</span>
                        <span className="text-xs opacity-75 mt-0.5">1 day</span>
                      </button>
                      <button
                        onClick={() => handleReview(3)}
                        disabled={reviewing}
                        className="flex flex-col items-center px-4 sm:px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 disabled:opacity-50 transition font-medium min-w-[70px]"
                        aria-label={`Good - show this card in ${getNextInterval(3)}`}
                      >
                        <span>Good</span>
                        <span className="text-xs opacity-75 mt-0.5">{getNextInterval(3)}</span>
                      </button>
                      <button
                        onClick={() => handleReview(4)}
                        disabled={reviewing}
                        className="flex flex-col items-center px-4 sm:px-5 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50 transition font-medium min-w-[70px]"
                        aria-label={`Easy - show this card in ${getNextInterval(4)}`}
                      >
                        <span>Easy</span>
                        <span className="text-xs opacity-75 mt-0.5">{getNextInterval(4)}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

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
