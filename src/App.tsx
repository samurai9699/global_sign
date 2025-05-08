import React from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import SignToSpeechPage from './pages/SignToSpeechPage';
import SpeechToSignPage from './pages/SpeechToSignPage';
import { useAppStore } from './store/appStore';
import { TranslationMode } from './types';

function App() {
  const { mode } = useAppStore();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-grow py-6">
        {mode === TranslationMode.SignToSpeech ? (
          <SignToSpeechPage />
        ) : (
          <SpeechToSignPage />
        )}
      </main>
      
      <Footer />
    </div>
  );
}

export default App;