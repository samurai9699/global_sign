import React from 'react';
import { TranslationResult, ConversationChunk } from '../types';
import { ASL_TO_ENGLISH_MAPPING } from '../utils/constants';

interface TranslationDisplayProps {
  result: TranslationResult | null;
  isLoading: boolean;
  error: string | null;
  currentChunk?: ConversationChunk | null;
  isIdle?: boolean;
  debugInfo?: string;
  sentenceInProgress?: string;
}

const TranslationDisplay: React.FC<TranslationDisplayProps> = ({
  result,
  isLoading,
  error,
  currentChunk,
  isIdle,
  debugInfo,
  sentenceInProgress,
}) => {
  if (error) {
    return (
      <div className="p-4 bg-error-50 border border-error-200 rounded-md text-error-700">
        <p className="font-medium">Error</p>
        <p>{error}</p>
      </div>
    );
  }

  if (isIdle) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
        <p className="text-gray-500 text-center">Make a gesture to start translation</p>
        <p className="text-xs text-gray-400 text-center mt-2">
          Hold each gesture for about 1 second, then pause briefly before the next gesture
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="p-6 bg-white border border-gray-200 rounded-md">
        {/* Current sentence being built */}
        {sentenceInProgress && (
          <div className="mb-4 p-4 bg-primary-50 border border-primary-200 rounded-md">
            <h4 className="text-sm font-medium text-primary-700 mb-2">Current Sentence:</h4>
            <p className="text-lg text-primary-800 font-medium">{sentenceInProgress}</p>
          </div>
        )}

        {/* Current gesture detection */}
        <div className="mb-4 p-3 bg-gray-50 rounded-md">
          <p className="text-gray-700 font-medium">
            {currentChunk && currentChunk.gestures.length > 0
              ? `Last detected: ${ASL_TO_ENGLISH_MAPPING[currentChunk.gestures[currentChunk.gestures.length - 1].name]}`
              : 'Waiting for gestures...'}
          </p>
        </div>
        
        {/* Gesture sequence display */}
        {currentChunk && currentChunk.gestures.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Gesture Sequence:</h4>
            <div className="flex flex-wrap gap-2">
              {currentChunk.gestures.map((gesture, index) => (
                <div
                  key={index}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    index === currentChunk.gestures.length - 1
                      ? 'bg-primary-100 text-primary-700 ring-2 ring-primary-300'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {ASL_TO_ENGLISH_MAPPING[gesture.name]}
                  {gesture.confidence > 0.8 && (
                    <span className="ml-1 text-success-500">✓</span>
                  )}
                </div>
              ))}
            </div>
            
            <div className="mt-3 text-sm text-gray-500">
              {currentChunk.gestures.length === 1
                ? '1 gesture in current sequence'
                : `${currentChunk.gestures.length} gestures in current sequence`}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-700">
            <strong>How to use:</strong> Hold each gesture clearly for about 1 second, then pause briefly before making the next gesture. 
            Your sentence will be completed automatically after a few seconds of no gestures.
          </p>
        </div>
      </div>

      {/* Completed translations */}
      {result && result.translated && (
        <div className="p-4 bg-success-50 border border-success-200 rounded-md">
          <h4 className="text-sm font-medium text-success-700 mb-2">Completed Translation:</h4>
          <p className="text-success-800 font-medium">{result.translated}</p>
        </div>
      )}

      {debugInfo && (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Debug Information</h4>
          <p className="text-sm text-gray-600">{debugInfo}</p>
        </div>
      )}
    </div>
  );
};

export default TranslationDisplay;