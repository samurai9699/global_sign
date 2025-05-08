import { create } from 'zustand';
import { 
  TranslationMode, 
  AppState,
  TranslationResult,
  ConversationChunk
} from '../types';
import { 
  DEFAULT_SPOKEN_LANGUAGE, 
  DEFAULT_SIGN_LANGUAGE 
} from '../utils/constants';

export const useAppStore = create<AppState>((set) => ({
  mode: TranslationMode.SignToSpeech,
  setMode: (mode) => set({ mode }),
  
  spokenLanguage: DEFAULT_SPOKEN_LANGUAGE,
  setSpokenLanguage: (language) => set({ spokenLanguage: language }),
  
  signLanguage: DEFAULT_SIGN_LANGUAGE,
  setSignLanguage: (language) => set({ signLanguage: language }),
  
  webcamActive: false,
  setWebcamActive: (active) => set({ webcamActive: active }),
  
  microphoneActive: false,
  setMicrophoneActive: (active) => set({ microphoneActive: active }),
  
  isTranslating: false,
  setIsTranslating: (translating) => set({ isTranslating: translating }),
  
  translationResult: null,
  setTranslationResult: (result: TranslationResult | null) => set({ translationResult: result }),
  
  error: null,
  setError: (error) => set({ error }),
  
  conversationMode: false,
  setConversationMode: (enabled) => set({ conversationMode: enabled }),
  
  currentChunk: null,
  setCurrentChunk: (chunk: ConversationChunk | null) => set({ currentChunk: chunk }),
}));