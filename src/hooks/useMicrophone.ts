import { useState, useCallback, useEffect } from 'react';

type MicrophoneOptions = {
  onStream?: (stream: MediaStream) => void;
  onError?: (error: Error) => void;
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
};

export function useMicrophone({
  onStream,
  onError,
  echoCancellation = true,
  noiseSuppression = true,
}: MicrophoneOptions = {}) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const startMicrophone = useCallback(async () => {
    try {
      const constraints = {
        audio: {
          echoCancellation,
          noiseSuppression,
        },
        video: false,
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      setIsActive(true);
      onStream?.(mediaStream);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error occurred while accessing the microphone');
      setError(error);
      onError?.(error);
    }
  }, [echoCancellation, noiseSuppression, onStream, onError]);

  const stopMicrophone = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => {
        track.stop();
      });
      setStream(null);
      setIsActive(false);
    }
  }, [stream]);

  useEffect(() => {
    return () => {
      stopMicrophone();
    };
  }, [stopMicrophone]);

  return {
    stream,
    isActive,
    error,
    startMicrophone,
    stopMicrophone,
  };
}