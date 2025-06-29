import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Plus, X, Clock, Stethoscope, Calendar, FileText } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { addMedication, updateMedication, Medication } from '../../lib/medications';
import toast from 'react-hot-toast';

interface MedicationFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  medication?: Medication | null;
}

interface MedicationFormData {
  name: string;
  dosage: string;
  frequency: string;
  time_of_day: { time: string }[];
  start_date: string;
  end_date: string;
  doctor_name: string;
  instructions: string;
}

const frequencyOptions = [
  'Once daily',
  'Twice daily',
  'Three times daily',
  'Four times daily',
  'Every 8 hours',
  'Every 12 hours',
  'As needed',
  'Weekly',
  'Monthly',
  'Other'
];

export const MedicationForm: React.FC<MedicationFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  medication
}) => {
  const [loading, setLoading] = useState(false);
  const isEditing = !!medication;

  const form = useForm<MedicationFormData>({
    defaultValues: {
      name: '',
      dosage: '',
      frequency: '',
      time_of_day: [{ time: '' }],
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      doctor_name: '',
      instructions: ''
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'time_of_day'
  });

  // Reset form when medication prop changes or modal opens/closes
  useEffect(() => {
    if (isOpen) {
      if (medication) {
        // Editing existing medication - populate form
        form.reset({
          name: medication.name || '',
          dosage: medication.dosage || '',
          frequency: medication.frequency || '',
          time_of_day: medication.time_of_day?.map(time => ({ time })) || [{ time: '' }],
          start_date: medication.start_date || new Date().toISOString().split('T')[0],
          end_date: medication.end_date || '',
          doctor_name: medication.doctor_name || '',
          instructions: medication.instructions || ''
        });
      } else {
        // Adding new medication - reset to defaults
        form.reset({
          name: '',
          dosage: '',
          frequency: '',
          time_of_day: [{ time: '' }],
          start_date: new Date().toISOString().split('T')[0],
          end_date: '',
          doctor_name: '',
          instructions: ''
        });
      }
    }
  }, [isOpen, medication, form]);

  const onSubmit = async (data: MedicationFormData) => {
    setLoading(true);

    try {
      // Validate that at least one time is provided
      const times = data.time_of_day.filter(t => t.time.trim() !== '').map(t => t.time);
      if (times.length === 0) {
        toast.error('Please specify at least one time of day');
        return;
      }

      // Validate end date is after start date
      if (data.end_date && data.end_date <= data.start_date) {
        toast.error('End date must be after start date');
        return;
      }

      const medicationData = {
        name: data.name.trim(),
        dosage: data.dosage.trim(),
        frequency: data.frequency,
        time_of_day: times,
        start_date: data.start_date,
        end_date: data.end_date || undefined,
        doctor_name: data.doctor_name.trim() || undefined,
        instructions: data.instructions.trim() || undefined,
        is_active: true
      };

      let result;
      if (isEditing && medication) {
        result = await updateMedication(medication.id, medicationData);
      } else {
        result = await addMedication(medicationData);
      }

      if (result.error) {
        throw new Error(result.error.message);
      }

      toast.success(`Medication ${isEditing ? 'updated' : 'added'} successfully!`);
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error saving medication:', error);
      toast.error(error.message || `Failed to ${isEditing ? 'update' : 'add'} medication`);
    } finally {
      setLoading(false);
    }
  };

  const addTimeSlot = () => {
    append({ time: '' });
  };

  const removeTimeSlot = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${isEditing ? 'Edit' : 'Add'} Medication`}
      size="lg"
    >
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Medication Name *"
            placeholder="Enter medication name"
            {...form.register('name', { required: 'Medication name is required' })}
            error={form.formState.errors.name?.message}
          />
          
          <Input
            label="Dosage *"
            placeholder="e.g., 500mg, 1 tablet"
            {...form.register('dosage', { required: 'Dosage is required' })}
            error={form.formState.errors.dosage?.message}
          />
        </div>

        {/* Frequency */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Frequency *
          </label>
          <select
            {...form.register('frequency', { required: 'Frequency is required' })}
            className="
              w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 
              focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500
              dark:border-gray-600 dark:bg-gray-800 dark:text-white
              dark:focus:border-primary-400 dark:focus:ring-primary-400
            "
          >
            <option value="">Select frequency</option>
            {frequencyOptions.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          {form.formState.errors.frequency && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {form.formState.errors.frequency.message}
            </p>
          )}
        </div>

        {/* Time of Day */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Time of Day *
            </label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addTimeSlot}
              className="text-xs"
            >
              <Plus size={14} className="mr-1" />
              Add Time
            </Button>
          </div>
          
          <div className="space-y-2">
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-center space-x-2">
                <div className="flex-1">
                  <Input
                    type="time"
                    placeholder="Select time"
                    icon={<Clock size={16} className="text-gray-400" />}
                    {...form.register(`time_of_day.${index}.time`, {
                      required: 'Time is required'
                    })}
                    error={form.formState.errors.time_of_day?.[index]?.time?.message}
                  />
                </div>
                {fields.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeTimeSlot(index)}
                    className="text-red-400 hover:text-red-300 p-2"
                  >
                    <X size={16} />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Start Date *"
            type="date"
            icon={<Calendar size={16} className="text-gray-400" />}
            {...form.register('start_date', { required: 'Start date is required' })}
            error={form.formState.errors.start_date?.message}
          />
          
          <Input
            label="End Date (Optional)"
            type="date"
            icon={<Calendar size={16} className="text-gray-400" />}
            {...form.register('end_date')}
            error={form.formState.errors.end_date?.message}
          />
        </div>

        {/* Doctor and Instructions */}
        <Input
          label="Prescribing Doctor"
          placeholder="Enter doctor's name"
          icon={<Stethoscope size={16} className="text-gray-400" />}
          {...form.register('doctor_name')}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Instructions
          </label>
          <textarea
            placeholder="Enter any special instructions (e.g., take with food, avoid alcohol)"
            {...form.register('instructions')}
            className="
              block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 
              focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500
              dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400
              dark:focus:border-primary-400 dark:focus:ring-primary-400
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
            {isEditing ? 'Update' : 'Add'} Medication
          </Button>
        </div>
      </form>
    </Modal>
  );
};