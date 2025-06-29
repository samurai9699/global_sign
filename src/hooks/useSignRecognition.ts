import { useState, useEffect, useRef, useCallback } from 'react';
import { Hands, Results } from '@mediapipe/hands';
import { HandGesture, ConversationChunk } from '../types';
import { ASL_TO_ENGLISH_MAPPING } from '../utils/constants';

const GESTURE_HOLD_TIME = 800; // Time to hold gesture for recognition
const GESTURE_PAUSE_TIME = 300; // Pause between gestures
const SENTENCE_TIMEOUT = 4000; // Time before ending current sentence
const CONFIDENCE_THRESHOLD = 0.3;
const GESTURE_STABILITY_THRESHOLD = 3; // Frames needed for stable gesture
const IDLE_TIMEOUT = 6000; // Longer idle timeout for conversations

export function useSignRecognition(videoRef: React.RefObject<HTMLVideoElement>) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [detectedGesture, setDetectedGesture] = useState<HandGesture | null>(null);
  const [translatedText, setTranslatedText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [currentChunk, setCurrentChunk] = useState<ConversationChunk | null>(null);
  const [isIdle, setIsIdle] = useState(true);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [sentenceInProgress, setSentenceInProgress] = useState<string>('');
  
  const handsRef = useRef<Hands | null>(null);
  const processingRef = useRef<boolean>(false);
  const sentenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const idleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const gestureHoldTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  // Gesture tracking state
  const currentGestureRef = useRef<string | null>(null);
  const gestureStabilityCountRef = useRef<number>(0);
  const gestureStartTimeRef = useRef<number>(0);
  const lastProcessedGestureRef = useRef<string | null>(null);
  const lastProcessedTimeRef = useRef<number>(0);
  const isWaitingForNextGestureRef = useRef<boolean>(false);

  const resetIdleTimeout = useCallback(() => {
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current);
    }
    setIsIdle(false);
    idleTimeoutRef.current = setTimeout(() => {
      setIsIdle(true);
      setSentenceInProgress('');
      setCurrentChunk(null);
      setDetectedGesture(null);
      currentGestureRef.current = null;
      gestureStabilityCountRef.current = 0;
      lastProcessedGestureRef.current = null;
      isWaitingForNextGestureRef.current = false;
    }, IDLE_TIMEOUT);
  }, []);

  const resetSentenceTimeout = useCallback(() => {
    if (sentenceTimeoutRef.current) {
      clearTimeout(sentenceTimeoutRef.current);
    }
    sentenceTimeoutRef.current = setTimeout(() => {
      // Finalize current sentence
      if (sentenceInProgress) {
        setTranslatedText(prev => {
          const newSentence = sentenceInProgress.trim();
          return prev ? `${prev}. ${newSentence}` : newSentence;
        });
        setSentenceInProgress('');
        setCurrentChunk(null);
      }
      lastProcessedGestureRef.current = null;
      isWaitingForNextGestureRef.current = false;
    }, SENTENCE_TIMEOUT);
  }, [sentenceInProgress]);

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
        minDetectionConfidence: 0.4,
        minTrackingConfidence: 0.4,
      });

      hands.onResults((results: Results) => {
        if (!processingRef.current) return;
        processHandResults(results);
      });

      handsRef.current = hands;
      setDebugInfo('MediaPipe Hands initialized for conversation mode');
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown initialization error';
      console.error('Failed to initialize MediaPipe Hands:', error);
      setError(`Failed to initialize hand tracking: ${error}`);
    }
  }, []);

  const isFingerExtended = (tipLandmark: any, mcpLandmark: any): boolean => {
    return tipLandmark.y < mcpLandmark.y - 0.025;
  };

  const isThumbExtended = (thumbTip: any, thumbMcp: any, wrist: any): boolean => {
    const thumbDistance = Math.abs(thumbTip.x - wrist.x);
    const mcpDistance = Math.abs(thumbMcp.x - wrist.x);
    return thumbDistance > mcpDistance + 0.04;
  };

  const processHandResults = useCallback((results: Results) => {
    try {
      resetIdleTimeout();

      if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
        // No hands detected - reset current gesture tracking
        if (currentGestureRef.current) {
          currentGestureRef.current = null;
          gestureStabilityCountRef.current = 0;
          setDetectedGesture(null);
          
          // If we were waiting for the next gesture, continue waiting
          if (!isWaitingForNextGestureRef.current) {
            isWaitingForNextGestureRef.current = true;
            setDebugInfo('Waiting for next gesture...');
          }
        }
        return;
      }

      const landmarks = results.multiHandLandmarks[0];
      const gesture = recognizeGestureFromLandmarks(landmarks);
      const currentTime = Date.now();
      
      if (gesture) {
        const gestureName = gesture.name;
        
        // Check if this is the same gesture as currently being tracked
        if (currentGestureRef.current === gestureName) {
          gestureStabilityCountRef.current++;
          
          // Check if gesture has been held long enough and is stable
          if (gestureStabilityCountRef.current >= GESTURE_STABILITY_THRESHOLD) {
            const holdTime = currentTime - gestureStartTimeRef.current;
            
            if (holdTime >= GESTURE_HOLD_TIME) {
              // Check if this gesture is different from the last processed one
              // or enough time has passed since the last gesture
              const timeSinceLastGesture = currentTime - lastProcessedTimeRef.current;
              
              if (lastProcessedGestureRef.current !== gestureName || 
                  timeSinceLastGesture >= GESTURE_PAUSE_TIME) {
                
                // Process the gesture
                const translatedWord = ASL_TO_ENGLISH_MAPPING[gestureName];
                
                setDetectedGesture(gesture);
                
                // Add to current sentence
                setSentenceInProgress(prev => {
                  const newSentence = prev ? `${prev} ${translatedWord}` : translatedWord;
                  return newSentence.trim();
                });

                // Update current chunk for display
                setCurrentChunk(prev => {
                  const newChunk: ConversationChunk = {
                    gestures: prev ? [...prev.gestures, gesture] : [gesture],
                    text: prev ? `${prev.text} ${translatedWord}`.trim() : translatedWord,
                    timestamp: Date.now(),
                  };
                  return newChunk;
                });

                // Update tracking variables
                lastProcessedGestureRef.current = gestureName;
                lastProcessedTimeRef.current = currentTime;
                isWaitingForNextGestureRef.current = false;
                
                // Reset sentence timeout
                resetSentenceTimeout();
                
                setDebugInfo(`Added "${translatedWord}" to sentence. Current: "${sentenceInProgress} ${translatedWord}".trim()`);
              }
            } else {
              setDebugInfo(`Holding gesture "${gestureName}" for ${Math.round(holdTime)}ms (need ${GESTURE_HOLD_TIME}ms)`);
            }
          }
        } else {
          // New gesture detected
          currentGestureRef.current = gestureName;
          gestureStabilityCountRef.current = 1;
          gestureStartTimeRef.current = currentTime;
          setDebugInfo(`New gesture detected: ${gestureName}`);
        }
      } else {
        // No gesture recognized
        if (currentGestureRef.current) {
          currentGestureRef.current = null;
          gestureStabilityCountRef.current = 0;
          setDetectedGesture(null);
          
          if (!isWaitingForNextGestureRef.current) {
            isWaitingForNextGestureRef.current = true;
            setDebugInfo('No gesture - waiting for next gesture...');
          }
        }
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown processing error';
      console.error('Error processing hand results:', error);
      setError(`Error processing gestures: ${error}`);
    }
  }, [resetIdleTimeout, resetSentenceTimeout, sentenceInProgress]);

  const recognizeGestureFromLandmarks = (landmarks: any): HandGesture | null => {
    const wrist = landmarks[0];
    const thumbTip = landmarks[4];
    const thumbMcp = landmarks[2];
    const indexTip = landmarks[8];
    const indexMcp = landmarks[5];
    const middleTip = landmarks[12];
    const middleMcp = landmarks[9];
    const ringTip = landmarks[16];
    const ringMcp = landmarks[13];
    const pinkyTip = landmarks[20];
    const pinkyMcp = landmarks[17];

    const thumbExtended = isThumbExtended(thumbTip, thumbMcp, wrist);
    const indexExtended = isFingerExtended(indexTip, indexMcp);
    const middleExtended = isFingerExtended(middleTip, middleMcp);
    const ringExtended = isFingerExtended(ringTip, ringMcp);
    const pinkyExtended = isFingerExtended(pinkyTip, pinkyMcp);

    // Victory sign (peace) - Index and middle extended, others curled
    if (!thumbExtended && indexExtended && middleExtended && !ringExtended && !pinkyExtended) {
      return { name: 'victory', confidence: 0.9, timestamp: Date.now() };
    }

    // Pointing up - Only index finger extended
    if (!thumbExtended && indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
      return { name: 'pointing_up', confidence: 0.9, timestamp: Date.now() };
    }

    // Thumbs up - Only thumb extended
    if (thumbExtended && !indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
      return { name: 'thumbs_up', confidence: 0.9, timestamp: Date.now() };
    }

    // Thumbs down - Thumb pointing down
    if (thumbTip.y > wrist.y + 0.06 && !indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
      return { name: 'thumbs_down', confidence: 0.9, timestamp: Date.now() };
    }

    // Open palm - All fingers extended
    if (thumbExtended && indexExtended && middleExtended && ringExtended && pinkyExtended) {
      return { name: 'open_palm', confidence: 0.9, timestamp: Date.now() };
    }

    // Closed fist - All fingers curled
    if (!thumbExtended && !indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
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
      setDebugInfo('Starting conversation mode gesture recognition');
      setIsProcessing(true);
      processingRef.current = true;
      
      // Reset all state
      setCurrentChunk(null);
      setTranslatedText('');
      setSentenceInProgress('');
      currentGestureRef.current = null;
      gestureStabilityCountRef.current = 0;
      lastProcessedGestureRef.current = null;
      lastProcessedTimeRef.current = 0;
      isWaitingForNextGestureRef.current = false;
      
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
    
    // Finalize any sentence in progress
    if (sentenceInProgress) {
      setTranslatedText(prev => {
        const newSentence = sentenceInProgress.trim();
        return prev ? `${prev}. ${newSentence}` : newSentence;
      });
    }
    
    // Reset all state
    setDetectedGesture(null);
    setSentenceInProgress('');
    setCurrentChunk(null);
    currentGestureRef.current = null;
    gestureStabilityCountRef.current = 0;
    lastProcessedGestureRef.current = null;
    lastProcessedTimeRef.current = 0;
    isWaitingForNextGestureRef.current = false;
    
    // Clear all timeouts
    if (sentenceTimeoutRef.current) {
      clearTimeout(sentenceTimeoutRef.current);
    }
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current);
    }
    if (gestureHoldTimeoutRef.current) {
      clearTimeout(gestureHoldTimeoutRef.current);
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, [sentenceInProgress]);

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
    sentenceInProgress, // Export current sentence for UI display
  };
}