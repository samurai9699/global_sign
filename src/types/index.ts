export type Language = {
  code: string;
  name: string;
  nativeName: string;
};

export type SupportedLanguage = {
  spoken: Language[];
  sign: Language[];
};

export enum TranslationMode {
  SignToSpeech = 'signToSpeech',
  SpeechToSign = 'speechToSign',
}

export type HandGesture = {
  name: string;
  confidence: number;
  landmarks?: any;
  timestamp: number;
};

export type TranslationResult = {
  original: string;
  translated: string;
  confidence: number;
  isPartial?: boolean;
};

export type ConversationChunk = {
  gestures: HandGesture[];
  text: string;
  timestamp: number;
};

export type AppState = {
  mode: TranslationMode;
  setMode: (mode: TranslationMode) => void;
  
  spokenLanguage: Language;
  setSpokenLanguage: (language: Language) => void;
  
  signLanguage: Language;
  setSignLanguage: (language: Language) => void;
  
  webcamActive: boolean;
  setWebcamActive: (active: boolean) => void;
  
  microphoneActive: boolean;
  setMicrophoneActive: (active: boolean) => void;
  
  isTranslating: boolean;
  setIsTranslating: (translating: boolean) => void;
  
  translationResult: TranslationResult | null;
  setTranslationResult: (result: TranslationResult | null) => void;
  
  error: string | null;
  setError: (error: string | null) => void;
  
  conversationMode: boolean;
  setConversationMode: (enabled: boolean) => void;
  
  currentChunk: ConversationChunk | null;
  setCurrentChunk: (chunk: ConversationChunk | null) => void;
};