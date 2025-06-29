import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  Ruler, 
  Weight, 
  MapPin, 
  Droplet,
  Edit3,
  Save,
  X,
  RefreshCw,
  Shield,
  AlertTriangle,
  Wifi,
  WifiOff
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { useAuth } from '../contexts/AuthContext';
import { getUserProfile, updateUserProfile } from '../lib/database';
import { supabase, testSupabaseConnection } from '../lib/supabase';
import toast from 'react-hot-toast';
import { getCurrentUser } from '../lib/customAuth';

interface ProfileFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  blood_type: string;
  height_cm: string;
  weight_kg: string;
  address: string;
}

const bloodTypes = [
  'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'
];

const Profile: React.FC = () => {
  const user = getCurrentUser();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const form = useForm<ProfileFormData>({
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      date_of_birth: '',
      blood_type: '',
      height_cm: '',
      weight_kg: '',
      address: ''
    }
  });

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setConnectionError(null);
      // Retry loading profile when back online
      if (user && !profile) {
        loadProfile();
      }
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setConnectionError('You are currently offline. Please check your internet connection.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user, profile]);

  const loadProfile = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setConnectionError(null);
      
      // Test Supabase connection first
      console.log('Testing Supabase connection...');
      const connectionTest = await testSupabaseConnection();
      
      if (!connectionTest.success) {
        throw new Error(`Database connection failed: ${connectionTest.error?.message || 'Unknown error'}`);
      }

      console.log('Loading profile for user:', user.id);
      const { data, error } = await getUserProfile(user.id);
      
      if (error) {
        console.error('Database error:', error);
        throw new Error(`Failed to load profile: ${error.message}`);
      }

      console.log('Profile data received:', data);

      if (data && data.length > 0) {
        const profileData = data[0];
        setProfile(profileData);
        
        // Populate form with existing data
        form.reset({
          first_name: profileData.first_name || '',
          last_name: profileData.last_name || '',
          email: user.email || '',
          phone: profileData.phone || '',
          date_of_birth: profileData.date_of_birth || '',
          blood_type: profileData.blood_type || '',
          height_cm: profileData.height_cm?.toString() || '',
          weight_kg: profileData.weight_kg?.toString() || '',
          address: profileData.address || ''
        });
      } else {
        console.log('No profile data found, user may need to complete profile setup');
        // Initialize form with user email
        form.reset({
          first_name: '',
          last_name: '',
          email: user.email || '',
          phone: '',
          date_of_birth: '',
          blood_type: '',
          height_cm: '',
          weight_kg: '',
          address: ''
        });
      }
    } catch (error: any) {
      console.error('Error loading profile:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to load profile';
      
      if (error.message?.includes('Failed to fetch')) {
        errorMessage = 'Unable to connect to the database. Please check your internet connection and try again.';
        setConnectionError(errorMessage);
      } else if (error.message?.includes('Database connection failed')) {
        errorMessage = 'Database connection failed. Please check your Supabase configuration.';
        setConnectionError(errorMessage);
      } else if (error.message) {
        errorMessage = error.message;
        setConnectionError(errorMessage);
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadProfile();
  };

  const onSubmit = async (data: ProfileFormData) => {
    if (!user) return;

    setSaving(true);

    try {
      setConnectionError(null);
      
      // Test connection before attempting to save
      const connectionTest = await testSupabaseConnection();
      if (!connectionTest.success) {
        throw new Error(`Database connection failed: ${connectionTest.error?.message || 'Unknown error'}`);
      }

      // Prepare profile data with proper type conversion
      const profileData = {
        first_name: data.first_name.trim(),
        last_name: data.last_name.trim(),
        phone: data.phone.trim() || null,
        date_of_birth: data.date_of_birth || null,
        blood_type: data.blood_type || null,
        height_cm: data.height_cm ? parseInt(data.height_cm, 10) : null,
        weight_kg: data.weight_kg ? parseFloat(data.weight_kg) : null,
        address: data.address.trim() || null
      };

      // Validate numeric values before sending
      if (profileData.height_cm !== null && (isNaN(profileData.height_cm) || profileData.height_cm <= 0)) {
        throw new Error('Please enter a valid height');
      }
      
      if (profileData.weight_kg !== null && (isNaN(profileData.weight_kg) || profileData.weight_kg <= 0)) {
        throw new Error('Please enter a valid weight');
      }

      // Update profile in database
      const { error: profileError } = await updateUserProfile(user.id, profileData);
      if (profileError) throw profileError;

      // Update email in auth if changed
      if (data.email !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: data.email
        });
        
        if (emailError) {
          // Revert profile changes if email update fails
          await updateUserProfile(user.id, profile);
          throw emailError;
        }
        
        toast.success('Profile updated! Please check your new email for verification.');
      } else {
        toast.success('Profile updated successfully!');
      }

      setIsEditing(false);
      await loadProfile();

    } catch (error: any) {
      console.error('Error updating profile:', error);
      
      let errorMessage = 'Failed to update profile';
      if (error.message?.includes('Failed to fetch')) {
        errorMessage = 'Unable to connect to the database. Please check your internet connection and try again.';
        setConnectionError(errorMessage);
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset form to current profile data
    if (profile) {
      form.reset({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        email: user?.email || '',
        phone: profile.phone || '',
        date_of_birth: profile.date_of_birth || '',
        blood_type: profile.blood_type || '',
        height_cm: profile.height_cm?.toString() || '',
        weight_kg: profile.weight_kg?.toString() || '',
        address: profile.address || ''
      });
    }
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

  useEffect(() => {
    loadProfile();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading your profile...</p>
        </div>
      </div>
    );
  }

  // Show connection error state
  if (connectionError) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="mb-4 sm:mb-0">
            <h1 className="text-3xl font-bold text-white mb-2">My Profile</h1>
            <p className="text-slate-400">
              Manage your personal information and account settings
            </p>
          </div>
        </div>

        <Card className="p-6 bg-slate-800 border-slate-700">
          <div className="text-center py-12">
            <div className="flex justify-center mb-4">
              {isOnline ? (
                <AlertTriangle className="w-16 h-16 text-yellow-500" />
              ) : (
                <WifiOff className="w-16 h-16 text-red-500" />
              )}
            </div>
            
            <h3 className="text-xl font-semibold text-white mb-2">
              {isOnline ? 'Connection Error' : 'You\'re Offline'}
            </h3>
            
            <p className="text-slate-400 mb-6 max-w-md mx-auto">
              {connectionError}
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-3">
              <Button
                onClick={handleRefresh}
                disabled={refreshing}
                className="inline-flex items-center space-x-2"
              >
                <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                <span>Try Again</span>
              </Button>
              
              {!isOnline && (
                <div className="flex items-center space-x-2 text-sm text-slate-400">
                  <WifiOff size={16} />
                  <span>Check your internet connection</span>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="mb-4 sm:mb-0">
          <h1 className="text-3xl font-bold text-white mb-2">My Profile</h1>
          <p className="text-slate-400">
            Manage your personal information and account settings
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Connection status indicator */}
          <div className="flex items-center space-x-2">
            {isOnline ? (
              <Wifi size={16} className="text-green-400" />
            ) : (
              <WifiOff size={16} className="text-red-400" />
            )}
            <span className={`text-sm ${isOnline ? 'text-green-400' : 'text-red-400'}`}>
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
          
          <Button
            variant="ghost"
            onClick={handleRefresh}
            disabled={refreshing}
            className="text-slate-400 hover:text-slate-300"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </Button>
          
          {!isEditing ? (
            <Button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center space-x-2"
            >
              <Edit3 size={16} />
              <span>Edit Profile</span>
            </Button>
          ) : (
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={saving}
              >
                <X size={16} className="mr-1" />
                Cancel
              </Button>
              <Button
                onClick={form.handleSubmit(onSubmit)}
                loading={saving}
                disabled={saving}
              >
                <Save size={16} className="mr-1" />
                Save Changes
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Profile Form */}
      <Card className="p-6 bg-slate-800 border-slate-700">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
              <User className="w-5 h-5 text-cyan-400" />
              <span>Basic Information</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="First Name *"
                placeholder="Enter your first name"
                icon={<User size={16} className="text-gray-400" />}
                {...form.register('first_name', { 
                  required: 'First name is required',
                  minLength: {
                    value: 2,
                    message: 'First name must be at least 2 characters'
                  }
                })}
                error={form.formState.errors.first_name?.message}
                disabled={!isEditing}
              />
              
              <Input
                label="Last Name *"
                placeholder="Enter your last name"
                icon={<User size={16} className="text-gray-400" />}
                {...form.register('last_name', { 
                  required: 'Last name is required',
                  minLength: {
                    value: 2,
                    message: 'Last name must be at least 2 characters'
                  }
                })}
                error={form.formState.errors.last_name?.message}
                disabled={!isEditing}
              />
            </div>
          </div>

          {/* Contact Information */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
              <Mail className="w-5 h-5 text-cyan-400" />
              <span>Contact Information</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Email Address *"
                type="email"
                placeholder="Enter your email"
                icon={<Mail size={16} className="text-gray-400" />}
                {...form.register('email', { 
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address'
                  }
                })}
                error={form.formState.errors.email?.message}
                disabled={!isEditing}
              />
              
              <Input
                label="Phone Number"
                type="tel"
                placeholder="Enter your phone number"
                icon={<Phone size={16} className="text-gray-400" />}
                {...form.register('phone')}
                disabled={!isEditing}
              />
            </div>
            
            {isEditing && (
              <div className="mt-3 p-3 bg-blue-900/20 border border-blue-800 rounded-lg">
                <div className="flex items-start space-x-2">
                  <Shield className="w-4 h-4 text-blue-400 mt-0.5" />
                  <div className="text-sm">
                    <p className="text-blue-300 font-medium">Email Change Notice</p>
                    <p className="text-blue-200 mt-1">
                      If you change your email address, you'll need to verify the new email before you can sign in with it.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Personal Details */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-cyan-400" />
              <span>Personal Details</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Input
                label="Date of Birth"
                type="date"
                icon={<Calendar size={16} className="text-gray-400" />}
                {...form.register('date_of_birth')}
                disabled={!isEditing}
                max={new Date().toISOString().split('T')[0]}
              />
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Blood Type
                </label>
                <div className="relative">
                  <Droplet className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <select
                    {...form.register('blood_type')}
                    disabled={!isEditing}
                    className="
                      block w-full rounded-lg border border-gray-600 pl-10 pr-3 py-2 text-white 
                      focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500
                      bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed
                    "
                  >
                    <option value="">Select blood type</option>
                    {bloodTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <Input
                label="Height (cm)"
                type="number"
                placeholder="170"
                icon={<Ruler size={16} className="text-gray-400" />}
                {...form.register('height_cm', {
                  min: {
                    value: 50,
                    message: 'Height must be at least 50 cm'
                  },
                  max: {
                    value: 300,
                    message: 'Height must be less than 300 cm'
                  }
                })}
                error={form.formState.errors.height_cm?.message}
                disabled={!isEditing}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <Input
                label="Weight (kg)"
                type="number"
                step="0.1"
                placeholder="70.5"
                icon={<Weight size={16} className="text-gray-400" />}
                {...form.register('weight_kg', {
                  min: {
                    value: 20,
                    message: 'Weight must be at least 20 kg'
                  },
                  max: {
                    value: 500,
                    message: 'Weight must be less than 500 kg'
                  }
                })}
                error={form.formState.errors.weight_kg?.message}
                disabled={!isEditing}
              />
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Address
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
                  <textarea
                    placeholder="Enter your address"
                    {...form.register('address')}
                    disabled={!isEditing}
                    className="
                      block w-full rounded-lg border border-gray-600 pl-10 pr-3 py-2 text-white placeholder-gray-400 
                      focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500
                      bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed resize-none
                    "
                    rows={3}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Display Current Values (when not editing) */}
          {!isEditing && profile && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Current Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                {profile.date_of_birth && (
                  <div className="p-3 bg-slate-700/50 rounded-lg">
                    <p className="text-slate-400">Date of Birth</p>
                    <p className="text-white font-medium">
                      {new Date(profile.date_of_birth).toLocaleDateString()}
                    </p>
                  </div>
                )}
                
                {profile.blood_type && (
                  <div className="p-3 bg-slate-700/50 rounded-lg">
                    <p className="text-slate-400">Blood Type</p>
                    <p className="text-white font-medium">{profile.blood_type}</p>
                  </div>
                )}
                
                {profile.height_cm && (
                  <div className="p-3 bg-slate-700/50 rounded-lg">
                    <p className="text-slate-400">Height</p>
                    <p className="text-white font-medium">{formatHeight(profile.height_cm)}</p>
                  </div>
                )}
                
                {profile.weight_kg && (
                  <div className="p-3 bg-slate-700/50 rounded-lg">
                    <p className="text-slate-400">Weight</p>
                    <p className="text-white font-medium">{formatWeight(profile.weight_kg)}</p>
                  </div>
                )}
                
                {profile.address && (
                  <div className="p-3 bg-slate-700/50 rounded-lg md:col-span-2">
                    <p className="text-slate-400">Address</p>
                    <p className="text-white font-medium">{profile.address}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </form>
      </Card>

      {/* Account Information - Removed User ID for security */}
      <Card className="p-6 bg-slate-800 border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
          <Shield className="w-5 h-5 text-cyan-400" />
          <span>Account Information</span>
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="p-3 bg-slate-700/50 rounded-lg">
            <p className="text-slate-400">Account Created</p>
            <p className="text-white font-medium">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
            </p>
          </div>
          
          <div className="p-3 bg-slate-700/50 rounded-lg">
            <p className="text-slate-400">Email Verified</p>
            <p className="text-white font-medium">
              {user?.email_confirmed_at ? 'Yes' : 'No'}
            </p>
          </div>
          
          <div className="p-3 bg-slate-700/50 rounded-lg">
            <p className="text-slate-400">Last Sign In</p>
            <p className="text-white font-medium">
              {user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'Unknown'}
            </p>
          </div>
          
          <div className="p-3 bg-slate-700/50 rounded-lg">
            <p className="text-slate-400">Account Status</p>
            <p className="text-white font-medium">
              {user?.email_confirmed_at ? 'Verified' : 'Pending Verification'}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Profile;