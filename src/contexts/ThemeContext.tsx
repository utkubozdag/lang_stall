import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'default' | 'aristocratic';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  isAristocratic: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem('theme');
    return (stored === 'aristocratic' ? 'aristocratic' : 'default') as Theme;
  });

  useEffect(() => {
    localStorage.setItem('theme', theme);

    // Apply theme class to document root
    if (theme === 'aristocratic') {
      document.documentElement.classList.add('aristocratic');
    } else {
      document.documentElement.classList.remove('aristocratic');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'default' ? 'aristocratic' : 'default');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isAristocratic: theme === 'aristocratic' }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
