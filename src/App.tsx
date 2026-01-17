import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import { Header } from '@/components/Header';
import { SignalsPage } from '@/pages/SignalsPage';
import { WhalePlaysPage } from '@/pages/WhalePlaysPage';
import { LoginPage } from '@/pages/LoginPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Login page - no header */}
          <Route path="/login" element={<LoginPage />} />

          {/* Main app with header - publicly accessible */}
          <Route
            path="/*"
            element={
              <div className="min-h-screen bg-background">
                <Header />
                <main>
                  <Routes>
                    <Route path="/" element={<SignalsPage />} />
                    <Route path="/whale-plays" element={<WhalePlaysPage />} />
                  </Routes>
                </main>
              </div>
            }
          />
        </Routes>

        <Toaster position="bottom-center" />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
