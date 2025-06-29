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
        <p className="text-gray-500 text-center font-medium">Ready to translate gestures</p>
        <p className="text-xs text-gray-400 text-center mt-2">
          Make clear gestures and hold them steady. Available: thumbs up (yes), thumbs down (no), peace sign (peace), pointing up (up), open palm (hello), closed fist (stop)
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Current sentence being built */}
      {sentenceInProgress && (
        <div className="p-4 bg-primary-50 border border-primary-200 rounded-md">
          <h4 className="text-sm font-medium text-primary-700 mb-2">Building Sentence:</h4>
          <p className="text-xl text-primary-800 font-semibold">{sentenceInProgress}</p>
          <p className="text-xs text-primary-600 mt-2">
            Sentence will complete automatically in a few seconds, or make another gesture to continue
          </p>
        </div>
      )}

      {/* Status display */}
      <div className="p-4 bg-white border border-gray-200 rounded-md">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-700">Recognition Status</h4>
          <div className="flex items-center">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-2"></div>
            <span className="text-xs text-green-600">Active</span>
          </div>
        </div>
        
        <div className="text-sm text-gray-600">
          {debugInfo || 'Waiting for clear gesture...'}
        </div>
      </div>

      {/* Completed translations */}
      {result && result.translated && (
        <div className="p-4 bg-success-50 border border-success-200 rounded-md">
          <h4 className="text-sm font-medium text-success-700 mb-2">Completed Sentences:</h4>
          <p className="text-lg text-success-800 font-medium">{result.translated}</p>
        </div>
      )}

      {/* Instructions */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
        <h4 className="text-sm font-medium text-blue-700 mb-2">How to Use:</h4>
        <ul className="text-sm text-blue-600 space-y-1">
          <li>• Make clear, distinct gestures</li>
          <li>• Hold each gesture steady for about 1 second</li>
          <li>• Wait 2 seconds between different gestures</li>
          <li>• Your sentence will complete automatically</li>
        </ul>
      </div>

      {/* Available gestures */}
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Available Gestures:</h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-600">👍 Thumbs up</span>
            <span className="text-gray-800 font-medium">yes</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">👎 Thumbs down</span>
            <span className="text-gray-800 font-medium">no</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">✌️ Peace sign</span>
            <span className="text-gray-800 font-medium">peace</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">☝️ Point up</span>
            <span className="text-gray-800 font-medium">up</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">✋ Open palm</span>
            <span className="text-gray-800 font-medium">hello</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">✊ Closed fist</span>
            <span className="text-gray-800 font-medium">stop</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TranslationDisplay;