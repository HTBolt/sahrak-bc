import React, { useState } from 'react';
import { format, parseISO, isAfter, isBefore } from 'date-fns';
import { 
  Pill, 
  Clock, 
  Stethoscope, 
  Calendar, 
  Edit3, 
  Trash2, 
  CheckCircle, 
  RotateCcw,
  AlertTriangle,
  Search,
  Filter
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { 
  Medication, 
  deleteMedication, 
  completeMedication, 
  reactivateMedication,
  formatTime 
} from '../../lib/medications';
import toast from 'react-hot-toast';

interface MedicationListProps {
  medications: Medication[];
  title: string;
  loading: boolean;
  onRefresh: () => void;
  onEdit: (medication: Medication) => void;
  showActions?: boolean;
}

export const MedicationList: React.FC<MedicationListProps> = ({
  medications,
  title,
  loading,
  onRefresh,
  onEdit,
  showActions = true
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMedication, setSelectedMedication] = useState<Medication | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Filter medications based on search
  const filteredMedications = medications.filter(med =>
    med.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    med.doctor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    med.dosage.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async () => {
    if (!selectedMedication) return;

    setActionLoading('delete');
    
    try {
      const { error } = await deleteMedication(selectedMedication.id);
      if (error) throw error;
      
      toast.success('Medication deleted successfully');
      onRefresh();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error('Failed to delete medication');
    } finally {
      setActionLoading(null);
      setShowDeleteModal(false);
      setSelectedMedication(null);
    }
  };

  const handleComplete = async (medication: Medication) => {
    setActionLoading(medication.id);
    
    try {
      const { error } = await completeMedication(medication.id);
      if (error) throw error;
      
      toast.success('Medication marked as completed');
      onRefresh();
    } catch (error: any) {
      console.error('Complete error:', error);
      toast.error('Failed to complete medication');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReactivate = async (medication: Medication) => {
    setActionLoading(medication.id);
    
    try {
      const { error } = await reactivateMedication(medication.id);
      if (error) throw error;
      
      toast.success('Medication reactivated');
      onRefresh();
    } catch (error: any) {
      console.error('Reactivate error:', error);
      toast.error('Failed to reactivate medication');
    } finally {
      setActionLoading(null);
    }
  };

  const getMedicationStatus = (medication: Medication) => {
    if (!medication.is_active) return 'completed';
    
    const today = new Date().toISOString().split('T')[0];
    const startDate = medication.start_date;
    const endDate = medication.end_date;
    
    if (isBefore(new Date(today), new Date(startDate))) return 'upcoming';
    if (endDate && isAfter(new Date(today), new Date(endDate))) return 'expired';
    
    return 'active';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-400 bg-green-900/20 border-green-800';
      case 'upcoming': return 'text-blue-400 bg-blue-900/20 border-blue-800';
      case 'expired': return 'text-red-400 bg-red-900/20 border-red-800';
      case 'completed': return 'text-slate-400 bg-slate-900/20 border-slate-800';
      default: return 'text-slate-400 bg-slate-900/20 border-slate-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Active';
      case 'upcoming': return 'Upcoming';
      case 'expired': return 'Expired';
      case 'completed': return 'Completed';
      default: return 'Unknown';
    }
  };

  if (loading) {
    return (
      <Card className="p-6 bg-slate-800 border-slate-700">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
          <span className="ml-3 text-slate-400">Loading medications...</span>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-6 bg-slate-800 border-slate-700">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <h2 className="text-xl font-semibold text-white mb-3 sm:mb-0">
            {title} ({medications.length})
          </h2>
          
          {medications.length > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search medications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent w-full sm:w-64"
              />
            </div>
          )}
        </div>

        {filteredMedications.length === 0 ? (
          <div className="text-center py-12">
            <Pill className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-300 mb-2">
              {medications.length === 0 
                ? `No ${title.toLowerCase()} found`
                : 'No medications match your search'
              }
            </h3>
            <p className="text-slate-500">
              {medications.length === 0 
                ? `${title} will appear here once you add them`
                : 'Try adjusting your search terms'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredMedications.map((medication) => {
              const status = getMedicationStatus(medication);
              const statusColor = getStatusColor(status);
              const statusText = getStatusText(status);
              const isProcessing = actionLoading === medication.id;

              return (
                <div
                  key={medication.id}
                  className="flex flex-col lg:flex-row lg:items-center justify-between p-4 bg-slate-700/50 rounded-lg hover:bg-slate-700/70 transition-colors"
                >
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="p-2 bg-cyan-600 rounded-lg">
                      <Pill className="w-5 h-5 text-white" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-2">
                        <h3 className="font-semibold text-white text-lg">
                          {medication.name}
                        </h3>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${statusColor} mt-1 sm:mt-0`}>
                          {statusText}
                        </span>
                      </div>
                      
                      <p className="text-slate-300 mb-2">{medication.dosage} • {medication.frequency}</p>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-sm text-slate-400">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>
                            {medication.time_of_day.map(time => formatTime(time)).join(', ')}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {format(parseISO(medication.start_date), 'MMM d, yyyy')}
                            {medication.end_date && ` - ${format(parseISO(medication.end_date), 'MMM d, yyyy')}`}
                          </span>
                        </div>
                        
                        {medication.doctor_name && (
                          <div className="flex items-center space-x-1">
                            <Stethoscope className="w-4 h-4 text-cyan-400" />
                            <span>Dr. {medication.doctor_name}</span>
                          </div>
                        )}
                      </div>
                      
                      {medication.instructions && (
                        <p className="text-slate-500 text-sm mt-2 italic">
                          {medication.instructions}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {showActions && (
                    <div className="flex items-center space-x-2 mt-4 lg:mt-0 lg:ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(medication)}
                        className="text-cyan-400 hover:text-cyan-300"
                        title="Edit medication"
                      >
                        <Edit3 size={16} />
                      </Button>
                      
                      {medication.is_active ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleComplete(medication)}
                          loading={isProcessing}
                          className="text-orange-400 hover:text-orange-300"
                          title="Mark as completed"
                        >
                          <CheckCircle size={16} />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReactivate(medication)}
                          loading={isProcessing}
                          className="text-green-400 hover:text-green-300"
                          title="Reactivate medication"
                        >
                          <RotateCcw size={16} />
                        </Button>
                      )}
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedMedication(medication);
                          setShowDeleteModal(true);
                        }}
                        className="text-red-400 hover:text-red-300"
                        title="Delete medication"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Medication"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300">
            Are you sure you want to delete "{selectedMedication?.name}"? This action cannot be undone and will remove all associated intake records.
          </p>
          
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
              disabled={actionLoading === 'delete'}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              loading={actionLoading === 'delete'}
            >
              Delete Medication
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};