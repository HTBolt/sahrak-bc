import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Stethoscope, 
  Heart, 
  Users,
  FileText,
  Pill,
  Calendar,
  Activity,
  AlertTriangle,
  TrendingUp
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Card } from '../ui/Card';
import { addCaregiver, updateCaregiverAccess, CaregiverFormData, CaregiverAccess } from '../../lib/caregivers';
import toast from 'react-hot-toast';

interface CaregiverFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  caregiverAccess?: CaregiverAccess | null;
}

const caregiverTypes = [
  { value: 'doctor', label: 'Doctor', icon: Stethoscope },
  { value: 'nurse', label: 'Nurse', icon: Heart },
  { value: 'family', label: 'Family Member', icon: Users }
];

const accessModules = [
  { key: 'documents_access', label: 'Documents', icon: FileText, description: 'Medical reports and prescriptions' },
  { key: 'medications_access', label: 'Medications', icon: Pill, description: 'Medication schedules and reminders' },
  { key: 'appointments_access', label: 'Appointments', icon: Calendar, description: 'Medical appointments and scheduling' },
  { key: 'mood_tracker_access', label: 'Mood Tracker', icon: Heart, description: 'Mental health and mood entries' },
  { key: 'progress_tracker_access', label: 'Progress Tracker', icon: TrendingUp, description: 'Health metrics and progress' },
  { key: 'emergency_info_access', label: 'Emergency Information', icon: AlertTriangle, description: 'Emergency contacts and medical info' }
];

const accessLevels = [
  { value: 'none', label: 'No Access', description: 'Cannot view or modify' },
  { value: 'view', label: 'View Only', description: 'Can view but not modify' },
  { value: 'full', label: 'Full Access', description: 'Can view and modify' }
];

