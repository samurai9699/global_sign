import { useState, useEffect, useRef, useCallback } from 'react';
import { Hands, Results } from '@mediapipe/hands';
import { HandGesture, ConversationChunk } from '../types';
import { ASL_TO_ENGLISH_MAPPING } from '../utils/constants';

const CHUNK_TIMEOUT = 1500;
const CONFIDENCE_THRESHOLD = 0.3;
const GESTURE_STABILITY_THRESHOLD = 2;
const IDLE_TIMEOUT = 3000;
const GESTURE_COOLDOWN = 2000; // Add cooldown period between gestures

export function useSignRecognition(videoRef: React.RefObject<HTMLVideoElement>) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [detectedGesture, setDetectedGesture] = useState<HandGesture | null>(null);
  const [translatedText, setTranslatedText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [currentChunk, setCurrentChunk] = useState<ConversationChunk | null>(null);
  const [isIdle, setIsIdle] = useState(true);
  const [debugInfo, setDebugInfo] = useState<string>('');
  
  const handsRef = useRef<Hands | null>(null);
  const processingRef = useRef<boolean>(false);
  const chunkTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const idleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastGestureRef = useRef<string | null>(null);
  const gestureCountRef = useRef<Record<string, number>>({});
  const gestureStabilityCountRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);
  const lastGestureTimeRef = useRef<number>(0);

  const resetIdleTimeout = useCallback(() => {
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current);
    }
    setIsIdle(false);
    idleTimeoutRef.current = setTimeout(() => {
      setIsIdle(true);
      // Reset gesture state when idle
      lastGestureRef.current = null;
      gestureStabilityCountRef.current = 0;
      setDetectedGesture(null);
    }, IDLE_TIMEOUT);
  }, []);

  const processFrame = useCallback(async () => {
    if (!videoRef.current || !handsRef.current || !processingRef.current) return;

    try {
      await handsRef.current.send({ image: videoRef.current });
    } catch (err) {
      console.error('Frame processing error:', err);
      setError('Error processing video frame');
    }

    if (processingRef.current) {
      animationFrameRef.current = requestAnimationFrame(processFrame);
    }
  }, [videoRef]);

  const initializeHands = useCallback(async () => {
    try {
      const hands = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.3,
        minTrackingConfidence: 0.3,
      });

      hands.onResults((results: Results) => {
        if (!processingRef.current) return;
        processHandResults(results);
      });

      handsRef.current = hands;
      setDebugInfo('MediaPipe Hands initialized');
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown initialization error';
      console.error('Failed to initialize MediaPipe Hands:', error);
      setError(`Failed to initialize hand tracking: ${error}`);
    }
  }, []);

  const processHandResults = useCallback((results: Results) => {
    try {
      resetIdleTimeout();

      if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
        setDebugInfo('No hands detected');
        return;
      }

      const landmarks = results.multiHandLandmarks[0];
      setDebugInfo(`Processing landmarks: ${landmarks.length} points detected`);

      const gesture = recognizeGestureFromLandmarks(landmarks);
      const currentTime = Date.now();
      
      if (gesture) {
        const currentGestureName = gesture.name;
        setDebugInfo(`Detected gesture: ${currentGestureName}`);

        // Check if enough time has passed since the last gesture
        if (currentTime - lastGestureTimeRef.current < GESTURE_COOLDOWN) {
          return;
        }

        if (lastGestureRef.current === currentGestureName) {
          gestureStabilityCountRef.current++;
          setDebugInfo(`Stability count: ${gestureStabilityCountRef.current}`);
        } else {
          gestureStabilityCountRef.current = 1;
        }

        if (gestureStabilityCountRef.current >= GESTURE_STABILITY_THRESHOLD) {
          // Only process if it's a new gesture or enough time has passed
          if (lastGestureRef.current !== currentGestureName || 
              currentTime - lastGestureTimeRef.current >= GESTURE_COOLDOWN) {
            
            setDetectedGesture(gesture);
            const translatedWord = ASL_TO_ENGLISH_MAPPING[currentGestureName];

            setCurrentChunk(prev => {
              const newChunk: ConversationChunk = {
                gestures: prev ? [...prev.gestures, gesture] : [gesture],
                text: prev ? `${prev.text} ${translatedWord}`.trim() : translatedWord,
                timestamp: Date.now(),
              };
              return newChunk;
            });

            setTranslatedText(prev => {
              const newText = `${prev ? prev + ' ' : ''}${translatedWord}`.trim();
              return newText;
            });

            // Update last gesture time
            lastGestureTimeRef.current = currentTime;

            if (chunkTimeoutRef.current) {
              clearTimeout(chunkTimeoutRef.current);
            }
            
            chunkTimeoutRef.current = setTimeout(() => {
              setCurrentChunk(null);
              lastGestureRef.current = null;
              gestureStabilityCountRef.current = 0;
            }, CHUNK_TIMEOUT);
          }
        }

        lastGestureRef.current = currentGestureName;
      } else {
        setDebugInfo('No gesture recognized from landmarks');
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown processing error';
      console.error('Error processing hand results:', error);
      setError(`Error processing gestures: ${error}`);
    }
  }, [resetIdleTimeout]);

  const recognizeGestureFromLandmarks = (landmarks: any): HandGesture | null => {
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];
    const wrist = landmarks[0];

    const threshold = 0.1;
    
    const thumbUp = thumbTip.y < wrist.y - threshold;
    const thumbDown = thumbTip.y > wrist.y + threshold;
    const indexUp = indexTip.y < wrist.y - threshold;
    const middleUp = middleTip.y < wrist.y - threshold;
    const ringUp = ringTip.y < wrist.y - threshold;
    const pinkyUp = pinkyTip.y < wrist.y - threshold;

    setDebugInfo(`Finger positions - Thumb: ${thumbUp ? 'up' : 'down'}, Index: ${indexUp ? 'up' : 'down'}, Middle: ${middleUp ? 'up' : 'down'}`);

    if (thumbUp && !indexUp && !middleUp && !ringUp && !pinkyUp) {
      return { name: 'thumbs_up', confidence: 0.9, timestamp: Date.now() };
    }

    if (thumbDown && !indexUp && !middleUp && !ringUp && !pinkyUp) {
      return { name: 'thumbs_down', confidence: 0.9, timestamp: Date.now() };
    }

    if (!thumbUp && indexUp && middleUp && !ringUp && !pinkyUp) {
      return { name: 'victory', confidence: 0.9, timestamp: Date.now() };
    }

    if (!thumbUp && indexUp && !middleUp && !ringUp && !pinkyUp) {
      return { name: 'pointing_up', confidence: 0.9, timestamp: Date.now() };
    }

    if (indexUp && middleUp && ringUp && pinkyUp) {
      return { name: 'open_palm', confidence: 0.9, timestamp: Date.now() };
    }

    if (!indexUp && !middleUp && !ringUp && !pinkyUp) {
      return { name: 'closed_fist', confidence: 0.9, timestamp: Date.now() };
    }

    return null;
  };

  const startProcessing = useCallback(async () => {
    if (!videoRef.current || !handsRef.current) {
      setError('Video or hand tracking not available');
      return;
    }
    
    try {
      setDebugInfo('Starting gesture recognition');
      setIsProcessing(true);
      processingRef.current = true;
      setCurrentChunk(null);
      lastGestureRef.current = null;
      gestureCountRef.current = {};
      gestureStabilityCountRef.current = 0;
      lastGestureTimeRef.current = 0;
      setTranslatedText('');
      setError(null);
      resetIdleTimeout();
      
      processFrame();
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown start error';
      console.error('Error starting gesture recognition:', error);
      setError(`Failed to start gesture recognition: ${error}`);
    }
  }, [videoRef, resetIdleTimeout, processFrame]);

  const stopProcessing = useCallback(() => {
    setDebugInfo('Stopping gesture recognition');
    setIsProcessing(false);
    processingRef.current = false;
    setDetectedGesture(null);
    setTranslatedText('');
    setCurrentChunk(null);
    lastGestureRef.current = null;
    gestureCountRef.current = {};
    gestureStabilityCountRef.current = 0;
    lastGestureTimeRef.current = 0;
    
    if (chunkTimeoutRef.current) {
      clearTimeout(chunkTimeoutRef.current);
    }
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current);
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, []);

  useEffect(() => {
    initializeHands();
    return () => {
      stopProcessing();
    };
  }, [initializeHands, stopProcessing]);

  return {
    isProcessing,
    detectedGesture,
    translatedText,
    error,
    currentChunk,
    isIdle,
    debugInfo,
    startProcessing,
    stopProcessing,
  };
}