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
  const ttsTimeoutRef = React.useRef<NodeJS.Timeout>();
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
    
    // Clear any pending TTS timeout
    if (ttsTimeoutRef.current) {
      clearTimeout(ttsTimeoutRef.current);
    }
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

  const debouncedTextToSpeech = useCallback((text: string) => {
    // Only speak if the text has changed and is not empty
    if (!text || text === lastSpokenTextRef.current) {
      return;
    }

    // Clear any existing timeout
    if (ttsTimeoutRef.current) {
      clearTimeout(ttsTimeoutRef.current);
    }

    // Set a new timeout
    ttsTimeoutRef.current = setTimeout(() => {
      lastSpokenTextRef.current = text;
      textToSpeech({
        text,
        lang: spokenLanguage.code,
        onError: (error) => {
          if (!error.toLowerCase().includes('cancel') && !error.toLowerCase().includes('interrupt')) {
            console.error('TTS error:', error);
            setError(error);
          }
        },
      });
    }, 800); // Longer debounce for sentence completion
  }, [spokenLanguage.code, setError]);

  // Handle completed translations (when sentences are finalized)
  useEffect(() => {
    if (translatedText && isTranslating && translatedText !== lastSpokenTextRef.current) {
      const newResult: TranslationResult = {
        original: 'gesture sequence',
        translated: translatedText,
        confidence: 0.9,
      };
      
      setTranslationResult(newResult);
      setStatus('success');
      
      // Speak the completed sentence
      debouncedTextToSpeech(translatedText);
    }
  }, [translatedText, isTranslating, debouncedTextToSpeech, setTranslationResult]);

  useEffect(() => {
    if (recognitionError) {
      setError(recognitionError);
      setStatus('error');
    }
  }, [recognitionError, setError]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (ttsTimeoutRef.current) {
        clearTimeout(ttsTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Sign to Speech Translation</h2>
        <p className="text-gray-600 mb-6">
          Use your webcam to capture sign language gestures. Create sentences by making multiple gestures in sequence.
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
            onStreamReady={handleStreamReady}
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
                  Start Conversation Mode
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

          {/* Conversation tips */}
          {isTranslating && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <h3 className="text-sm font-medium text-blue-800 mb-2">Conversation Tips:</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Hold each gesture clearly for about 1 second</li>
                <li>• Pause briefly between gestures</li>
                <li>• Your sentence will be spoken when completed</li>
                <li>• Available gestures: thumbs up (yes), thumbs down (no), peace sign (peace), pointing up (up), open palm (hello), closed fist (stop)</li>
              </ul>
            </div>
          )}
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
              sentenceInProgress={sentenceInProgress}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignToSpeechPage;