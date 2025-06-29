import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  getUserProfile,
  createUserProfile,
  getUpcomingAppointments,
  getLatestMoodEntry,
  calculateWellnessScores
} from '../lib/database';
import { getTodaysSchedule } from '../lib/medications';

export const useUserData = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [todaysSchedule, setTodaysSchedule] = useState<any[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([]);
  const [latestMood, setLatestMood] = useState<any>(null);
  const [wellnessScores, setWellnessScores] = useState({ physical: 75, mental: 75 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Load user profile
      let { data: profileData, error: profileError } = await getUserProfile(user.id);
      
      if (profileError) {
        throw profileError;
      }

      // Check if we have a profile
      if (profileData && profileData.length > 0) {
        setProfile(profileData[0]); // Use the first profile (most recent due to ordering)
      } else {
        // Profile doesn't exist, create one with error handling for race conditions
        try {
          const newProfile = {
            user_id: user.id,
            first_name: user.user_metadata?.first_name || 'User',
            last_name: user.user_metadata?.last_name || '',
            phone: user.user_metadata?.phone || '',
            wellness_score_physical: 75,
            wellness_score_mental: 75
          };
          
          const { data: createdProfile, error: createError } = await createUserProfile(newProfile);
          
          if (createError) {
            // If creation failed due to unique constraint violation, try to fetch the profile again
            if (createError.code === '23505' || createError.message?.includes('duplicate') || createError.message?.includes('unique')) {
              console.log('Profile already exists, fetching existing profile...');
              const { data: existingProfile, error: fetchError } = await getUserProfile(user.id);
              if (fetchError) throw fetchError;
              if (existingProfile && existingProfile.length > 0) {
                setProfile(existingProfile[0]);
              } else {
                throw new Error('Failed to create or fetch user profile');
              }
            } else {
              throw createError;
            }
          } else {
            setProfile(createdProfile);
          }
        } catch (profileCreationError: any) {
          console.error('Error creating profile:', profileCreationError);
          // If profile creation fails, try one more time to fetch in case it was created by another request
          const { data: retryProfile, error: retryError } = await getUserProfile(user.id);
          if (retryError) throw retryError;
          if (retryProfile && retryProfile.length > 0) {
            setProfile(retryProfile[0]);
          } else {
            throw profileCreationError;
          }
        }
      }

      // Load today's medication schedule (same as medications page)
      const { data: schedule, error: scheduleError } = await getTodaysSchedule();
      if (scheduleError) console.error('Error loading medication schedule:', scheduleError);
      else setTodaysSchedule(schedule || []);

      // Load upcoming appointments
      const { data: appointments, error: apptError } = await getUpcomingAppointments(user.id, 3);
      if (apptError) console.error('Error loading appointments:', apptError);
      else setUpcomingAppointments(appointments || []);

      // Load latest mood entry
      const { data: mood, error: moodError } = await getLatestMoodEntry(user.id);
      if (moodError) {
        console.error('Error loading mood:', moodError);
      } else {
        // Set the latest mood entry if one exists, otherwise set to null
        setLatestMood(mood && mood.length > 0 ? mood[0] : null);
      }

      // Calculate and update wellness scores using the same logic as Physical Wellness page
      const scores = await calculateWellnessScores(user.id);
      setWellnessScores({
        physical: scores.physicalScore,
        mental: scores.mentalScore
      });

    } catch (err: any) {
      console.error('Error loading user data:', err);
      setError(err.message || 'Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = () => {
    if (user) {
      loadUserData();
    }
  };

  return {
    profile,
    todaysSchedule,
    upcomingAppointments,
    latestMood,
    wellnessScores,
    loading,
    error,
    refreshData
  };
};