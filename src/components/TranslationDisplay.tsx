import React from 'react';
import { TranslationResult, ConversationChunk } from '../types';
import { ASL_TO_ENGLISH_MAPPING } from '../utils/constants';

interface TranslationDisplayProps {
  result: TranslationResult | null;
  isLoading: boolean;
  error: string | null;
  currentChunk?: ConversationChunk | null;
  isIdle?: boolean;
}

const TranslationDisplay: React.FC<TranslationDisplayProps> = ({
  result,
  isLoading,
  error,
  currentChunk,
  isIdle,
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
        <p className="text-gray-500 text-center">No gesture detected</p>
      </div>
    );
  }

  if (isLoading || (currentChunk && currentChunk.gestures.length > 0)) {
    return (
      <div className="p-6 bg-white border border-gray-200 rounded-md">
        <div id="translation-output" className="mb-4 p-3 bg-primary-50 rounded-md">
          <p className="text-primary-700 font-medium">
            {currentChunk && currentChunk.gestures.length > 0
              ? `Current gesture: ${ASL_TO_ENGLISH_MAPPING[currentChunk.gestures[currentChunk.gestures.length - 1].name]}`
              : 'Processing...'}
          </p>
        </div>
        
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <span className="ml-3 text-gray-700">
            {currentChunk ? 'Processing signs...' : 'Translating...'}
          </span>
        </div>
        
        {currentChunk && currentChunk.gestures.length > 0 && (
          <div className="mt-4">
            <div className="flex flex-wrap gap-2">
              {currentChunk.gestures.slice(-5).map((gesture, index) => (
                <div
                  key={index}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    index === currentChunk.gestures.length - 1
                      ? 'bg-primary-100 text-primary-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {ASL_TO_ENGLISH_MAPPING[gesture.name]}
                  {gesture.confidence > 0.9 && (
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
          </div>
        )}
      </div>
    );
  }

  if (!result || (!result.original && !result.translated)) {
    return (
      <div className="p-6 bg-white border border-gray-200 rounded-md text-center text-gray-500">
        <p>Make signs to start translation</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white border border-gray-200 rounded-md">
      <div id="translation-output" className="mb-4">
        <h3 className="text-sm font-medium text-gray-500 mb-1">Original:</h3>
        <p className="text-lg font-medium text-gray-900">{result.original}</p>
      </div>
      
      <div className="pt-4 border-t border-gray-200">
        <h3 className="text-sm font-medium text-gray-500 mb-1">Translated:</h3>
        <p className="text-lg font-medium text-primary-700">
          {result.translated}
          {result.isPartial && (
            <span className="text-sm text-gray-500 ml-2">(processing...)</span>
          )}
        </p>
        
        {result.confidence && (
          <div className="mt-2 flex items-center">
            <span className="text-xs text-gray-500 mr-2">Confidence:</span>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  result.confidence > 0.7
                    ? 'bg-success-500'
                    : result.confidence > 0.4
                    ? 'bg-warning-500'
                    : 'bg-error-500'
                }`}
                style={{ width: `${result.confidence * 100}%` }}
              ></div>
            </div>
            <span className="ml-2 text-xs text-gray-500">
              {Math.round(result.confidence * 100)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default TranslationDisplay;