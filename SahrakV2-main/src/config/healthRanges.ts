// Health Ranges Configuration
// This file contains acceptable ranges for various health metrics
// Modify these values to update health indicators without code changes

export interface HealthRange {
  optimal: { min: number; max: number };
  normal: { min: number; max: number };
  borderline: { min: number; max: number };
  high: { min: number; max: number };
  critical: { min: number; max: number };
}

export interface MetricRange {
  unit: string;
  ranges: HealthRange;
  description: string;
}

// Health Metrics Ranges Configuration
export const HEALTH_RANGES: Record<string, MetricRange> = {
  // Blood Pressure (Systolic)
  blood_pressure_systolic: {
    unit: 'mmHg',
    description: 'Systolic Blood Pressure',
    ranges: {
      optimal: { min: 90, max: 120 },
      normal: { min: 120, max: 130 },
      borderline: { min: 130, max: 140 },
      high: { min: 140, max: 180 },
      critical: { min: 180, max: 250 }
    }
  },

  // Blood Pressure (Diastolic)
  blood_pressure_diastolic: {
    unit: 'mmHg',
    description: 'Diastolic Blood Pressure',
    ranges: {
      optimal: { min: 60, max: 80 },
      normal: { min: 80, max: 85 },
      borderline: { min: 85, max: 90 },
      high: { min: 90, max: 120 },
      critical: { min: 120, max: 150 }
    }
  },

  // Heart Rate (Resting)
  heart_rate: {
    unit: 'bpm',
    description: 'Resting Heart Rate',
    ranges: {
      optimal: { min: 60, max: 70 },
      normal: { min: 50, max: 100 },
      borderline: { min: 100, max: 110 },
      high: { min: 110, max: 150 },
      critical: { min: 150, max: 220 }
    }
  },

  // Blood Sugar (Fasting)
  blood_sugar: {
    unit: 'mg/dL',
    description: 'Blood Sugar (Fasting)',
    ranges: {
      optimal: { min: 70, max: 100 },
      normal: { min: 100, max: 125 },
      borderline: { min: 125, max: 140 },
      high: { min: 140, max: 200 },
      critical: { min: 200, max: 400 }
    }
  },

  // Body Temperature
  temperature: {
    unit: '°C',
    description: 'Body Temperature',
    ranges: {
      optimal: { min: 36.1, max: 37.2 },
      normal: { min: 35.8, max: 37.5 },
      borderline: { min: 37.5, max: 38.0 },
      high: { min: 38.0, max: 39.5 },
      critical: { min: 39.5, max: 42.0 }
    }
  },

  // Sleep Duration - FIXED: 7-9 hours is optimal for adults
  sleep_duration: {
    unit: 'hours',
    description: 'Sleep Duration',
    ranges: {
      optimal: { min: 7, max: 9 },
      normal: { min: 6, max: 10 },
      borderline: { min: 5, max: 6 },
      high: { min: 4, max: 5 },
      critical: { min: 0, max: 4 }
    }
  },

  // Exercise Duration (Daily) - FIXED: 30-90 minutes is optimal
  exercise_duration: {
    unit: 'minutes',
    description: 'Daily Exercise Duration',
    ranges: {
      optimal: { min: 30, max: 90 },
      normal: { min: 20, max: 120 },
      borderline: { min: 10, max: 20 },
      high: { min: 5, max: 10 },
      critical: { min: 0, max: 5 }
    }
  }
};

// BMI Ranges (calculated from weight and height)
export const BMI_RANGES: HealthRange = {
  optimal: { min: 18.5, max: 24.9 },
  normal: { min: 18.5, max: 24.9 },
  borderline: { min: 25.0, max: 29.9 },
  high: { min: 30.0, max: 34.9 },
  critical: { min: 35.0, max: 50.0 }
};

// Weight Goal Deviation Ranges (in kg)
export const WEIGHT_GOAL_RANGES = {
  acceptable: 3,    // ±3kg from goal
  warning1: 5,      // 5kg deviation
  warning2: 10,     // 10kg deviation
  critical: 15      // 15kg+ deviation
};

// Health Status Colors and Icons
export const HEALTH_STATUS = {
  optimal: {
    label: 'Optimal',
    color: 'text-green-400',
    bgColor: 'bg-green-900/20',
    borderColor: 'border-green-800',
    icon: 'CheckCircle'
  },
  normal: {
    label: 'Normal',
    color: 'text-blue-400',
    bgColor: 'bg-blue-900/20',
    borderColor: 'border-blue-800',
    icon: 'CheckCircle'
  },
  borderline: {
    label: 'Borderline',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-900/20',
    borderColor: 'border-yellow-800',
    icon: 'AlertTriangle'
  },
  high: {
    label: 'High',
    color: 'text-orange-400',
    bgColor: 'bg-orange-900/20',
    borderColor: 'border-orange-800',
    icon: 'AlertTriangle'
  },
  critical: {
    label: 'Critical',
    color: 'text-red-400',
    bgColor: 'bg-red-900/20',
    borderColor: 'border-red-800',
    icon: 'XCircle'
  }
};

// Function to get health status for a metric value
export const getHealthStatus = (metricType: string, value: number): keyof typeof HEALTH_STATUS => {
  const range = HEALTH_RANGES[metricType];
  if (!range) return 'normal';

  const { ranges } = range;

  // Check if value is in optimal range
  if (value >= ranges.optimal.min && value <= ranges.optimal.max) return 'optimal';
  
  // Check if value is in normal range
  if (value >= ranges.normal.min && value <= ranges.normal.max) return 'normal';
  
  // Check if value is in borderline range
  if (value >= ranges.borderline.min && value <= ranges.borderline.max) return 'borderline';
  
  // Check if value is in high range
  if (value >= ranges.high.min && value <= ranges.high.max) return 'high';
  
  // Check if value is in critical range
  if (value >= ranges.critical.min && value <= ranges.critical.max) return 'critical';

  // Handle values outside all ranges
  if (value < ranges.optimal.min) {
    // For metrics where lower is worse (like sleep duration)
    if (metricType === 'sleep_duration' || metricType === 'exercise_duration') {
      if (value < ranges.critical.min) return 'critical';
      if (value < ranges.high.min) return 'high';
      if (value < ranges.borderline.min) return 'borderline';
    } else {
      // For metrics where lower is better (like blood pressure)
      return 'optimal';
    }
  }
  
  if (value > ranges.optimal.max) {
    // For metrics where higher is worse
    if (value > ranges.critical.max) return 'critical';
    if (value > ranges.high.max) return 'high';
    if (value > ranges.borderline.max) return 'borderline';
  }
  
  return 'normal';
};

// Function to calculate BMI and get status
export const getBMIStatus = (weight: number, heightCm: number): { bmi: number; status: keyof typeof HEALTH_STATUS } => {
  const heightM = heightCm / 100;
  const bmi = weight / (heightM * heightM);
  
  if (bmi >= BMI_RANGES.critical.min) return { bmi, status: 'critical' };
  if (bmi >= BMI_RANGES.high.min) return { bmi, status: 'high' };
  if (bmi >= BMI_RANGES.borderline.min) return { bmi, status: 'borderline' };
  if (bmi >= BMI_RANGES.optimal.min && bmi <= BMI_RANGES.optimal.max) return { bmi, status: 'optimal' };
  if (bmi < BMI_RANGES.optimal.min) return { bmi, status: 'borderline' }; // Underweight
  
  return { bmi, status: 'normal' };
};

// Function to get weight goal status
export const getWeightGoalStatus = (current: number, goal: number): { 
  deviation: number; 
  status: keyof typeof HEALTH_STATUS;
  level: number;
} => {
  const deviation = current - goal;
  const absDeviation = Math.abs(deviation);

  if (absDeviation <= WEIGHT_GOAL_RANGES.acceptable) {
    return { deviation, status: 'optimal', level: 0 };
  } else if (absDeviation <= WEIGHT_GOAL_RANGES.acceptable + WEIGHT_GOAL_RANGES.warning1) {
    return { deviation, status: 'borderline', level: 1 };
  } else if (absDeviation <= WEIGHT_GOAL_RANGES.acceptable + WEIGHT_GOAL_RANGES.warning2) {
    return { deviation, status: 'high', level: 2 };
  } else {
    return { deviation, status: 'critical', level: 3 };
  }
};