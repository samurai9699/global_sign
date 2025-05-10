import { useState, useEffect, useRef, useCallback } from 'react';
import { Hands, Results } from '@mediapipe/hands';
import { HandGesture, ConversationChunk } from '../types';
import { ASL_TO_ENGLISH_MAPPING } from '../utils/constants';

const CHUNK_TIMEOUT = 1500; // 1.5 seconds for natural chunking
const CONFIDENCE_THRESHOLD = 0.85;
const GESTURE_STABILITY_THRESHOLD = 3; // Number of consistent frames needed
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
      animationFrameRef.current = requestAnimationFrame(processFrame);
    } catch (err) {
      console.error('Frame processing error:', err);
      setError('Error processing video frame');
    }
  }, [videoRef]);

  // Initialize MediaPipe Hands
  const initializeHands = useCallback(async () => {
    try {
      console.log('Initializing MediaPipe Hands');
      const hands = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });

      hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.7,
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
          lastGestureRef.current = gesture.name;
        }

        if (gestureStabilityCountRef.current >= GESTURE_STABILITY_THRESHOLD) {
          gestureCountRef.current[gesture.name] = (gestureCountRef.current[gesture.name] || 0) + 1;
          
          setDetectedGesture(gesture);
          
          const translatedWord = ASL_TO_ENGLISH_MAPPING[gesture.name];
          console.log('✅ Gesture Mapped to Text:', translatedWord);
          
          setCurrentChunk(prev => {
            const newChunk: ConversationChunk = prev || {
              gestures: [],
              text: '',
              timestamp: Date.now(),
            };
            
            // Only add the gesture if it's different from the last one
            const lastGesture = newChunk.gestures[newChunk.gestures.length - 1];
            if (!lastGesture || lastGesture.name !== gesture.name) {
              return {
                ...newChunk,
                gestures: [...newChunk.gestures, gesture],
                text: `${newChunk.text} ${translatedWord}`.trim(),
              };
            }
            return newChunk;
          });
          
          setTranslatedText(prev => `${prev} ${translatedWord}`.trim());
          console.log('✅ Text Rendered to Screen');
          resetChunkTimeout();
        }
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown processing error';
      console.error('❌ Error processing hand results:', error);
      setError(`Error processing gestures: ${error}`);
    }
  }, [resetIdleTimeout]);

  // Recognize gesture from landmarks
  const recognizeGestureFromLandmarks = (landmarks: any): HandGesture | null => {
    try {
      const thumbTip = landmarks[4];
      const indexTip = landmarks[8];
      const middleTip = landmarks[12];
      const ringTip = landmarks[16];
      const pinkyTip = landmarks[20];
      const palmBase = landmarks[0];
      
      // Calculate distances and angles for more accurate gesture recognition
      const thumbUp = thumbTip.y < landmarks[2].y && Math.abs(thumbTip.x - palmBase.x) < 0.15;
      const indexUp = indexTip.y < landmarks[5].y && Math.abs(indexTip.x - landmarks[5].x) < 0.15;
      const middleUp = middleTip.y < landmarks[9].y && Math.abs(middleTip.x - landmarks[9].x) < 0.15;
      const ringUp = ringTip.y < landmarks[13].y && Math.abs(ringTip.x - landmarks[13].x) < 0.15;
      const pinkyUp = pinkyTip.y < landmarks[17].y && Math.abs(pinkyTip.x - landmarks[17].x) < 0.15;
      
      // Thumbs up gesture
      if (thumbUp && !indexUp && !middleUp && !ringUp && !pinkyUp) {
        return {
          name: 'thumbs_up',
          confidence: 0.95,
          timestamp: Date.now(),
        };
      }
      
      // Victory sign
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
      if (!thumbUp && indexUp && middleUp && ringUp && pinkyUp) {
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
        const frequentGestures = currentChunk.gestures.filter(gesture => {
          const count = gestureCountRef.current[gesture.name] || 0;
          return count >= 2 && gesture.confidence >= CONFIDENCE_THRESHOLD;
        });
        
        if (frequentGestures.length > 0) {
          const sentence = frequentGestures
            .map(gesture => ASL_TO_ENGLISH_MAPPING[gesture.name] || '')
            .filter(Boolean)
            .join(' ');
          
          if (sentence) {
            console.log('✅ Final Translation:', sentence);
            setTranslatedText(sentence);
          }
        }
        
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
      resetIdleTimeout();
      
      // Start continuous frame processing
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