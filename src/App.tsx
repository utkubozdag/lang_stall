import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Home from './pages/Home';
import Reader from './pages/Reader';
import Vocabulary from './pages/Vocabulary';
import Flashcards from './pages/Flashcards';
import Guide from './pages/Guide';
import About from './pages/About';
import Login from './pages/Login';
import Register from './pages/Register';
import Verify from './pages/Verify';

function LoadingWrapper({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen theme-bg-secondary flex items-center justify-center">
        <div className="text-xl theme-text-primary theme-font">Loading...</div>
      </div>
    );
  }

  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <LoadingWrapper>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/read/:id" element={<Reader />} />
              <Route path="/vocabulary" element={<Vocabulary />} />
              <Route path="/flashcards" element={<Flashcards />} />
              <Route path="/guide" element={<Guide />} />
              <Route path="/about" element={<About />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/verify" element={<Verify />} />
            </Routes>
          </LoadingWrapper>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
