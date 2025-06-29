import { getCurrentUser } from './customAuth';
import { supabase } from './supabase';

export interface Appointment {
  id: string;
  user_id: string;
  title: string;
  appointment_type: 'consultation' | 'test' | 'followup';
  appointment_date: string;
  appointment_time: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  reminder_24h_sent: boolean;
  reminder_1h_sent: boolean;
  is_recurring: boolean;
  recurrence_pattern?: string;
  recurrence_end_date?: string;
  parent_appointment_id?: string;
  location_name?: string;
  location_address?: string;
  location_phone?: string;
  doctor_name?: string;
  doctor_specialization?: string;
  lab_name?: string;
  test_name?: string;
  referring_doctor?: string;
  previous_appointment_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface AppointmentFormData {
  title: string;
  appointment_type: 'consultation' | 'test' | 'followup';
  appointment_date: string;
  appointment_time: string;
  is_recurring: boolean;
  recurrence_pattern?: string;
  recurrence_end_date?: string;
  location_name?: string;
  location_address?: string;
  location_phone?: string;
  doctor_name?: string;
  doctor_specialization?: string;
  lab_name?: string;
  test_name?: string;
  referring_doctor?: string;
  previous_appointment_id?: string;
  notes?: string;
  linked_documents?: string[];
}

export interface AppointmentChain {
  id: string;
  user_id: string;
  chain_name: string;
  root_appointment_id: string;
  appointments: Appointment[];
  created_at: string;
}

// Get user's appointments
export const getUserAppointments = async (): Promise<{ data: Appointment[] | null; error: any }> => {
  try {
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('user_id', getCurrentUser()?.id)
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true });

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

// Get upcoming appointments
export const getUpcomingAppointments = async (limit?: number): Promise<{ data: Appointment[] | null; error: any }> => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    let query = supabase
      .from('appointments')
      .select('*')
      .eq('user_id', getCurrentUser()?.id)
      .eq('status', 'scheduled')
      .gte('appointment_date', today)
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

// Get past appointments
export const getPastAppointments = async (): Promise<{ data: Appointment[] | null; error: any }> => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('user_id', getCurrentUser()?.id)
      .or(`appointment_date.lt.${today},status.eq.completed,status.eq.cancelled`)
      .order('appointment_date', { ascending: false })
      .order('appointment_time', { ascending: false });

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

// Add new appointment
export const addAppointment = async (appointmentData: AppointmentFormData): Promise<{ data: Appointment | null; error: any }> => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    const { linked_documents, ...appointmentFields } = appointmentData;

    const { data, error } = await supabase
      .from('appointments')
      .insert([{
        ...appointmentFields,
        user_id: user.id
      }])
      .select()
      .single();

    if (error) return { data: null, error };

