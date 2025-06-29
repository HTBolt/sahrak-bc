import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Volume2, Copy, MoreHorizontal } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '../ui/Button';
import { VoiceInput, useTextToSpeech } from './VoiceInput';
import { AIMessage } from '../../lib/aiAssistant';
import toast from 'react-hot-toast';

interface ChatInterfaceProps {
  messages: AIMessage[];
  onSendMessage: (message: string, isVoice?: boolean) => void;
  loading?: boolean;
  disabled?: boolean;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  onSendMessage,
  loading = false,
  disabled = false
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isVoiceInput, setIsVoiceInput] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { speak, stop, isSpeaking } = useTextToSpeech();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when not disabled
  useEffect(() => {
    if (!disabled && inputRef.current) {
      inputRef.current.focus();
    }
  }, [disabled]);

  const handleSend = () => {
    if (inputValue.trim() && !loading && !disabled) {
      onSendMessage(inputValue.trim(), isVoiceInput);
      setInputValue('');
      setIsVoiceInput(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleVoiceTranscript = (transcript: string) => {
    setInputValue(transcript);
    setIsVoiceInput(true);
  };

  const handleVoiceStart = () => {
    stop(); // Stop any ongoing speech
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const speakMessage = (text: string) => {
    if (isSpeaking) {
      stop();
    } else {
      speak(text);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md px-4">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bot size={24} className="text-white" />
              </div>
              <h3 className="text-lg font-medium text-slate-300 mb-2">
                Ready to listen
              </h3>
              <p className="text-slate-500 text-sm">
                Share what's on your mind. I'm here to provide support and guidance.
              </p>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
            {messages.map((message, index) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  {/* Avatar */}
                  <div className={`flex-shrink-0 ${message.role === 'user' ? 'ml-3' : 'mr-3'}`}>
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center
                      ${message.role === 'user' 
                        ? 'bg-cyan-600' 
                        : 'bg-gradient-to-br from-purple-500 to-blue-500'
                      }
                    `}>
                      {message.role === 'user' ? (
                        <User size={16} className="text-white" />
                      ) : (
                        <Bot size={16} className="text-white" />
                      )}
                    </div>
                  </div>
                  
                  {/* Message Content */}
                  <div className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`
                      rounded-2xl px-4 py-3 max-w-full
                      ${message.role === 'user'
                        ? 'bg-cyan-600 text-white'
                        : 'bg-slate-700 text-slate-100'
                      }
                    `}>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {message.content}
                      </p>
                      
                      {/* Voice input indicator */}
                      {message.metadata?.voice_input && (
                        <div className="flex items-center space-x-1 mt-2 text-xs opacity-70">
                          <Volume2 size={12} />
                          <span>Voice message</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Message actions and timestamp */}
                    <div className={`flex items-center space-x-2 mt-1 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      <span className="text-xs text-slate-500">
                        {format(new Date(message.timestamp), 'h:mm a')}
                      </span>
                      
                      {message.role === 'assistant' && (
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => speakMessage(message.content)}
                            className="text-slate-500 hover:text-slate-400 p-1 h-6 w-6"
                            title={isSpeaking ? 'Stop speaking' : 'Read aloud'}
                          >
                            <Volume2 size={12} />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(message.content)}
                            className="text-slate-500 hover:text-slate-400 p-1 h-6 w-6"
                            title="Copy message"
                          >
                            <Copy size={12} />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Loading indicator */}
            {loading && (
              <div className="flex justify-start">
                <div className="flex max-w-[80%]">
                  <div className="flex-shrink-0 mr-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                      <Bot size={16} className="text-white" />
                    </div>
                  </div>
                  <div className="bg-slate-700 text-slate-100 rounded-2xl px-4 py-3">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-slate-700 bg-slate-800">
        <div className="max-w-4xl mx-auto p-4">
          <div className="flex items-end space-x-3">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Message AI Wellness Companion..."
                disabled={disabled || loading}
                className="
                  w-full rounded-xl border border-slate-600 bg-slate-700 text-white placeholder-slate-400
                  px-4 py-3 pr-20 resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
                rows={1}
                style={{ minHeight: '48px', maxHeight: '120px' }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = Math.min(target.scrollHeight, 120) + 'px';
                }}
              />
              
              {/* Voice input button inside textarea */}
              <div className="absolute right-2 bottom-2">
                <VoiceInput
                  onTranscript={handleVoiceTranscript}
                  onVoiceStart={handleVoiceStart}
                  disabled={disabled || loading}
                />
              </div>
            </div>
            
            <Button
              onClick={handleSend}
              disabled={!inputValue.trim() || loading || disabled}
              className="bg-cyan-600 hover:bg-cyan-700 text-white p-3 rounded-xl"
            >
              <Send size={16} />
            </Button>
          </div>
          
          {isVoiceInput && (
            <p className="text-xs text-cyan-400 mt-2 flex items-center space-x-1">
              <Volume2 size={12} />
              <span>Voice input detected</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};