import { getCurrentUser } from './customAuth';
import { supabase } from './supabase';

export interface Caregiver {
  id: string;
  email: string;
  name: string;
  phone: string;
  address: string;
  caregiver_type: 'doctor' | 'nurse' | 'family';
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface CaregiverAccess {
  id: string;
  user_id: string;
  caregiver_id: string;
  relationship_type: string;
  documents_access: 'none' | 'view' | 'full';
  medications_access: 'none' | 'view' | 'full';
  appointments_access: 'none' | 'view' | 'full';
  mood_tracker_access: 'none' | 'view' | 'full';
  progress_tracker_access: 'none' | 'view' | 'full';
  emergency_info_access: 'none' | 'view' | 'full';
  status: 'active' | 'inactive' | 'revoked';
  created_at: string;
  updated_at: string;
  caregiver?: Caregiver;
}

export interface CaregiverFormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  caregiver_type: 'doctor' | 'nurse' | 'family';
  relationship_type: string;
  documents_access: 'none' | 'view' | 'full';
  medications_access: 'none' | 'view' | 'full';
  appointments_access: 'none' | 'view' | 'full';
  mood_tracker_access: 'none' | 'view' | 'full';
  progress_tracker_access: 'none' | 'view' | 'full';
  emergency_info_access: 'none' | 'view' | 'full';
}

// Get user's caregivers with access details
export const getUserCaregivers = async (): Promise<{ data: CaregiverAccess[] | null; error: any }> => {
  try {
    const { data, error } = await supabase
      .from('caregiver_access')
      .select(`
        *,
        caregiver:caregivers(*)
      `)
      .eq('user_id', getCurrentUser()?.id)
      .order('created_at', { ascending: false });

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

// Add new caregiver
export const addCaregiver = async (caregiverData: CaregiverFormData): Promise<{ data: CaregiverAccess | null; error: any }> => {
  try {
    const user  = await getCurrentUser();
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    // First, check if caregiver already exists by email
    let caregiver: Caregiver;
    const { data: existingCaregiver, error: findError } = await supabase
      .from('caregivers')
      .select('*')
      .eq('email', caregiverData.email)
      .maybeSingle();

    if (findError) {
      return { data: null, error: findError };
    }

    if (existingCaregiver) {
      caregiver = existingCaregiver;
    } else {
      // Create new caregiver
      const { data: newCaregiver, error: createError } = await supabase
        .from('caregivers')
        .insert([{
          email: caregiverData.email,
          name: caregiverData.name,
          phone: caregiverData.phone,
          address: caregiverData.address,
          caregiver_type: caregiverData.caregiver_type
        }])
        .select()
        .single();

      if (createError) {
        return { data: null, error: createError };
      }

      caregiver = newCaregiver;
    }

    // Create access relationship
    const { data: accessData, error: accessError } = await supabase
      .from('caregiver_access')
      .insert([{
        user_id: user.id,
        caregiver_id: caregiver.id,
        relationship_type: caregiverData.relationship_type,
        documents_access: caregiverData.documents_access,
        medications_access: caregiverData.medications_access,
        appointments_access: caregiverData.appointments_access,
        mood_tracker_access: caregiverData.mood_tracker_access,
        progress_tracker_access: caregiverData.progress_tracker_access,
        emergency_info_access: caregiverData.emergency_info_access
      }])
      .select(`
        *,
        caregiver:caregivers(*)
      `)
      .single();

    if (accessError) {
      return { data: null, error: accessError };
    }

    return { data: accessData, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Update caregiver access permissions
export const updateCaregiverAccess = async (
  accessId: string,
  updates: Partial<Pick<CaregiverAccess, 'relationship_type' | 'documents_access' | 'medications_access' | 'appointments_access' | 'mood_tracker_access' | 'progress_tracker_access' | 'emergency_info_access'>>
): Promise<{ data: CaregiverAccess | null; error: any }> => {
  try {
    const { data, error } = await supabase
      .from('caregiver_access')
      .update(updates)
      .eq('id', accessId)
      .select(`
        *,
        caregiver:caregivers(*)
      `)
      .single();

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

// Revoke caregiver access
export const revokeCaregiverAccess = async (accessId: string): Promise<{ error: any }> => {
  try {
    const { error } = await supabase
      .from('caregiver_access')
      .update({ status: 'revoked' })
      .eq('id', accessId);

    return { error };
  } catch (error) {
    return { error };
  }
};

// Delete caregiver relationship completely
export const deleteCaregiverAccess = async (accessId: string): Promise<{ error: any }> => {
  try {
    const { error } = await supabase
      .from('caregiver_access')
      .delete()
      .eq('id', accessId);

    return { error };
  } catch (error) {
    return { error };
  }
};

// Get caregiver statistics
export const getCaregiverStats = async () => {
  try {
    const { data: caregivers } = await getUserCaregivers();
    
    if (!caregivers) return { total: 0, active: 0, doctors: 0, nurses: 0, family: 0 };

    const total = caregivers.length;
    const active = caregivers.filter(c => c.status === 'active').length;
    const doctors = caregivers.filter(c => c.caregiver?.caregiver_type === 'doctor').length;
    const nurses = caregivers.filter(c => c.caregiver?.caregiver_type === 'nurse').length;
    const family = caregivers.filter(c => c.caregiver?.caregiver_type === 'family').length;

    return { total, active, doctors, nurses, family };
  } catch (error) {
    return { total: 0, active: 0, doctors: 0, nurses: 0, family: 0 };
  }
};

// Helper functions
export const getCaregiverTypeLabel = (type: string): string => {
  switch (type) {
    case 'doctor': return 'Doctor';
    case 'nurse': return 'Nurse';
    case 'family': return 'Family Member';
    default: return type;
  }
};

export const getAccessLevelLabel = (level: string): string => {
  switch (level) {
    case 'none': return 'No Access';
    case 'view': return 'View Only';
    case 'full': return 'Full Access';
    default: return level;
  }
};

export const getAccessLevelColor = (level: string): string => {
  switch (level) {
    case 'none': return 'text-slate-400 bg-slate-900/20 border-slate-800';
    case 'view': return 'text-blue-400 bg-blue-900/20 border-blue-800';
    case 'full': return 'text-green-400 bg-green-900/20 border-green-800';
    default: return 'text-slate-400 bg-slate-900/20 border-slate-800';
  }
};

export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'active': return 'text-green-400 bg-green-900/20 border-green-800';
    case 'inactive': return 'text-orange-400 bg-orange-900/20 border-orange-800';
    case 'revoked': return 'text-red-400 bg-red-900/20 border-red-800';
    default: return 'text-slate-400 bg-slate-900/20 border-slate-800';
  }
};