import { supabase } from './supabase';

// User Profile Functions
export const getUserProfile = async (authUserId: string) => {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', authUserId)
    .order('created_at', { ascending: false })
    .limit(1);
  
  return { data, error };
};

export const createUserProfile = async (profileData: any) => {
  const { data, error } = await supabase
    .from('user_profiles')
    .insert([profileData])
    .select()
    .single();
  
  return { data, error };
};

export const updateUserProfile = async (authUserId: string, updates: any) => {
  const { data, error } = await supabase
    .from('user_profiles')
    .update(updates)
    .eq('user_id', authUserId)
    .select()
    .single();
  
  return { data, error };
};

// Medications Functions
export const getUserMedications = async (authUserId: string) => {
  const { data, error } = await supabase
    .from('medications')
    .select('*')
    .eq('user_id', authUserId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  
  return { data, error };
};

export const getTodaysMedications = async (authUserId: string) => {
  const today = new Date().toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from('medications')
    .select('*')
    .eq('user_id', authUserId)
    .eq('is_active', true)
    .lte('start_date', today)
    .or(`end_date.is.null,end_date.gte.${today}`)
    .order('time_of_day', { ascending: true });
  
  return { data, error };
};

export const addMedication = async (medicationData: any) => {
  const { data, error } = await supabase
    .from('medications')
    .insert([medicationData])
    .select()
    .single();
  
  return { data, error };
};

// Appointments Functions
export const getUserAppointments = async (authUserId: string) => {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('user_id', authUserId)
    .gte('appointment_date', new Date().toISOString().split('T')[0])
    .order('appointment_date', { ascending: true })
    .order('appointment_time', { ascending: true });
  
  return { data, error };
};

export const getUpcomingAppointments = async (authUserId: string, limit: number = 5) => {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('user_id', authUserId)
    .eq('status', 'scheduled')
    .gte('appointment_date', new Date().toISOString().split('T')[0])
    .order('appointment_date', { ascending: true })
    .order('appointment_time', { ascending: true })
    .limit(limit);
  
  return { data, error };
};

export const addAppointment = async (appointmentData: any) => {
  const { data, error } = await supabase
    .from('appointments')
    .insert([appointmentData])
    .select()
    .single();
  
  return { data, error };
};

// Mood Tracking Functions
export const getUserMoodEntries = async (authUserId: string, days: number = 30) => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const { data, error } = await supabase
    .from('mood_entries')
    .select('*')
    .eq('user_id', authUserId)
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: false });
  
  return { data, error };
};

export const addMoodEntry = async (moodData: any) => {
  const { data, error } = await supabase
    .from('mood_entries')
    .insert([moodData])
    .select()
    .single();
  
  return { data, error };
};

export const getLatestMoodEntry = async (authUserId: string) => {
  const { data, error } = await supabase
    .from('mood_entries')
    .select('*')
    .eq('user_id', authUserId)
    .order('created_at', { ascending: false })
    .limit(1);
  
  return { data, error };
};

// Health Metrics Functions
export const getUserHealthMetrics = async (authUserId: string, metricType?: string) => {
  let query = supabase
    .from('health_metrics')
    .select('*')
    .eq('user_id', authUserId);
  
  if (metricType) {
    query = query.eq('metric_type', metricType);
  }
  
  const { data, error } = await query
    .order('recorded_at', { ascending: false })
    .limit(100);
  
  return { data, error };
};

export const addHealthMetric = async (metricData: any) => {
  const { data, error } = await supabase
    .from('health_metrics')
    .insert([metricData])
    .select()
    .single();
  
  return { data, error };
};

// Emergency Contacts Functions
export const getEmergencyContacts = async (authUserId: string) => {
  const { data, error } = await supabase
    .from('emergency_contacts')
    .select('*')
    .eq('user_id', authUserId)
    .order('is_primary', { ascending: false })
    .order('name', { ascending: true });
  
  return { data, error };
};

export const addEmergencyContact = async (contactData: any) => {
  const { data, error } = await supabase
    .from('emergency_contacts')
    .insert([contactData])
    .select()
    .single();
  
  return { data, error };
};

