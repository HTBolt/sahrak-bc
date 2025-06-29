import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { 
  Heart, 
  Plus, 
  Brain, 
  TrendingUp, 
  Calendar, 
  MessageCircle,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Tag,
  Clock,
  RefreshCw,
  Sparkles,
  BarChart3
} from 'lucide-react';
import { format, parseISO, subDays, startOfDay, endOfDay } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';
import { 
  getUserMoodEntries, 
  addMoodEntry, 
  getLatestMoodEntry,
  getUpcomingAppointments,
  calculateWellnessScores
} from '../lib/database';
import toast from 'react-hot-toast';
import { getCurrentUser } from '../lib/customAuth';

interface MoodEntry {
  id: string;
  user_id: string;
  mood: 'excellent' | 'good' | 'neutral' | 'stressed' | 'distressed';
  mood_score: number;
  stress_level: number;
  notes: string;
  tags: string[];
  created_at: string;
}

interface MoodFormData {
  mood: 'excellent' | 'good' | 'neutral' | 'stressed' | 'distressed';
  mood_score: number;
  stress_level: number;
  notes: string;
  tags: string;
}

const moodOptions = [
  { value: 'excellent', label: 'Excellent', emoji: '😊', score: 5, color: 'text-green-400 bg-green-900/20' },
  { value: 'good', label: 'Good', emoji: '🙂', score: 4, color: 'text-blue-400 bg-blue-900/20' },
  { value: 'neutral', label: 'Neutral', emoji: '😐', score: 3, color: 'text-yellow-400 bg-yellow-900/20' },
  { value: 'stressed', label: 'Stressed', emoji: '😰', score: 2, color: 'text-orange-400 bg-orange-900/20' },
  { value: 'distressed', label: 'Distressed', emoji: '😢', score: 1, color: 'text-red-400 bg-red-900/20' }
];

