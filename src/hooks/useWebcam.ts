import { useState, useRef, useEffect, useCallback } from 'react';

type WebcamOptions = {
  onStream?: (stream: MediaStream) => void;
  onError?: (error: Error) => void;
  width?: number;
  height?: number;
  facingMode?: 'user' | 'environment';
};

export function useWebcam({
  onStream,
  onError,
  width = 640,
  height = 480,
  facingMode = 'user',
}: WebcamOptions = {}) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const startWebcam = useCallback(async () => {
    try {
      const constraints = {
        audio: false,
        video: {
          width: { ideal: width },
          height: { ideal: height },
          facingMode,
        },
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      
      setIsActive(true);
      onStream?.(mediaStream);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error occurred while accessing the webcam');
      setError(error);
      onError?.(error);
    }
  }, [width, height, facingMode, onStream, onError]);

  const stopWebcam = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => {
        track.stop();
      });
      setStream(null);
      
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      
      setIsActive(false);
    }
  }, [stream]);

  useEffect(() => {
    return () => {
      stopWebcam();
    };
  }, [stopWebcam]);

  return {
    videoRef,
    stream,
    isActive,
    error,
    startWebcam,
    stopWebcam,
  };
}