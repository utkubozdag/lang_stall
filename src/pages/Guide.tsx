import { useNavigate } from 'react-router-dom';

export default function Guide() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center text-gray-600 hover:text-gray-900 transition"
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <h1 className="text-xl font-bold text-gray-900">How to Use</h1>
          <div className="w-16"></div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8 space-y-8">

          {/* Step 1 */}
          <section>
            <div className="flex items-center gap-3 mb-3">
              <span className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">1</span>
              <h2 className="text-xl font-semibold text-gray-900">Add a Text</h2>
            </div>
            <p className="text-gray-600 ml-11">
              From the home page, click <strong>"+ Add Text"</strong> and paste any text in the language you're learning.
              Give it a title and specify the language (e.g., Hungarian, Spanish, German).
            </p>
          </section>

          {/* Step 2 */}
          <section>
            <div className="flex items-center gap-3 mb-3">
              <span className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">2</span>
              <h2 className="text-xl font-semibold text-gray-900">Read and Translate</h2>
            </div>
            <p className="text-gray-600 ml-11 mb-3">
              Open your text and start reading. When you encounter an unknown word:
            </p>
            <ul className="text-gray-600 ml-11 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span><strong>Tap a word</strong> to instantly translate it</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span><strong>Hold on a word</strong> to start selecting a phrase, then tap another word to complete the selection</span>
              </li>
            </ul>
          </section>

          {/* Step 3 */}
          <section>
            <div className="flex items-center gap-3 mb-3">
              <span className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">3</span>
              <h2 className="text-xl font-semibold text-gray-900">Save to Vocabulary</h2>
            </div>
            <p className="text-gray-600 ml-11">
              After translating a word, click <strong>"+ Save"</strong> to add it to your vocabulary list.
              The word, its translation, and context are saved for later review.
            </p>
          </section>

          {/* Step 4 */}
          <section>
            <div className="flex items-center gap-3 mb-3">
              <span className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">4</span>
              <h2 className="text-xl font-semibold text-gray-900">Review with Flashcards</h2>
            </div>
            <p className="text-gray-600 ml-11 mb-3">
              Go to <strong>"Practice"</strong> to review your saved vocabulary using spaced repetition flashcards.
            </p>
            <ul className="text-gray-600 ml-11 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">•</span>
                <span><strong>Easy (5)</strong> - You knew it instantly</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-600 font-bold">•</span>
                <span><strong>Good (4)</strong> - You remembered after thinking</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-600 font-bold">•</span>
                <span><strong>Hard (2)</strong> - You barely remembered</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-600 font-bold">•</span>
                <span><strong>Again (0)</strong> - You forgot completely</span>
              </li>
            </ul>
            <p className="text-gray-500 text-sm ml-11 mt-3">
              Words you find difficult will appear more often. Words you know well will appear less frequently.
            </p>
          </section>

          {/* Tips */}
          <section className="bg-blue-50 rounded-lg p-5 mt-6">
            <h3 className="font-semibold text-blue-900 mb-2">Tips for Effective Learning</h3>
            <ul className="text-blue-800 space-y-1 text-sm">
              <li>• Read content that interests you - news, stories, articles</li>
              <li>• Review flashcards daily for best retention</li>
              <li>• Don't save every word - focus on useful vocabulary</li>
              <li>• Use the context when reviewing to remember better</li>
            </ul>
          </section>

        </div>
      </div>
    </div>
  );
}
