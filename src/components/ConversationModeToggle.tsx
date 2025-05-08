import React from 'react';
import { MessageSquare, MessageSquareOff } from 'lucide-react';
import { useAppStore } from '../store/appStore';

const ConversationModeToggle: React.FC = () => {
  const { conversationMode, setConversationMode } = useAppStore();

  return (
    <button
      onClick={() => setConversationMode(!conversationMode)}
      className={`flex items-center px-4 py-2 rounded-lg transition ${
        conversationMode
          ? 'bg-primary-600 text-white hover:bg-primary-700'
          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
      }`}
      aria-label={conversationMode ? 'Disable conversation mode' : 'Enable conversation mode'}
    >
      {conversationMode ? (
        <MessageSquare className="h-5 w-5 mr-2" />
      ) : (
        <MessageSquareOff className="h-5 w-5 mr-2" />
      )}
      <span className="text-sm font-medium">
        {conversationMode ? 'Conversation Mode' : 'Direct Translation'}
      </span>
    </button>
  );
};

export default ConversationModeToggle;