// Enhanced Wellness Score Calculation
export const calculateWellnessScores = async (authUserId: string) => {
  try {
    // Get recent mood entries for mental wellness (last 7 days)
    const { data: moodEntries } = await getUserMoodEntries(authUserId, 7);
    
    // Get recent health metrics for physical wellness (last 30 days)
    const { data: healthMetrics } = await getUserHealthMetrics(authUserId);
    
    // Get user profile for goals
    const { data: profileData } = await getUserProfile(authUserId);
    const profile = profileData && profileData.length > 0 ? profileData[0] : null;
    
    let mentalScore = 75; // Default
    let physicalScore = 75; // Default
    
    // Calculate mental wellness based on recent mood entries
    if (moodEntries && moodEntries.length > 0) {
      const recentEntries = moodEntries.slice(0, 7); // Last 7 entries
      
      // Calculate average mood score (1-5 scale)
      const avgMoodScore = recentEntries.reduce((sum, entry) => sum + entry.mood_score, 0) / recentEntries.length;
      
      // Calculate average stress level (1-10 scale, inverted for scoring)
      const avgStressLevel = recentEntries.reduce((sum, entry) => sum + (entry.stress_level || 5), 0) / recentEntries.length;
      const stressScore = ((10 - avgStressLevel) / 10) * 100; // Invert stress (lower stress = higher score)
      
      // Combine mood and stress (60% mood, 40% stress)
      const moodScore = (avgMoodScore / 5) * 100; // Convert 1-5 to 0-100
      mentalScore = Math.round((moodScore * 0.6) + (stressScore * 0.4));
      
      // Ensure score is within bounds
      mentalScore = Math.max(0, Math.min(100, mentalScore));
    }
    
    // Calculate physical wellness based on health metrics and goals
    if (healthMetrics && healthMetrics.length > 0) {
      const scores = [];
      
      // Weight score (if goal is set)
      if (profile?.weight_goal) {
        const weightMetrics = healthMetrics.filter(m => m.metric_type === 'weight');
        if (weightMetrics.length > 0) {
          const latestWeight = weightMetrics[0].value;
          const goal = profile.weight_goal;
          const deviation = Math.abs(latestWeight - goal);
          
          // Weight scoring based on deviation from goal
          let weightScore = 100;
          if (deviation <= 3) weightScore = 100; // Within 3kg
          else if (deviation <= 8) weightScore = 75; // Warning level 1
          else if (deviation <= 13) weightScore = 50; // Warning level 2
          else weightScore = 25; // Critical level
          
          scores.push(weightScore);
        }
      }
      
      // Exercise score (if goal is set and recent data available)
      if (profile?.exercise_duration_goal) {
        const exerciseMetrics = healthMetrics
          .filter(m => m.metric_type === 'exercise_duration')
          .filter(m => {
            const metricDate = new Date(m.recorded_at);
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return metricDate >= weekAgo;
          });
          
        if (exerciseMetrics.length > 0) {
          const avgExercise = exerciseMetrics.reduce((sum, m) => sum + m.value, 0) / exerciseMetrics.length;
          const goal = profile.exercise_duration_goal;
          const progress = Math.min((avgExercise / goal) * 100, 100);
          scores.push(Math.round(progress));
        }
      }
      
      // Blood pressure score (if available)
      const systolicMetrics = healthMetrics.filter(m => m.metric_type === 'blood_pressure_systolic');
      const diastolicMetrics = healthMetrics.filter(m => m.metric_type === 'blood_pressure_diastolic');
      
      if (systolicMetrics.length > 0 && diastolicMetrics.length > 0) {
        const latestSystolic = systolicMetrics[0].value;
        const latestDiastolic = diastolicMetrics[0].value;
        
        let bpScore = 100;
        if (latestSystolic <= 120 && latestDiastolic <= 80) bpScore = 100; // Normal
        else if (latestSystolic <= 130 && latestDiastolic <= 80) bpScore = 90; // Elevated
        else if (latestSystolic <= 140 && latestDiastolic <= 90) bpScore = 75; // Stage 1 hypertension
        else bpScore = 50; // Stage 2 hypertension
        
        scores.push(bpScore);
      }
      
      // Heart rate score (if available)
      const heartRateMetrics = healthMetrics.filter(m => m.metric_type === 'heart_rate');
      if (heartRateMetrics.length > 0) {
        const latestHR = heartRateMetrics[0].value;
        let hrScore = 100;
        
        if (latestHR >= 60 && latestHR <= 100) hrScore = 100; // Normal resting HR
        else if (latestHR >= 50 && latestHR <= 110) hrScore = 85; // Slightly outside normal
        else hrScore = 70; // Concerning range
        
        scores.push(hrScore);
      }
      
      // Sleep score (if available)
      const sleepMetrics = healthMetrics
        .filter(m => m.metric_type === 'sleep_duration')
        .filter(m => {
          const metricDate = new Date(m.recorded_at);
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return metricDate >= weekAgo;
        });
        
      if (sleepMetrics.length > 0) {
        const avgSleep = sleepMetrics.reduce((sum, m) => sum + m.value, 0) / sleepMetrics.length;
        let sleepScore = 100;
        
        if (avgSleep >= 7 && avgSleep <= 9) sleepScore = 100; // Optimal sleep
        else if (avgSleep >= 6 && avgSleep <= 10) sleepScore = 85; // Acceptable sleep
        else sleepScore = 70; // Poor sleep
        
        scores.push(sleepScore);
      }
      
      // Calculate final physical score
      if (scores.length > 0) {
        physicalScore = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
      } else {
        // If no specific metrics, base on general health data availability
        const recentMetrics = healthMetrics.filter(m => {
          const metricDate = new Date(m.recorded_at);
          const monthAgo = new Date();
          monthAgo.setDate(monthAgo.getDate() - 30);
          return metricDate >= monthAgo;
        });
        
        // Score based on data recency and variety
        const dataRecencyScore = Math.min(85, 60 + (recentMetrics.length * 2.5));
        physicalScore = Math.round(dataRecencyScore);
      }
      
      // Ensure score is within bounds
      physicalScore = Math.max(0, Math.min(100, physicalScore));
    }
    
    // Update user profile with new scores
    await updateUserProfile(authUserId, {
      wellness_score_mental: mentalScore,
      wellness_score_physical: physicalScore
    });
    
    return { 
      mentalScore, 
      physicalScore,
      details: {
        moodEntriesCount: moodEntries?.length || 0,
        healthMetricsCount: healthMetrics?.length || 0,
        hasWeightGoal: !!profile?.weight_goal,
        hasExerciseGoal: !!profile?.exercise_duration_goal
      }
    };
  } catch (error) {
    console.error('Error calculating wellness scores:', error);
    return { mentalScore: 75, physicalScore: 75 };
  }
};

// Get wellness trend over time
export const getWellnessTrend = async (authUserId: string, days: number = 30) => {
  try {
    // This would require storing historical wellness scores
    // For now, return current scores
    const scores = await calculateWellnessScores(authUserId);
    return {
      current: scores,
      trend: 'stable', // Could be 'improving', 'declining', 'stable'
      change: 0 // Percentage change from previous period
    };
  } catch (error) {
    console.error('Error getting wellness trend:', error);
    return {
      current: { mentalScore: 75, physicalScore: 75 },
      trend: 'stable',
      change: 0
    };
  }
};