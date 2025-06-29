interface TextToSpeechOptions {
  text: string;
  lang?: string;
  volume?: number;
  rate?: number;
  pitch?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
}

export const textToSpeech = ({
  text,
  lang = 'en-US',
  volume = 1,
  rate = 1,
  pitch = 1,
  onStart,
  onEnd,
  onError,
}: TextToSpeechOptions): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!('speechSynthesis' in window)) {
      const error = 'Text-to-speech is not supported in this browser';
      onError?.(error);
      reject(new Error(error));
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.volume = volume;
    utterance.rate = rate;
    utterance.pitch = pitch;

    utterance.onstart = () => {
      onStart?.();
    };

    utterance.onend = () => {
      onEnd?.();
      resolve();
    };

    utterance.onerror = (event) => {
      const errorType = event.error || 'unknown';
      
      // Handle intentional cancellations as normal operations, not errors
      if (errorType === 'canceled' || errorType === 'interrupted') {
        resolve();
        return;
      }
      
      // For actual errors, reject the promise and call the error handler
      const errorMessage = `Speech synthesis error: ${errorType}`;
      onError?.(errorMessage);
      reject(new Error(errorMessage));
    };

    window.speechSynthesis.speak(utterance);
  });
};

export const getAvailableVoices = (): Promise<SpeechSynthesisVoice[]> => {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) {
      resolve([]);
      return;
    }

    // Firefox needs a bit of time to populate the voices
    let voices = window.speechSynthesis.getVoices();
    
    if (voices.length > 0) {
      resolve(voices);
    } else {
      window.speechSynthesis.onvoiceschanged = () => {
        voices = window.speechSynthesis.getVoices();
        resolve(voices);
      };
    }
  });
};