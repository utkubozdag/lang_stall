import { useTheme } from '../contexts/ThemeContext';

export default function ThemeToggle() {
  const { isAristocratic, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`
        relative flex items-center gap-2 px-3 py-1.5 text-sm font-medium
        transition-all duration-300 ease-in-out
        ${isAristocratic
          ? 'bg-gradient-to-b from-[#F5EED9] to-[#EBE5D9] text-[#6B4E12] border border-[#C9B896] hover:border-[#996515] rounded shadow-sm'
          : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200 rounded-md'
        }
      `}
      title={isAristocratic ? 'Switch to modern theme' : 'Switch to aristocratic theme'}
      aria-label={isAristocratic ? 'Switch to modern theme' : 'Switch to aristocratic theme'}
    >
      {isAristocratic ? (
        <>
          {/* Crown icon */}
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/>
          </svg>
          <span className="hidden sm:inline tracking-wider uppercase text-xs">Regal</span>
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
          </svg>
          <span className="hidden sm:inline">Theme</span>
        </>
      )}
    </button>
  );
}
