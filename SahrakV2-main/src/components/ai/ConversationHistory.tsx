import React from 'react';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { MessageCircle, Clock } from 'lucide-react';
import { AIConversation } from '../../lib/aiAssistant';

interface ConversationHistoryProps {
  conversations: AIConversation[];
  onSelectConversation: (conversation: AIConversation) => void;
  selectedConversationId?: string;
  loading?: boolean;
}

export const ConversationHistory: React.FC<ConversationHistoryProps> = ({
  conversations,
  onSelectConversation,
  selectedConversationId,
  loading = false
}) => {
  const formatDate = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMM d');
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-slate-700 rounded-lg h-12"></div>
          </div>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="text-center py-6">
        <MessageCircle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
        <p className="text-sm text-slate-500">No conversations yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {conversations.map((conversation) => (
        <button
          key={conversation.id}
          onClick={() => onSelectConversation(conversation)}
          className={`
            w-full text-left p-3 rounded-lg transition-colors
            ${selectedConversationId === conversation.id 
              ? 'bg-cyan-600 text-white' 
              : 'hover:bg-slate-700 text-slate-300'
            }
          `}
        >
          <div className="font-medium text-sm mb-1 truncate">
            {conversation.title}
          </div>
          <div className="flex items-center justify-between text-xs opacity-70">
            <span>{formatDate(conversation.last_message_at)}</span>
            <span>{conversation.message_count} messages</span>
          </div>
        </button>
      ))}
    </div>
  );
};