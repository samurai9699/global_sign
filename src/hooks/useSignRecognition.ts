import { useState, useEffect, useRef, useCallback } from 'react';
import { Hands, Results } from '@mediapipe/hands';
import { HandGesture, ConversationChunk } from '../types';
import { ASL_TO_ENGLISH_MAPPING } from '../utils/constants';

const GESTURE_HOLD_TIME = 1000; // Time to hold gesture for recognition
const GESTURE_COOLDOWN = 2000; // Cooldown between same gestures
const SENTENCE_TIMEOUT = 3000; // Time before ending current sentence
const CONFIDENCE_THRESHOLD = 0.7;
const GESTURE_STABILITY_THRESHOLD = 5; // Frames needed for stable gesture
const IDLE_TIMEOUT = 8000;

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
  const animationFrameRef = useRef<number | null>(null);
  
  // Simplified gesture tracking
  const currentGestureRef = useRef<string | null>(null);
  const gestureStabilityCountRef = useRef<number>(0);
  const lastGestureTimeRef = useRef<number>(0);
  const sentenceWordsRef = useRef<string[]>([]);

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
      sentenceWordsRef.current = [];
      setDebugInfo('Session idle - reset all state');
    }, IDLE_TIMEOUT);
  }, []);

  const finalizeSentence = useCallback(() => {
    if (sentenceWordsRef.current.length > 0) {
      const completedSentence = sentenceWordsRef.current.join(' ');
      setTranslatedText(prev => {
        const newText = prev ? `${prev}. ${completedSentence}` : completedSentence;
        return newText;
      });
      
      setDebugInfo(`Sentence completed: "${completedSentence}"`);
      
      // Reset for next sentence
      sentenceWordsRef.current = [];
      setSentenceInProgress('');
      setCurrentChunk(null);
    }
  }, []);

  const resetSentenceTimeout = useCallback(() => {
    if (sentenceTimeoutRef.current) {
      clearTimeout(sentenceTimeoutRef.current);
    }
    sentenceTimeoutRef.current = setTimeout(() => {
      finalizeSentence();
    }, SENTENCE_TIMEOUT);
  }, [finalizeSentence]);

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
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      hands.onResults((results: Results) => {
        if (!processingRef.current) return;
        processHandResults(results);
      });

      handsRef.current = hands;
      setDebugInfo('MediaPipe Hands initialized successfully');
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown initialization error';
      console.error('Failed to initialize MediaPipe Hands:', error);
      setError(`Failed to initialize hand tracking: ${error}`);
    }
  }, []);

  const processHandResults = useCallback((results: Results) => {
    try {
      resetIdleTimeout();
      const currentTime = Date.now();

      if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
        // No hands detected
        if (currentGestureRef.current) {
          setDebugInfo('No hands detected - clearing current gesture');
          currentGestureRef.current = null;
          gestureStabilityCountRef.current = 0;
          setDetectedGesture(null);
        }
        return;
      }

      const landmarks = results.multiHandLandmarks[0];
      const gesture = recognizeGestureFromLandmarks(landmarks);
      
      if (gesture) {
        const gestureName = gesture.name;
        
        if (currentGestureRef.current === gestureName) {
          // Same gesture - increase stability count
          gestureStabilityCountRef.current++;
          setDebugInfo(`Gesture "${gestureName}" stability: ${gestureStabilityCountRef.current}/${GESTURE_STABILITY_THRESHOLD}`);
          
          // Check if gesture is stable enough and enough time has passed since last gesture
          if (gestureStabilityCountRef.current >= GESTURE_STABILITY_THRESHOLD) {
            const timeSinceLastGesture = currentTime - lastGestureTimeRef.current;
            
            if (timeSinceLastGesture >= GESTURE_COOLDOWN) {
              // Process this gesture
              const translatedWord = ASL_TO_ENGLISH_MAPPING[gestureName];
              
              if (translatedWord) {
                // Add word to current sentence
                sentenceWordsRef.current.push(translatedWord);
                const currentSentence = sentenceWordsRef.current.join(' ');
                setSentenceInProgress(currentSentence);
                
                // Update detected gesture for UI
                setDetectedGesture(gesture);
                
                // Update current chunk
                setCurrentChunk({
                  gestures: [gesture],
                  text: currentSentence,
                  timestamp: currentTime,
                });
                
                // Update timing
                lastGestureTimeRef.current = currentTime;
                
                // Reset sentence timeout
                resetSentenceTimeout();
                
                setDebugInfo(`Added "${translatedWord}" to sentence. Current: "${currentSentence}"`);
                
                // Reset gesture tracking for next gesture
                currentGestureRef.current = null;
                gestureStabilityCountRef.current = 0;
              }
            } else {
              const waitTime = Math.round((GESTURE_COOLDOWN - timeSinceLastGesture) / 1000 * 10) / 10;
              setDebugInfo(`Gesture "${gestureName}" recognized but cooling down (${waitTime}s remaining)`);
            }
          }
        } else {
          // New gesture detected
          currentGestureRef.current = gestureName;
          gestureStabilityCountRef.current = 1;
          setDebugInfo(`New gesture detected: ${gestureName}`);
        }
      } else {
        // No gesture recognized
        if (currentGestureRef.current) {
          currentGestureRef.current = null;
          gestureStabilityCountRef.current = 0;
          setDetectedGesture(null);
          setDebugInfo('No clear gesture detected');
        }
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown processing error';
      console.error('Error processing hand results:', error);
      setError(`Error processing gestures: ${error}`);
    }
  }, [resetIdleTimeout, resetSentenceTimeout]);

  const recognizeGestureFromLandmarks = (landmarks: any): HandGesture | null => {
    try {
      const wrist = landmarks[0];
      const thumbTip = landmarks[4];
      const indexTip = landmarks[8];
      const middleTip = landmarks[12];
      const ringTip = landmarks[16];
      const pinkyTip = landmarks[20];

      // Simple distance-based recognition
      const threshold = 0.08;
      
      // Check finger positions relative to wrist
      const thumbUp = thumbTip.y < wrist.y - threshold;
      const thumbDown = thumbTip.y > wrist.y + threshold;
      const indexUp = indexTip.y < wrist.y - threshold;
      const middleUp = middleTip.y < wrist.y - threshold;
      const ringUp = ringTip.y < wrist.y - threshold;
      const pinkyUp = pinkyTip.y < wrist.y - threshold;

      // Count extended fingers
      const extendedFingers = [indexUp, middleUp, ringUp, pinkyUp].filter(Boolean).length;
      
      // Gesture recognition with clear conditions
      if (thumbUp && extendedFingers === 0) {
        return { name: 'thumbs_up', confidence: 0.9, timestamp: Date.now() };
      }
      
      if (thumbDown && extendedFingers === 0) {
        return { name: 'thumbs_down', confidence: 0.9, timestamp: Date.now() };
      }
      
      if (!thumbUp && indexUp && middleUp && !ringUp && !pinkyUp) {
        return { name: 'victory', confidence: 0.9, timestamp: Date.now() };
      }
      
      if (!thumbUp && indexUp && !middleUp && !ringUp && !pinkyUp) {
        return { name: 'pointing_up', confidence: 0.9, timestamp: Date.now() };
      }
      
      if (extendedFingers === 4) {
        return { name: 'open_palm', confidence: 0.9, timestamp: Date.now() };
      }
      
      if (extendedFingers === 0 && !thumbUp) {
        return { name: 'closed_fist', confidence: 0.9, timestamp: Date.now() };
      }

      return null;
    } catch (err) {
      console.error('Error in gesture recognition:', err);
      return null;
    }
  };

  const startProcessing = useCallback(async () => {
    if (!videoRef.current || !handsRef.current) {
      setError('Video or hand tracking not available');
      return;
    }
    
    try {
      setDebugInfo('Starting gesture recognition...');
      setIsProcessing(true);
      processingRef.current = true;
      
      // Reset all state
      setCurrentChunk(null);
      setTranslatedText('');
      setSentenceInProgress('');
      currentGestureRef.current = null;
      gestureStabilityCountRef.current = 0;
      lastGestureTimeRef.current = 0;
      sentenceWordsRef.current = [];
      
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
    finalizeSentence();
    
    // Reset all state
    setDetectedGesture(null);
    setSentenceInProgress('');
    setCurrentChunk(null);
    currentGestureRef.current = null;
    gestureStabilityCountRef.current = 0;
    lastGestureTimeRef.current = 0;
    sentenceWordsRef.current = [];
    
    // Clear all timeouts
    if (sentenceTimeoutRef.current) {
      clearTimeout(sentenceTimeoutRef.current);
    }
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current);
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, [finalizeSentence]);

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
    sentenceInProgress,
  };
}