export const CaregiverForm: React.FC<CaregiverFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  caregiverAccess
}) => {
  const [loading, setLoading] = useState(false);
  const isEditing = !!caregiverAccess;

  const form = useForm<CaregiverFormData>({
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      address: '',
      caregiver_type: 'family',
      relationship_type: '',
      documents_access: 'none',
      medications_access: 'none',
      appointments_access: 'none',
      mood_tracker_access: 'none',
      progress_tracker_access: 'none',
      emergency_info_access: 'none'
    }
  });

  // Reset form when modal opens/closes or caregiver changes
  useEffect(() => {
    if (isOpen) {
      if (caregiverAccess) {
        // Editing existing caregiver access
        form.reset({
          name: caregiverAccess.caregiver?.name || '',
          email: caregiverAccess.caregiver?.email || '',
          phone: caregiverAccess.caregiver?.phone || '',
          address: caregiverAccess.caregiver?.address || '',
          caregiver_type: caregiverAccess.caregiver?.caregiver_type || 'family',
          relationship_type: caregiverAccess.relationship_type || '',
          documents_access: caregiverAccess.documents_access || 'none',
          medications_access: caregiverAccess.medications_access || 'none',
          appointments_access: caregiverAccess.appointments_access || 'none',
          mood_tracker_access: caregiverAccess.mood_tracker_access || 'none',
          progress_tracker_access: caregiverAccess.progress_tracker_access || 'none',
          emergency_info_access: caregiverAccess.emergency_info_access || 'none'
        });
      } else {
        // Adding new caregiver
        form.reset({
          name: '',
          email: '',
          phone: '',
          address: '',
          caregiver_type: 'family',
          relationship_type: '',
          documents_access: 'none',
          medications_access: 'none',
          appointments_access: 'none',
          mood_tracker_access: 'none',
          progress_tracker_access: 'none',
          emergency_info_access: 'none'
        });
      }
    }
  }, [isOpen, caregiverAccess, form]);

  const onSubmit = async (data: CaregiverFormData) => {
    setLoading(true);

    try {
      if (isEditing && caregiverAccess) {
        // Update existing caregiver access
        const { error } = await updateCaregiverAccess(caregiverAccess.id, {
          relationship_type: data.relationship_type,
          documents_access: data.documents_access,
          medications_access: data.medications_access,
          appointments_access: data.appointments_access,
          mood_tracker_access: data.mood_tracker_access,
          progress_tracker_access: data.progress_tracker_access,
          emergency_info_access: data.emergency_info_access
        });

        if (error) throw error;
        toast.success('Caregiver access updated successfully!');
      } else {
        // Add new caregiver
        const { error } = await addCaregiver(data);
        if (error) throw error;
        toast.success('Caregiver added successfully!');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error saving caregiver:', error);
      toast.error(error.message || `Failed to ${isEditing ? 'update' : 'add'} caregiver`);
    } finally {
      setLoading(false);
    }
  };

  const getAccessLevelColor = (level: string) => {
    switch (level) {
      case 'none': return 'border-slate-600 bg-slate-700/50';
      case 'view': return 'border-blue-600 bg-blue-900/20';
      case 'full': return 'border-green-600 bg-green-900/20';
      default: return 'border-slate-600 bg-slate-700/50';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${isEditing ? 'Edit Caregiver Access' : 'Add New Caregiver'}`}
      size="xl"
    >
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Caregiver Information */}
        <Card className="p-6 bg-slate-700/50 border-slate-600">
          <h3 className="text-lg font-semibold text-white mb-4">Caregiver Information</h3>
          
          {/* Caregiver Type */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Caregiver Type *
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {caregiverTypes.map((type) => (
                <label
                  key={type.value}
                  className={`
                    flex items-center space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-all
                    ${form.watch('caregiver_type') === type.value
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-600 hover:border-gray-500'
                    }
                    ${isEditing ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  <input
                    type="radio"
                    value={type.value}
                    {...form.register('caregiver_type', { required: 'Caregiver type is required' })}
                    className="sr-only"
                    disabled={isEditing}
                  />
                  <type.icon className="w-5 h-5 text-primary-600" />
                  <span className="font-medium text-white">
                    {type.label}
                  </span>
                </label>
              ))}
            </div>
            {form.formState.errors.caregiver_type && (
              <p className="mt-1 text-sm text-red-400">
                {form.formState.errors.caregiver_type.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Full Name *"
              placeholder="Enter caregiver's full name"
              icon={<User size={16} className="text-gray-400" />}
              {...form.register('name', { required: 'Name is required' })}
              error={form.formState.errors.name?.message}
              disabled={isEditing}
            />
            
            <Input
              label="Email Address *"
              type="email"
              placeholder="Enter email address"
              icon={<Mail size={16} className="text-gray-400" />}
              {...form.register('email', { 
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address'
                }
              })}
              error={form.formState.errors.email?.message}
              disabled={isEditing}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Phone Number *"
              type="tel"
              placeholder="Enter phone number"
              icon={<Phone size={16} className="text-gray-400" />}
              {...form.register('phone', { required: 'Phone number is required' })}
              error={form.formState.errors.phone?.message}
              disabled={isEditing}
            />
            
            <Input
              label="Relationship *"
              placeholder="e.g., Primary Care Doctor, Mother, etc."
              {...form.register('relationship_type', { required: 'Relationship is required' })}
              error={form.formState.errors.relationship_type?.message}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Address *
            </label>
            <textarea
              placeholder="Enter full address"
              {...form.register('address', { required: 'Address is required' })}
              className="
                block w-full rounded-lg border border-gray-600 px-3 py-2 text-white placeholder-gray-400 
                focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500
                bg-gray-800 resize-none
              "
              rows={3}
              disabled={isEditing}
            />
            {form.formState.errors.address && (
              <p className="mt-1 text-sm text-red-400">{form.formState.errors.address.message}</p>
            )}
          </div>
        </Card>

        {/* Access Permissions */}
        <Card className="p-6 bg-slate-700/50 border-slate-600">
          <h3 className="text-lg font-semibold text-white mb-4">Access Permissions</h3>
          <p className="text-sm text-gray-400 mb-6">
            Configure what information this caregiver can access and whether they can make changes on your behalf.
          </p>

          <div className="space-y-6">
            {accessModules.map((module) => (
              <div key={module.key} className="space-y-3">
                <div className="flex items-center space-x-3">
                  <module.icon className="w-5 h-5 text-cyan-400" />
                  <div>
                    <h4 className="font-medium text-white">{module.label}</h4>
                    <p className="text-sm text-gray-400">{module.description}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 ml-8">
                  {accessLevels.map((level) => (
                    <label
                      key={level.value}
                      className={`
                        flex flex-col p-3 border-2 rounded-lg cursor-pointer transition-all
                        ${form.watch(module.key as keyof CaregiverFormData) === level.value
                          ? getAccessLevelColor(level.value)
                          : 'border-slate-600 bg-slate-700/50 hover:border-slate-500'
                        }
                      `}
                    >
                      <input
                        type="radio"
                        value={level.value}
                        {...form.register(module.key as keyof CaregiverFormData)}
                        className="sr-only"
                      />
                      <span className="font-medium text-white text-sm">{level.label}</span>
                      <span className="text-xs text-gray-400 mt-1">{level.description}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            loading={loading}
            disabled={loading}
          >
            {isEditing ? 'Update Access' : 'Add Caregiver'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};