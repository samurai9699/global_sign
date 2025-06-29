import React, { useState, useEffect, useCallback } from 'react';
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
  const lastSpokenTextRef = React.useRef<string>('');
  
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
    sentenceInProgress,
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
    lastSpokenTextRef.current = '';
  };

  const handleStopTranslation = () => {
    stopProcessing();
    setIsTranslating(false);
    setStatus('idle');
  };

  const handleStreamReady = (stream: MediaStream) => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      
      const playVideo = () => {
        if (videoRef.current && videoRef.current.readyState === 4 && videoRef.current.paused) {
          videoRef.current.play().catch(error => {
            console.error('Error playing video:', error);
          });
        }
      };

      videoRef.current.addEventListener('canplay', playVideo);
      playVideo();
    }
  };

  const speakText = useCallback((text: string) => {
    // Only speak if the text has changed and is not empty
    if (!text || text === lastSpokenTextRef.current) {
      return;
    }

    lastSpokenTextRef.current = text;
    textToSpeech({
      text,
      lang: spokenLanguage.code,
      onError: (error) => {
        console.error('TTS error:', error);
        // Don't set error for cancellations
        if (!error.toLowerCase().includes('cancel') && !error.toLowerCase().includes('interrupt')) {
          setError(`Speech error: ${error}`);
        }
      },
    });
  }, [spokenLanguage.code, setError]);

  // Handle completed translations (when sentences are finalized)
  useEffect(() => {
    if (translatedText && isTranslating) {
      const newResult: TranslationResult = {
        original: 'gesture sequence',
        translated: translatedText,
        confidence: 0.9,
      };
      
      setTranslationResult(newResult);
      setStatus('success');
      
      // Speak the completed sentence
      speakText(translatedText);
    }
  }, [translatedText, isTranslating, speakText, setTranslationResult]);

  useEffect(() => {
    if (recognitionError) {
      setError(recognitionError);
      setStatus('error');
    }
  }, [recognitionError, setError]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-4">Sign to Speech Translation</h2>
        <p className="text-gray-600 mb-6">
          Make clear gestures to build sentences. Each completed sentence will be spoken aloud.
        </p>
        
        {error && (
          <div className="mb-4">
            <StatusIndicator type="error" message={error} />
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <WebcamComponent
              isActive={webcamActive}
              onToggle={handleToggleWebcam}
              onStreamReady={handleStreamReady}
            />
            <video 
              ref={videoRef} 
              className="hidden" 
              autoPlay 
              playsInline 
              muted
            />
          </div>
          
          <div className="mt-6">
            {webcamActive ? (
              isTranslating ? (
                <button
                  onClick={handleStopTranslation}
                  className="w-full py-3 px-6 bg-error-500 text-white rounded-lg hover:bg-error-600 transition-colors font-medium"
                >
                  Stop Translation
                </button>
              ) : (
                <button
                  onClick={handleStartTranslation}
                  className="w-full py-3 px-6 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors font-medium"
                >
                  Start Gesture Recognition
                </button>
              )
            ) : (
              <button
                className="w-full py-3 px-6 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed font-medium"
                disabled
              >
                Please enable webcam first
              </button>
            )}
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Language Settings</h3>
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
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Translation Results</h3>
            <TranslationDisplay
              result={translationResult}
              isLoading={status === 'loading' && !translationResult}
              error={null}
              currentChunk={currentChunk}
              isIdle={isIdle}
              debugInfo={debugInfo}
              sentenceInProgress={sentenceInProgress}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignToSpeechPage;