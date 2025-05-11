import { useState, useEffect, useRef, useCallback } from 'react';
import { Hands, Results } from '@mediapipe/hands';
import { HandGesture, ConversationChunk } from '../types';
import { ASL_TO_ENGLISH_MAPPING } from '../utils/constants';

const CHUNK_TIMEOUT = 1500; // 1.5 seconds for natural chunking
const CONFIDENCE_THRESHOLD = 0.5; // Lowered threshold for better detection
const GESTURE_STABILITY_THRESHOLD = 1; // Reduced for faster response
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
      console.log('Initializing MediaPipe Hands');
      const hands = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 0, // Reduced for better performance
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
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
        
        // Immediately process the gesture
        const translatedWord = ASL_TO_ENGLISH_MAPPING[gesture.name];
        console.log('✅ Gesture Mapped to Text:', translatedWord);
        
        setDetectedGesture(gesture);
        
        // Update current chunk immediately
        setCurrentChunk(prev => {
          const newChunk: ConversationChunk = {
            gestures: prev ? [...prev.gestures, gesture] : [gesture],
            text: prev ? `${prev.text} ${translatedWord}`.trim() : translatedWord,
            timestamp: Date.now(),
          };
          return newChunk;
        });
        
        // Update translated text immediately
        setTranslatedText(prev => {
          const newText = `${prev ? prev + ' ' : ''}${translatedWord}`.trim();
          console.log('✅ Text Rendered:', newText);
          return newText;
        });
        
        resetChunkTimeout();
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
      const wrist = landmarks[0];

      // More lenient thresholds
      const threshold = 0.1;
      
      // Check if fingers are raised relative to the wrist
      const thumbUp = thumbTip.y < wrist.y;
      const indexUp = indexTip.y < wrist.y - threshold;
      const middleUp = middleTip.y < wrist.y - threshold;
      const ringUp = ringTip.y < wrist.y - threshold;
      const pinkyUp = pinkyTip.y < wrist.y - threshold;

      // Open palm (hello)
      if (indexUp && middleUp && ringUp && pinkyUp) {
        return {
          name: 'open_palm',
          confidence: 0.9,
          timestamp: Date.now(),
        };
      }

      // Thumbs up
      if (thumbUp && !indexUp && !middleUp && !ringUp && !pinkyUp) {
        return {
          name: 'thumbs_up',
          confidence: 0.9,
          timestamp: Date.now(),
        };
      }

      // Victory/Peace sign
      if (!thumbUp && indexUp && middleUp && !ringUp && !pinkyUp) {
        return {
          name: 'victory',
          confidence: 0.9,
          timestamp: Date.now(),
        };
      }

      // Pointing up
      if (!thumbUp && indexUp && !middleUp && !ringUp && !pinkyUp) {
        return {
          name: 'pointing_up',
          confidence: 0.9,
          timestamp: Date.now(),
        };
      }

      return null;
    } catch (err) {
      console.error('❌ Error recognizing gesture:', err);
      throw new Error(`Failed to recognize gesture: ${err}`);
    }
  };

  const resetChunkTimeout = useCallback(() => {
    if (chunkTimeoutRef.current) {
      clearTimeout(chunkTimeoutRef.current);
    }
    
    chunkTimeoutRef.current = setTimeout(() => {
      setCurrentChunk(null);
      lastGestureRef.current = null;
      gestureCountRef.current = {};
      gestureStabilityCountRef.current = 0;
    }, CHUNK_TIMEOUT);
  }, []);

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
      setTranslatedText('');
      setError(null);
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