    // Link documents if provided (for follow-up appointments)
    if (linked_documents && linked_documents.length > 0 && data) {
      const documentLinks = linked_documents.map(docId => ({
        appointment_id: data.id,
        document_id: docId
      }));

      const { error: linkError } = await supabase
        .from('appointment_documents')
        .insert(documentLinks);

      if (linkError) {
        console.error('Error linking documents:', linkError);
      }
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Update appointment
export const updateAppointment = async (
  appointmentId: string, 
  updates: Partial<AppointmentFormData>
): Promise<{ data: Appointment | null; error: any }> => {
  try {
    const { linked_documents, ...appointmentUpdates } = updates;

    const { data, error } = await supabase
      .from('appointments')
      .update(appointmentUpdates)
      .eq('id', appointmentId)
      .select()
      .single();

    if (error) return { data: null, error };

    // Update document links if provided
    if (linked_documents !== undefined && data) {
      // Remove existing links
      await supabase
        .from('appointment_documents')
        .delete()
        .eq('appointment_id', appointmentId);

      // Add new links
      if (linked_documents.length > 0) {
        const documentLinks = linked_documents.map(docId => ({
          appointment_id: data.id,
          document_id: docId
        }));

        const { error: linkError } = await supabase
          .from('appointment_documents')
          .insert(documentLinks);

        if (linkError) {
          console.error('Error updating document links:', linkError);
        }
      }
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Delete appointment
export const deleteAppointment = async (appointmentId: string): Promise<{ error: any }> => {
  try {
    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', appointmentId);

    return { error };
  } catch (error) {
    return { error };
  }
};

// Mark appointment as completed
export const completeAppointment = async (appointmentId: string): Promise<{ data: Appointment | null; error: any }> => {
  try {
    const { data, error } = await supabase
      .from('appointments')
      .update({ status: 'completed' })
      .eq('id', appointmentId)
      .select()
      .single();

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

// Reactivate appointment (set status back to scheduled)
export const reactivateAppointment = async (appointmentId: string): Promise<{ data: Appointment | null; error: any }> => {
  try {
    const { data, error } = await supabase
      .from('appointments')
      .update({ status: 'scheduled' })
      .eq('id', appointmentId)
      .select()
      .single();

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

// Cancel appointment
export const cancelAppointment = async (appointmentId: string): Promise<{ data: Appointment | null; error: any }> => {
  try {
    const { data, error } = await supabase
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('id', appointmentId)
      .select()
      .single();

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

// Get appointment chains (for follow-up tracking)
export const getAppointmentChains = async (): Promise<{ data: AppointmentChain[] | null; error: any }> => {
  try {
    const { data: chains, error: chainsError } = await supabase
      .from('appointment_chains')
      .select('*')
      .order('created_at', { ascending: false });

    if (chainsError) return { data: null, error: chainsError };

    if (!chains) return { data: [], error: null };

    // Get appointments for each chain
    const chainsWithAppointments = await Promise.all(
      chains.map(async (chain) => {
        const { data: appointments, error: apptError } = await supabase
          .from('appointments')
          .select('*')
          .or(`id.eq.${chain.root_appointment_id},previous_appointment_id.eq.${chain.root_appointment_id}`)
          .order('appointment_date', { ascending: true });

        return {
          ...chain,
          appointments: appointments || []
        };
      })
    );

    return { data: chainsWithAppointments, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Get linked documents for an appointment
export const getAppointmentDocuments = async (appointmentId: string) => {
  try {
    const { data, error } = await supabase
      .from('appointment_documents')
      .select(`
        document_id,
        documents (*)
      `)
      .eq('appointment_id', appointmentId);

    return { data: data?.map(item => item.documents) || [], error };
  } catch (error) {
    return { data: [], error };
  }
};

// Format time for display
export const formatAppointmentTime = (time: string): string => {
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

// Get appointment statistics
export const getAppointmentStats = async () => {
  try {
    const [upcoming, past, total] = await Promise.all([
      getUpcomingAppointments(),
      getPastAppointments(),
      getUserAppointments()
    ]);

    const upcomingCount = upcoming.data?.length || 0;
    const pastCount = past.data?.length || 0;
    const totalCount = total.data?.length || 0;
    const completedCount = past.data?.filter(a => a.status === 'completed').length || 0;
    const cancelledCount = past.data?.filter(a => a.status === 'cancelled').length || 0;

    return {
      total: totalCount,
      upcoming: upcomingCount,
      completed: completedCount,
      cancelled: cancelledCount,
      past: pastCount
    };
  } catch (error) {
    return {
      total: 0,
      upcoming: 0,
      completed: 0,
      cancelled: 0,
      past: 0
    };
  }
};

// Open location in maps
export const openInMaps = (address: string) => {
  if (!address) return;
  
  const encodedAddress = encodeURIComponent(address);
  
  // Try to detect the platform and use appropriate maps app
  const userAgent = navigator.userAgent;
  
  if (/iPhone|iPad|iPod/.test(userAgent)) {
    // iOS - try Apple Maps first, fallback to Google Maps
    window.open(`maps://maps.apple.com/?q=${encodedAddress}`, '_blank');
  } else if (/Android/.test(userAgent)) {
    // Android - use Google Maps
    window.open(`geo:0,0?q=${encodedAddress}`, '_blank');
  } else {
    // Desktop - use Google Maps web
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
  }
};