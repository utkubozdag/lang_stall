import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Text } from '../types';

export default function Reader() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [text, setText] = useState<Text | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const [selectedWords, setSelectedWords] = useState<number[]>([]);
  const [translation, setTranslation] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [rangeStartIndex, setRangeStartIndex] = useState<number | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);

  useEffect(() => {
    if (id) {
      loadText();
    }
  }, [id]);

  const loadText = async () => {
    try {
      const response = await api.get(`/texts/${id}`);
      setText(response.data);
    } catch (error) {
      console.error('Error loading text:', error);
    }
  };

  // Split text into words while preserving whitespace and punctuation
  const getWords = (content: string) => {
    return content.split(/(\s+)/);
  };

  const translateWord = async (word: string) => {
    if (!word || !text) return;

    // Check cache first
    const cacheKey = `translation:${text.language}:${word.toLowerCase()}`;
    const cached = localStorage.getItem(cacheKey);

    if (cached) {
      setTranslation(cached);
      setShowTranslation(true);
      return;
    }

    setLoading(true);
    setShowTranslation(false);
    try {
      const response = await api.post('/translate', {
        text: word,
        sourceLanguage: text.language,
        targetLanguage: 'English',
        context: text.content.substring(0, 200),
      });

      const translationResult = response.data.translation;

      // Cache the translation
      localStorage.setItem(cacheKey, translationResult);

      setTranslation(translationResult);
      setShowTranslation(true);
    } catch (error) {
      console.error('Translation error:', error);
      setTranslation('Translation failed. Please try again.');
      setShowTranslation(true);
    } finally {
      setLoading(false);
    }
  };

  const handleWordTouchStart = (index: number, word: string) => {
    if (!word.trim()) return;

    isLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      // Start range selection
      setRangeStartIndex(index);
      setSelectedWords([index]);
      setSelectedText(word.trim());
      setShowTranslation(false);
      setTranslation('');
    }, 500); // 500ms for long press
  };

  const handleWordTouchEnd = (index: number, word: string) => {
    if (!word.trim()) return;

    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    // If it was a long press, don't do anything on touch end
    if (isLongPress.current) {
      isLongPress.current = false;
      return;
    }

    // Check if we're in range selection mode
    if (rangeStartIndex !== null) {
      // Complete the range selection
      const start = Math.min(rangeStartIndex, index);
      const end = Math.max(rangeStartIndex, index);
      const words = getWords(text!.content);
      const range: number[] = [];
      for (let i = start; i <= end; i++) {
        range.push(i);
      }
      setSelectedWords(range);
      const phrase = words.slice(start, end + 1).join('').trim();
      setSelectedText(phrase);
      setRangeStartIndex(null);
      // Translate the phrase
      translateWord(phrase);
    } else {
      // Single tap - select word and translate immediately
      setSelectedWords([index]);
      setSelectedText(word.trim());
      translateWord(word.trim());
    }
  };

  const handleWordTouchCancel = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    isLongPress.current = false;
  };

  const handleTranslate = async () => {
    if (!selectedText || !text) return;

    setLoading(true);
    try {
      const response = await api.post('/translate', {
        text: selectedText,
        sourceLanguage: text.language,
        targetLanguage: 'English',
        context: getContext(),
      });

      setTranslation(response.data.translation);
      setShowTranslation(true);
    } catch (error) {
      console.error('Translation error:', error);
      setTranslation('Translation failed. Please try again.');
      setShowTranslation(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveVocabulary = async () => {
    if (!selectedText || !translation || !text) return;

    setSaving(true);
    try {
      await api.post('/vocabulary', {
        word: selectedText,
        translation,
        context: getContext(),
        language: text.language,
      });

      alert('Added to vocabulary!');
    } catch (error: any) {
      if (error.response?.data?.error === 'Word already in your vocabulary') {
        alert('This word is already in your vocabulary');
      } else {
        alert('Failed to save vocabulary');
      }
    } finally {
      setSaving(false);
    }
  };

  const clearSelection = () => {
    setSelectedWords([]);
    setSelectedText('');
    setShowTranslation(false);
    setTranslation('');
  };

  const getContext = () => {
    if (!text) return '';
    const content = text.content;
    const index = content.toLowerCase().indexOf(selectedText.toLowerCase());
    if (index === -1) return '';

    const start = Math.max(0, index - 50);
    const end = Math.min(content.length, index + selectedText.length + 50);
    return content.substring(start, end);
  };

  if (!text) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  const words = getWords(text.content);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Simple Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center text-gray-600 hover:text-gray-900 transition"
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <span className="text-sm px-3 py-1 bg-blue-50 text-blue-700 rounded-full font-medium">
            {text.language}
          </span>
        </div>
      </div>

      {/* Reading Area */}
      <div className="max-w-4xl mx-auto px-4 py-8 pb-48">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">{text.title}</h1>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-10">
          <p className="text-lg leading-relaxed text-gray-800" style={{ lineHeight: '2' }}>
            {words.map((word, index) => {
              const isWhitespace = !word.trim();
              const isSelected = selectedWords.includes(index);

              if (isWhitespace) {
                return <span key={index}>{word}</span>;
              }

              return (
                <span
                  key={index}
                  onTouchStart={() => handleWordTouchStart(index, word)}
                  onTouchEnd={() => handleWordTouchEnd(index, word)}
                  onTouchCancel={handleWordTouchCancel}
                  onMouseDown={() => handleWordTouchStart(index, word)}
                  onMouseUp={() => handleWordTouchEnd(index, word)}
                  className={`cursor-pointer rounded px-0.5 transition-colors select-none ${
                    isSelected
                      ? 'bg-blue-200 text-blue-900'
                      : rangeStartIndex !== null
                        ? 'hover:bg-yellow-100 active:bg-yellow-200'
                        : 'hover:bg-gray-100 active:bg-blue-100'
                  }`}
                >
                  {word}
                </span>
              );
            })}
          </p>

          <p className="text-sm text-gray-500 mt-6 pt-4 border-t border-gray-100">
            {rangeStartIndex !== null
              ? 'Tap another word to complete selection'
              : 'Tap a word to translate. Hold to select a phrase.'}
          </p>
        </div>
      </div>

      {/* Translation Panel */}
      {selectedText && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-2xl">
          <div className="max-w-4xl mx-auto p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="text-xs text-gray-500 mb-1">SELECTED</div>
                <div className="text-lg font-semibold text-gray-900">{selectedText}</div>
              </div>
              <button
                onClick={clearSelection}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {loading ? (
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="text-gray-600">Translating...</div>
              </div>
            ) : showTranslation ? (
              <div className="space-y-3">
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  {translation.split('\n').map((line, i) => {
                    const trimmed = line.trim();
                    if (!trimmed) return null;

                    // Check if line starts with a label
                    if (trimmed.toLowerCase().startsWith('meaning:') ||
                        trimmed.toLowerCase().startsWith('translation:')) {
                      return (
                        <div key={i}>
                          <div className="text-xs font-semibold text-blue-600 uppercase mb-1">Meaning</div>
                          <div className="text-gray-900 font-medium">{trimmed.replace(/^(meaning|translation):\s*/i, '')}</div>
                        </div>
                      );
                    }
                    if (trimmed.toLowerCase().startsWith('explanation:') ||
                        trimmed.toLowerCase().startsWith('usage:')) {
                      return (
                        <div key={i}>
                          <div className="text-xs font-semibold text-green-600 uppercase mb-1">Explanation</div>
                          <div className="text-gray-700">{trimmed.replace(/^(explanation|usage):\s*/i, '')}</div>
                        </div>
                      );
                    }
                    return <div key={i} className="text-gray-800">{trimmed}</div>;
                  })}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveVocabulary}
                    disabled={saving}
                    className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:bg-green-400 transition font-medium"
                  >
                    {saving ? 'Saving...' : '+ Save'}
                  </button>
                  <button
                    onClick={() => translateWord(selectedText)}
                    disabled={loading}
                    className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
