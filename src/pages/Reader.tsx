import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Text } from '../types';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';
import Toast from '../components/Toast';
import { LANGUAGES } from '../constants/languages';

export default function Reader() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, updateTargetLanguage } = useAuth();
  const [text, setText] = useState<Text | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const [selectedWords, setSelectedWords] = useState<number[]>([]);
  const [translation, setTranslation] = useState('');
  const [mnemonic, setMnemonic] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState(user?.target_language || 'English');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [mnemonicEnabled, setMnemonicEnabled] = useState(() => {
    const saved = localStorage.getItem('mnemonicEnabled');
    return saved === 'true';
  });
  const [selectedModel, setSelectedModel] = useState<'gemini' | 'grok'>(() => {
    const saved = localStorage.getItem('selectedModel');
    return saved === 'grok' ? 'grok' : 'gemini';
  });

  useEffect(() => {
    if (id) {
      loadText();
    }
  }, [id]);

  useEffect(() => {
    localStorage.setItem('mnemonicEnabled', String(mnemonicEnabled));
  }, [mnemonicEnabled]);

  useEffect(() => {
    localStorage.setItem('selectedModel', selectedModel);
  }, [selectedModel]);

  const loadText = async () => {
    try {
      const response = await api.get(`/texts/${id}`);
      setText(response.data);
    } catch (error) {
      console.error('Error loading text:', error);
    }
  };

  const getWords = (content: string) => {
    return content.split(/(\s+)/);
  };

  const CACHE_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000;

  const getCachedTranslation = (cacheKey: string): { translation: string; mnemonic?: string } | null => {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (!cached) return null;

      const parsed = JSON.parse(cached);
      if (parsed.timestamp && Date.now() - parsed.timestamp > CACHE_EXPIRATION_MS) {
        localStorage.removeItem(cacheKey);
        return null;
      }
      return parsed.translation ? { translation: parsed.translation, mnemonic: parsed.mnemonic } : null;
    } catch {
      localStorage.removeItem(cacheKey);
      return null;
    }
  };

  const setCachedTranslation = (cacheKey: string, translation: string, mnemonic?: string) => {
    try {
      localStorage.setItem(cacheKey, JSON.stringify({
        translation,
        mnemonic,
        timestamp: Date.now(),
      }));
    } catch {
      // localStorage might be full
    }
  };

  const translateWord = async (word: string, allowMnemonic: boolean = true) => {
    if (!word || !text) return;

    // Only generate mnemonic for single words when enabled
    const shouldGenerateMnemonic = mnemonicEnabled && allowMnemonic;
    const cacheKey = `translation:${text.language}:${targetLanguage}:${word.toLowerCase()}:${selectedModel}:${shouldGenerateMnemonic ? 'mnemonic' : 'no-mnemonic'}`;
    const cached = getCachedTranslation(cacheKey);

    if (cached) {
      setTranslation(cached.translation);
      setMnemonic(cached.mnemonic || '');
      setShowTranslation(true);
      return;
    }

    setLoading(true);
    setShowTranslation(false);
    setMnemonic('');
    try {
      const response = await api.post('/translate', {
        text: word,
        sourceLanguage: text.language,
        targetLanguage: targetLanguage,
        context: text.content.substring(0, 200),
        generateMnemonic: shouldGenerateMnemonic,
        model: selectedModel,
      });

      const translationResult = response.data.translation;
      const mnemonicResult = response.data.mnemonic || '';
      setCachedTranslation(cacheKey, translationResult, mnemonicResult);
      setTranslation(translationResult);
      setMnemonic(mnemonicResult);
      setShowTranslation(true);
    } catch (error) {
      console.error('Translation error:', error);
      setTranslation('Translation failed. Please try again.');
      setShowTranslation(true);
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageChange = async (newLanguage: string) => {
    setTargetLanguage(newLanguage);
    try {
      await updateTargetLanguage(newLanguage);
    } catch (error) {
      console.error('Failed to save language preference:', error);
    }
    if (selectedText) {
      setShowTranslation(false);
      setTranslation('');
      setMnemonic('');
    }
  };

  const handleWordClick = (index: number, word: string) => {
    if (!word.trim() || !text) return;

    const words = getWords(text.content);

    // If clicking on a selected word, deselect all
    if (selectedWords.includes(index)) {
      clearSelection();
      return;
    }

    // If no selection, start new selection with this word
    if (selectedWords.length === 0) {
      setSelectedWords([index]);
      setSelectedText(word.trim());
      translateWord(word.trim(), true); // Single word, allow mnemonic
      return;
    }

    // Check if this word is adjacent to the current selection
    const minSelected = Math.min(...selectedWords);
    const maxSelected = Math.max(...selectedWords);

    // Find the actual word indices (skip whitespace)
    const isAdjacentBefore = index < minSelected &&
      !words.slice(index + 1, minSelected).some(w => w.trim());
    const isAdjacentAfter = index > maxSelected &&
      !words.slice(maxSelected + 1, index).some(w => w.trim());

    if (isAdjacentBefore || isAdjacentAfter) {
      // Add to selection
      const newStart = isAdjacentBefore ? index : minSelected;
      const newEnd = isAdjacentAfter ? index : maxSelected;

      const range: number[] = [];
      for (let i = newStart; i <= newEnd; i++) {
        range.push(i);
      }

      const selectedWordCount = range.filter(i => words[i]?.trim()).length;
      if (selectedWordCount > 15) {
        setToast({ message: 'Please select at most 15 words', type: 'error' });
        return;
      }

      setSelectedWords(range);
      const phrase = words.slice(newStart, newEnd + 1).join('').trim();
      setSelectedText(phrase);
      translateWord(phrase, false); // Multiple words, no mnemonic
    } else {
      // Non-adjacent word, start new selection
      setSelectedWords([index]);
      setSelectedText(word.trim());
      translateWord(word.trim(), true); // Single word, allow mnemonic
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
        mnemonic: mnemonic || undefined,
      });
      setToast({ message: `"${selectedText}" saved to vocabulary`, type: 'success' });
    } catch (error: any) {
      if (error.response?.data?.error === 'Word already in your vocabulary') {
        setToast({ message: 'Already in your vocabulary', type: 'error' });
      } else {
        setToast({ message: 'Failed to save', type: 'error' });
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
    setMnemonic('');
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

  const words = getWords(text.content);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        showBackButton
        backTo="/"
        maxWidth="4xl"
        rightContent={
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-xs sm:text-sm px-2 sm:px-3 py-1 bg-blue-50 text-blue-700 rounded-full font-medium">
              {text.language}
            </span>
            <span className="text-gray-400 hidden sm:inline">→</span>
            <select
              value={targetLanguage}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="text-xs sm:text-sm px-2 sm:px-3 py-1 bg-green-50 text-green-700 rounded-full font-medium border-none cursor-pointer focus:ring-2 focus:ring-green-500 focus-visible:ring-offset-2"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>
          </div>
        }
      />

      {/* Reading Area */}
      <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8 pb-48">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{text.title}</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedModel(selectedModel === 'gemini' ? 'grok' : 'gemini')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition ${
                selectedModel === 'grok'
                  ? 'bg-orange-100 text-orange-700'
                  : 'bg-blue-100 text-blue-700'
              }`}
              title={`Using ${selectedModel === 'grok' ? 'Grok' : 'Gemini'} for translation`}
            >
              {selectedModel === 'grok' ? (
                <span className="text-sm">𝕏</span>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              )}
              <span className="hidden sm:inline">{selectedModel === 'grok' ? 'Grok' : 'Gemini'}</span>
            </button>
            <button
              onClick={() => setMnemonicEnabled(!mnemonicEnabled)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition ${
                mnemonicEnabled
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
              title="Link and Story Method - Generate memory aids for words"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <span className="hidden sm:inline">Mnemonic</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 md:p-10">
          <p className="text-base sm:text-lg leading-relaxed text-gray-800" style={{ lineHeight: '2' }}>
            {words.map((word, index) => {
              const isWhitespace = !word.trim();
              const isSelected = selectedWords.includes(index);

              if (isWhitespace) {
                return <span key={index}>{word}</span>;
              }

              return (
                <span
                  key={index}
                  onClick={() => handleWordClick(index, word)}
                  className={`cursor-pointer rounded px-0.5 transition-colors select-none ${
                    isSelected
                      ? 'bg-blue-200 text-blue-900'
                      : 'hover:bg-gray-100 active:bg-blue-100'
                  }`}
                >
                  {word}
                </span>
              );
            })}
          </p>

          <p className="text-xs sm:text-sm text-gray-500 mt-6 pt-4 border-t border-gray-100">
            {selectedWords.length > 0
              ? 'Click adjacent word to extend phrase, or click selected word to deselect'
              : 'Click a word to translate, click more adjacent words for phrases'}
          </p>
        </div>
      </div>

      {/* Translation Panel */}
      {selectedText && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-2xl z-20">
          <div className="max-w-4xl mx-auto p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-baseline gap-2 sm:gap-3 min-w-0">
                <div className="text-lg sm:text-xl font-bold text-gray-900 truncate">{selectedText}</div>
                <span className="text-xs sm:text-sm text-gray-400 flex-shrink-0">({text.language})</span>
              </div>
              <button
                onClick={clearSelection}
                className="text-gray-400 hover:text-gray-600 focus-visible:ring-2 focus-visible:ring-gray-500 rounded p-1 -mr-1 flex-shrink-0 transition"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {loading ? (
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center gap-2 text-gray-500">
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Translating...
                </div>
              </div>
            ) : showTranslation ? (
              <div className="space-y-3">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-800 whitespace-pre-wrap leading-relaxed text-sm sm:text-base">{translation}</p>
                </div>
                {mnemonic && (
                  <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                    <div className="flex items-start gap-2">
                      <svg className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      <p className="text-purple-800 text-sm leading-relaxed">{mnemonic}</p>
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveVocabulary}
                    disabled={saving}
                    className="flex-1 bg-blue-600 text-white py-2.5 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition font-medium text-sm flex items-center justify-center gap-2"
                  >
                    {saving && (
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    )}
                    {saving ? 'Saving...' : 'Save to Vocabulary'}
                  </button>
                  <button
                    onClick={() => translateWord(selectedText)}
                    disabled={loading}
                    className="px-4 py-2.5 text-gray-500 hover:text-gray-700 focus-visible:ring-2 focus-visible:ring-gray-500 rounded-lg transition"
                    aria-label="Retry translation"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

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
