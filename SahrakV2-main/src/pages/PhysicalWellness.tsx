import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { 
  Activity, 
  Heart, 
  Weight, 
  Ruler, 
  Droplets, 
  Zap, 
  Moon, 
  Target, 
  TrendingUp, 
  Plus, 
  Edit3, 
  Save, 
  X, 
  RefreshCw,
  Calendar,
  Clock,
  Flame,
  BarChart3,
  Award,
  AlertCircle,
  User
} from 'lucide-react';
import { format, parseISO, subDays } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, BarChart, Bar, Tooltip } from 'recharts';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { MultiMetricForm } from '../components/health/MultiMetricForm';
import { HealthIndicator, HealthBadge, HealthSummary } from '../components/ui/HealthIndicator';
import { useAuth } from '../contexts/AuthContext';
import { getUserHealthMetrics, addHealthMetric, getUserProfile, updateUserProfile, calculateWellnessScores } from '../lib/database';
import { 
  getHealthStatus, 
  getBMIStatus, 
  getWeightGoalStatus, 
  HEALTH_RANGES,
  HEALTH_STATUS 
} from '../config/healthRanges';
import toast from 'react-hot-toast';
import { getCurrentUser } from '../lib/customAuth';

interface HealthMetric {
  id: string;
  user_id: string;
  metric_type: string;
  value: number;
  unit: string;
  recorded_at: string;
  notes?: string;
  source: string;
}

interface GoalFormData {
  weight_goal: string;
  exercise_duration_goal: string;
  calories_goal: string;
}

interface MetricFormData {
  metric_type: string;
  value: string;
  notes: string;
}

const metricTypes = [
  { value: 'weight', label: 'Weight', unit: 'kg', icon: Weight, color: 'text-primary-500' },
  { value: 'blood_pressure_systolic', label: 'Blood Pressure (Systolic)', unit: 'mmHg', icon: Heart, color: 'text-red-400' },
  { value: 'blood_pressure_diastolic', label: 'Blood Pressure (Diastolic)', unit: 'mmHg', icon: Heart, color: 'text-red-400' },
  { value: 'heart_rate', label: 'Heart Rate', unit: 'bpm', icon: Heart, color: 'text-pink-400' },
  { value: 'blood_sugar', label: 'Blood Sugar', unit: 'mg/dL', icon: Droplets, color: 'text-orange-400' },
  { value: 'sleep_duration', label: 'Sleep Duration', unit: 'hours', icon: Moon, color: 'text-purple-400' },
  { value: 'exercise_duration', label: 'Exercise Duration', unit: 'minutes', icon: Activity, color: 'text-secondary-500' },
  { value: 'calories_burned', label: 'Calories Burned', unit: 'kcal', icon: Flame, color: 'text-yellow-400' }
];

