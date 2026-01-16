import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Header } from '@/components/Header';
import { SignalsPage } from '@/pages/SignalsPage';
import { WhalePlaysPage } from '@/pages/WhalePlaysPage';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background">
        <Header />

        <main>
          <Routes>
            <Route path="/" element={<SignalsPage />} />
            <Route path="/whale-plays" element={<WhalePlaysPage />} />
          </Routes>
        </main>

        <Toaster position="bottom-center" />
      </div>
    </BrowserRouter>
  );
}

export default App;
