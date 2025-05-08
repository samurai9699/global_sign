import React from 'react';
import { CheckCircle, AlertTriangle, XCircle, Clock } from 'lucide-react';

type StatusType = 'success' | 'warning' | 'error' | 'idle' | 'loading';

interface StatusIndicatorProps {
  type: StatusType;
  message: string;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ type, message }) => {
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-success-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-warning-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-error-500" />;
      case 'loading':
        return <div className="h-5 w-5 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />;
      case 'idle':
        return <Clock className="h-5 w-5 text-gray-400" />;
      default:
        return null;
    }
  };

  const getBgColor = () => {
    switch (type) {
      case 'success':
        return 'bg-success-50';
      case 'warning':
        return 'bg-warning-50';
      case 'error':
        return 'bg-error-50';
      case 'loading':
        return 'bg-primary-50';
      case 'idle':
      default:
        return 'bg-gray-50';
    }
  };

  const getTextColor = () => {
    switch (type) {
      case 'success':
        return 'text-success-700';
      case 'warning':
        return 'text-warning-700';
      case 'error':
        return 'text-error-700';
      case 'loading':
        return 'text-primary-700';
      case 'idle':
      default:
        return 'text-gray-700';
    }
  };

  return (
    <div className={`flex items-center p-3 rounded-md ${getBgColor()}`}>
      <div className="flex-shrink-0">
        {getIcon()}
      </div>
      <p className={`ml-3 text-sm font-medium ${getTextColor()}`}>
        {message}
      </p>
    </div>
  );
};

export default StatusIndicator;