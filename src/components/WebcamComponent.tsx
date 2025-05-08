import React, { useEffect } from 'react';
import { Camera, CameraOff } from 'lucide-react';
import { useWebcam } from '../hooks/useWebcam';

interface WebcamComponentProps {
  onStreamReady?: (stream: MediaStream) => void;
  isActive: boolean;
  onToggle: (active: boolean) => void;
}

const WebcamComponent: React.FC<WebcamComponentProps> = ({
  onStreamReady,
  isActive,
  onToggle,
}) => {
  const {
    videoRef,
    stream,
    isActive: webcamActive,
    error,
    startWebcam,
    stopWebcam,
  } = useWebcam({
    onStream: onStreamReady,
    onError: (error) => console.error('Webcam error:', error),
  });

  const handleToggle = () => {
    if (isActive) {
      stopWebcam();
      onToggle(false);
    } else {
      startWebcam();
      onToggle(true);
    }
  };

  useEffect(() => {
    if (isActive && !webcamActive) {
      startWebcam();
    } else if (!isActive && webcamActive) {
      stopWebcam();
    }
  }, [isActive, webcamActive, startWebcam, stopWebcam]);

  return (
    <div className="relative rounded-lg overflow-hidden bg-gray-900 aspect-video">
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-error-50 text-error-700 p-4">
          <p>Camera access error: {error.message}</p>
        </div>
      )}
      
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover transform scale-x-[-1] ${isActive ? 'opacity-100' : 'opacity-0'}`}
      />
      
      {!isActive && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800 text-white">
          <p className="text-lg">Camera is off</p>
        </div>
      )}
      
      <div className="absolute bottom-4 right-4">
        <button
          onClick={handleToggle}
          className={`p-3 rounded-full ${
            isActive
              ? 'bg-error-500 hover:bg-error-600'
              : 'bg-primary-500 hover:bg-primary-600'
          } text-white transition-colors`}
          aria-label={isActive ? 'Turn off camera' : 'Turn on camera'}
        >
          {isActive ? (
            <CameraOff className="h-6 w-6" />
          ) : (
            <Camera className="h-6 w-6" />
          )}
        </button>
      </div>
    </div>
  );
};

export default WebcamComponent;