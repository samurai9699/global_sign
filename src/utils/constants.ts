import { Language, SupportedLanguage } from '../types';

export const SUPPORTED_LANGUAGES: SupportedLanguage = {
  spoken: [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'es', name: 'Spanish', nativeName: 'Español' },
    { code: 'fr', name: 'French', nativeName: 'Français' },
    { code: 'de', name: 'German', nativeName: 'Deutsch' },
    { code: 'zh', name: 'Chinese', nativeName: '中文' },
    { code: 'ja', name: 'Japanese', nativeName: '日本語' },
    { code: 'ru', name: 'Russian', nativeName: 'Русский' },
    { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  ],
  sign: [
    { code: 'asl', name: 'American Sign Language', nativeName: 'ASL' },
    { code: 'bsl', name: 'British Sign Language', nativeName: 'BSL' },
    { code: 'auslan', name: 'Australian Sign Language', nativeName: 'Auslan' },
    { code: 'lsf', name: 'French Sign Language', nativeName: 'LSF' },
    { code: 'dgs', name: 'German Sign Language', nativeName: 'DGS' },
    { code: 'csl', name: 'Chinese Sign Language', nativeName: 'CSL' },
    { code: 'jsl', name: 'Japanese Sign Language', nativeName: 'JSL' },
    { code: 'rsl', name: 'Russian Sign Language', nativeName: 'RSL' },
  ],
};

export const DEFAULT_SPOKEN_LANGUAGE: Language = SUPPORTED_LANGUAGES.spoken[0];
export const DEFAULT_SIGN_LANGUAGE: Language = SUPPORTED_LANGUAGES.sign[0];

export const HAND_MODEL_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/';

// Enhanced gesture mappings optimized for conversation building
export const ASL_TO_ENGLISH_MAPPING: Record<string, string> = {
  'thumbs_up': 'yes',
  'thumbs_down': 'no',
  'victory': 'peace',
  'pointing_up': 'up',
  'pointing_down': 'down',
  'open_palm': 'hello',
  'closed_fist': 'stop',
  'ok_sign': 'okay',
  'wave': 'goodbye',
  'pinch': 'small',
  'spread_fingers': 'big',
  'index_middle': 'two',
  'three_fingers': 'three',
  'four_fingers': 'four',
  'five_fingers': 'five',
};