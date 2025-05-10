import { useState, useEffect, useRef, useCallback } from 'react';
import { Hands, Results } from '@mediapipe/hands';
import { HandGesture, ConversationChunk } from '../types';
import { ASL_TO_ENGLISH_MAPPING } from '../utils/constants';

const CHUNK_TIMEOUT = 1500; // 1.5 seconds for natural chunking
const CONFIDENCE_THRESHOLD = 0.85;
const GESTURE_STABILITY_THRESHOLD = 2; // Reduced from 3 to make it more responsive
const IDLE_TIMEOUT = 5000; // 5 seconds before showing "No gesture detected"

export function useSignRecognition(videoRef: React.RefObject<HTMLVideoElement>) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [detectedGesture, setDetectedGesture] = useState<HandGesture | null>(null);
  const [translatedText, setTranslatedText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [currentChunk, setCurrentChunk] = useState<ConversationChunk | null>(null);
  const [isIdle, setIsIdle] = useState(true);
  
  const handsRef = useRef<Hands | null>(null);
  const processingRef = useRef<boolean>(false);
  const chunkTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const idleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastGestureRef = useRef<string | null>(null);
  const gestureCountRef = useRef<Record<string, number>>({});
  const gestureStabilityCountRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);

  const resetIdleTimeout = useCallback(() => {
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current);
    }
    setIsIdle(false);
    idleTimeoutRef.current = setTimeout(() => {
      console.log('✅ System Idle: No gesture detected for 5 seconds');
      setIsIdle(true);
    }, IDLE_TIMEOUT);
  }, []);

  // Process video frames continuously
  const processFrame = useCallback(async () => {
    if (!videoRef.current || !handsRef.current || !processingRef.current) return;

    try {
      await handsRef.current.send({ image: videoRef.current });
    } catch (err) {
      console.error('Frame processing error:', err);
      setError('Error processing video frame');
    }

    // Request next frame immediately
    animationFrameRef.current = requestAnimationFrame(processFrame);
  }, [videoRef]);

  // Initialize MediaPipe Hands
  const initializeHands = useCallback(async () => {
    try {
      console.log('Initializing MediaPipe Hands');
      const hands = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });

      hands.setOptions({
        maxNumHands: 1, // Focus on one hand for better performance
        modelComplexity: 1,
        minDetectionConfidence: 0.6, // Lowered for better responsiveness
        minTrackingConfidence: 0.6,
      });

      hands.onResults((results: Results) => {
        if (!processingRef.current) return;
        processHandResults(results);
      });

      handsRef.current = hands;
      console.log('✅ MediaPipe Hands initialized successfully');
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown initialization error';
      console.error('❌ Failed to initialize MediaPipe Hands:', error);
      setError(`Failed to initialize hand tracking: ${error}`);
    }
  }, []);

  // Process hand tracking results
  const processHandResults = useCallback((results: Results) => {
    try {
      resetIdleTimeout();

      if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
        return;
      }

      const landmarks = results.multiHandLandmarks[0];
      const gesture = recognizeGestureFromLandmarks(landmarks);
      
      if (gesture) {
        console.log('✅ Gesture Detected:', gesture.name);
        
        if (lastGestureRef.current === gesture.name) {
          gestureStabilityCountRef.current++;
        } else {
          gestureStabilityCountRef.current = 1;
        }

        lastGestureRef.current = gesture.name;

        if (gestureStabilityCountRef.current >= GESTURE_STABILITY_THRESHOLD) {
          gestureCountRef.current[gesture.name] = (gestureCountRef.current[gesture.name] || 0) + 1;
          
          setDetectedGesture(gesture);
          
          const translatedWord = ASL_TO_ENGLISH_MAPPING[gesture.name];
          console.log('✅ Gesture Mapped to Text:', translatedWord);
          
          // Update the current chunk with the new gesture
          setCurrentChunk(prev => {
            if (!prev) {
              return {
                gestures: [gesture],
                text: translatedWord,
                timestamp: Date.now(),
              };
            }

            // Only add if it's a new gesture
            const lastGesture = prev.gestures[prev.gestures.length - 1];
            if (!lastGesture || lastGesture.name !== gesture.name) {
              return {
                ...prev,
                gestures: [...prev.gestures, gesture],
                text: `${prev.text} ${translatedWord}`.trim(),
              };
            }

            return prev;
          });
          
          // Update the translated text immediately
          setTranslatedText(prev => {
            const newText = prev ? `${prev} ${translatedWord}`.trim() : translatedWord;
            console.log('✅ Updated translation:', newText);
            return newText;
          });
          
          resetChunkTimeout();
        }
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown processing error';
      console.error('❌ Error processing hand results:', error);
      setError(`Error processing gestures: ${error}`);
    }
  }, [resetIdleTimeout]);

  const recognizeGestureFromLandmarks = (landmarks: any): HandGesture | null => {
    try {
      const thumbTip = landmarks[4];
      const indexTip = landmarks[8];
      const middleTip = landmarks[12];
      const ringTip = landmarks[16];
      const pinkyTip = landmarks[20];
      const palmBase = landmarks[0];

      // Calculate finger states with relaxed thresholds
      const threshold = 0.2;
      const thumbUp = thumbTip.y < landmarks[2].y;
      const indexUp = indexTip.y < landmarks[5].y - threshold;
      const middleUp = middleTip.y < landmarks[9].y - threshold;
      const ringUp = ringTip.y < landmarks[13].y - threshold;
      const pinkyUp = pinkyTip.y < landmarks[17].y - threshold;

      // Thumbs up
      if (thumbUp && !indexUp && !middleUp && !ringUp && !pinkyUp) {
        return {
          name: 'thumbs_up',
          confidence: 0.95,
          timestamp: Date.now(),
        };
      }

      // Victory/Peace sign
      if (!thumbUp && indexUp && middleUp && !ringUp && !pinkyUp) {
        return {
          name: 'victory',
          confidence: 0.95,
          timestamp: Date.now(),
        };
      }

      // Pointing up
      if (!thumbUp && indexUp && !middleUp && !ringUp && !pinkyUp) {
        return {
          name: 'pointing_up',
          confidence: 0.95,
          timestamp: Date.now(),
        };
      }

      // Open palm (hello)
      if (indexUp && middleUp && ringUp && pinkyUp) {
        return {
          name: 'open_palm',
          confidence: 0.95,
          timestamp: Date.now(),
        };
      }

      return null;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown gesture recognition error';
      console.error('❌ Error recognizing gesture:', error);
      throw new Error(`Failed to recognize gesture: ${error}`);
    }
  };

  const resetChunkTimeout = useCallback(() => {
    if (chunkTimeoutRef.current) {
      clearTimeout(chunkTimeoutRef.current);
    }
    
    chunkTimeoutRef.current = setTimeout(() => {
      if (currentChunk && currentChunk.gestures.length > 0) {
        console.log('✅ Finalizing translation chunk');
        setCurrentChunk(null);
        lastGestureRef.current = null;
        gestureCountRef.current = {};
        gestureStabilityCountRef.current = 0;
      }
    }, CHUNK_TIMEOUT);
  }, [currentChunk]);

  const startProcessing = useCallback(async () => {
    if (!videoRef.current || !handsRef.current) {
      setError('Video or hand tracking not available');
      return;
    }
    
    try {
      console.log('✅ Starting gesture recognition');
      setIsProcessing(true);
      processingRef.current = true;
      setCurrentChunk(null);
      lastGestureRef.current = null;
      gestureCountRef.current = {};
      gestureStabilityCountRef.current = 0;
      setError(null);
      setTranslatedText('');
      resetIdleTimeout();
      
      processFrame();
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown start error';
      console.error('❌ Error starting gesture recognition:', error);
      setError(`Failed to start gesture recognition: ${error}`);
    }
  }, [videoRef, resetIdleTimeout, processFrame]);

  const stopProcessing = useCallback(() => {
    console.log('Stopping gesture recognition');
    setIsProcessing(false);
    processingRef.current = false;
    setDetectedGesture(null);
    setTranslatedText('');
    setCurrentChunk(null);
    lastGestureRef.current = null;
    gestureCountRef.current = {};
    gestureStabilityCountRef.current = 0;
    
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
    startProcessing,
    stopProcessing,
  };
}