const MoodTracker: React.FC = () => {
  const user = getCurrentUser();
  const navigate = useNavigate();
  
  const [moodEntries, setMoodEntries] = useState<MoodEntry[]>([]);
  const [latestMood, setLatestMood] = useState<MoodEntry | null>(null);
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([]);
  const [wellnessScore, setWellnessScore] = useState(75);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showAllEntries, setShowAllEntries] = useState(false);
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState('');

  const form = useForm<MoodFormData>({
    defaultValues: {
      mood: 'good',
      mood_score: 4,
      stress_level: 5,
      notes: '',
      tags: ''
    }
  });

  const loadData = async () => {
    if (!user) return;

    try {
      const [moodResult, latestResult, appointmentsResult] = await Promise.all([
        getUserMoodEntries(user.id, 30),
        getLatestMoodEntry(user.id),
        getUpcomingAppointments(user.id, 3)
      ]);

      if (moodResult.error) throw moodResult.error;
      if (latestResult.error) throw latestResult.error;
      if (appointmentsResult.error) throw appointmentsResult.error;

      const entries = moodResult.data || [];
      setMoodEntries(entries);
      setLatestMood(latestResult.data?.[0] || null);
      setUpcomingAppointments(appointmentsResult.data || []);

      // Calculate and update wellness score
      const scores = await calculateWellnessScores(user.id);
      setWellnessScore(scores.mentalScore);

    } catch (error: any) {
      console.error('Error loading mood data:', error);
      toast.error('Failed to load mood data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  const onSubmit = async (data: MoodFormData) => {
    if (!user) return;

    try {
      // Parse tags from comma-separated string
      const tags = data.tags
        .split(',')
        .map(tag => tag.trim().toLowerCase())
        .filter(tag => tag.length > 0)
        .map(tag => tag.startsWith('#') ? tag : `#${tag}`);

      const moodData = {
        user_id: user.id,
        mood: data.mood,
        mood_score: data.mood_score,
        stress_level: data.stress_level,
        notes: data.notes.trim(),
        tags: tags
      };

      const { error } = await addMoodEntry(moodData);
      if (error) throw error;

      toast.success('Mood entry added successfully!');
      setShowForm(false);
      form.reset();
      await loadData();

    } catch (error: any) {
      console.error('Error adding mood entry:', error);
      toast.error('Failed to add mood entry');
    }
  };

  const getMoodOption = (mood: string) => {
    return moodOptions.find(option => option.value === mood) || moodOptions[2];
  };

  const getStressLevel7DayAvg = () => {
    if (moodEntries.length === 0) return 0;
    const recent = moodEntries.slice(0, 7);
    return recent.reduce((sum, entry) => sum + entry.stress_level, 0) / recent.length;
  };

  const getWellnessTrend = () => {
    if (moodEntries.length === 0) {
      return { 
        label: 'No Data', 
        color: 'text-gray-400',
        description: 'Start logging moods'
      };
    }
    
    if (moodEntries.length === 1) {
      const entry = moodEntries[0];
      const wellnessScore = entry.mood_score - (entry.stress_level / 2);
      
      if (wellnessScore >= 3.5) {
        return { 
          label: 'Good Start', 
          color: 'text-green-400',
          description: 'Keep tracking!'
        };
      } else if (wellnessScore >= 2) {
        return { 
          label: 'Baseline', 
          color: 'text-yellow-400',
          description: 'Building data...'
        };
      } else {
        return { 
          label: 'Needs Attention', 
          color: 'text-orange-400',
          description: 'Consider support'
        };
      }
    }
    
    if (moodEntries.length < 4) {
      // Calculate trend with available data
      const recent = moodEntries.slice(0, Math.ceil(moodEntries.length / 2));
      const older = moodEntries.slice(Math.ceil(moodEntries.length / 2));
      
      const recentAvgMood = recent.reduce((sum, entry) => sum + entry.mood_score, 0) / recent.length;
      const recentAvgStress = recent.reduce((sum, entry) => sum + entry.stress_level, 0) / recent.length;
      
      if (older.length > 0) {
        const olderAvgMood = older.reduce((sum, entry) => sum + entry.mood_score, 0) / older.length;
        const olderAvgStress = older.reduce((sum, entry) => sum + entry.stress_level, 0) / older.length;
        
        const recentWellness = recentAvgMood - (recentAvgStress / 2);
        const olderWellness = olderAvgMood - (olderAvgStress / 2);
        const diff = recentWellness - olderWellness;
        
        if (diff > 0.3) {
          return { 
            label: 'Improving', 
            color: 'text-green-400',
            description: `${moodEntries.length} entries tracked`
          };
        } else if (diff < -0.3) {
          return { 
            label: 'Declining', 
            color: 'text-red-400',
            description: `${moodEntries.length} entries tracked`
          };
        } else {
          return { 
            label: 'Stable', 
            color: 'text-blue-400',
            description: `${moodEntries.length} entries tracked`
          };
        }
      } else {
        // Only one entry, show current state
        const wellnessScore = recentAvgMood - (recentAvgStress / 2);
        if (wellnessScore >= 3.5) {
          return { 
            label: 'Positive', 
            color: 'text-green-400',
            description: `${moodEntries.length} entries tracked`
          };
        } else if (wellnessScore >= 2) {
          return { 
            label: 'Neutral', 
            color: 'text-yellow-400',
            description: `${moodEntries.length} entries tracked`
          };
        } else {
          return { 
            label: 'Needs Support', 
            color: 'text-orange-400',
            description: `${moodEntries.length} entries tracked`
          };
        }
      }
    }
    
    // 4+ entries - full trend analysis
    const recent = moodEntries.slice(0, 3);
    const previous = moodEntries.slice(3, 6);
    
    const recentAvgMood = recent.reduce((sum, entry) => sum + entry.mood_score, 0) / recent.length;
    const previousAvgMood = previous.reduce((sum, entry) => sum + entry.mood_score, 0) / previous.length;
    
    const recentAvgStress = recent.reduce((sum, entry) => sum + entry.stress_level, 0) / recent.length;
    const previousAvgStress = previous.reduce((sum, entry) => sum + entry.stress_level, 0) / previous.length;
    
    const recentWellness = recentAvgMood - (recentAvgStress / 2);
    const previousWellness = previousAvgMood - (previousAvgStress / 2);
    
    const diff = recentWellness - previousWellness;
    
    if (diff > 0.5) {
      return { 
        label: 'Improving', 
        color: 'text-green-400',
        description: 'Wellness trending up'
      };
    }
    if (diff < -0.5) {
      return { 
        label: 'Declining', 
        color: 'text-red-400',
        description: 'May need attention'
      };
    }
    return { 
      label: 'Stable', 
      color: 'text-blue-400',
      description: 'Consistent patterns'
    };
  };

  const getAllTags = () => {
    const allTags = new Set<string>();
    moodEntries.forEach(entry => {
      if (entry.notes) {
        const tags = entry.notes.match(/#\w+/g) || [];
        tags.forEach(tag => allTags.add(tag));
      }
    });
    return Array.from(allTags);
  };

  const filteredEntries = moodEntries.filter(entry => {
    const matchesSearch = entry.notes.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entry.mood.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTag = !selectedTag || entry.notes.includes(selectedTag);
    return matchesSearch && matchesTag;
  });

  const visibleEntries = showAllEntries ? filteredEntries : filteredEntries.slice(0, 3);

  const handleAIAssistant = () => {
    const contextData = {
      currentMood: latestMood ? {
        mood: latestMood.mood,
        mood_score: latestMood.mood_score,
        stress_level: latestMood.stress_level,
        notes: latestMood.notes,
        created_at: latestMood.created_at
      } : null,
      recentEntries: moodEntries.slice(0, 3),
      upcomingAppointments: upcomingAppointments,
      trend: getWellnessTrend(),
      averageStress: getStressLevel7DayAvg(),
      wellnessScore: wellnessScore
    };

    // Store context in sessionStorage for AI assistant to access
    sessionStorage.setItem('moodContext', JSON.stringify(contextData));
    navigate('/ai-assistant');
  };

  const trend = getWellnessTrend();
  const stressAvg = getStressLevel7DayAvg();

  useEffect(() => {
    loadData();
  }, [user]);

  useEffect(() => {
    const selectedMood = moodOptions.find(option => option.value === form.watch('mood'));
    if (selectedMood) {
      form.setValue('mood_score', selectedMood.score);
    }
  }, [form.watch('mood')]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading your mood data...</p>
        </div>
      </div>
    );
  }

  const getWellnessStatus = (score: number) => {
    if (score >= 85) return { label: 'Excellent', color: 'text-green-400', bgColor: 'bg-green-900/20' };
    if (score >= 70) return { label: 'Good', color: 'text-blue-400', bgColor: 'bg-blue-900/20' };
    if (score >= 50) return { label: 'Fair', color: 'text-yellow-400', bgColor: 'bg-yellow-900/20' };
    return { label: 'Needs Attention', color: 'text-red-400', bgColor: 'bg-red-900/20' };
  };

  const mentalStatus = getWellnessStatus(wellnessScore);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="mb-4 sm:mb-0">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center space-x-3">
            <Heart className="w-8 h-8 text-pink-400" />
            <span>Mood Tracker</span>
          </h1>
          <p className="text-slate-400">
            Track your emotional wellbeing and discover patterns in your mental health
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            onClick={handleRefresh}
            disabled={refreshing}
            className="text-slate-400 hover:text-slate-300"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </Button>
          
          <Button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center space-x-2 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
          >
            <Plus size={16} />
            <span>Log Mood</span>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current Mood */}
        <Card className="p-6 bg-gradient-to-br from-slate-800 to-slate-700 border-slate-600">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
              <Heart className="w-5 h-5 text-pink-400" />
              <span>Current Mood</span>
            </h3>
          </div>
          
          {latestMood ? (
            <div className="flex items-center space-x-3">
              <span className="text-3xl">{getMoodOption(latestMood.mood).emoji}</span>
              <div>
                <p className="text-xl font-bold text-white">{getMoodOption(latestMood.mood).label}</p>
                <p className="text-sm text-slate-400">
                  {format(parseISO(latestMood.created_at), 'MMM d, h:mm a')}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-slate-400 mb-3">No mood entries yet</p>
              <Button
                size="sm"
                onClick={() => setShowForm(true)}
                className="bg-pink-500 hover:bg-pink-600"
              >
                Log Your First Mood
              </Button>
            </div>
          )}
        </Card>

        {/* Stress Level */}
        <Card className="p-6 bg-gradient-to-br from-slate-800 to-slate-700 border-slate-600">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
              <Brain className="w-5 h-5 text-blue-400" />
              <span>Stress Level</span>
            </h3>
          </div>
          
          {moodEntries.length > 0 ? (
            <div>
              <div className="flex items-end space-x-2">
                <span className="text-3xl font-bold text-blue-400">
                  {stressAvg.toFixed(1)}
                </span>
                <span className="text-slate-400 text-lg mb-1">/10</span>
              </div>
              <p className="text-sm text-slate-400 mt-1">
                ({moodEntries.length >= 7 ? '7-day' : `${moodEntries.length}-entry`} avg)
              </p>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-slate-400 mb-3">No stress data yet</p>
              <Button
                size="sm"
                onClick={() => setShowForm(true)}
                className="bg-blue-500 hover:bg-blue-600"
              >
                Start Tracking
              </Button>
            </div>
          )}
        </Card>

        {/* Mental Wellness Score */}
        <Card className="p-6 bg-gradient-to-br from-slate-800 to-slate-700 border-slate-600">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              <span>Mental Wellness</span>
            </h3>
          </div>
          
          <div>
            <div className="flex items-end space-x-2 mb-2">
              <span className={`text-3xl font-bold ${mentalStatus.color}`}>
                {wellnessScore}
              </span>
              <span className="text-slate-400 text-lg mb-1">/100</span>
            </div>
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${mentalStatus.bgColor} ${mentalStatus.color}`}>
              {mentalStatus.label}
            </div>
          </div>
        </Card>
      </div>

      {/* AI Wellness Companion */}
      <Card className="p-6 bg-gradient-to-r from-purple-900/20 to-blue-900/20 border-purple-800/50">
        <div className="flex items-start space-x-4">
          <div className="p-3 bg-purple-600 rounded-lg">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-2 flex items-center space-x-2">
              <MessageCircle className="w-5 h-5 text-purple-400" />
              <span>AI Wellness Companion</span>
            </h3>
            <p className="text-purple-100 mb-4">
              {latestMood 
                ? `I notice you've been feeling ${latestMood.mood} recently. Would you like to explore strategies to enhance your wellbeing?`
                : "I'm here to help you understand your mood patterns and provide personalized wellness guidance."
              }
            </p>
            <Button
              onClick={handleAIAssistant}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              Start Conversation
            </Button>
          </div>
        </div>
      </Card>

      {/* Recent Mood Entries */}
      <Card className="p-6 bg-slate-800 border-slate-700">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-cyan-400" />
            <span>Recent Mood Entries</span>
          </h3>
          
          {moodEntries.length > 3 && (
            <Button
              variant="ghost"
              onClick={() => setShowAllEntries(!showAllEntries)}
              className="text-cyan-400 hover:text-cyan-300"
            >
              {showAllEntries ? (
                <>
                  <ChevronUp size={16} className="mr-1" />
                  Show Less
                </>
              ) : (
                <>
                  <ChevronDown size={16} className="mr-1" />
                  View All ({moodEntries.length})
                </>
              )}
            </Button>
          )}
        </div>

        {/* Search and Filter */}
        {moodEntries.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search entries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent w-full"
              />
            </div>
            
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            >
              <option value="">All Tags</option>
              {getAllTags().map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          </div>
        )}

        {/* Entries List */}
        <div className="space-y-4">
          {visibleEntries.length > 0 ? (
            visibleEntries.map((entry) => {
              const moodOption = getMoodOption(entry.mood);
              const isExpanded = expandedEntry === entry.id;
              const tags = entry.notes.match(/#\w+/g) || [];
              
              return (
                <div
                  key={entry.id}
                  className="p-4 bg-slate-700/50 rounded-lg hover:bg-slate-700/70 transition-colors cursor-pointer"
                  onClick={() => setExpandedEntry(isExpanded ? null : entry.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <span className="text-2xl">{moodOption.emoji}</span>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="font-semibold text-white">{moodOption.label}</h4>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${moodOption.color}`}>
                            Stress: {entry.stress_level}/10
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-slate-400 mb-2">
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{format(parseISO(entry.created_at), 'MMM d, yyyy • h:mm a')}</span>
                          </div>
                        </div>
                        
                        {!isExpanded && entry.notes && (
                          <p className="text-slate-300 text-sm line-clamp-2">
                            {entry.notes.length > 100 
                              ? `${entry.notes.substring(0, 100)}...`
                              : entry.notes
                            }
                          </p>
                        )}
                        
                        {isExpanded && entry.notes && (
                          <div className="mt-3 p-3 bg-slate-600/50 rounded-lg">
                            <p className="text-slate-200 whitespace-pre-wrap">{entry.notes}</p>
                          </div>
                        )}
                        
                        {tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {tags.map((tag, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-cyan-900/30 text-cyan-300 border border-cyan-800"
                              >
                                <Tag className="w-3 h-3 mr-1" />
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12">
              <Heart className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-300 mb-2">
                {moodEntries.length === 0 
                  ? 'No mood entries yet'
                  : 'No entries match your search'
                }
              </h3>
              <p className="text-slate-500 mb-4">
                {moodEntries.length === 0 
                  ? 'Start tracking your mood to see patterns and insights'
                  : 'Try adjusting your search terms or filters'
                }
              </p>
              {moodEntries.length === 0 && (
                <Button
                  onClick={() => setShowForm(true)}
                  className="bg-pink-500 hover:bg-pink-600"
                >
                  Log Your First Mood
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Mood Entry Form Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Log Your Mood"
        size="lg"
      >
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Mood Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              How are you feeling? *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {moodOptions.map((option) => (
                <label
                  key={option.value}
                  className={`
                    flex items-center space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-all
                    ${form.watch('mood') === option.value
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                    }
                  `}
                >
                  <input
                    type="radio"
                    value={option.value}
                    {...form.register('mood', { required: 'Please select your mood' })}
                    className="sr-only"
                  />
                  <span className="text-2xl">{option.emoji}</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
            {form.formState.errors.mood && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {form.formState.errors.mood.message}
              </p>
            )}
          </div>

          {/* Stress Level */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Stress Level: {form.watch('stress_level')}/10
            </label>
            <input
              type="range"
              min="1"
              max="10"
              {...form.register('stress_level', { 
                required: 'Please select your stress level',
                valueAsNumber: true 
              })}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 slider"
            />
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
              <span>Low Stress</span>
              <span>High Stress</span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Journal Entry
            </label>
            <textarea
              placeholder="How was your day? What's on your mind? Use #tags to categorize your thoughts..."
              {...form.register('notes', {
                maxLength: {
                  value: 4000,
                  message: 'Entry cannot exceed 4000 characters'
                }
              })}
              className="
                block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 
                focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500
                dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400
                dark:focus:border-primary-400 dark:focus:ring-primary-400
                resize-none
              "
              rows={6}
            />
            <div className="flex justify-between items-center mt-1">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Use #tags to categorize your thoughts (e.g., #work #family #exercise)
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {form.watch('notes')?.length || 0}/4000
              </p>
            </div>
            {form.formState.errors.notes && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {form.formState.errors.notes.message}
              </p>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
            >
              Log Mood
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default MoodTracker;