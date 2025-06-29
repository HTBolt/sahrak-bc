import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Phone, 
  Stethoscope, 
  Building2, 
  FileText, 
  User,
  TestTube,
  ArrowRight,
  Link,
  X
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { 
  addAppointment, 
  updateAppointment, 
  Appointment, 
  AppointmentFormData,
  getAppointmentDocuments
} from '../../lib/appointments';
import { getUserDocuments, Document } from '../../lib/documents';
import { getUserAppointments } from '../../lib/appointments';
import toast from 'react-hot-toast';

interface AppointmentFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  appointment?: Appointment | null;
}

const appointmentTypes = [
  { value: 'consultation', label: 'Doctor Consultation', icon: Stethoscope },
  { value: 'test', label: 'Medical Test', icon: TestTube },
  { value: 'followup', label: 'Follow-up Visit', icon: ArrowRight }
];

const recurrenceOptions = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'custom', label: 'Custom Date' }
];

export const AppointmentForm: React.FC<AppointmentFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  appointment
}) => {
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [previousAppointments, setPreviousAppointments] = useState<Appointment[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [showCustomRecurrence, setShowCustomRecurrence] = useState(false);
  const [customRecurrenceDate, setCustomRecurrenceDate] = useState('');
  const [loadingFormData, setLoadingFormData] = useState(false);
  const [formInitialized, setFormInitialized] = useState(false);
  const isEditing = !!appointment;

  const form = useForm<AppointmentFormData>({
    defaultValues: {
      title: '',
      appointment_type: 'consultation',
      appointment_date: '',
      appointment_time: '',
      is_recurring: false,
      recurrence_pattern: '',
      recurrence_end_date: '',
      location_name: '',
      location_address: '',
      location_phone: '',
      doctor_name: '',
      doctor_specialization: '',
      lab_name: '',
      test_name: '',
      referring_doctor: '',
      previous_appointment_id: '',
      notes: ''
    }
  });

  const appointmentType = form.watch('appointment_type');
  const isRecurring = form.watch('is_recurring');
  const recurrencePattern = form.watch('recurrence_pattern');

  // Load documents and previous appointments for follow-up appointments
  useEffect(() => {
    if (isOpen && appointmentType === 'followup') {
      loadDocuments();
      loadPreviousAppointments();
    }
  }, [isOpen, appointmentType]);

  // Show custom recurrence options when custom is selected
  useEffect(() => {
    setShowCustomRecurrence(recurrencePattern === 'custom');
  }, [recurrencePattern]);

  // Initialize form data when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormInitialized(false);
      setLoadingFormData(true);
      
      // Small delay to ensure modal is fully rendered
      const timer = setTimeout(() => {
        initializeFormData();
      }, 100);
      
      return () => clearTimeout(timer);
    } else {
      // Reset state when modal closes
      setFormInitialized(false);
      setSelectedDocuments([]);
      setCustomRecurrenceDate('');
      setShowCustomRecurrence(false);
    }
  }, [isOpen, appointment?.id]); // Include appointment.id to trigger when editing different appointments

  const initializeFormData = async () => {
    try {
      if (appointment) {
        console.log('Initializing form with appointment data:', {
          id: appointment.id,
          title: appointment.title,
          time: appointment.appointment_time,
          type: appointment.appointment_type
        });

        // Load linked documents if it's a follow-up appointment
        let linkedDocumentIds: string[] = [];
        if (appointment.appointment_type === 'followup') {
          try {
            const { data: linkedDocs } = await getAppointmentDocuments(appointment.id);
            linkedDocumentIds = linkedDocs?.map(doc => doc.id) || [];
            setSelectedDocuments(linkedDocumentIds);
          } catch (error) {
            console.error('Error loading linked documents:', error);
          }
        }

        // Handle custom recurrence pattern
        let customDate = '';
        let showCustom = false;
        if (appointment.is_recurring && appointment.recurrence_pattern === 'custom' && appointment.recurrence_end_date) {
          customDate = appointment.recurrence_end_date;
          showCustom = true;
        }
        setCustomRecurrenceDate(customDate);
        setShowCustomRecurrence(showCustom);

        // Prepare form data with all appointment fields
        const formData: AppointmentFormData = {
          title: appointment.title || '',
          appointment_type: appointment.appointment_type || 'consultation',
          appointment_date: appointment.appointment_date || '',
          appointment_time: appointment.appointment_time || '',
          is_recurring: appointment.is_recurring || false,
          recurrence_pattern: appointment.recurrence_pattern || '',
          recurrence_end_date: appointment.recurrence_end_date || '',
          location_name: appointment.location_name || '',
          location_address: appointment.location_address || '',
          location_phone: appointment.location_phone || '',
          doctor_name: appointment.doctor_name || '',
          doctor_specialization: appointment.doctor_specialization || '',
          lab_name: appointment.lab_name || '',
          test_name: appointment.test_name || '',
          referring_doctor: appointment.referring_doctor || '',
          previous_appointment_id: appointment.previous_appointment_id || '',
          notes: appointment.notes || ''
        };

        console.log('Resetting form with data:', formData);
        
        // Reset form with appointment data
        form.reset(formData);
        
        console.log('Form reset complete. Current values:', {
          appointment_time: form.getValues('appointment_time'),
          title: form.getValues('title'),
          appointment_type: form.getValues('appointment_type')
        });
      } else {
        // Adding new appointment - reset to defaults
        const defaultData: AppointmentFormData = {
          title: '',
          appointment_type: 'consultation',
          appointment_date: '',
          appointment_time: '',
          is_recurring: false,
          recurrence_pattern: '',
          recurrence_end_date: '',
          location_name: '',
          location_address: '',
          location_phone: '',
          doctor_name: '',
          doctor_specialization: '',
          lab_name: '',
          test_name: '',
          referring_doctor: '',
          previous_appointment_id: '',
          notes: ''
        };
        
        form.reset(defaultData);
        setSelectedDocuments([]);
        setCustomRecurrenceDate('');
        setShowCustomRecurrence(false);
      }
    } catch (error) {
      console.error('Error initializing form data:', error);
    } finally {
      setLoadingFormData(false);
      setFormInitialized(true);
    }
  };

  const loadDocuments = async () => {
    try {
      const { data, error } = await getUserDocuments();
      if (error) throw error;
      setDocuments(data || []);
    } catch (error: any) {
      console.error('Error loading documents:', error);
    }
  };

  const loadPreviousAppointments = async () => {
    try {
      const { data, error } = await getUserAppointments();
      if (error) throw error;
      
      // Filter out current appointment if editing and get completed appointments
      const filteredAppointments = (data || []).filter(apt => 
        apt.id !== appointment?.id && 
        (apt.status === 'completed' || apt.status === 'scheduled')
      );
      
      setPreviousAppointments(filteredAppointments);
    } catch (error: any) {
      console.error('Error loading previous appointments:', error);
    }
  };

  // Generate time options in 15-minute increments
  const generateTimeOptions = () => {
    const times = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const displayTime = new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        times.push({ value: timeString, label: displayTime });
      }
    }
    return times;
  };

  const timeOptions = generateTimeOptions();

  const onSubmit = async (data: AppointmentFormData) => {
    setLoading(true);

    try {
      // Validate required fields
      if (!data.appointment_date) {
        toast.error('Appointment date is required');
        return;
      }

      if (!data.appointment_time) {
        toast.error('Appointment time is required');
        return;
      }

      // Validate appointment date is not in the past
      const appointmentDateTime = new Date(`${data.appointment_date}T${data.appointment_time}`);
      const now = new Date();
      
      if (appointmentDateTime < now) {
        toast.error('Appointment date and time cannot be in the past');
        return;
      }

      // Validate recurrence settings if recurring is enabled
      if (data.is_recurring) {
        if (!data.recurrence_pattern) {
          toast.error('Please select a recurrence pattern');
          return;
        }
        
        if (data.recurrence_pattern === 'custom') {
          if (!customRecurrenceDate) {
            toast.error('Please select a custom recurrence date');
            return;
          }
          
          const customDate = new Date(customRecurrenceDate);
          const startDate = new Date(data.appointment_date);
          
          if (customDate <= startDate) {
            toast.error('Custom recurrence date must be after appointment date');
            return;
          }
          
          // Set the custom date as the end date
          data.recurrence_end_date = customRecurrenceDate;
        } else if (data.recurrence_end_date) {
          const endDate = new Date(data.recurrence_end_date);
          const startDate = new Date(data.appointment_date);
          
          if (endDate <= startDate) {
            toast.error('Recurrence end date must be after appointment date');
            return;
          }
        }
      }

      // Clean up the data - convert empty strings to undefined for optional fields
      const appointmentData: AppointmentFormData = {
        // Required fields - keep as is
        title: data.title.trim(),
        appointment_type: data.appointment_type,
        appointment_date: data.appointment_date,
        appointment_time: data.appointment_time,
        is_recurring: data.is_recurring,
        
        // Optional fields - convert empty strings to undefined
        recurrence_pattern: data.is_recurring && data.recurrence_pattern?.trim() ? data.recurrence_pattern.trim() : undefined,
        recurrence_end_date: data.is_recurring && data.recurrence_end_date ? data.recurrence_end_date : undefined,
        location_name: data.location_name?.trim() || undefined,
        location_address: data.location_address?.trim() || undefined,
        location_phone: data.location_phone?.trim() || undefined,
        doctor_name: data.doctor_name?.trim() || undefined,
        doctor_specialization: data.doctor_specialization?.trim() || undefined,
        lab_name: data.lab_name?.trim() || undefined,
        test_name: data.test_name?.trim() || undefined,
        referring_doctor: data.referring_doctor?.trim() || undefined,
        previous_appointment_id: data.previous_appointment_id?.trim() || undefined,
        notes: data.notes?.trim() || undefined,
        
        // Document linking for follow-up appointments
        linked_documents: appointmentType === 'followup' ? selectedDocuments : undefined
      };

      let result;
      if (isEditing && appointment) {
        result = await updateAppointment(appointment.id, appointmentData);
      } else {
        result = await addAppointment(appointmentData);
      }

      if (result.error) {
        throw new Error(result.error.message);
      }

      toast.success(`Appointment ${isEditing ? 'updated' : 'scheduled'} successfully!`);
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error saving appointment:', error);
      toast.error(error.message || `Failed to ${isEditing ? 'update' : 'schedule'} appointment`);
    } finally {
      setLoading(false);
    }
  };

  const toggleDocument = (documentId: string) => {
    setSelectedDocuments(prev => 
      prev.includes(documentId)
        ? prev.filter(id => id !== documentId)
        : [...prev, documentId]
    );
  };

  // Show loading state while form data is being loaded
  if (loadingFormData || !formInitialized) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`${isEditing ? 'Edit' : 'Schedule'} Appointment`}
        size="xl"
      >
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-400">Loading appointment data...</span>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${isEditing ? 'Edit' : 'Schedule'} Appointment`}
      size="xl"
    >
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Appointment Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Appointment Type *
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {appointmentTypes.map((type) => (
              <label
                key={type.value}
                className={`
                  flex items-center space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-all
                  ${form.watch('appointment_type') === type.value
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                  }
                `}
              >
                <input
                  type="radio"
                  value={type.value}
                  {...form.register('appointment_type', { required: 'Appointment type is required' })}
                  className="sr-only"
                />
                <type.icon className="w-5 h-5 text-primary-600" />
                <span className="font-medium text-gray-900 dark:text-white">
                  {type.label}
                </span>
              </label>
            ))}
          </div>
          {form.formState.errors.appointment_type && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {form.formState.errors.appointment_type.message}
            </p>
          )}
        </div>

        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Appointment Title *"
            placeholder="Enter appointment title"
            {...form.register('title', { 
              required: 'Title is required',
              minLength: {
                value: 3,
                message: 'Title must be at least 3 characters'
              }
            })}
            error={form.formState.errors.title?.message}
          />
          
          <Input
            label="Date *"
            type="date"
            min={new Date().toISOString().split('T')[0]}
            icon={<Calendar size={16} className="text-gray-400" />}
            {...form.register('appointment_date', { required: 'Date is required' })}
            error={form.formState.errors.appointment_date?.message}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Time Selector with 15-minute increments */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Time *
            </label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <select
                {...form.register('appointment_time', { required: 'Time is required' })}
                className="
                  block w-full rounded-lg border border-gray-300 pl-10 pr-3 py-2 text-gray-900 
                  focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500
                  dark:border-gray-600 dark:bg-gray-800 dark:text-white
                  dark:focus:border-primary-400 dark:focus:ring-primary-400
                "
                value={form.watch('appointment_time')} // Explicitly set value to ensure it shows
              >
                <option value="">Select time</option>
                {timeOptions.map(time => (
                  <option key={time.value} value={time.value}>
                    {time.label}
                  </option>
                ))}
              </select>
            </div>
            {form.formState.errors.appointment_time && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {form.formState.errors.appointment_time.message}
              </p>
            )}
          </div>
          
          {/* Recurring Appointment Toggle */}
          <div className="flex items-center space-x-3 pt-6">
            <input
              type="checkbox"
              id="is_recurring"
              {...form.register('is_recurring')}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="is_recurring" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Recurring appointment
            </label>
          </div>
        </div>

        {/* Recurring Options */}
        {isRecurring && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Recurrence Pattern *
              </label>
              <select
                {...form.register('recurrence_pattern', {
                  required: isRecurring ? 'Recurrence pattern is required' : false
                })}
                className="
                  w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 
                  focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500
                  dark:border-gray-600 dark:bg-gray-700 dark:text-white
                "
              >
                <option value="">Select pattern</option>
                {recurrenceOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {form.formState.errors.recurrence_pattern && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {form.formState.errors.recurrence_pattern.message}
                </p>
              )}
            </div>
            
            {/* Custom Date Selector or End Date */}
            {showCustomRecurrence ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Custom Date *
                </label>
                <input
                  type="date"
                  value={customRecurrenceDate}
                  onChange={(e) => setCustomRecurrenceDate(e.target.value)}
                  min={form.watch('appointment_date')}
                  className="
                    w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 
                    focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500
                    dark:border-gray-600 dark:bg-gray-700 dark:text-white
                  "
                />
              </div>
            ) : (
              <Input
                label="End Date (Optional)"
                type="date"
                min={form.watch('appointment_date')}
                {...form.register('recurrence_end_date')}
              />
            )}
          </div>
        )}

        {/* Type-specific fields */}
        {appointmentType === 'consultation' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Doctor Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Doctor Name"
                placeholder="Enter doctor's name"
                icon={<Stethoscope size={16} className="text-gray-400" />}
                {...form.register('doctor_name')}
              />
              
              <Input
                label="Specialization"
                placeholder="e.g., Cardiology, Dermatology"
                {...form.register('doctor_specialization')}
              />
            </div>
          </div>
        )}

        {appointmentType === 'test' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Test Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Lab/Test Center Name"
                placeholder="Enter lab name"
                icon={<Building2 size={16} className="text-gray-400" />}
                {...form.register('lab_name')}
              />
              
              <Input
                label="Test Name"
                placeholder="e.g., Blood Test, MRI Scan"
                icon={<TestTube size={16} className="text-gray-400" />}
                {...form.register('test_name')}
              />
            </div>
            
            <Input
              label="Referring Doctor"
              placeholder="Doctor who referred this test"
              icon={<Stethoscope size={16} className="text-gray-400" />}
              {...form.register('referring_doctor')}
            />
          </div>
        )}

        {appointmentType === 'followup' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Follow-up Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Doctor Name"
                placeholder="Enter doctor's name"
                icon={<Stethoscope size={16} className="text-gray-400" />}
                {...form.register('doctor_name')}
              />
              
              <Input
                label="Specialization"
                placeholder="e.g., Cardiology, Dermatology"
                {...form.register('doctor_specialization')}
              />
            </div>

            {/* Previous Appointment Linking */}
            {previousAppointments.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Link to Previous Appointment (Optional)
                </label>
                <select
                  {...form.register('previous_appointment_id')}
                  className="
                    w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 
                    focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500
                    dark:border-gray-600 dark:bg-gray-800 dark:text-white
                  "
                >
                  <option value="">Select previous appointment</option>
                  {previousAppointments.map((apt) => (
                    <option key={apt.id} value={apt.id}>
                      {apt.title} - {new Date(apt.appointment_date).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Document Linking */}
            {documents.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Link Documents (Optional)
                </label>
                <div className="max-h-40 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-3">
                  {documents.map((doc) => (
                    <label
                      key={doc.id}
                      className="flex items-center space-x-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedDocuments.includes(doc.id)}
                        onChange={() => toggleDocument(doc.id)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <FileText className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-900 dark:text-white truncate">
                        {doc.document_name}
                      </span>
                    </label>
                  ))}
                </div>
                {selectedDocuments.length > 0 && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    {selectedDocuments.length} document(s) selected
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Location Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Location & Contact
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Location Name"
              placeholder="Hospital/Clinic name"
              icon={<Building2 size={16} className="text-gray-400" />}
              {...form.register('location_name')}
            />
            
            <Input
              label="Phone Number"
              placeholder="Contact number"
              icon={<Phone size={16} className="text-gray-400" />}
              {...form.register('location_phone')}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Address
            </label>
            <textarea
              placeholder="Enter full address"
              {...form.register('location_address')}
              className="
                block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 
                focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500
                dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400
                resize-none
              "
              rows={3}
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Notes
          </label>
          <textarea
            placeholder="Any additional notes or instructions"
            {...form.register('notes')}
            className="
              block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 
              focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500
              dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400
              resize-none
            "
            rows={3}
          />
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
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
            {isEditing ? 'Update' : 'Schedule'} Appointment
          </Button>
        </div>
      </form>
    </Modal>
  );
};