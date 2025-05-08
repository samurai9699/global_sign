import React, { useEffect } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { useMicrophone } from '../hooks/useMicrophone';

interface MicrophoneComponentProps {
  onStreamReady?: (stream: MediaStream) => void;
  isActive: boolean;
  onToggle: (active: boolean) => void;
}

const MicrophoneComponent: React.FC<MicrophoneComponentProps> = ({
  onStreamReady,
  isActive,
  onToggle,
}) => {
  const {
    stream,
    isActive: micActive,
    error,
    startMicrophone,
    stopMicrophone,
  } = useMicrophone({
    onStream: onStreamReady,
    onError: (error) => console.error('Microphone error:', error),
  });

  const handleToggle = () => {
    if (isActive) {
      stopMicrophone();
      onToggle(false);
    } else {
      startMicrophone();
      onToggle(true);
    }
  };

  useEffect(() => {
    if (isActive && !micActive) {
      startMicrophone();
    } else if (!isActive && micActive) {
      stopMicrophone();
    }
  }, [isActive, micActive, startMicrophone, stopMicrophone]);

  // Audio visualization with CSS animation (simplified)
  const renderAudioWaves = () => {
    if (!isActive) return null;
    
    return (
      <div className="flex items-center justify-center space-x-1 mt-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="w-1 bg-primary-400 rounded-full animate-pulse-slow"
            style={{
              height: `${20 + Math.random() * 30}px`,
              animationDelay: `${i * 0.1}s`,
            }}
          ></div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      {error && (
        <div className="mb-4 p-3 bg-error-50 text-error-700 rounded-md">
          <p>Microphone error: {error.message}</p>
        </div>
      )}
      
      <div className="flex items-center justify-center flex-col">
        <button
          onClick={handleToggle}
          className={`p-4 rounded-full ${
            isActive
              ? 'bg-primary-500 hover:bg-primary-600'
              : 'bg-gray-300 hover:bg-gray-400'
          } text-white transition-colors`}
          aria-label={isActive ? 'Turn off microphone' : 'Turn on microphone'}
        >
          {isActive ? (
            <Mic className="h-8 w-8" />
          ) : (
            <MicOff className="h-8 w-8" />
          )}
        </button>
        
        <p className="mt-3 text-sm font-medium text-gray-700">
          {isActive ? 'Microphone active' : 'Microphone inactive'}
        </p>
        
        {renderAudioWaves()}
      </div>
    </div>
  );
};

export default MicrophoneComponent;