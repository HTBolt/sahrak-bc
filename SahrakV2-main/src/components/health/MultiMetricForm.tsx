import React, { useState } from 'react';
import { 
  Activity, 
  Heart, 
  Weight, 
  Droplets, 
  Moon, 
  Flame,
  Plus,
  Minus,
  Save,
  X,
  AlertCircle
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { addHealthMetric } from '../../lib/database';
import { getCurrentUser } from '../../lib/customAuth';
import toast from 'react-hot-toast';

interface MultiMetricFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface MetricField {
  id: string;
  type: string;
  value: string;
  notes: string;
}

const metricTypes = [
  { value: 'weight', label: 'Weight', unit: 'kg', icon: Weight, color: 'text-blue-400' },
  { value: 'heart_rate', label: 'Heart Rate', unit: 'bpm', icon: Heart, color: 'text-pink-400' },
  { value: 'blood_sugar', label: 'Blood Sugar', unit: 'mg/dL', icon: Droplets, color: 'text-orange-400' },
  { value: 'sleep_duration', label: 'Sleep Duration', unit: 'hours', icon: Moon, color: 'text-purple-400' },
  { value: 'exercise_duration', label: 'Exercise Duration', unit: 'minutes', icon: Activity, color: 'text-green-400' },
  { value: 'calories_burned', label: 'Calories Burned', unit: 'kcal', icon: Flame, color: 'text-yellow-400' }
];

export const MultiMetricForm: React.FC<MultiMetricFormProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [notes, setNotes] = useState('');
  
  // Form state
  const [weight, setWeight] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [systolic, setSystolic] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [bloodSugar, setBloodSugar] = useState('');
  const [sleepDuration, setSleepDuration] = useState('');
  const [exerciseDuration, setExerciseDuration] = useState('');
  const [caloriesBurned, setCaloriesBurned] = useState('');

  const validateForm = (): boolean => {
    const newErrors: {[key: string]: string} = {};
    let isValid = true;
    
    // Only validate fields that have values
    if (weight && (isNaN(parseFloat(weight)) || parseFloat(weight) <= 0)) {
      newErrors['weight'] = 'Please enter a valid weight';
      isValid = false;
    }
    
    if (diastolic && (isNaN(parseFloat(diastolic)) || parseFloat(diastolic) <= 0)) {
      newErrors['diastolic'] = 'Please enter a valid diastolic pressure';
      isValid = false;
    }
    
    if (systolic && (isNaN(parseFloat(systolic)) || parseFloat(systolic) <= 0)) {
      newErrors['systolic'] = 'Please enter a valid systolic pressure';
      isValid = false;
    }
    
    // If one blood pressure value is provided, both must be provided
    if ((systolic && !diastolic) || (!systolic && diastolic)) {
      if (!diastolic) newErrors['diastolic'] = 'Both diastolic and systolic values are required';
      if (!systolic) newErrors['systolic'] = 'Both diastolic and systolic values are required';
      isValid = false;
    }
    
    if (heartRate && (isNaN(parseFloat(heartRate)) || parseFloat(heartRate) <= 0)) {
      newErrors['heartRate'] = 'Please enter a valid heart rate';
      isValid = false;
    }
    
    if (bloodSugar && (isNaN(parseFloat(bloodSugar)) || parseFloat(bloodSugar) <= 0)) {
      newErrors['bloodSugar'] = 'Please enter a valid blood sugar level';
      isValid = false;
    }
    
    if (sleepDuration && (isNaN(parseFloat(sleepDuration)) || parseFloat(sleepDuration) <= 0)) {
      newErrors['sleepDuration'] = 'Please enter a valid sleep duration';
      isValid = false;
    }
    
    if (exerciseDuration && (isNaN(parseFloat(exerciseDuration)) || parseFloat(exerciseDuration) <= 0)) {
      newErrors['exerciseDuration'] = 'Please enter a valid exercise duration';
      isValid = false;
    }
    
    if (caloriesBurned && (isNaN(parseFloat(caloriesBurned)) || parseFloat(caloriesBurned) <= 0)) {
      newErrors['caloriesBurned'] = 'Please enter a valid calories value';
      isValid = false;
    }
    
    // Check if at least one metric is provided
    if (!weight && !diastolic && !systolic && !heartRate && !bloodSugar && !sleepDuration && !exerciseDuration && !caloriesBurned) {
      newErrors['general'] = 'Please enter at least one health metric';
      isValid = false;
    }
    
    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async () => {
    const user = getCurrentUser();
    if (!user) {
      toast.error('User not authenticated');
      return;
    }
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      const metrics = [];
      
      // Add metrics that have values
      if (weight) {
        metrics.push({
          user_id: user.id,
          metric_type: 'weight',
          value: parseFloat(weight),
          unit: 'kg',
          notes: notes.trim() || null,
          source: 'manual'
        });
      }
      
      if (diastolic && systolic) {
        metrics.push({
          user_id: user.id,
          metric_type: 'blood_pressure_diastolic',
          value: parseFloat(diastolic),
          unit: 'mmHg',
          notes: notes.trim() || null,
          source: 'manual'
        });
        
        metrics.push({
          user_id: user.id,
          metric_type: 'blood_pressure_systolic',
          value: parseFloat(systolic),
          unit: 'mmHg',
          notes: notes.trim() || null,
          source: 'manual'
        });
      }
      
      if (heartRate) {
        metrics.push({
          user_id: user.id,
          metric_type: 'heart_rate',
          value: parseFloat(heartRate),
          unit: 'bpm',
          notes: notes.trim() || null,
          source: 'manual'
        });
      }
      
      if (bloodSugar) {
        metrics.push({
          user_id: user.id,
          metric_type: 'blood_sugar',
          value: parseFloat(bloodSugar),
          unit: 'mg/dL',
          notes: notes.trim() || null,
          source: 'manual'
        });
      }
      
      if (sleepDuration) {
        metrics.push({
          user_id: user.id,
          metric_type: 'sleep_duration',
          value: parseFloat(sleepDuration),
          unit: 'hours',
          notes: notes.trim() || null,
          source: 'manual'
        });
      }
      
      if (exerciseDuration) {
        metrics.push({
          user_id: user.id,
          metric_type: 'exercise_duration',
          value: parseFloat(exerciseDuration),
          unit: 'minutes',
          notes: notes.trim() || null,
          source: 'manual'
        });
      }
      
      if (caloriesBurned) {
        metrics.push({
          user_id: user.id,
          metric_type: 'calories_burned',
          value: parseFloat(caloriesBurned),
          unit: 'kcal',
          notes: notes.trim() || null,
          source: 'manual'
        });
      }
      
      // Save all metrics
      const promises = metrics.map(metric => addHealthMetric(metric));
      const results = await Promise.all(promises);
      
      // Check for errors
      const saveErrors = results.filter(result => result.error);
      if (saveErrors.length > 0) {
        throw new Error(`Failed to save ${saveErrors.length} metrics`);
      }
      
      toast.success(`Successfully added ${metrics.length} health metrics!`);
      onSuccess();
      handleCancel();
      
    } catch (error: any) {
      console.error('Error saving health metrics:', error);
      toast.error(error.message || 'Failed to save health metrics');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    onClose();
    // Reset form state
    setWeight('');
    setDiastolic('');
    setSystolic('');
    setHeartRate('');
    setBloodSugar('');
    setSleepDuration('');
    setExerciseDuration('');
    setCaloriesBurned('');
    setNotes('');
    setErrors({});
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title="Add Health Metrics"
      size="xl"
    >
      <div className="space-y-6">
        {errors.general && (
          <div className="p-3 bg-red-900/20 border border-red-800 rounded-lg">
            <p className="text-sm text-red-400">{errors.general}</p>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Weight */}
          <Card className="p-4 bg-slate-800 border-slate-700">
            <div className="flex items-center space-x-2 mb-4">
              <Weight className="w-5 h-5 text-blue-400" />
              <h3 className="font-medium text-white">Weight</h3>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-300">Value</label>
                <span className="text-xs text-gray-400">kg</span>
              </div>
              <input
                type="number"
                step="0.1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="Enter weight"
                className={`
                  w-full rounded-lg border px-3 py-2 text-white 
                  focus:outline-none focus:ring-1
                  bg-gray-700 placeholder-gray-400
                  ${errors.weight 
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                    : 'border-gray-600 focus:border-primary-500 focus:ring-primary-500'
                  }
                `}
              />
              {errors.weight && (
                <p className="mt-1 text-sm text-red-400">{errors.weight}</p>
              )}
            </div>
          </Card>
          
          {/* Blood Pressure */}
          <Card className="p-4 bg-slate-800 border-slate-700">
            <div className="flex items-center space-x-2 mb-4">
              <Heart className="w-5 h-5 text-red-400" />
              <h3 className="font-medium text-white">Blood Pressure</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-gray-300">Diastolic</label>
                  <span className="text-xs text-gray-400">mmHg</span>
                </div>
                <input
                  type="number"
                  value={diastolic}
                  onChange={(e) => setDiastolic(e.target.value)}
                  placeholder="Diastolic"
                  className={`
                    w-full rounded-lg border px-3 py-2 text-white 
                    focus:outline-none focus:ring-1
                    bg-gray-700 placeholder-gray-400
                    ${errors.diastolic 
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                      : 'border-gray-600 focus:border-primary-500 focus:ring-primary-500'
                    }
                  `}
                />
                {errors.diastolic && (
                  <p className="mt-1 text-sm text-red-400">{errors.diastolic}</p>
                )}
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-gray-300">Systolic</label>
                  <span className="text-xs text-gray-400">mmHg</span>
                </div>
                <input
                  type="number"
                  value={systolic}
                  onChange={(e) => setSystolic(e.target.value)}
                  placeholder="Systolic"
                  className={`
                    w-full rounded-lg border px-3 py-2 text-white 
                    focus:outline-none focus:ring-1
                    bg-gray-700 placeholder-gray-400
                    ${errors.systolic 
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                      : 'border-gray-600 focus:border-primary-500 focus:ring-primary-500'
                    }
                  `}
                />
                {errors.systolic && (
                  <p className="mt-1 text-sm text-red-400">{errors.systolic}</p>
                )}
              </div>
            </div>
          </Card>
          
          {/* Heart Rate */}
          <Card className="p-4 bg-slate-800 border-slate-700">
            <div className="flex items-center space-x-2 mb-4">
              <Heart className="w-5 h-5 text-pink-400" />
              <h3 className="font-medium text-white">Heart Rate</h3>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-300">Value</label>
                <span className="text-xs text-gray-400">bpm</span>
              </div>
              <input
                type="number"
                value={heartRate}
                onChange={(e) => setHeartRate(e.target.value)}
                placeholder="Enter heart rate"
                className={`
                  w-full rounded-lg border px-3 py-2 text-white 
                  focus:outline-none focus:ring-1
                  bg-gray-700 placeholder-gray-400
                  ${errors.heartRate 
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                    : 'border-gray-600 focus:border-primary-500 focus:ring-primary-500'
                  }
                `}
              />
              {errors.heartRate && (
                <p className="mt-1 text-sm text-red-400">{errors.heartRate}</p>
              )}
            </div>
          </Card>
          
          {/* Blood Sugar */}
          <Card className="p-4 bg-slate-800 border-slate-700">
            <div className="flex items-center space-x-2 mb-4">
              <Droplets className="w-5 h-5 text-orange-400" />
              <h3 className="font-medium text-white">Blood Sugar</h3>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-300">Value</label>
                <span className="text-xs text-gray-400">mg/dL</span>
              </div>
              <input
                type="number"
                value={bloodSugar}
                onChange={(e) => setBloodSugar(e.target.value)}
                placeholder="Enter blood sugar"
                className={`
                  w-full rounded-lg border px-3 py-2 text-white 
                  focus:outline-none focus:ring-1
                  bg-gray-700 placeholder-gray-400
                  ${errors.bloodSugar 
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                    : 'border-gray-600 focus:border-primary-500 focus:ring-primary-500'
                  }
                `}
              />
              {errors.bloodSugar && (
                <p className="mt-1 text-sm text-red-400">{errors.bloodSugar}</p>
              )}
            </div>
          </Card>
          
          {/* Sleep Duration */}
          <Card className="p-4 bg-slate-800 border-slate-700">
            <div className="flex items-center space-x-2 mb-4">
              <Moon className="w-5 h-5 text-purple-400" />
              <h3 className="font-medium text-white">Sleep Duration</h3>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-300">Value</label>
                <span className="text-xs text-gray-400">hours</span>
              </div>
              <input
                type="number"
                step="0.1"
                value={sleepDuration}
                onChange={(e) => setSleepDuration(e.target.value)}
                placeholder="Enter sleep duration"
                className={`
                  w-full rounded-lg border px-3 py-2 text-white 
                  focus:outline-none focus:ring-1
                  bg-gray-700 placeholder-gray-400
                  ${errors.sleepDuration 
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                    : 'border-gray-600 focus:border-primary-500 focus:ring-primary-500'
                  }
                `}
              />
              {errors.sleepDuration && (
                <p className="mt-1 text-sm text-red-400">{errors.sleepDuration}</p>
              )}
            </div>
          </Card>
          
          {/* Exercise Duration */}
          <Card className="p-4 bg-slate-800 border-slate-700">
            <div className="flex items-center space-x-2 mb-4">
              <Activity className="w-5 h-5 text-green-400" />
              <h3 className="font-medium text-white">Exercise Duration</h3>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-300">Value</label>
                <span className="text-xs text-gray-400">minutes</span>
              </div>
              <input
                type="number"
                value={exerciseDuration}
                onChange={(e) => setExerciseDuration(e.target.value)}
                placeholder="Enter exercise duration"
                className={`
                  w-full rounded-lg border px-3 py-2 text-white 
                  focus:outline-none focus:ring-1
                  bg-gray-700 placeholder-gray-400
                  ${errors.exerciseDuration 
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                    : 'border-gray-600 focus:border-primary-500 focus:ring-primary-500'
                  }
                `}
              />
              {errors.exerciseDuration && (
                <p className="mt-1 text-sm text-red-400">{errors.exerciseDuration}</p>
              )}
            </div>
          </Card>
          
          {/* Calories Burned */}
          <Card className="p-4 bg-slate-800 border-slate-700">
            <div className="flex items-center space-x-2 mb-4">
              <Flame className="w-5 h-5 text-yellow-400" />
              <h3 className="font-medium text-white">Calories Burned</h3>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-300">Value</label>
                <span className="text-xs text-gray-400">kcal</span>
              </div>
              <input
                type="number"
                value={caloriesBurned}
                onChange={(e) => setCaloriesBurned(e.target.value)}
                placeholder="Enter calories burned"
                className={`
                  w-full rounded-lg border px-3 py-2 text-white 
                  focus:outline-none focus:ring-1
                  bg-gray-700 placeholder-gray-400
                  ${errors.caloriesBurned 
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                    : 'border-gray-600 focus:border-primary-500 focus:ring-primary-500'
                  }
                `}
              />
              {errors.caloriesBurned && (
                <p className="mt-1 text-sm text-red-400">{errors.caloriesBurned}</p>
              )}
            </div>
          </Card>
        </div>
        
        {/* Common Notes Field */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Notes (applies to all entered metrics)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes about these measurements"
            className="w-full rounded-lg border border-gray-600 px-3 py-2 text-white focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 bg-gray-700 placeholder-gray-400 resize-none"
            rows={3}
          />
        </div>
        
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            loading={loading}
            disabled={loading}
          >
            Save All Metrics
          </Button>
        </div>
      </div>
    </Modal>
  );
};