const PhysicalWellness: React.FC = () => {
  const user = getCurrentUser();
  const [healthMetrics, setHealthMetrics] = useState<HealthMetric[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [healthScore, setHealthScore] = useState(75);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showMetricForm, setShowMetricForm] = useState(false);
  const [showMultiMetricForm, setShowMultiMetricForm] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [selectedMetricType, setSelectedMetricType] = useState('');

  const goalForm = useForm<GoalFormData>({
    defaultValues: {
      weight_goal: '',
      exercise_duration_goal: '',
      calories_goal: ''
    }
  });

  const metricForm = useForm<MetricFormData>({
    defaultValues: {
      metric_type: 'weight',
      value: '',
      notes: ''
    }
  });

  const loadData = async () => {
    if (!user) return;

    try {
      const [metricsResult, profileResult] = await Promise.all([
        getUserHealthMetrics(user.id),
        getUserProfile(user.id)
      ]);

      if (metricsResult.error) throw metricsResult.error;
      if (profileResult.error) throw profileResult.error;

      setHealthMetrics(metricsResult.data || []);
      
      if (profileResult.data && profileResult.data.length > 0) {
        const profileData = profileResult.data[0];
        setProfile(profileData);
        
        // Set goal form values
        goalForm.reset({
          weight_goal: profileData.weight_goal?.toString() || '',
          exercise_duration_goal: profileData.exercise_duration_goal?.toString() || '',
          calories_goal: profileData.calories_goal?.toString() || ''
        });
      }

      // Calculate health score using the same logic as the dashboard
      const scores = await calculateWellnessScores(user.id);
      setHealthScore(scores.physicalScore);

    } catch (error: any) {
      console.error('Error loading health data:', error);
      toast.error('Failed to load health data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  const onSubmitMetric = async (data: MetricFormData) => {
    if (!user) return;

    try {
      const metricType = metricTypes.find(m => m.value === data.metric_type);
      if (!metricType) throw new Error('Invalid metric type');

      const metricData = {
        user_id: user.id,
        metric_type: data.metric_type,
        value: parseFloat(data.value),
        unit: metricType.unit,
        notes: data.notes.trim() || null,
        source: 'manual'
      };

      const { error } = await addHealthMetric(metricData);
      if (error) throw error;

      toast.success('Health metric added successfully!');
      setShowMetricForm(false);
      metricForm.reset();
      await loadData();

    } catch (error: any) {
      console.error('Error adding health metric:', error);
      toast.error('Failed to add health metric');
    }
  };

  const onSubmitGoals = async (data: GoalFormData) => {
    if (!user) return;

    try {
      const goalData = {
        weight_goal: data.weight_goal ? parseFloat(data.weight_goal) : null,
        exercise_duration_goal: data.exercise_duration_goal ? parseInt(data.exercise_duration_goal) : null,
        calories_goal: data.calories_goal ? parseInt(data.calories_goal) : null
      };

      const { error } = await updateUserProfile(user.id, goalData);
      if (error) throw error;

      toast.success('Goals updated successfully!');
      setShowGoalForm(false);
      await loadData();

    } catch (error: any) {
      console.error('Error updating goals:', error);
      toast.error('Failed to update goals');
    }
  };

  const getLatestMetric = (type: string) => {
    return healthMetrics
      .filter(m => m.metric_type === type)
      .sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())[0];
  };

  const getMetricTrend = (type: string, days: number = 7) => {
    const metrics = healthMetrics
      .filter(m => m.metric_type === type)
      .filter(m => new Date(m.recorded_at) >= subDays(new Date(), days))
      .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());

    return metrics.map(m => ({
      date: format(parseISO(m.recorded_at), 'MMM d'),
      value: m.value,
      fullDate: m.recorded_at
    }));
  };

  const getGoalProgress = (type: string) => {
    const latest = getLatestMetric(type);
    if (!latest || !profile) return null;

    let goal = null;
    let current = latest.value;

    switch (type) {
      case 'weight':
        goal = profile.weight_goal;
        // For weight goals, calculate progress differently
        if (goal) {
          const weightStatus = getWeightGoalStatus(current, goal);
          const progress = Math.max(0, 100 - (Math.abs(weightStatus.deviation) / goal) * 100);
          return {
            current: Math.round(current * 10) / 10,
            goal,
            progress: Math.round(progress),
            isOnTrack: weightStatus.status === 'optimal',
            unit: metricTypes.find(m => m.value === type)?.unit || ''
          };
        }
        break;
      case 'exercise_duration':
        goal = profile.exercise_duration_goal;
        // Get last 7 days average
        const exerciseMetrics = healthMetrics
          .filter(m => m.metric_type === 'exercise_duration')
          .filter(m => new Date(m.recorded_at) >= subDays(new Date(), 7));
        current = exerciseMetrics.length > 0 
          ? exerciseMetrics.reduce((sum, m) => sum + m.value, 0) / exerciseMetrics.length 
          : 0;
        break;
      case 'calories_burned':
        goal = profile.calories_goal;
        // Get last 7 days average
        const calorieMetrics = healthMetrics
          .filter(m => m.metric_type === 'calories_burned')
          .filter(m => new Date(m.recorded_at) >= subDays(new Date(), 7));
        current = calorieMetrics.length > 0 
          ? calorieMetrics.reduce((sum, m) => sum + m.value, 0) / calorieMetrics.length 
          : 0;
        break;
    }

    if (!goal) return null;

    const progress = Math.min((current / goal) * 100, 100);
    const isOnTrack = progress >= 80;

    return {
      current: Math.round(current * 10) / 10,
      goal,
      progress: Math.round(progress),
      isOnTrack,
      unit: metricTypes.find(m => m.value === type)?.unit || ''
    };
  };

  // Get BMI and status
  const getBMIData = () => {
    const weight = getLatestMetric('weight');
    if (!weight || !profile?.height_cm) return null;
    
    const bmiData = getBMIStatus(weight.value, profile.height_cm);
    return {
      ...bmiData,
      bmi: Math.round(bmiData.bmi * 100) / 100 // Round to 2 decimal places
    };
  };

  // Get health alerts for concerning metrics
  const getHealthAlerts = () => {
    const alerts = [];
    
    // Check each metric type
    metricTypes.forEach(metricType => {
      const latest = getLatestMetric(metricType.value);
      if (latest && HEALTH_RANGES[metricType.value]) {
        const status = getHealthStatus(metricType.value, latest.value);
        if (status !== 'optimal' && status !== 'normal') {
          alerts.push({
            status,
            metricName: metricType.label,
            value: latest.value,
            unit: latest.unit,
            recommendations: getRecommendations(metricType.value, status)
          });
        }
      }
    });

    // Check BMI
    const bmiData = getBMIData();
    if (bmiData && bmiData.status !== 'optimal' && bmiData.status !== 'normal') {
      alerts.push({
        status: bmiData.status,
        metricName: 'BMI',
        value: bmiData.bmi,
        unit: '',
        recommendations: getBMIRecommendations(bmiData.status)
      });
    }

    return alerts;
  };

  const getRecommendations = (metricType: string, status: keyof typeof HEALTH_STATUS): string[] => {
    const recommendations: Record<string, Record<string, string[]>> = {
      blood_pressure_systolic: {
        borderline: ['Reduce sodium intake', 'Exercise regularly', 'Manage stress'],
        high: ['Consult your doctor', 'Monitor blood pressure daily', 'Consider medication'],
        critical: ['Seek immediate medical attention', 'Emergency consultation required']
      },
      blood_pressure_diastolic: {
        borderline: ['Reduce sodium intake', 'Exercise regularly', 'Manage stress'],
        high: ['Consult your doctor', 'Monitor blood pressure daily', 'Consider medication'],
        critical: ['Seek immediate medical attention', 'Emergency consultation required']
      },
      heart_rate: {
        borderline: ['Monitor during rest', 'Check with healthcare provider'],
        high: ['Consult cardiologist', 'Avoid strenuous activity until cleared'],
        critical: ['Seek immediate medical attention', 'Emergency evaluation needed']
      },
      blood_sugar: {
        borderline: ['Monitor diet', 'Increase physical activity', 'Regular testing'],
        high: ['Consult endocrinologist', 'Diabetes management plan', 'Medication review'],
        critical: ['Immediate medical attention', 'Emergency glucose management']
      },
      sleep_duration: {
        borderline: ['Improve sleep hygiene', 'Consistent sleep schedule'],
        high: ['Consult sleep specialist', 'Sleep study evaluation'],
        critical: ['Medical evaluation needed', 'Potential sleep disorder']
      }
    };

    return recommendations[metricType]?.[status] || ['Consult with your healthcare provider'];
  };

  const getBMIRecommendations = (status: keyof typeof HEALTH_STATUS): string[] => {
    const recommendations = {
      borderline: ['Balanced diet and exercise', 'Consult nutritionist', 'Regular monitoring'],
      high: ['Weight management program', 'Medical supervision', 'Lifestyle changes'],
      critical: ['Immediate medical consultation', 'Comprehensive weight management', 'Health risk assessment']
    };

    return recommendations[status] || ['Consult with your healthcare provider'];
  };

  const formatHeight = (cm: number) => {
    if (!cm) return 'Not specified';
    const feet = Math.floor(cm / 30.48);
    const inches = Math.round((cm % 30.48) / 2.54);
    return `${cm} cm (${feet}'${inches}")`;
  };

  const formatWeight = (kg: number) => {
    if (!kg) return 'Not specified';
    const lbs = Math.round(kg * 2.20462);
    return `${kg} kg (${lbs} lbs)`;
  };

  const bmiData = getBMIData();
  const healthAlerts = getHealthAlerts();

  useEffect(() => {
    loadData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading your health data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="mb-4 sm:mb-0">
          <h1 className="text-3xl font-bold text-[var(--text-primary)] dark:text-white mb-2 flex items-center space-x-3">
            <Activity className="w-8 h-8 text-secondary-500" />
            <span>Physical Wellness</span>
          </h1>
          <p className="text-[var(--text-secondary)] dark:text-slate-400">
            Track your physical health metrics and monitor progress towards your wellness goals
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            onClick={handleRefresh}
            disabled={refreshing}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] dark:text-slate-400 dark:hover:text-slate-300"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </Button>
          
          <Button
            onClick={() => setShowGoalForm(true)}
            variant="outline"
            className="inline-flex items-center space-x-2"
          >
            <Target size={16} />
            <span>Set Goals</span>
          </Button>
          
          <Button
            onClick={() => setShowMultiMetricForm(true)}
            className="inline-flex items-center space-x-2"
          >
            <Plus size={16} />
            <span>Add Metrics</span>
          </Button>
        </div>
      </div>

      {/* Health Alerts Summary */}
      {healthAlerts.length > 0 && (
        <HealthSummary alerts={healthAlerts} />
      )}

      {/* Health Score & Key Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Overall Health Score */}
        <Card className="p-6 bg-gradient-to-br from-secondary-900/20 to-primary-900/20 border-secondary-800/50 lg:col-span-1 dark:bg-gradient-to-br dark:from-secondary-900/20 dark:to-primary-900/20 dark:border-secondary-800/50">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="relative">
                <svg className="w-20 h-20 transform -rotate-90">
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-gray-300 dark:text-slate-700"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 36}`}
                    strokeDashoffset={`${2 * Math.PI * 36 * (1 - healthScore / 100)}`}
                    className="text-secondary-500"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-[var(--text-primary)] dark:text-white">{healthScore}</span>
                </div>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] dark:text-white mb-1">Health Score</h3>
            <p className="text-sm text-[var(--text-secondary)] dark:text-slate-400">Overall wellness rating</p>
          </div>
        </Card>

        {/* Key Metrics */}
        <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Weight */}
          <Card className="p-4 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Weight className="w-5 h-5 text-primary-500" />
                {getLatestMetric('weight') && (
                  <HealthIndicator
                    status={getHealthStatus('weight', getLatestMetric('weight')!.value)}
                    value={getLatestMetric('weight')!.value}
                    unit="kg"
                    metricName="Weight"
                    size="sm"
                    recommendations={getRecommendations('weight', getHealthStatus('weight', getLatestMetric('weight')!.value))}
                  />
                )}
              </div>
              <span className="text-xs text-[var(--text-muted)] dark:text-slate-400">kg</span>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-[var(--text-primary)] dark:text-white">
                {getLatestMetric('weight')?.value || '--'}
              </p>
              <p className="text-xs text-[var(--text-muted)] dark:text-slate-400">Weight</p>
              {getGoalProgress('weight') && (
                <div className="flex items-center space-x-2">
                  <div className="flex-1 bg-gray-200 dark:bg-slate-700 rounded-full h-1">
                    <div 
                      className={`h-1 rounded-full ${getGoalProgress('weight')!.isOnTrack ? 'bg-secondary-500' : 'bg-yellow-400'}`}
                      style={{ width: `${Math.min(getGoalProgress('weight')!.progress, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-[var(--text-muted)] dark:text-slate-400">{getGoalProgress('weight')!.progress}%</span>
                </div>
              )}
            </div>
          </Card>

          {/* Blood Pressure */}
          <Card className="p-4 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Heart className="w-5 h-5 text-red-400" />
                {getLatestMetric('blood_pressure_systolic') && getLatestMetric('blood_pressure_diastolic') && (
                  <HealthIndicator
                    status={getHealthStatus('blood_pressure_systolic', getLatestMetric('blood_pressure_systolic')!.value)}
                    value={getLatestMetric('blood_pressure_systolic')!.value}
                    unit="mmHg"
                    metricName="Blood Pressure"
                    size="sm"
                    recommendations={getRecommendations('blood_pressure_systolic', getHealthStatus('blood_pressure_systolic', getLatestMetric('blood_pressure_systolic')!.value))}
                  />
                )}
              </div>
              <span className="text-xs text-[var(--text-muted)] dark:text-slate-400">mmHg</span>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-[var(--text-primary)] dark:text-white">
                {getLatestMetric('blood_pressure_systolic')?.value || '--'}/
                {getLatestMetric('blood_pressure_diastolic')?.value || '--'}
              </p>
              <p className="text-xs text-[var(--text-muted)] dark:text-slate-400">Blood Pressure</p>
            </div>
          </Card>

          {/* Heart Rate */}
          <Card className="p-4 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Heart className="w-5 h-5 text-pink-400" />
                {getLatestMetric('heart_rate') && (
                  <HealthIndicator
                    status={getHealthStatus('heart_rate', getLatestMetric('heart_rate')!.value)}
                    value={getLatestMetric('heart_rate')!.value}
                    unit="bpm"
                    metricName="Heart Rate"
                    size="sm"
                    recommendations={getRecommendations('heart_rate', getHealthStatus('heart_rate', getLatestMetric('heart_rate')!.value))}
                  />
                )}
              </div>
              <span className="text-xs text-[var(--text-muted)] dark:text-slate-400">bpm</span>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-[var(--text-primary)] dark:text-white">
                {getLatestMetric('heart_rate')?.value || '--'}
              </p>
              <p className="text-xs text-[var(--text-muted)] dark:text-slate-400">Heart Rate</p>
            </div>
          </Card>

          {/* Blood Sugar */}
          <Card className="p-4 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Droplets className="w-5 h-5 text-orange-400" />
                {getLatestMetric('blood_sugar') && (
                  <HealthIndicator
                    status={getHealthStatus('blood_sugar', getLatestMetric('blood_sugar')!.value)}
                    value={getLatestMetric('blood_sugar')!.value}
                    unit="mg/dL"
                    metricName="Blood Sugar"
                    size="sm"
                    recommendations={getRecommendations('blood_sugar', getHealthStatus('blood_sugar', getLatestMetric('blood_sugar')!.value))}
                  />
                )}
              </div>
              <span className="text-xs text-[var(--text-muted)] dark:text-slate-400">mg/dL</span>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-[var(--text-primary)] dark:text-white">
                {getLatestMetric('blood_sugar')?.value || '--'}
              </p>
              <p className="text-xs text-[var(--text-muted)] dark:text-slate-400">Blood Sugar</p>
            </div>
          </Card>

          {/* Sleep */}
          <Card className="p-4 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Moon className="w-5 h-5 text-purple-400" />
                {getLatestMetric('sleep_duration') && (
                  <HealthIndicator
                    status={getHealthStatus('sleep_duration', getLatestMetric('sleep_duration')!.value)}
                    value={getLatestMetric('sleep_duration')!.value}
                    unit="hours"
                    metricName="Sleep Duration"
                    size="sm"
                    recommendations={getRecommendations('sleep_duration', getHealthStatus('sleep_duration', getLatestMetric('sleep_duration')!.value))}
                  />
                )}
              </div>
              <span className="text-xs text-[var(--text-muted)] dark:text-slate-400">hrs</span>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-[var(--text-primary)] dark:text-white">
                {getLatestMetric('sleep_duration')?.value || '--'}
              </p>
              <p className="text-xs text-[var(--text-muted)] dark:text-slate-400">Sleep Duration</p>
            </div>
          </Card>

          {/* Exercise */}
          <Card className="p-4 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Activity className="w-5 h-5 text-secondary-500" />
                {getLatestMetric('exercise_duration') && (
                  <HealthIndicator
                    status={getHealthStatus('exercise_duration', getLatestMetric('exercise_duration')!.value)}
                    value={getLatestMetric('exercise_duration')!.value}
                    unit="minutes"
                    metricName="Exercise Duration"
                    size="sm"
                    recommendations={getRecommendations('exercise_duration', getHealthStatus('exercise_duration', getLatestMetric('exercise_duration')!.value))}
                  />
                )}
              </div>
              <span className="text-xs text-[var(--text-muted)] dark:text-slate-400">min</span>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-[var(--text-primary)] dark:text-white">
                {getLatestMetric('exercise_duration')?.value || '--'}
              </p>
              <p className="text-xs text-[var(--text-muted)] dark:text-slate-400">Exercise Duration</p>
              {getGoalProgress('exercise_duration') && (
                <div className="flex items-center space-x-2">
                  <div className="flex-1 bg-gray-200 dark:bg-slate-700 rounded-full h-1">
                    <div 
                      className={`h-1 rounded-full ${getGoalProgress('exercise_duration')!.isOnTrack ? 'bg-secondary-500' : 'bg-yellow-400'}`}
                      style={{ width: `${Math.min(getGoalProgress('exercise_duration')!.progress, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-[var(--text-muted)] dark:text-slate-400">{getGoalProgress('exercise_duration')!.progress}%</span>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Profile Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Height Card */}
        <Card className="p-6 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-purple-600 rounded-lg">
                <Ruler className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)] dark:text-white">Height</h3>
                <p className="text-[var(--text-secondary)] dark:text-slate-400">From your profile</p>
              </div>
            </div>
            
            <div className="text-right">
              <p className="text-3xl font-bold text-[var(--text-primary)] dark:text-white">{profile?.height_cm || '--'}</p>
              <p className="text-sm text-[var(--text-muted)] dark:text-slate-400">cm</p>
              {profile?.height_cm && (
                <p className="text-xs text-[var(--text-muted)] dark:text-slate-500 mt-1">
                  {Math.floor(profile.height_cm / 30.48)}'{Math.round((profile.height_cm % 30.48) / 2.54)}"
                </p>
              )}
            </div>
          </div>
        </Card>

        {/* Blood Group Card */}
        <Card className="p-6 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-red-600 rounded-lg">
                <Droplets className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)] dark:text-white">Blood Type</h3>
                <p className="text-[var(--text-secondary)] dark:text-slate-400">From your profile</p>
              </div>
            </div>
            
            <div className="text-right">
              <p className="text-3xl font-bold text-[var(--text-primary)] dark:text-white">{profile?.blood_type || '--'}</p>
              <p className="text-sm text-[var(--text-muted)] dark:text-slate-400">Blood Group</p>
            </div>
          </div>
        </Card>

        {/* BMI Card */}
        <Card className="p-6 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-600 rounded-lg">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)] dark:text-white">BMI</h3>
                <p className="text-[var(--text-secondary)] dark:text-slate-400">Body Mass Index</p>
              </div>
            </div>
            
            <div className="text-right">
              <div className="flex items-center space-x-2">
                <p className="text-3xl font-bold text-[var(--text-primary)] dark:text-white">{bmiData?.bmi || '--'}</p>
                {bmiData && (
                  <HealthIndicator
                    status={bmiData.status}
                    value={bmiData.bmi}
                    unit=""
                    metricName="BMI"
                    recommendations={getBMIRecommendations(bmiData.status)}
                  />
                )}
              </div>
              {bmiData && (
                <HealthBadge status={bmiData.status} label={HEALTH_STATUS[bmiData.status].label} size="sm" />
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Goal Progress Cards */}
      {(getGoalProgress('weight') || getGoalProgress('exercise_duration') || getGoalProgress('calories_burned')) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {getGoalProgress('weight') && (
            <Card className="p-6 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[var(--text-primary)] dark:text-white flex items-center space-x-2">
                  <Target className="w-5 h-5 text-primary-500" />
                  <span>Weight Goal</span>
                </h3>
                {getGoalProgress('weight')!.isOnTrack && (
                  <Award className="w-5 h-5 text-yellow-400" />
                )}
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-2xl font-bold text-[var(--text-primary)] dark:text-white">
                      {getGoalProgress('weight')!.current}
                    </p>
                    <p className="text-sm text-[var(--text-muted)] dark:text-slate-400">Current</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-[var(--text-secondary)] dark:text-slate-300">
                      {getGoalProgress('weight')!.goal}
                    </p>
                    <p className="text-sm text-[var(--text-muted)] dark:text-slate-400">Goal</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-muted)] dark:text-slate-400">Progress</span>
                    <span className={getGoalProgress('weight')!.isOnTrack ? 'text-secondary-500' : 'text-yellow-400'}>
                      {getGoalProgress('weight')!.progress}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${getGoalProgress('weight')!.isOnTrack ? 'bg-secondary-500' : 'bg-yellow-400'}`}
                      style={{ width: `${Math.min(getGoalProgress('weight')!.progress, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </Card>
          )}

          {getGoalProgress('exercise_duration') && (
            <Card className="p-6 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[var(--text-primary)] dark:text-white flex items-center space-x-2">
                  <Activity className="w-5 h-5 text-secondary-500" />
                  <span>Exercise Goal</span>
                </h3>
                {getGoalProgress('exercise_duration')!.isOnTrack && (
                  <Award className="w-5 h-5 text-yellow-400" />
                )}
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-2xl font-bold text-[var(--text-primary)] dark:text-white">
                      {getGoalProgress('exercise_duration')!.current}
                    </p>
                    <p className="text-sm text-[var(--text-muted)] dark:text-slate-400">Avg/day (7d)</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-[var(--text-secondary)] dark:text-slate-300">
                      {getGoalProgress('exercise_duration')!.goal}
                    </p>
                    <p className="text-sm text-[var(--text-muted)] dark:text-slate-400">Goal</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-muted)] dark:text-slate-400">Progress</span>
                    <span className={getGoalProgress('exercise_duration')!.isOnTrack ? 'text-secondary-500' : 'text-yellow-400'}>
                      {getGoalProgress('exercise_duration')!.progress}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${getGoalProgress('exercise_duration')!.isOnTrack ? 'bg-secondary-500' : 'bg-yellow-400'}`}
                      style={{ width: `${Math.min(getGoalProgress('exercise_duration')!.progress, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </Card>
          )}

          {getGoalProgress('calories_burned') && (
            <Card className="p-6 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[var(--text-primary)] dark:text-white flex items-center space-x-2">
                  <Flame className="w-5 h-5 text-yellow-400" />
                  <span>Calories Goal</span>
                </h3>
                {getGoalProgress('calories_burned')!.isOnTrack && (
                  <Award className="w-5 h-5 text-yellow-400" />
                )}
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-2xl font-bold text-[var(--text-primary)] dark:text-white">
                      {getGoalProgress('calories_burned')!.current}
                    </p>
                    <p className="text-sm text-[var(--text-muted)] dark:text-slate-400">Avg/day (7d)</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-[var(--text-secondary)] dark:text-slate-300">
                      {getGoalProgress('calories_burned')!.goal}
                    </p>
                    <p className="text-sm text-[var(--text-muted)] dark:text-slate-400">Goal</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-muted)] dark:text-slate-400">Progress</span>
                    <span className={getGoalProgress('calories_burned')!.isOnTrack ? 'text-secondary-500' : 'text-yellow-400'}>
                      {getGoalProgress('calories_burned')!.progress}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${getGoalProgress('calories_burned')!.isOnTrack ? 'bg-secondary-500' : 'bg-yellow-400'}`}
                      style={{ width: `${Math.min(getGoalProgress('calories_burned')!.progress, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Trends Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weight Trend */}
        {getMetricTrend('weight').length > 0 && (
          <Card className="p-6 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] dark:text-white mb-4 flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-primary-500" />
              <span>Weight Trend (7 days)</span>
            </h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={getMetricTrend('weight')}>
                  <XAxis 
                    dataKey="date" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--card-bg)', 
                      border: '1px solid var(--card-border)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#F78970" 
                    strokeWidth={2}
                    dot={{ fill: '#F78970', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        {/* Exercise Trend */}
        {getMetricTrend('exercise_duration').length > 0 && (
          <Card className="p-6 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] dark:text-white mb-4 flex items-center space-x-2">
              <Activity className="w-5 h-5 text-secondary-500" />
              <span>Exercise Trend (7 days)</span>
            </h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={getMetricTrend('exercise_duration')}>
                  <XAxis 
                    dataKey="date" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--card-bg)', 
                      border: '1px solid var(--card-border)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)'
                    }}
                  />
                  <Bar 
                    dataKey="value" 
                    fill="#049E56"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
      </div>

      {/* Recent Metrics */}
      <Card className="p-6 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] dark:text-white mb-6 flex items-center space-x-2">
          <BarChart3 className="w-5 h-5 text-primary-500" />
          <span>Recent Metrics</span>
        </h3>
        
        {healthMetrics.length > 0 ? (
          <div className="space-y-3">
            {healthMetrics
              .sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())
              .slice(0, 10)
              .map((metric) => {
                const metricType = metricTypes.find(m => m.value === metric.metric_type);
                if (!metricType) return null;
                
                const status = getHealthStatus(metric.metric_type, metric.value);
                
                return (
                  <div key={metric.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <metricType.icon className={`w-5 h-5 ${metricType.color}`} />
                      <div>
                        <p className="font-medium text-[var(--text-primary)] dark:text-white">{metricType.label}</p>
                        <p className="text-sm text-[var(--text-muted)] dark:text-slate-400">
                          {format(parseISO(metric.recorded_at), 'MMM d, yyyy • h:mm a')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <p className="font-semibold text-[var(--text-primary)] dark:text-white">
                          {metric.value} {metric.unit}
                        </p>
                        {metric.notes && (
                          <p className="text-sm text-[var(--text-muted)] dark:text-slate-400 max-w-32 truncate">
                            {metric.notes}
                          </p>
                        )}
                      </div>
                      <HealthIndicator
                        status={status}
                        value={metric.value}
                        unit={metric.unit}
                        metricName={metricType.label}
                        recommendations={getRecommendations(metric.metric_type, status)}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        ) : (
          <div className="text-center py-12">
            <Activity className="w-16 h-16 text-gray-300 dark:text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-[var(--text-primary)] dark:text-slate-300 mb-2">No health metrics yet</h3>
            <p className="text-[var(--text-muted)] dark:text-slate-500 mb-4">Start tracking your physical wellness metrics</p>
            <Button
              onClick={() => setShowMultiMetricForm(true)}
              className="bg-secondary-500 hover:bg-secondary-600"
            >
              Add Your First Metric
            </Button>
          </div>
        )}
      </Card>

      {/* Add Metric Modal (Single) */}
      <Modal
        isOpen={showMetricForm}
        onClose={() => setShowMetricForm(false)}
        title="Add Health Metric"
        size="lg"
      >
        <form onSubmit={metricForm.handleSubmit(onSubmitMetric)} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Metric Type *
            </label>
            <select
              {...metricForm.register('metric_type', { required: 'Please select a metric type' })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              {metricTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label} ({type.unit})
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Value *"
            type="number"
            step="0.1"
            placeholder="Enter value"
            {...metricForm.register('value', { 
              required: 'Value is required',
              min: { value: 0, message: 'Value must be positive' }
            })}
            error={metricForm.formState.errors.value?.message}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes (Optional)
            </label>
            <textarea
              placeholder="Any additional notes about this measurement..."
              {...metricForm.register('notes')}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400 resize-none"
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowMetricForm(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              Add Metric
            </Button>
          </div>
        </form>
      </Modal>

      {/* Multi-Metric Form Modal */}
      <MultiMetricForm
        isOpen={showMultiMetricForm}
        onClose={() => setShowMultiMetricForm(false)}
        onSuccess={loadData}
      />

      {/* Set Goals Modal */}
      <Modal
        isOpen={showGoalForm}
        onClose={() => setShowGoalForm(false)}
        title="Set Wellness Goals"
        size="lg"
      >
        <form onSubmit={goalForm.handleSubmit(onSubmitGoals)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Weight Goal (kg)"
              type="number"
              step="0.1"
              placeholder="70.0"
              icon={<Weight size={16} className="text-gray-400" />}
              {...goalForm.register('weight_goal')}
            />
            
            <Input
              label="Daily Exercise Goal (minutes)"
              type="number"
              placeholder="30"
              icon={<Activity size={16} className="text-gray-400" />}
              {...goalForm.register('exercise_duration_goal')}
            />
          </div>

          <Input
            label="Daily Calories Burned Goal"
            type="number"
            placeholder="500"
            icon={<Flame size={16} className="text-gray-400" />}
            {...goalForm.register('calories_goal')}
          />

          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5" />
              <div className="text-sm">
                <p className="text-blue-700 dark:text-blue-300 font-medium">Goal Setting Tips</p>
                <ul className="text-blue-600 dark:text-blue-400 mt-1 space-y-1">
                  <li>• Set realistic and achievable goals</li>
                  <li>• Goals help track your progress over time</li>
                  <li>• You can update your goals anytime</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowGoalForm(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              Save Goals
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PhysicalWellness;