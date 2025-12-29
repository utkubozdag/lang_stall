import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../services/api';
import { User, AuthResponse } from '../types';

// Default anonymous user - matches the user created in db.ts
const ANONYMOUS_USER: User = {
  id: 1,
  email: 'anonymous@langstall.local',
  name: 'Anonymous',
  target_language: 'English',
};

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string, nativeLanguage?: string, learningLanguage?: string) => Promise<{ requiresVerification: boolean }>;
  logout: () => void;
  updateTargetLanguage: (targetLanguage: string) => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        if (storedToken && storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setToken(storedToken);
          setUser(parsedUser);
        } else {
          // No stored auth - use anonymous user (no login required)
          setUser(ANONYMOUS_USER);
        }
      } catch (error) {
        // Clear corrupted data and use anonymous user
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        console.error('Failed to parse stored user:', error);
        setUser(ANONYMOUS_USER);
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await api.post<AuthResponse>('/auth/login', { email, password });
    const { token, user } = response.data;

    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setToken(token);
    setUser(user);
  };

  const register = async (
    email: string,
    password: string,
    name?: string,
    nativeLanguage?: string,
    learningLanguage?: string
  ): Promise<{ requiresVerification: boolean }> => {
    const response = await api.post<{ message: string; requiresVerification?: boolean } | AuthResponse>('/auth/register', {
      email,
      password,
      name,
      native_language: nativeLanguage,
      learning_language: learningLanguage,
    });

    // Check if registration requires email verification
    if ('requiresVerification' in response.data && response.data.requiresVerification) {
      return { requiresVerification: true };
    }

    // Legacy flow (if verification is disabled in the future)
    if ('token' in response.data && 'user' in response.data) {
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setToken(token);
      setUser(user);
    }

    return { requiresVerification: false };
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(ANONYMOUS_USER);
  };

  const updateTargetLanguage = async (targetLanguage: string) => {
    // For anonymous user, just update local state without API call
    if (!token) {
      const updatedUser = { ...user!, target_language: targetLanguage };
      setUser(updatedUser);
      return;
    }

    const response = await api.patch<{ user: User }>('/auth/preferences', {
      target_language: targetLanguage,
    });
    const updatedUser = response.data.user;
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, updateTargetLanguage, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
