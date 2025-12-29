import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Home from './pages/Home';
import Reader from './pages/Reader';
import Vocabulary from './pages/Vocabulary';
import Flashcards from './pages/Flashcards';
import Guide from './pages/Guide';
import About from './pages/About';

function LoadingWrapper({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <LoadingWrapper>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/read/:id" element={<Reader />} />
            <Route path="/vocabulary" element={<Vocabulary />} />
            <Route path="/flashcards" element={<Flashcards />} />
            <Route path="/guide" element={<Guide />} />
            <Route path="/about" element={<About />} />
          </Routes>
        </LoadingWrapper>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
