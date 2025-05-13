import React, { useState, useEffect } from 'react';
import WebcamComponent from '../components/WebcamComponent';
import TranslationDisplay from '../components/TranslationDisplay';
import LanguageSelector from '../components/LanguageSelector';
import StatusIndicator from '../components/StatusIndicator';
import { useAppStore } from '../store/appStore';
import { useSignRecognition } from '../hooks/useSignRecognition';
import { textToSpeech } from '../services/textToSpeechService';
import { SUPPORTED_LANGUAGES } from '../utils/constants';
import { TranslationResult } from '../types';

const SignToSpeechPage: React.FC = () => {
  const {
    webcamActive,
    setWebcamActive,
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
  
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  
  const {
    isProcessing,
    detectedGesture,
    translatedText,
    error: recognitionError,
    currentChunk,
    isIdle,
    debugInfo,
    startProcessing,
    stopProcessing,
  } = useSignRecognition(videoRef);

  const handleToggleWebcam = (active: boolean) => {
    setWebcamActive(active);
    if (!active && isProcessing) {
      stopProcessing();
      setIsTranslating(false);
    }
  };

  const handleStartTranslation = () => {
    if (!webcamActive) {
      setError('Please enable the webcam first');
      return;
    }
    
    setIsTranslating(true);
    startProcessing();
    setStatus('loading');
    setError(null);
  };

  const handleStopTranslation = () => {
    stopProcessing();
    setIsTranslating(false);
    setStatus('idle');
  };

  useEffect(() => {
    if (translatedText && isTranslating) {
      const newResult: TranslationResult = {
        original: detectedGesture?.name || 'unknown gesture',
        translated: translatedText,
        confidence: detectedGesture?.confidence || 0.5,
      };
      
      setTranslationResult(newResult);
      setStatus('success');
      
      textToSpeech({
        text: translatedText,
        lang: spokenLanguage.code,
        onError: (error) => {
          console.error('TTS error:', error);
          setError(error);
        },
      });
    }
  }, [translatedText, detectedGesture, isTranslating, spokenLanguage, setTranslationResult, setError]);

  useEffect(() => {
    if (recognitionError) {
      setError(recognitionError);
      setStatus('error');
    }
  }, [recognitionError, setError]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Sign to Speech Translation</h2>
        <p className="text-gray-600 mb-6">
          Use your webcam to capture sign language gestures. Our AI will translate them into spoken language.
        </p>
        
        {error && (
          <div className="mb-4">
            <StatusIndicator type="error" message={error} />
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <WebcamComponent
            isActive={webcamActive}
            onToggle={handleToggleWebcam}
            onStreamReady={(stream) => {
              if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play().catch(console.error);
              }
            }}
          />
          <video 
            ref={videoRef} 
            className="hidden" 
            autoPlay 
            playsInline 
            muted
          />
          <div className="mt-4">
            {webcamActive ? (
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
                Please enable webcam
              </button>
            )}
          </div>
        </div>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-800 mb-4">Language Settings</h3>
            <div className="space-y-4">
              <LanguageSelector
                languages={SUPPORTED_LANGUAGES.sign}
                selectedLanguage={signLanguage}
                onChange={setSignLanguage}
                label="Sign Language"
              />
              
              <LanguageSelector
                languages={SUPPORTED_LANGUAGES.spoken}
                selectedLanguage={spokenLanguage}
                onChange={setSpokenLanguage}
                label="Output Language"
              />
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-medium text-gray-800 mb-4">Translation Results</h3>
            <TranslationDisplay
              result={translationResult}
              isLoading={status === 'loading' && !translationResult}
              error={null}
              currentChunk={currentChunk}
              isIdle={isIdle}
              debugInfo={debugInfo}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignToSpeechPage;