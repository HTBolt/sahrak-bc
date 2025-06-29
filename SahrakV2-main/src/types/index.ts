export interface User {
  id: string;
  email: string;
  phone?: string;
  first_name: string;
  last_name: string;
  created_at: string;
  updated_at: string;
  timezone?: string;
  subscription_type: 'free' | 'premium';
}

export interface UserProfile {
  id: string;
  user_id: string;
  height?: number;
  weight?: number;
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  blood_sugar?: number;
  allergies?: string[];
  medical_conditions?: string[];
  emergency_contacts: Contact[];
  sos_contacts: Contact[];
  caregivers: Contact[];
  doctors: Contact[];
  wellness_score_physical: number;
  wellness_score_mental: number;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  type: 'emergency' | 'sos' | 'caregiver' | 'doctor';
  notes?: string;
  authorized_access: boolean;
}

export interface Prescription {
  id: string;
  user_id: string;
  file_url: string;
  file_name: string;
  upload_date: string;
  medications: Medication[];
  doctor_name?: string;
  prescription_date?: string;
}

export interface Medication {
  id: string;
  prescription_id: string;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
  start_date: string;
  end_date?: string;
}

export interface MedicalReport {
  id: string;
  user_id: string;
  file_url: string;
  file_name: string;
  upload_date: string;
  report_type: string;
  report_date?: string;
  doctor_name?: string;
  notes?: string;
}

export interface Appointment {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  date: string;
  time: string;
  location?: string;
  doctor_name?: string;
  appointment_type: 'checkup' | 'treatment' | 'consultation' | 'test';
  is_recurring: boolean;
  recurrence_pattern?: string;
  reminder_sent: boolean;
}

export interface MoodEntry {
  id: string;
  user_id: string;
  mood: 'excellent' | 'good' | 'neutral' | 'stressed' | 'distressed';
  notes?: string;
  created_at: string;
}

export interface JournalEntry {
  id: string;
  user_id: string;
  mood: 'excellent' | 'good' | 'neutral' | 'stressed' | 'distressed';
  content: string;
  created_at: string;
}

export interface AIConversation {
  id: string;
  user_id: string;
  messages: AIMessage[];
  mood_indicator: string;
  created_at: string;
  updated_at: string;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface HealthMetric {
  id: string;
  user_id: string;
  metric_type: 'weight' | 'bp_systolic' | 'bp_diastolic' | 'blood_sugar' | 'exercise_calories';
  value: number;
  unit: string;
  recorded_at: string;
  source: 'manual' | 'device' | 'report';
}

export interface GeneralUpdate {
  id: string;
  headline: string;
  body: string;
  url?: string;
  type: 'advisory' | 'alert' | 'tip';
  created_at: string;
  is_active: boolean;
}