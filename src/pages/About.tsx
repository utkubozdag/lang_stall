import { Link } from 'react-router-dom';
import Logo from '../components/Logo';
import { useTheme } from '../contexts/ThemeContext';

export default function About() {
  const { isAristocratic } = useTheme();

  return (
    <div className={`min-h-screen theme-bg-secondary theme-font ${isAristocratic ? 'aristocratic' : ''}`}>
      {/* Header */}
      <nav className="theme-bg-primary border-b theme-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="flex justify-between items-center h-16">
            <Link to="/">
              <Logo size="sm" />
            </Link>
            <Link
              to="/"
              className="px-4 py-2 text-sm theme-text-secondary hover:theme-text-primary focus-visible:ring-2 rounded-lg font-medium transition"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="theme-bg-primary rounded-2xl shadow-sm border theme-border p-6 sm:p-8 md:p-12">
          {/* About Section */}
          <section className="mb-10">
            <h1 className="text-2xl sm:text-3xl font-bold theme-text-primary mb-6">About Lang Stall</h1>

            <div className="space-y-4 text-sm sm:text-base">
              <p className="theme-text-secondary leading-relaxed">
                I developed Lang Stall, a Readlang/LingQ alternative that helps you learn languages by
                reading native content. Occasionally, I will try to improve things with small updates.
                But the goal is simple: Lang Stall should be doing one thing, and it should be doing it
                well without profit in mind.
              </p>

              <p className="theme-text-secondary leading-relaxed">
                The app is free and always should be free. To help me run the app, you can make some
                donations to cover the hosting + LLM usage costs.
              </p>

              <p className="theme-text-secondary leading-relaxed">
                Thankfully, LLM usage costs drastically reduced over the past years. So the app should
                be running with minimal cost. You can see the current costs of the app and the donations
                I received on the home page. If we are in minus, some small donations would be
                appreciated in order to keep the lights on!
              </p>
            </div>
          </section>

          {/* Contact Section */}
          <section className="pt-8 border-t theme-border">
            <h2 className="text-xl sm:text-2xl font-bold theme-text-primary mb-4">Contact</h2>

            <p className="theme-text-secondary leading-relaxed mb-6 text-sm sm:text-base">
              For any issues, collaboration ideas, or feedback, feel free to reach out:
            </p>

            <a
              href="mailto:utkubozdag1@yahoo.com.tr"
              className="inline-flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition font-medium text-sm sm:text-base"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              utkubozdag1@yahoo.com.tr
            </a>
          </section>
        </div>
      </div>
    </div>
  );
}
