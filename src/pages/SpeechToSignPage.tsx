import React, { useState, useEffect } from 'react';
import MicrophoneComponent from '../components/MicrophoneComponent';
import AvatarComponent from '../components/AvatarComponent';
import TranslationDisplay from '../components/TranslationDisplay';
import LanguageSelector from '../components/LanguageSelector';
import StatusIndicator from '../components/StatusIndicator';
import { useAppStore } from '../store/appStore';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { SUPPORTED_LANGUAGES, ASL_TO_ENGLISH_MAPPING } from '../utils/constants';
import { TranslationResult } from '../types';

const SpeechToSignPage: React.FC = () => {
  const {
    microphoneActive,
    setMicrophoneActive,
    spokenLanguage,
    setSpokenLanguage,
    signLanguage,
    setSignLanguage,
    isTranslating,
    setIsTranslating,
    translationResult,
    setTranslationResult,
    error,
    setError
  } = useAppStore();
  
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [signWord, setSignWord] = useState<string | undefined>(undefined);
  
  // Simplified translation logic (for demo purposes)
  const translateToSign = (text: string): string => {
    const lowerText = text.toLowerCase();
    // Find the closest match in our simple dictionary
    const entries = Object.entries(ASL_TO_ENGLISH_MAPPING);
    for (const [sign, word] of entries) {
      if (lowerText.includes(word)) {
        return sign;
      }
    }
    return 'unknown_sign';
  };
  
  const { 
    isListening,
    transcript,
    error: speechError,
    startListening,
    stopListening
  } = useSpeechRecognition({
    language: spokenLanguage,
    onResult: (text) => {
      if (isTranslating) {
        // Simulate translation delay
        setStatus('loading');
        setTimeout(() => {
          const signKey = translateToSign(text);
          setSignWord(signKey);
          
          const newResult: TranslationResult = {
            original: text,
            translated: signKey,
            confidence: 0.8, // Mock confidence value
          };
          
          setTranslationResult(newResult);
          setStatus('success');
        }, 1000);
      }
    },
    onError: (err) => {
      setError(err);
      setStatus('error');
    }
  });

  const handleToggleMicrophone = (active: boolean) => {
    setMicrophoneActive(active);
    if (!active && isListening) {
      stopListening();
      setIsTranslating(false);
    }
  };

  const handleStartTranslation = () => {
    if (!microphoneActive) {
      setError('Please enable the microphone first');
      return;
    }
    
    setIsTranslating(true);
    startListening();
    setStatus('loading');
    setError(null);
  };

  const handleStopTranslation = () => {
    stopListening();
    setIsTranslating(false);
    setStatus('idle');
  };

  // Handle errors
  useEffect(() => {
    if (speechError) {
      setError(speechError);
      setStatus('error');
    }
  }, [speechError, setError]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Speech to Sign Translation</h2>
        <p className="text-gray-600 mb-6">
          Speak into your microphone and our AI will translate your speech into sign language.
        </p>
        
        {error && (
          <div className="mb-4">
            <StatusIndicator type="error" message={error} />
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Avatar Visualization</h3>
            <AvatarComponent signWord={signWord} isAnimating={isTranslating} />
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Speech Input</h3>
            <MicrophoneComponent
              isActive={microphoneActive}
              onToggle={handleToggleMicrophone}
            />
            
            <div className="mt-6">
              {microphoneActive ? (
                isTranslating ? (
                  <button
                    onClick={handleStopTranslation}
                    className="w-full py-2 px-4 bg-error-500 text-white rounded-md hover:bg-error-600 transition-colors"
                  >
                    Stop Translation
                  </button>
                ) : (
                  <button
                    onClick={handleStartTranslation}
                    className="w-full py-2 px-4 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors"
                  >
                    Start Translation
                  </button>
                )
              ) : (
                <button
                  className="w-full py-2 px-4 bg-gray-300 text-gray-500 rounded-md cursor-not-allowed"
                  disabled
                >
                  Please enable microphone
                </button>
              )}
            </div>
          </div>
        </div>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-800 mb-4">Language Settings</h3>
            <div className="space-y-4">
              <LanguageSelector
                languages={SUPPORTED_LANGUAGES.spoken}
                selectedLanguage={spokenLanguage}
                onChange={setSpokenLanguage}
                label="Spoken Language"
              />
              
              <LanguageSelector
                languages={SUPPORTED_LANGUAGES.sign}
                selectedLanguage={signLanguage}
                onChange={setSignLanguage}
                label="Output Sign Language"
              />
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-medium text-gray-800 mb-4">Translation Results</h3>
            <TranslationDisplay
              result={translationResult}
              isLoading={status === 'loading' && !translationResult}
              error={null}
            />
            
            {transcript && isTranslating && (
              <div className="mt-4 p-4 bg-gray-50 rounded-md">
                <h4 className="text-sm font-medium text-gray-500 mb-1">Detected Speech:</h4>
                <p className="text-gray-700">{transcript}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpeechToSignPage;