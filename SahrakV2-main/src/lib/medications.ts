import { getCurrentUser } from './customAuth';
import { supabase } from './supabase';

export interface Medication {
  id: string;
  user_id: string;
  name: string;
  dosage: string;
  frequency: string;
  time_of_day: string[];
  start_date: string;
  end_date?: string;
  instructions?: string;
  doctor_name?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MedicationSchedule {
  medication_id: string;
  medication_name: string;
  dosage: string;
  time: string;
  taken: boolean;
  taken_at?: string;
  instructions?: string;
}

export interface MedicationIntake {
  id: string;
  user_id: string;
  medication_id: string;
  taken_at: string;
  scheduled_time: string;
  notes?: string;
}

// Get user's medications
export const getUserMedications = async (): Promise<{ data: Medication[] | null; error: any }> => {
  try {
    const { data, error } = await supabase
      .from('medications')
      .select('*')
      .eq('user_id', getCurrentUser()?.id)
      .order('created_at', { ascending: false });

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

// Get active medications (not completed and within date range)
export const getActiveMedications = async (): Promise<{ data: Medication[] | null; error: any }> => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('medications')
      .select('*')
      .eq('user_id', getCurrentUser()?.id)
      .eq('is_active', true)
      .lte('start_date', today)
      .or(`end_date.is.null,end_date.gte.${today}`)
      .order('name', { ascending: true });

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

// Get past medications (completed or end date passed)
export const getPastMedications = async (): Promise<{ data: Medication[] | null; error: any }> => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('medications')
      .select('*')
      .eq('user_id', getCurrentUser()?.id)
      .or(`is_active.eq.false,end_date.lt.${today}`)
      .order('updated_at', { ascending: false });

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

// Get today's medication schedule
export const getTodaysSchedule = async (): Promise<{ data: MedicationSchedule[] | null; error: any }> => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Get active medications for today
    const { data: medications, error: medError } = await getActiveMedications();
    if (medError) return { data: null, error: medError };
    
    if (!medications) return { data: [], error: null };

    // Get today's intakes
    const { data: intakes, error: intakeError } = await supabase
      .from('medication_intakes')
      .select('*')
      .eq('user_id', getCurrentUser()?.id)
      .gte('taken_at', `${today}T00:00:00`)
      .lt('taken_at', `${today}T23:59:59`);

    if (intakeError) return { data: null, error: intakeError };

    // Build schedule
    const schedule: MedicationSchedule[] = [];
    
    medications.forEach(med => {
      med.time_of_day.forEach(time => {
        const intake = intakes?.find(i => 
          i.medication_id === med.id && 
          i.scheduled_time === time
        );
        
        schedule.push({
          medication_id: med.id,
          medication_name: med.name,
          dosage: med.dosage,
          time: time,
          taken: !!intake,
          taken_at: intake?.taken_at,
          instructions: med.instructions
        });
      });
    });

    // Sort by time
    schedule.sort((a, b) => a.time.localeCompare(b.time));
    
    return { data: schedule, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Add new medication
export const addMedication = async (medicationData: Omit<Medication, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<{ data: Medication | null; error: any }> => {
  try {
    const user  = getCurrentUser();
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    const { data, error } = await supabase
      .from('medications')
      .insert([{
        ...medicationData,
        user_id: user.id
      }])
      .select()
      .single();

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

// Update medication
export const updateMedication = async (
  medicationId: string, 
  updates: Partial<Omit<Medication, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<{ data: Medication | null; error: any }> => {
  try {
    const { data, error } = await supabase
      .from('medications')
      .update(updates)
      .eq('id', medicationId)
      .select()
      .single();

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

// Mark medication as taken
export const markMedicationTaken = async (
  medicationId: string, 
  scheduledTime: string, 
  notes?: string
): Promise<{ data: MedicationIntake | null; error: any }> => {
  try {
    const user = getCurrentUser();
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    const now = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('medication_intakes')
      .insert([{
        user_id: user.id,
        medication_id: medicationId,
        taken_at: now,
        scheduled_time: scheduledTime,
        notes: notes || null
      }])
      .select()
      .single();

    // TODO: Send notification to caregivers here
    // This would be implemented when the caregivers system is built

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

// Undo medication taken (remove intake record)
export const undoMedicationTaken = async (
  medicationId: string, 
  scheduledTime: string
): Promise<{ error: any }> => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const { error } = await supabase
      .from('medication_intakes')
      .delete()
      .eq('medication_id', medicationId)
      .eq('scheduled_time', scheduledTime)
      .gte('taken_at', `${today}T00:00:00`)
      .lt('taken_at', `${today}T23:59:59`);

    return { error };
  } catch (error) {
    return { error };
  }
};

// Mark medication as completed (set is_active to false)
export const completeMedication = async (medicationId: string): Promise<{ data: Medication | null; error: any }> => {
  try {
    const { data, error } = await supabase
      .from('medications')
      .update({ is_active: false })
      .eq('id', medicationId)
      .select()
      .single();

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

// Reactivate medication
export const reactivateMedication = async (medicationId: string): Promise<{ data: Medication | null; error: any }> => {
  try {
    const { data, error } = await supabase
      .from('medications')
      .update({ is_active: true })
      .eq('id', medicationId)
      .select()
      .single();

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

// Delete medication
export const deleteMedication = async (medicationId: string): Promise<{ error: any }> => {
  try {
    const { error } = await supabase
      .from('medications')
      .delete()
      .eq('id', medicationId);

    return { error };
  } catch (error) {
    return { error };
  }
};

// Format time for display
export const formatTime = (time: string): string => {
  try {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  } catch {
    return time;
  }
};

// Get medication statistics
export const getMedicationStats = async (): Promise<{
  total: number;
  active: number;
  completed: number;
  todaysTaken: number;
  todaysTotal: number;
}> => {
  try {
    const [allMeds, activeMeds, schedule] = await Promise.all([
      getUserMedications(),
      getActiveMedications(),
      getTodaysSchedule()
    ]);

    const total = allMeds.data?.length || 0;
    const active = activeMeds.data?.length || 0;
    const completed = total - active;
    const todaysTotal = schedule.data?.length || 0;
    const todaysTaken = schedule.data?.filter(s => s.taken).length || 0;

    return {
      total,
      active,
      completed,
      todaysTaken,
      todaysTotal
    };
  } catch (error) {
    return {
      total: 0,
      active: 0,
      completed: 0,
      todaysTaken: 0,
      todaysTotal: 0
    };
  }
};