import { useState, useEffect, useCallback } from 'react';
import { Language } from '../types';

type SpeechRecognitionOptions = {
  language?: Language;
  continuous?: boolean;
  interimResults?: boolean;
  onResult?: (transcript: string) => void;
  onError?: (error: string) => void;
};

// Type declarations for the Web Speech API
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
}

interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative;
  length: number;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

// For TypeScript compatibility with the Speech Recognition API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export function useSpeechRecognition({
  language = { code: 'en', name: 'English', nativeName: 'English' },
  continuous = true,
  interimResults = true,
  onResult,
  onError,
}: SpeechRecognitionOptions = {}) {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [recognition, setRecognition] = useState<any | null>(null);

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      const errorMsg = 'Speech recognition is not supported in this browser';
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }
    
    const recognitionInstance = new SpeechRecognition();
    recognitionInstance.continuous = continuous;
    recognitionInstance.interimResults = interimResults;
    recognitionInstance.lang = language.code;
    
    recognitionInstance.onresult = (event: SpeechRecognitionEvent) => {
      const current = event.resultIndex;
      const result = event.results[current][0];
      const transcriptText = result.transcript;
      
      setTranscript(transcriptText);
      onResult?.(transcriptText);
    };
    
    recognitionInstance.onerror = (event: any) => {
      const errorMsg = `Speech recognition error: ${event.error}`;
      setError(errorMsg);
      onError?.(errorMsg);
    };
    
    setRecognition(recognitionInstance);
    
    return () => {
      if (recognitionInstance) {
        recognitionInstance.stop();
      }
    };
  }, [language, continuous, interimResults, onResult, onError]);

  const startListening = useCallback(() => {
    if (!recognition) return;
    
    try {
      recognition.start();
      setIsListening(true);
      setError(null);
    } catch (err) {
      const errorMsg = 'Error starting speech recognition';
      setError(errorMsg);
      onError?.(errorMsg);
    }
  }, [recognition, onError]);

  const stopListening = useCallback(() => {
    if (!recognition) return;
    
    try {
      recognition.stop();
      setIsListening(false);
    } catch (err) {
      const errorMsg = 'Error stopping speech recognition';
      setError(errorMsg);
      onError?.(errorMsg);
    }
  }, [recognition, onError]);

  // Update language if it changes
  useEffect(() => {
    if (recognition) {
      recognition.lang = language.code;
    }
  }, [language, recognition]);

  return {
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
  };
}