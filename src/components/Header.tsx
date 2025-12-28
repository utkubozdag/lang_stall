import { useNavigate } from 'react-router-dom';
import Logo from './Logo';

interface HeaderProps {
  showLogo?: boolean;
  showBackButton?: boolean;
  backTo?: string;
  rightContent?: React.ReactNode;
  title?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
}

export default function Header({
  showLogo = false,
  showBackButton = false,
  backTo,
  rightContent,
  title,
  maxWidth = '5xl',
}: HeaderProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (backTo) {
      navigate(backTo);
    } else {
      navigate(-1);
    }
  };

  const maxWidthClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
  }[maxWidth];

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className={`${maxWidthClass} mx-auto px-4 sm:px-6 py-3 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          {showBackButton && (
            <button
              onClick={handleBack}
              className="flex items-center text-gray-600 hover:text-gray-900 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded transition"
              aria-label="Go back"
            >
              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="hidden sm:inline">Back</span>
            </button>
          )}
          {showLogo && <Logo size="sm" />}
          {title && <h1 className="text-lg font-semibold text-gray-900">{title}</h1>}
        </div>
        {rightContent && <div className="flex items-center gap-2 sm:gap-3">{rightContent}</div>}
      </div>
    </header>
  );
}
