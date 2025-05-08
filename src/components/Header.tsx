import React from 'react';
import { Mic, HandMetal, Globe, Settings } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { TranslationMode } from '../types';

const Header: React.FC = () => {
  const { mode, setMode } = useAppStore();

  return (
    <header className="bg-primary-700 text-white shadow-md">
      <div className="container mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between">
        <div className="flex items-center mb-4 md:mb-0">
          <Globe className="h-8 w-8 mr-2" />
          <h1 className="text-2xl font-bold">Global Sign AI Bridge</h1>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="bg-primary-800 rounded-lg p-1 flex">
            <button
              className={`flex items-center px-4 py-2 rounded-md transition ${
                mode === TranslationMode.SignToSpeech
                  ? 'bg-primary-600 text-white'
                  : 'text-primary-100 hover:bg-primary-700'
              }`}
              onClick={() => setMode(TranslationMode.SignToSpeech)}
              aria-label="Sign to Speech mode"
            >
              <HandMetal className="h-5 w-5 mr-2" />
              <span className="hidden sm:inline">Sign to Speech</span>
            </button>
            
            <button
              className={`flex items-center px-4 py-2 rounded-md transition ${
                mode === TranslationMode.SpeechToSign
                  ? 'bg-primary-600 text-white'
                  : 'text-primary-100 hover:bg-primary-700'
              }`}
              onClick={() => setMode(TranslationMode.SpeechToSign)}
              aria-label="Speech to Sign mode"
            >
              <Mic className="h-5 w-5 mr-2" />
              <span className="hidden sm:inline">Speech to Sign</span>
            </button>
          </div>
          
          <button
            className="p-2 rounded-full bg-primary-600 hover:bg-primary-500 transition"
            aria-label="Settings"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;