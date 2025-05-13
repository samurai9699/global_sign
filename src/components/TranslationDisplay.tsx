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
}

const TranslationDisplay: React.FC<TranslationDisplayProps> = ({
  result,
  isLoading,
  error,
  currentChunk,
  isIdle,
  debugInfo,
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
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="p-6 bg-white border border-gray-200 rounded-md">
        <div className="mb-4 p-3 bg-primary-50 rounded-md">
          <p className="text-primary-700 font-medium">
            {currentChunk && currentChunk.gestures.length > 0
              ? `Detected gesture: ${ASL_TO_ENGLISH_MAPPING[currentChunk.gestures[currentChunk.gestures.length - 1].name]}`
              : 'Waiting for gestures...'}
          </p>
        </div>
        
        {currentChunk && currentChunk.gestures.length > 0 && (
          <div className="mt-4">
            <div className="flex flex-wrap gap-2">
              {currentChunk.gestures.map((gesture, index) => (
                <div
                  key={index}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    index === currentChunk.gestures.length - 1
                      ? 'bg-primary-100 text-primary-700'
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
                ? '1 gesture detected'
                : `${currentChunk.gestures.length} gestures detected`}
            </div>
            
            {currentChunk.text && (
              <div className="mt-4 p-3 bg-success-50 rounded-md">
                <p className="text-success-700 font-medium">
                  Translation: {currentChunk.text}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

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