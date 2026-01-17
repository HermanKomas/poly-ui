import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Header } from '@/components/Header';
import { SignalsPage } from '@/pages/SignalsPage';
import { WhalePlaysPage } from '@/pages/WhalePlaysPage';
import { LoginPage } from '@/pages/LoginPage';

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Login page - no header */}
      <Route path="/login" element={<LoginPage />} />

      {/* Main app with header */}
      <Route
        path="/*"
        element={
          <div className="min-h-screen bg-background">
            <Header />
            <main>
              <Routes>
                {/* Whale Bets - default home page, publicly accessible */}
                <Route path="/" element={<WhalePlaysPage />} />

                {/* Signals - requires authentication */}
                <Route
                  path="/signals"
                  element={
                    isAuthenticated ? (
                      <SignalsPage />
                    ) : (
                      <Navigate to="/login" replace />
                    )
                  }
                />

                {/* Redirect old whale-plays route */}
                <Route path="/whale-plays" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster position="bottom-center" />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
