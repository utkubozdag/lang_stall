import { useTheme } from '../contexts/ThemeContext';
import Header from '../components/Header';

export default function Guide() {
  const { isAristocratic } = useTheme();

  return (
    <div className={`min-h-screen theme-bg-secondary theme-font ${isAristocratic ? 'aristocratic' : ''}`}>
      <Header showBackButton backTo="/" title="How to Use" maxWidth="4xl" />

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="theme-bg-primary rounded-xl shadow-sm border theme-border p-6 md:p-8 space-y-8">
          {/* Step 1 */}
          <section>
            <div className="flex items-center gap-3 mb-3">
              <span className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                1
              </span>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Add a Text</h2>
            </div>
            <p className="text-gray-600 ml-11 text-sm sm:text-base">
              From the home page, click <strong>"+ Add Text"</strong> and paste any text in the language
              you're learning. Give it a title and specify the language.
            </p>
          </section>

          {/* Step 2 */}
          <section>
            <div className="flex items-center gap-3 mb-3">
              <span className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                2
              </span>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Read and Translate</h2>
            </div>
            <p className="text-gray-600 ml-11 mb-3 text-sm sm:text-base">
              Open your text and start reading. When you encounter an unknown word:
            </p>
            <ul className="text-gray-600 ml-11 space-y-2 text-sm sm:text-base">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>
                  <strong>Click a word</strong> to instantly translate it
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>
                  <strong>Click another word</strong> after selecting one to translate the phrase between
                  them
                </span>
              </li>
            </ul>
          </section>

          {/* Step 3 */}
          <section>
            <div className="flex items-center gap-3 mb-3">
              <span className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                3
              </span>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Save to Vocabulary</h2>
            </div>
            <p className="text-gray-600 ml-11 text-sm sm:text-base">
              After translating, click <strong>"Save to Vocabulary"</strong> to add it to your list. The
              word, its translation, and context are saved for review.
            </p>
          </section>

          {/* Step 4 */}
          <section>
            <div className="flex items-center gap-3 mb-3">
              <span className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                4
              </span>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Review with Flashcards</h2>
            </div>
            <p className="text-gray-600 ml-11 mb-3 text-sm sm:text-base">
              Go to <strong>"Practice"</strong> to review your vocabulary using spaced repetition.
            </p>
            <div className="ml-11 grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
              <div className="flex items-center gap-2 bg-red-50 text-red-700 px-3 py-2 rounded-lg">
                <span className="font-medium">Again</span>
                <span className="text-xs opacity-75">Forgot</span>
              </div>
              <div className="flex items-center gap-2 bg-orange-50 text-orange-700 px-3 py-2 rounded-lg">
                <span className="font-medium">Hard</span>
                <span className="text-xs opacity-75">Barely</span>
              </div>
              <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-2 rounded-lg">
                <span className="font-medium">Good</span>
                <span className="text-xs opacity-75">Recalled</span>
              </div>
              <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-2 rounded-lg">
                <span className="font-medium">Easy</span>
                <span className="text-xs opacity-75">Instant</span>
              </div>
            </div>
            <p className="text-gray-500 text-xs sm:text-sm ml-11 mt-3">
              Words you find difficult appear more often. Words you know well appear less frequently.
            </p>
          </section>

          {/* Tips */}
          <section className="bg-blue-50 rounded-lg p-4 sm:p-5">
            <h3 className="font-semibold text-blue-900 mb-2 text-sm sm:text-base">
              Tips for Effective Learning
            </h3>
            <ul className="text-blue-800 space-y-1 text-xs sm:text-sm">
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
