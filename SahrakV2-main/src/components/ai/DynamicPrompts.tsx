import React from 'react';
import { 
  Heart, 
  Activity, 
  Pill, 
  Calendar, 
  MessageCircle, 
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import { DynamicPrompt } from '../../lib/aiAssistant';

interface DynamicPromptsProps {
  prompts: DynamicPrompt[];
  onSelectPrompt: (prompt: DynamicPrompt) => void;
  loading?: boolean;
}

const categoryIcons = {
  mood: Heart,
  health: Activity,
  medication: Pill,
  appointment: Calendar,
  general: MessageCircle
};

const priorityColors = {
  high: 'border-red-500/50 bg-red-900/10',
  medium: 'border-orange-500/50 bg-orange-900/10',
  low: 'border-slate-600 bg-slate-800/50'
};

export const DynamicPrompts: React.FC<DynamicPromptsProps> = ({
  prompts,
  onSelectPrompt,
  loading = false
}) => {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-slate-700 rounded-lg h-16"></div>
          </div>
        ))}
      </div>
    );
  }

  if (prompts.length === 0) {
    return (
      <div className="text-center py-6">
        <Sparkles className="w-8 h-8 text-slate-600 mx-auto mb-2" />
        <p className="text-sm text-slate-500">No suggestions available</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {prompts.slice(0, 6).map((prompt) => {
        const IconComponent = categoryIcons[prompt.category];
        
        return (
          <button
            key={prompt.id}
            onClick={() => onSelectPrompt(prompt)}
            className={`
              w-full text-left p-3 rounded-lg border transition-all duration-200 hover:scale-[1.02]
              ${priorityColors[prompt.priority]}
            `}
          >
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <IconComponent size={16} className="text-white" />
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-white text-sm mb-1 line-clamp-1">
                  {prompt.title}
                </h4>
                <p className="text-xs text-slate-400 line-clamp-2">
                  {prompt.description}
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};