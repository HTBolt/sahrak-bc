import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { 
  AlertTriangle, 
  Phone, 
  MapPin, 
  Heart, 
  Shield, 
  Plus, 
  Edit3, 
  Trash2, 
  User, 
  Clock, 
  Wifi, 
  WifiOff,
  Utensils,
  Pill,
  Save,
  X,
  CheckCircle,
  Users,
  TreePine,
  Zap
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';
import { getUserProfile, updateUserProfile } from '../lib/database';
import { getUserCaregivers } from '../lib/caregivers';
import { sendSOSAlert, getLocationData, SOSAlert } from '../lib/sos';
import toast from 'react-hot-toast';
import { getCurrentUser } from '../lib/customAuth';

interface AllergyFormData {
  name: string;
  type: 'food' | 'medication' | 'environmental' | 'other';
  severity: 'mild' | 'moderate' | 'severe' | 'life-threatening';
  notes: string;
}

interface Allergy {
  id: string;
  name: string;
  type: 'food' | 'medication' | 'environmental' | 'other';
  severity: 'mild' | 'moderate' | 'severe' | 'life-threatening';
  notes?: string;
}

const SOS: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [caregivers, setCaregivers] = useState<any[]>([]);
  const [allergies, setAllergies] = useState<Allergy[]>([]);
  const [loading, setLoading] = useState(true);
  const [sosLoading, setSOSLoading] = useState(false);
  const [showAllergyForm, setShowAllergyForm] = useState(false);
  const [editingAllergy, setEditingAllergy] = useState<Allergy | null>(null);
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [lastSOSTime, setLastSOSTime] = useState<Date | null>(null);
  const [sosStatus, setSOSStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  const allergyForm = useForm<AllergyFormData>({
    defaultValues: {
      name: '',
      type: 'food',
      severity: 'mild',
      notes: ''
    }
  });

  useEffect(() => {
    loadData();
    checkLocationPermission();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      const [profileResult, caregiversResult] = await Promise.all([
        getUserProfile(user.id),
        getUserCaregivers()
      ]);

      if (profileResult.data && profileResult.data.length > 0) {
        const profileData = profileResult.data[0];
        setProfile(profileData);
        
        // Parse allergies from profile
        if (profileData.allergies && Array.isArray(profileData.allergies)) {
          const parsedAllergies: Allergy[] = [];
          
          profileData.allergies.forEach((allergy: any, index: number) => {
            try {
              // Standardize allergy object format
              let allergyObj: Allergy;
              
              if (typeof allergy === 'string') {
                // Handle legacy string format
                allergyObj = {
                  id: `allergy-${index}`,
                  name: allergy,
                  type: 'other',
                  severity: 'mild',
                  notes: ''
                };
              } else {
                // Handle object format
                const allergyData = typeof allergy === 'string' ? JSON.parse(allergy) : allergy;
                
                allergyObj = {
                  id: allergyData.id || `allergy-${index}`,
                  name: allergyData.name || 'Unknown Allergy',
                  type: allergyData.type || 'other',
                  severity: allergyData.severity || 'mild',
                  notes: allergyData.notes || ''
                };
                
                // Ensure type is valid
                if (!['food', 'medication', 'environmental', 'other'].includes(allergyObj.type)) {
                  allergyObj.type = 'other';
                }
                
                // Ensure severity is valid
                if (!['mild', 'moderate', 'severe', 'life-threatening'].includes(allergyObj.severity)) {
                  allergyObj.severity = 'mild';
                }
              }
              
              parsedAllergies.push(allergyObj);
            } catch (err) {
              console.error('Error parsing allergy:', err, allergy);
              // Add a fallback allergy object
              parsedAllergies.push({
                id: `allergy-${index}`,
                name: typeof allergy === 'string' ? allergy : 'Unknown Allergy',
                type: 'other',
                severity: 'mild',
                notes: ''
              });
            }
          });
          
          setAllergies(parsedAllergies);
        }
      }

      if (caregiversResult.data) {
        // Filter caregivers with emergency access
        const emergencyCaregivers = caregiversResult.data.filter(
          caregiver => caregiver.emergency_info_access !== 'none' && caregiver.status === 'active'
        );
        setCaregivers(emergencyCaregivers);
      }

    } catch (error) {
      console.error('Error loading SOS data:', error);
      toast.error('Failed to load emergency information');
    } finally {
      setLoading(false);
    }
  };

  const checkLocationPermission = async () => {
    if ('geolocation' in navigator) {
      try {
        const permission = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        setLocationPermission(permission.state as 'granted' | 'denied' | 'prompt');
        
        permission.addEventListener('change', () => {
          setLocationPermission(permission.state as 'granted' | 'denied' | 'prompt');
        });
      } catch (error) {
        console.error('Error checking location permission:', error);
      }
    }
  };

  const handleSOS = async () => {
    if (!user || !profile) {
      toast.error('Profile information not available');
      return;
    }

    // Prevent spam - 30 second cooldown
    if (lastSOSTime && Date.now() - lastSOSTime.getTime() < 30000) {
      toast.error('Please wait 30 seconds between SOS alerts');
      return;
    }

    if (caregivers.length === 0) {
      toast.error('No emergency contacts available. Please add caregivers with emergency access.');
      return;
    }

    setSOSLoading(true);
    setSOSStatus('sending');

    try {
      // Get location data
      const locationData = await getLocationData();

      // Prepare emergency information
      const emergencyInfo = {
        user: {
          name: `${profile.first_name} ${profile.last_name}`,
          email: user.email,
          phone: profile.phone,
          bloodType: profile.blood_type,
          dateOfBirth: profile.date_of_birth,
          address: profile.address
        },
        allergies: allergies,
        medicalConditions: profile.medical_conditions || [],
        emergencyContacts: profile.emergency_contact_name ? [{
          name: profile.emergency_contact_name,
          phone: profile.emergency_contact_phone
        }] : [],
        location: locationData,
        timestamp: new Date().toISOString()
      };

      // Send SOS alert to caregivers
      const sosAlert: SOSAlert = {
        userId: user.id,
        emergencyInfo,
        caregiverIds: caregivers.map(c => c.caregiver_id)
      };

      await sendSOSAlert(sosAlert);
      
      setLastSOSTime(new Date());
      setSOSStatus('success');
      toast.success('SOS alert sent to your emergency contacts!');

    } catch (error: any) {
      console.error('Error sending SOS alert:', error);
      setSOSStatus('error');
      toast.error(error.message || 'Failed to send SOS alert');
    } finally {
      setSOSLoading(false);
      // Reset status after a delay
      setTimeout(() => {
        setSOSStatus('idle');
      }, 5000);
    }
  };

  const handleAddAllergy = async (data: AllergyFormData) => {
    try {
      const newAllergy: Allergy = {
        id: editingAllergy?.id || `allergy-${Date.now()}`,
        ...data
      };

      let updatedAllergies;
      if (editingAllergy) {
        updatedAllergies = allergies.map(a => a.id === editingAllergy.id ? newAllergy : a);
      } else {
        updatedAllergies = [...allergies, newAllergy];
      }

      // Update profile with new allergies
      await updateUserProfile(user!.id, {
        allergies: updatedAllergies
      });

      setAllergies(updatedAllergies);
      setShowAllergyForm(false);
      setEditingAllergy(null);
      allergyForm.reset();
      
      toast.success(`Allergy ${editingAllergy ? 'updated' : 'added'} successfully`);

    } catch (error) {
      console.error('Error saving allergy:', error);
      toast.error('Failed to save allergy information');
    }
  };

  const handleDeleteAllergy = async (allergyId: string) => {
    try {
      const updatedAllergies = allergies.filter(a => a.id !== allergyId);
      
      await updateUserProfile(user!.id, {
        allergies: updatedAllergies
      });

      setAllergies(updatedAllergies);
      toast.success('Allergy removed successfully');

    } catch (error) {
      console.error('Error deleting allergy:', error);
      toast.error('Failed to remove allergy');
    }
  };

  const handleEditAllergy = (allergy: Allergy) => {
    setEditingAllergy(allergy);
    allergyForm.reset({
      name: allergy.name,
      type: allergy.type,
      severity: allergy.severity,
      notes: allergy.notes || ''
    });
    setShowAllergyForm(true);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'life-threatening': return 'text-red-400 bg-red-900/20 border-red-800';
      case 'severe': return 'text-orange-400 bg-orange-900/20 border-orange-800';
      case 'moderate': return 'text-yellow-400 bg-yellow-900/20 border-yellow-800';
      case 'mild': return 'text-green-400 bg-green-900/20 border-green-800';
      default: return 'text-slate-400 bg-slate-900/20 border-slate-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'food': return <Utensils className="w-4 h-4" />;
      case 'medication': return <Pill className="w-4 h-4" />;
      case 'environmental': return <TreePine className="w-4 h-4" />;
      case 'other': return <Zap className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'food': return 'text-orange-400';
      case 'medication': return 'text-blue-400';
      case 'environmental': return 'text-green-400';
      case 'other': return 'text-purple-400';
      default: return 'text-slate-400';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'food': return 'Food';
      case 'medication': return 'Medication';
      case 'environmental': return 'Environmental';
      case 'other': return 'Other';
      default: return type;
    }
  };

  // Group allergies by type
  const foodAllergies = allergies.filter(a => a.type === 'food');
  const medicationAllergies = allergies.filter(a => a.type === 'medication');
  const environmentalAllergies = allergies.filter(a => a.type === 'environmental');
  const otherAllergies = allergies.filter(a => a.type === 'other');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading emergency information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center justify-center space-x-3">
          <AlertTriangle className="w-8 h-8 text-primary-500" />
          <span>Emergency SOS</span>
        </h1>
        <p className="text-slate-400">
          Emergency assistance and medical information for first responders
        </p>
      </div>

      {/* SOS Button */}
      <Card className="p-8 bg-gradient-to-br from-primary-900/30 to-primary-800/30 border-primary-800">
        <div className="text-center">
          <div className="mb-6">
            <button
              onClick={handleSOS}
              disabled={sosLoading || caregivers.length === 0}
              className={`
                w-32 h-32 rounded-full border-4 border-primary-500 bg-primary-600 hover:bg-primary-700 
                flex items-center justify-center transition-all duration-200 mx-auto
                ${sosLoading ? 'animate-pulse' : 'hover:scale-105 active:scale-95'}
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {sosLoading ? (
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
              ) : sosStatus === 'success' ? (
                <div className="text-center">
                  <CheckCircle className="w-12 h-12 text-white mx-auto mb-1" />
                  <span className="text-white font-bold text-lg">Sent</span>
                </div>
              ) : sosStatus === 'error' ? (
                <div className="text-center">
                  <X className="w-12 h-12 text-white mx-auto mb-1" />
                  <span className="text-white font-bold text-lg">Failed</span>
                </div>
              ) : (
                <div className="text-center">
                  <AlertTriangle className="w-12 h-12 text-white mx-auto mb-1" />
                  <span className="text-white font-bold text-lg">SOS</span>
                </div>
              )}
            </button>
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-2">Emergency Alert</h2>
          <p className="text-primary-200 mb-4">
            Press the SOS button to immediately alert your emergency contacts with your location and medical information
          </p>
          
          {/* Status Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center justify-center space-x-2">
              {locationPermission === 'granted' ? (
                <>
                  <MapPin className="w-4 h-4 text-green-400" />
                  <span className="text-green-400">Location Available</span>
                </>
              ) : (
                <>
                  <MapPin className="w-4 h-4 text-orange-400" />
                  <span className="text-orange-400">Location Permission Needed</span>
                </>
              )}
            </div>
            
            <div className="flex items-center justify-center space-x-2">
              <Users className="w-4 h-4 text-primary-400" />
              <span className="text-primary-400">{caregivers.length} Emergency Contacts</span>
            </div>
            
            <div className="flex items-center justify-center space-x-2">
              <Shield className="w-4 h-4 text-secondary-400" />
              <span className="text-secondary-400">Medical Info Ready</span>
            </div>
          </div>
          
          {lastSOSTime && (
            <p className="text-xs text-slate-400 mt-4">
              Last SOS sent: {lastSOSTime.toLocaleTimeString()}
            </p>
          )}
          
          {caregivers.length === 0 && (
            <div className="mt-4 p-3 bg-red-900/20 border border-red-800 rounded-lg">
              <p className="text-red-300 text-sm">
                <AlertTriangle className="w-4 h-4 inline-block mr-1" />
                No emergency contacts available. Please add caregivers with emergency access to use the SOS feature.
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Emergency Contacts */}
      <Card className="p-6 bg-slate-800 border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
          <Users className="w-5 h-5 text-primary-500" />
          <span>Emergency Contacts ({caregivers.length})</span>
        </h3>
        
        {caregivers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {caregivers.map((caregiver) => (
              <div key={caregiver.id} className="p-4 bg-slate-700/50 rounded-lg">
                <div className="flex items-start space-x-3">
                  <User className="w-8 h-8 text-primary-500 mt-1" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-white">{caregiver.caregiver?.name}</h4>
                    <p className="text-sm text-slate-400">{caregiver.relationship_type}</p>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-slate-500">
                      <span className="flex items-center space-x-1">
                        <Phone className="w-3 h-3" />
                        <span>{caregiver.caregiver?.phone}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-slate-300 mb-2">No Emergency Contacts</h4>
            <p className="text-slate-500 mb-4">
              Add caregivers with emergency access to receive SOS alerts
            </p>
            <Button
              onClick={() => window.location.href = '/caregivers'}
              variant="outline"
            >
              Add Emergency Contacts
            </Button>
          </div>
        )}
      </Card>

      {/* Medical Information Summary */}
      <Card className="p-6 bg-slate-800 border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
          <Heart className="w-5 h-5 text-primary-500" />
          <span>Medical Information</span>
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div className="p-3 bg-slate-700/50 rounded-lg">
            <p className="text-slate-400">Blood Type</p>
            <p className="text-white font-medium">
              {profile?.blood_type || 'Not specified'}
            </p>
          </div>
          
          <div className="p-3 bg-slate-700/50 rounded-lg">
            <p className="text-slate-400">Date of Birth</p>
            <p className="text-white font-medium">
              {profile?.date_of_birth 
                ? new Date(profile.date_of_birth).toLocaleDateString()
                : 'Not specified'
              }
            </p>
          </div>
          
          <div className="p-3 bg-slate-700/50 rounded-lg">
            <p className="text-slate-400">Emergency Contact</p>
            <p className="text-white font-medium">
              {profile?.emergency_contact_name || 'Not specified'}
            </p>
          </div>
          
          <div className="p-3 bg-slate-700/50 rounded-lg">
            <p className="text-slate-400">Total Allergies</p>
            <p className="text-white font-medium">
              {allergies.length}
            </p>
          </div>
        </div>
      </Card>

      {/* Allergies Management */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Food Allergies */}
        <Card className="p-6 bg-slate-800 border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
              <Utensils className="w-5 h-5 text-primary-500" />
              <span>Food Allergies ({foodAllergies.length})</span>
            </h3>
            <Button
              size="sm"
              onClick={() => {
                setEditingAllergy(null);
                allergyForm.reset({ type: 'food', name: '', severity: 'mild', notes: '' });
                setShowAllergyForm(true);
              }}
            >
              <Plus size={14} className="mr-1" />
              Add
            </Button>
          </div>
          
          {foodAllergies.length > 0 ? (
            <div className="space-y-2">
              {foodAllergies.map((allergy) => (
                <div key={allergy.id} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-white">{allergy.name}</span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getSeverityColor(allergy.severity)}`}>
                        {allergy.severity}
                      </span>
                    </div>
                    {allergy.notes && (
                      <p className="text-xs text-slate-400 mt-1">{allergy.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditAllergy(allergy)}
                      className="text-primary-500 hover:text-primary-400 p-1"
                    >
                      <Edit3 size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteAllergy(allergy.id)}
                      className="text-red-400 hover:text-red-300 p-1"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <Utensils className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No food allergies recorded</p>
            </div>
          )}
        </Card>

        {/* Medication Allergies */}
        <Card className="p-6 bg-slate-800 border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
              <Pill className="w-5 h-5 text-secondary-500" />
              <span>Medication Allergies ({medicationAllergies.length})</span>
            </h3>
            <Button
              size="sm"
              onClick={() => {
                setEditingAllergy(null);
                allergyForm.reset({ type: 'medication', name: '', severity: 'mild', notes: '' });
                setShowAllergyForm(true);
              }}
            >
              <Plus size={14} className="mr-1" />
              Add
            </Button>
          </div>
          
          {medicationAllergies.length > 0 ? (
            <div className="space-y-2">
              {medicationAllergies.map((allergy) => (
                <div key={allergy.id} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-white">{allergy.name}</span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getSeverityColor(allergy.severity)}`}>
                        {allergy.severity}
                      </span>
                    </div>
                    {allergy.notes && (
                      <p className="text-xs text-slate-400 mt-1">{allergy.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditAllergy(allergy)}
                      className="text-primary-500 hover:text-primary-400 p-1"
                    >
                      <Edit3 size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteAllergy(allergy.id)}
                      className="text-red-400 hover:text-red-300 p-1"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <Pill className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No medication allergies recorded</p>
            </div>
          )}
        </Card>
      </div>

      {/* Environmental Allergies */}
      <Card className="p-6 bg-slate-800 border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
            <TreePine className="w-5 h-5 text-secondary-500" />
            <span>Environmental Allergies ({environmentalAllergies.length})</span>
          </h3>
          <Button
            size="sm"
            onClick={() => {
              setEditingAllergy(null);
              allergyForm.reset({ type: 'environmental', name: '', severity: 'mild', notes: '' });
              setShowAllergyForm(true);
            }}
          >
            <Plus size={14} className="mr-1" />
            Add
          </Button>
        </div>
        
        {environmentalAllergies.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {environmentalAllergies.map((allergy) => (
              <div key={allergy.id} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                <div className="flex items-center space-x-3 flex-1">
                  <TreePine className="w-4 h-4 text-secondary-500" />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-white">{allergy.name}</span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getSeverityColor(allergy.severity)}`}>
                        {allergy.severity}
                      </span>
                    </div>
                    {allergy.notes && (
                      <p className="text-xs text-slate-400 mt-1">{allergy.notes}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditAllergy(allergy)}
                    className="text-primary-500 hover:text-primary-400 p-1"
                  >
                    <Edit3 size={14} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteAllergy(allergy.id)}
                    className="text-red-400 hover:text-red-300 p-1"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <TreePine className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No environmental allergies recorded</p>
          </div>
        )}
      </Card>

      {/* Other Allergies */}
      <Card className="p-6 bg-slate-800 border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
            <Zap className="w-5 h-5 text-primary-500" />
            <span>Other Allergies ({otherAllergies.length})</span>
          </h3>
          <Button
            size="sm"
            onClick={() => {
              setEditingAllergy(null);
              allergyForm.reset({ type: 'other', name: '', severity: 'mild', notes: '' });
              setShowAllergyForm(true);
            }}
          >
            <Plus size={14} className="mr-1" />
            Add
          </Button>
        </div>
        
        {otherAllergies.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {otherAllergies.map((allergy) => (
              <div key={allergy.id} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                <div className="flex items-center space-x-3 flex-1">
                  <Zap className="w-4 h-4 text-primary-500" />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-white">{allergy.name}</span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getSeverityColor(allergy.severity)}`}>
                        {allergy.severity}
                      </span>
                    </div>
                    {allergy.notes && (
                      <p className="text-xs text-slate-400 mt-1">{allergy.notes}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditAllergy(allergy)}
                    className="text-primary-500 hover:text-primary-400 p-1"
                  >
                    <Edit3 size={14} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteAllergy(allergy.id)}
                    className="text-red-400 hover:text-red-300 p-1"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <Zap className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No other allergies recorded</p>
          </div>
        )}
      </Card>

      {/* Add New Allergy Button */}
      <div className="flex justify-center">
        <Button
          onClick={() => {
            setEditingAllergy(null);
            allergyForm.reset({ type: 'food', name: '', severity: 'mild', notes: '' });
            setShowAllergyForm(true);
          }}
          className="bg-gradient-to-r from-primary-500 to-primary-700 hover:from-primary-600 hover:to-primary-800"
        >
          <Plus size={16} className="mr-2" />
          Add New Allergy
        </Button>
      </div>

      {/* Allergy Form Modal */}
      <Modal
        isOpen={showAllergyForm}
        onClose={() => {
          setShowAllergyForm(false);
          setEditingAllergy(null);
          allergyForm.reset();
        }}
        title={`${editingAllergy ? 'Edit' : 'Add'} Allergy`}
        size="md"
      >
        <form onSubmit={allergyForm.handleSubmit(handleAddAllergy)} className="space-y-4">
          <Input
            label="Allergy Name *"
            placeholder="e.g., Peanuts, Penicillin, Pollen"
            {...allergyForm.register('name', { required: 'Allergy name is required' })}
            error={allergyForm.formState.errors.name?.message}
          />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Type *
            </label>
            <select
              {...allergyForm.register('type', { required: 'Type is required' })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              <option value="food">Food</option>
              <option value="medication">Medication</option>
              <option value="environmental">Environmental</option>
              <option value="other">Other</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Severity *
            </label>
            <select
              {...allergyForm.register('severity', { required: 'Severity is required' })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              <option value="mild">Mild</option>
              <option value="moderate">Moderate</option>
              <option value="severe">Severe</option>
              <option value="life-threatening">Life-threatening</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes
            </label>
            <textarea
              placeholder="Additional details about the allergy, symptoms, or treatment"
              {...allergyForm.register('notes')}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400 resize-none"
              rows={3}
            />
          </div>
          
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowAllergyForm(false);
                setEditingAllergy(null);
                allergyForm.reset();
              }}
            >
              Cancel
            </Button>
            <Button type="submit">
              {editingAllergy ? 'Update' : 'Add'} Allergy
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default SOS;