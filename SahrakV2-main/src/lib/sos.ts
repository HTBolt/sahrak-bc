import { supabase } from './supabase';

export interface LocationData {
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  address?: string;
  timestamp: string;
  source: 'gps' | 'ip' | 'unavailable';
}

export interface EmergencyInfo {
  user: {
    name: string;
    email: string;
    phone?: string;
    bloodType?: string;
    dateOfBirth?: string;
    address?: string;
  };
  allergies: Array<{
    name: string;
    type: string;
    severity: string;
    notes?: string;
  }>;
  medicalConditions: string[];
  emergencyContacts: Array<{
    name: string;
    phone: string;
  }>;
  location: LocationData;
  timestamp: string;
}

export interface SOSAlert {
  userId: string;
  emergencyInfo: EmergencyInfo;
  caregiverIds: string[];
}

// Get user's current location
export const getLocationData = async (): Promise<LocationData> => {
  const timestamp = new Date().toISOString();

  return new Promise((resolve) => {
    // Try to get GPS location first
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          
          try {
            // Try to get address from coordinates using reverse geocoding
            const address = await reverseGeocode(latitude, longitude);
            
            resolve({
              latitude,
              longitude,
              accuracy,
              address,
              timestamp,
              source: 'gps'
            });
          } catch (error) {
            resolve({
              latitude,
              longitude,
              accuracy,
              timestamp,
              source: 'gps'
            });
          }
        },
        async (error) => {
          console.warn('GPS location failed:', error);
          // Fallback to IP-based location
          try {
            const ipLocation = await getIPLocation();
            resolve({
              ...ipLocation,
              timestamp,
              source: 'ip'
            });
          } catch (ipError) {
            console.warn('IP location failed:', ipError);
            resolve({
              timestamp,
              source: 'unavailable'
            });
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    } else {
      // Geolocation not supported, try IP location
      (async () => {
        try {
          const ipLocation = await getIPLocation();
          resolve({
            ...ipLocation,
            timestamp,
            source: 'ip'
          });
        } catch (error) {
          resolve({
            timestamp,
            source: 'unavailable'
          });
        }
      })();
    }
  });
};

// Get approximate location from IP address
const getIPLocation = async (): Promise<Partial<LocationData>> => {
  try {
    const response = await fetch('https://ipapi.co/json/');
    const data = await response.json();
    
    return {
      latitude: data.latitude,
      longitude: data.longitude,
      address: `${data.city}, ${data.region}, ${data.country_name}`,
    };
  } catch (error) {
    throw new Error('IP location unavailable');
  }
};

// Reverse geocode coordinates to address
const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
  try {
    // Using OpenStreetMap Nominatim API (free, no API key required)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
    );
    const data = await response.json();
    
    if (data.display_name) {
      return data.display_name;
    }
    
    throw new Error('Address not found');
  } catch (error) {
    throw new Error('Reverse geocoding failed');
  }
};

// Send SOS alert to caregivers
export const sendSOSAlert = async (sosAlert: SOSAlert): Promise<void> => {
  try {
    // Call the Supabase Edge Function to send the SOS alert
    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-sos-alert`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sosAlert)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`SOS alert service error: ${response.status} - ${errorData.error || 'Unknown error'}`);
    }

    const result = await response.json();
    console.log('SOS alert sent successfully:', result);

    // Store the SOS event in the database (you would need to create this table)
    const { error } = await supabase
      .from('sos_alerts')
      .insert([{
        user_id: sosAlert.userId,
        emergency_info: sosAlert.emergencyInfo,
        caregiver_ids: sosAlert.caregiverIds,
        status: 'sent',
        created_at: new Date().toISOString()
      }]);

    if (error) {
      console.error('Error storing SOS alert:', error);
      // Don't throw error here as the alert might still be sent via other means
    }

  } catch (error) {
    console.error('Error sending SOS alert:', error);
    throw new Error('Failed to send SOS alert. Please try again or contact emergency services directly.');
  }
};

// Get SOS alert history (for tracking purposes)
export const getSOSHistory = async (userId: string): Promise<{ data: any[] | null; error: any }> => {
  try {
    const { data, error } = await supabase
      .from('sos_alerts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

// Check if user has emergency contacts set up
export const hasEmergencyContacts = async (userId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('caregiver_access')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .neq('emergency_info_access', 'none')
      .limit(1);

    return !error && data && data.length > 0;
  } catch (error) {
    return false;
  }
};