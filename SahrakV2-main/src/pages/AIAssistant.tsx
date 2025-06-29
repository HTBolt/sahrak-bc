import React, { useState, useEffect } from 'react';
import { 
  MessageCircle, 
  Plus, 
  Sparkles, 
  Heart, 
  Shield,
  RefreshCw,
  Bot,
  Users,
  Phone,
  History,
  Menu,
  X,
  Send,
  Mic,
  UserCheck
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { ChatInterface } from '../components/ai/ChatInterface';
import { DynamicPrompts } from '../components/ai/DynamicPrompts';
import { ConversationHistory } from '../components/ai/ConversationHistory';
import { CounselorContact } from '../components/ai/CounselorContact';
import { VoiceInput } from '../components/ai/VoiceInput';
import { useAuth } from '../contexts/AuthContext';
import {
  getUserConversations,
  getConversationMessages,
  createConversation,
  addMessage,
  generateDynamicPrompts,
  generateAIResponse,
  getAvailableCounselors,
  AIConversation,
  AIMessage,
  DynamicPrompt
} from '../lib/aiAssistant';
import toast from 'react-hot-toast';

const AIAssistant: React.FC = () => {
  const { user } = useAuth();
  
  // State management
  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<AIConversation | null>(null);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [dynamicPrompts, setDynamicPrompts] = useState<DynamicPrompt[]>([]);
  const [counselors, setCounselors] = useState<any[]>([]);
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [showCounselorModal, setShowCounselorModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'suggestions' | 'history'>('suggestions');
  const [inputValue, setInputValue] = useState('');
  const [isVoiceInput, setIsVoiceInput] = useState(false);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, [user]);

  // Load conversation messages when current conversation changes
  useEffect(() => {
    if (currentConversation) {
      loadConversationMessages(currentConversation.id);
    }
  }, [currentConversation]);

  const loadInitialData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      const [conversationsResult, promptsResult, counselorsResult] = await Promise.all([
        getUserConversations(),
        generateDynamicPrompts(),
        getAvailableCounselors()
      ]);

      if (conversationsResult.error) {
        console.error('Error loading conversations:', conversationsResult.error);
      } else {
        setConversations(conversationsResult.data || []);
      }

      setDynamicPrompts(promptsResult);

      if (counselorsResult.error) {
        console.error('Error loading counselors:', counselorsResult.error);
      } else {
        setCounselors(counselorsResult.data || []);
      }

    } catch (error) {
      console.error('Error loading initial data:', error);
      toast.error('Failed to load AI assistant data');
    } finally {
      setLoading(false);
    }
  };

  const loadConversationMessages = async (conversationId: string) => {
    try {
      const { data, error } = await getConversationMessages(conversationId);
      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load conversation messages');
    }
  };

  const handleSelectPrompt = async (prompt: DynamicPrompt) => {
    try {
      // Create a new conversation with the prompt title
      const { data: conversation, error } = await createConversation(prompt.title);
      if (error) throw error;

      if (conversation) {
        setConversations(prev => [conversation, ...prev]);
        setCurrentConversation(conversation);
        
        // Add the prompt as the first message
        await handleSendMessage(prompt.prompt, false, prompt.context);
      }
    } catch (error) {
      console.error('Error starting conversation from prompt:', error);
      toast.error('Failed to start conversation');
    }
  };

  const handleSendMessage = async (content: string, isVoice = false, context?: any) => {
    if (!currentConversation || !content.trim()) return;

    try {
      setChatLoading(true);

      // Add user message
      const userMessageData = await addMessage(
        currentConversation.id,
        'user',
        content,
        { voice_input: isVoice, context }
      );

      if (userMessageData.error) throw userMessageData.error;

      if (userMessageData.data) {
        setMessages(prev => [...prev, userMessageData.data!]);
      }

      // Generate AI response
      const aiResponse = await generateAIResponse(content, context);

      // Add AI message
      const aiMessageData = await addMessage(
        currentConversation.id,
        'assistant',
        aiResponse
      );

      if (aiMessageData.error) throw aiMessageData.error;

      if (aiMessageData.data) {
        setMessages(prev => [...prev, aiMessageData.data!]);
      }

      // Update conversation in list
      setConversations(prev => 
        prev.map(conv => 
          conv.id === currentConversation.id 
            ? { ...conv, last_message_at: new Date().toISOString(), message_count: conv.message_count + 2 }
            : conv
        )
      );

    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setChatLoading(false);
    }
  };

  const handleContactCounselor = (counselor: any, method: 'phone' | 'email' | 'message') => {
    switch (method) {
      case 'phone':
        window.open(`tel:${counselor.phone}`, '_self');
        break;
      case 'email':
        window.open(`mailto:${counselor.email}?subject=Mental Health Support Request`, '_self');
        break;
      case 'message':
        toast.info('Messaging feature coming soon. Please use phone or email for now.');
        break;
    }
  };

  const handleSend = () => {
    if (inputValue.trim() && !chatLoading) {
      handleSendMessage(inputValue.trim(), isVoiceInput);
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

  const startNewConversation = () => {
    setCurrentConversation(null);
    setMessages([]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading your AI wellness companion...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800 flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
            <Bot size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">
              {currentConversation ? currentConversation.title : 'AI Wellness Companion'}
            </h1>
            {!currentConversation && (
              <p className="text-sm text-slate-400 hidden sm:block">Your personal mental health assistant</p>
            )}
          </div>
        </div>
        
        {/* Human Support Button - Always Visible */}
        <Button
          onClick={() => setShowCounselorModal(true)}
          className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-3 py-2 rounded-lg flex items-center space-x-2"
          title="Talk to a Human"
        >
          <UserCheck size={16} />
          <span className="hidden sm:inline">Human Support</span>
        </Button>
      </div>

      {/* Main Content - Chat Window */}
      <div className="flex-1 flex flex-col min-h-0">
        {currentConversation ? (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Messages - Takes available space but allows for input */}
            <div className="flex-1 overflow-y-auto min-h-0">
              <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
                {messages.map((message, index) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex max-w-[85%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
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
                            <UserCheck size={16} className="text-white" />
                          ) : (
                            <Bot size={16} className="text-white" />
                          )}
                        </div>
                      </div>
                      
                      {/* Message Content */}
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
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Loading indicator */}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="flex max-w-[85%]">
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
              </div>
            </div>

            {/* Input Area - Fixed at bottom */}
            <div className="border-t border-slate-700 bg-slate-800 p-4 flex-shrink-0">
              <div className="max-w-4xl mx-auto">
                <div className="flex items-end space-x-3">
                  <div className="flex-1 relative">
                    <textarea
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Message AI Wellness Companion..."
                      disabled={chatLoading}
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
                        disabled={chatLoading}
                      />
                    </div>
                  </div>
                  
                  <Button
                    onClick={handleSend}
                    disabled={!inputValue.trim() || chatLoading}
                    className="bg-cyan-600 hover:bg-cyan-700 text-white p-3 rounded-xl"
                  >
                    <Send size={16} />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Welcome Screen with Direct Input */
          <div className="flex-1 flex flex-col min-h-0">
            {/* Welcome Content */}
            <div className="flex-1 flex items-center justify-center p-8 min-h-0">
              <div className="text-center max-w-2xl">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Bot size={32} className="text-white" />
                </div>
                
                <h2 className="text-3xl font-bold text-white mb-4">
                  How can I help you today?
                </h2>
                
                <p className="text-slate-400 mb-8">
                  I'm your AI wellness companion, here to provide emotional support and guidance. 
                  Start typing below or choose from suggestions.
                </p>
              </div>
            </div>

            {/* Direct Input Area */}
            <div className="border-t border-slate-700 bg-slate-800 p-4 flex-shrink-0">
              <div className="max-w-4xl mx-auto">
                <div className="flex items-end space-x-3">
                  <div className="flex-1 relative">
                    <textarea
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Start your conversation here..."
                      disabled={chatLoading}
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
                        disabled={chatLoading}
                      />
                    </div>
                  </div>
                  
                  <Button
                    onClick={async () => {
                      if (inputValue.trim()) {
                        // Create new conversation and send message
                        const { data: conversation, error } = await createConversation('New Conversation');
                        if (!error && conversation) {
                          setConversations(prev => [conversation, ...prev]);
                          setCurrentConversation(conversation);
                          handleSendMessage(inputValue.trim(), isVoiceInput);
                          setInputValue('');
                          setIsVoiceInput(false);
                        }
                      }
                    }}
                    disabled={!inputValue.trim() || chatLoading}
                    className="bg-cyan-600 hover:bg-cyan-700 text-white p-3 rounded-xl"
                  >
                    <Send size={16} />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Suggestions and History Section - Below Chat */}
      <div className="border-t border-slate-700 bg-slate-800 flex-shrink-0">
        <div className="max-w-4xl mx-auto">
          {/* Tab Navigation */}
          <div className="flex border-b border-slate-700">
            <button
              onClick={() => setActiveTab('suggestions')}
              className={`
                flex-1 flex items-center justify-center py-3 px-4 text-sm font-medium transition-colors
                ${activeTab === 'suggestions' 
                  ? 'text-cyan-400 bg-slate-700 border-b-2 border-cyan-400' 
                  : 'text-slate-400 hover:text-slate-300'
                }
              `}
            >
              <Sparkles size={16} className="mr-2" />
              <span className="hidden sm:inline">Personalized </span>Suggestions
            </button>
            
            <button
              onClick={() => setActiveTab('history')}
              className={`
                flex-1 flex items-center justify-center py-3 px-4 text-sm font-medium transition-colors
                ${activeTab === 'history' 
                  ? 'text-cyan-400 bg-slate-700 border-b-2 border-cyan-400' 
                  : 'text-slate-400 hover:text-slate-300'
                }
              `}
            >
              <History size={16} className="mr-2" />
              <span className="hidden sm:inline">Conversation </span>History
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-4">
            <div className="max-h-80 overflow-y-auto">
              {activeTab === 'suggestions' && (
                <div>
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-white mb-2">Personalized Suggestions</h3>
                    <p className="text-sm text-slate-400">Based on your health data and recent activity</p>
                  </div>
                  <DynamicPrompts
                    prompts={dynamicPrompts}
                    onSelectPrompt={handleSelectPrompt}
                    loading={false}
                  />
                </div>
              )}
              
              {activeTab === 'history' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-1">Conversation History</h3>
                      <p className="text-sm text-slate-400">Your recent conversations</p>
                    </div>
                    <Button
                      onClick={startNewConversation}
                      size="sm"
                      className="bg-cyan-600 hover:bg-cyan-700 flex items-center space-x-2"
                    >
                      <Plus size={14} />
                      <span className="hidden sm:inline">New</span>
                    </Button>
                  </div>
                  <ConversationHistory
                    conversations={conversations}
                    onSelectConversation={(conv) => {
                      setCurrentConversation(conv);
                    }}
                    selectedConversationId={currentConversation?.id}
                    loading={false}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Counselor Contact Modal */}
      <Modal
        isOpen={showCounselorModal}
        onClose={() => setShowCounselorModal(false)}
        title="Human Support & Crisis Resources"
        size="lg"
      >
        <CounselorContact
          counselors={counselors}
          onContactCounselor={handleContactCounselor}
          loading={false}
        />
      </Modal>
    </div>
  );
};

export default AIAssistant;