import React, { useState, useEffect } from 'react';
import { format, parseISO, isToday, isTomorrow, isPast } from 'date-fns';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Phone, 
  Stethoscope, 
  Building2, 
  TestTube, 
  ArrowRight,
  Edit3, 
  Trash2, 
  CheckCircle, 
  X,
  ExternalLink,
  Search,
  Filter,
  FileText,
  RotateCcw,
  Repeat,
  Download,
  Plus
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { 
  Appointment, 
  deleteAppointment, 
  completeAppointment, 
  cancelAppointment,
  reactivateAppointment,
  formatAppointmentTime,
  openInMaps,
  getAppointmentDocuments
} from '../../lib/appointments';
import { getDocumentUrl } from '../../lib/documents';
import toast from 'react-hot-toast';

interface AppointmentListProps {
  appointments: Appointment[];
  title: string;
  loading: boolean;
  onRefresh: () => void;
  onEdit: (appointment: Appointment) => void;
  showActions?: boolean;
}

export const AppointmentList: React.FC<AppointmentListProps> = ({
  appointments,
  title,
  loading,
  onRefresh,
  onEdit,
  showActions = true
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'consultation' | 'test' | 'followup'>('all');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [appointmentDocuments, setAppointmentDocuments] = useState<{[key: string]: any[]}>({});

  // Load documents for appointments that have them
  useEffect(() => {
    const loadDocuments = async () => {
      const documentsMap: {[key: string]: any[]} = {};
      
      for (const appointment of appointments) {
        if (appointment.appointment_type === 'followup') {
          try {
            const { data } = await getAppointmentDocuments(appointment.id);
            if (data && data.length > 0) {
              documentsMap[appointment.id] = data;
            }
          } catch (error) {
            console.error('Error loading documents for appointment:', error);
          }
        }
      }
      
      setAppointmentDocuments(documentsMap);
    };

    if (appointments.length > 0) {
      loadDocuments();
    }
  }, [appointments]);

  // Filter appointments based on search and type
  const filteredAppointments = appointments.filter(appointment => {
    const matchesSearch = 
      appointment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.doctor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.lab_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.location_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || appointment.appointment_type === filterType;
    
    return matchesSearch && matchesType;
  });

  const handleDelete = async () => {
    if (!selectedAppointment) return;

    setActionLoading('delete');
    
    try {
      const { error } = await deleteAppointment(selectedAppointment.id);
      if (error) throw error;
      
      toast.success('Appointment deleted successfully');
      onRefresh();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error('Failed to delete appointment');
    } finally {
      setActionLoading(null);
      setShowDeleteModal(false);
      setSelectedAppointment(null);
    }
  };

  const handleComplete = async (appointment: Appointment) => {
    setActionLoading(appointment.id);
    
    try {
      const { error } = await completeAppointment(appointment.id);
      if (error) throw error;
      
      toast.success('Appointment marked as completed');
      onRefresh();
    } catch (error: any) {
      console.error('Complete error:', error);
      toast.error('Failed to complete appointment');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReactivate = async (appointment: Appointment) => {
    setActionLoading(appointment.id);
    
    try {
      const { error } = await reactivateAppointment(appointment.id);
      if (error) throw error;
      
      toast.success('Appointment reactivated');
      onRefresh();
    } catch (error: any) {
      console.error('Reactivate error:', error);
      toast.error('Failed to reactivate appointment');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (appointment: Appointment) => {
    setActionLoading(appointment.id);
    
    try {
      const { error } = await cancelAppointment(appointment.id);
      if (error) throw error;
      
      toast.success('Appointment cancelled');
      onRefresh();
    } catch (error: any) {
      console.error('Cancel error:', error);
      toast.error('Failed to cancel appointment');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDocumentView = async (document: any) => {
    try {
      const { data: url, error } = await getDocumentUrl(document.file_path);
      
      if (error) {
        throw new Error(error.message);
      }
      
      if (url) {
        window.open(url, '_blank');
      }
    } catch (error: any) {
      console.error('View error:', error);
      toast.error('Failed to open document');
    }
  };

  const generateCalendarLink = (appointment: Appointment) => {
    const startDate = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour duration
    
    const formatDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const title = encodeURIComponent(appointment.title);
    const details = encodeURIComponent([
      appointment.doctor_name && `Doctor: ${appointment.doctor_name}`,
      appointment.location_name && `Location: ${appointment.location_name}`,
      appointment.location_address && `Address: ${appointment.location_address}`,
      appointment.notes && `Notes: ${appointment.notes}`
    ].filter(Boolean).join('\n'));

    const location = encodeURIComponent(appointment.location_address || appointment.location_name || '');

    // Google Calendar
    const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${formatDate(startDate)}/${formatDate(endDate)}&details=${details}&location=${location}`;
    
    return googleUrl;
  };

  const getAppointmentIcon = (type: string) => {
    switch (type) {
      case 'consultation': return <Stethoscope className="w-5 h-5 text-blue-500" />;
      case 'test': return <TestTube className="w-5 h-5 text-green-500" />;
      case 'followup': return <ArrowRight className="w-5 h-5 text-orange-500" />;
      default: return <Calendar className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'text-blue-400 bg-blue-900/20 border-blue-800';
      case 'completed': return 'text-green-400 bg-green-900/20 border-green-800';
      case 'cancelled': return 'text-red-400 bg-red-900/20 border-red-800';
      case 'rescheduled': return 'text-orange-400 bg-orange-900/20 border-orange-800';
      default: return 'text-slate-400 bg-slate-900/20 border-slate-800';
    }
  };

  const formatAppointmentDate = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'MMM d, yyyy');
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'consultation': return 'Consultation';
      case 'test': return 'Test';
      case 'followup': return 'Follow-up';
      default: return type;
    }
  };

  const canEdit = (appointment: Appointment) => {
    const appointmentDate = parseISO(appointment.appointment_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day
    appointmentDate.setHours(0, 0, 0, 0); // Reset time to start of day
    
    // Can edit if appointment date is today or in the future
    return appointmentDate >= today;
  };

  const canReactivate = (appointment: Appointment) => {
    const appointmentDate = parseISO(appointment.appointment_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    appointmentDate.setHours(0, 0, 0, 0);
    
    return appointment.status === 'completed' && appointmentDate >= today;
  };

  if (loading) {
    return (
      <Card className="p-6 bg-slate-800 border-slate-700">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
          <span className="ml-3 text-slate-400">Loading appointments...</span>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-6 bg-slate-800 border-slate-700">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <h2 className="text-xl font-semibold text-white mb-3 sm:mb-0">
            {title} ({appointments.length})
          </h2>
          
          {appointments.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search appointments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent w-full sm:w-64"
                />
              </div>
              
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              >
                <option value="all">All Types</option>
                <option value="consultation">Consultations</option>
                <option value="test">Tests</option>
                <option value="followup">Follow-ups</option>
              </select>
            </div>
          )}
        </div>

        {filteredAppointments.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-300 mb-2">
              {appointments.length === 0 
                ? `No ${title.toLowerCase()} found`
                : 'No appointments match your search'
              }
            </h3>
            <p className="text-slate-500">
              {appointments.length === 0 
                ? `${title} will appear here once you schedule them`
                : 'Try adjusting your search terms or filters'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAppointments.map((appointment) => {
              const statusColor = getStatusColor(appointment.status);
              const isProcessing = actionLoading === appointment.id;
              const linkedDocs = appointmentDocuments[appointment.id] || [];

              return (
                <div
                  key={appointment.id}
                  className="flex flex-col lg:flex-row lg:items-center justify-between p-4 bg-slate-700/50 rounded-lg hover:bg-slate-700/70 transition-colors"
                >
                  <div className="flex items-start space-x-4 flex-1">
                    {getAppointmentIcon(appointment.appointment_type)}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-2">
                        <h3 className="font-semibold text-white text-lg">
                          {appointment.title}
                        </h3>
                        <div className="flex items-center space-x-2 mt-1 sm:mt-0">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${statusColor}`}>
                            {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                          </span>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-600 text-slate-300">
                            {getTypeLabel(appointment.appointment_type)}
                          </span>
                          {appointment.is_recurring && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-900/20 text-purple-400 border border-purple-800">
                              <Repeat className="w-3 h-3 mr-1" />
                              Recurring
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm text-slate-400 mb-2">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>{formatAppointmentDate(appointment.appointment_date)}</span>
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>{formatAppointmentTime(appointment.appointment_time)}</span>
                        </div>
                        
                        {(appointment.doctor_name || appointment.lab_name) && (
                          <div className="flex items-center space-x-1">
                            <Stethoscope className="w-4 h-4 text-cyan-400" />
                            <span>
                              {appointment.doctor_name || appointment.lab_name}
                              {appointment.doctor_specialization && ` (${appointment.doctor_specialization})`}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {appointment.location_name && (
                        <div className="flex items-center space-x-1 text-sm text-slate-400 mb-1">
                          <Building2 className="w-4 h-4" />
                          <span>{appointment.location_name}</span>
                        </div>
                      )}

                      {appointment.location_address && (
                        <div className="flex items-center space-x-1 text-sm text-slate-400 mb-1">
                          <MapPin className="w-4 h-4" />
                          <button
                            onClick={() => openInMaps(appointment.location_address!)}
                            className="text-cyan-400 hover:text-cyan-300 underline flex items-center space-x-1"
                          >
                            <span>{appointment.location_address}</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                      
                      {appointment.location_phone && (
                        <div className="flex items-center space-x-1 text-sm text-slate-400 mb-1">
                          <Phone className="w-4 h-4" />
                          <a 
                            href={`tel:${appointment.location_phone}`}
                            className="text-cyan-400 hover:text-cyan-300"
                          >
                            {appointment.location_phone}
                          </a>
                        </div>
                      )}

                      {/* Linked Documents */}
                      {linkedDocs.length > 0 && (
                        <div className="flex items-center space-x-2 text-sm text-slate-400 mb-1">
                          <FileText className="w-4 h-4" />
                          <span>Linked documents:</span>
                          <div className="flex flex-wrap gap-1">
                            {linkedDocs.map((doc, index) => (
                              <button
                                key={doc.id}
                                onClick={() => handleDocumentView(doc)}
                                className="text-cyan-400 hover:text-cyan-300 underline text-xs"
                              >
                                {doc.document_name}
                                {index < linkedDocs.length - 1 && ','}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {appointment.notes && (
                        <p className="text-slate-500 text-sm mt-2 italic">
                          {appointment.notes}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {showActions && (
                    <div className="flex items-center space-x-2 mt-4 lg:mt-0 lg:ml-4">
                      {/* Add to Calendar */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(generateCalendarLink(appointment), '_blank')}
                        className="text-purple-400 hover:text-purple-300"
                        title="Add to calendar"
                      >
                        <Plus size={16} />
                      </Button>

                      {/* Edit (only if not past date) */}
                      {canEdit(appointment) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(appointment)}
                          className="text-cyan-400 hover:text-cyan-300"
                          title="Edit appointment"
                        >
                          <Edit3 size={16} />
                        </Button>
                      )}
                      
                      {appointment.status === 'scheduled' && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleComplete(appointment)}
                            loading={isProcessing}
                            className="text-green-400 hover:text-green-300"
                            title="Mark as completed"
                          >
                            <CheckCircle size={16} />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancel(appointment)}
                            loading={isProcessing}
                            className="text-orange-400 hover:text-orange-300"
                            title="Cancel appointment"
                          >
                            <X size={16} />
                          </Button>
                        </>
                      )}

                      {/* Reactivate (only if completed and not past date) */}
                      {canReactivate(appointment) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReactivate(appointment)}
                          loading={isProcessing}
                          className="text-blue-400 hover:text-blue-300"
                          title="Reactivate appointment"
                        >
                          <RotateCcw size={16} />
                        </Button>
                      )}
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedAppointment(appointment);
                          setShowDeleteModal(true);
                        }}
                        className="text-red-400 hover:text-red-300"
                        title="Delete appointment"
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
        title="Delete Appointment"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300">
            Are you sure you want to delete "{selectedAppointment?.title}"? This action cannot be undone.
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
              Delete Appointment
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};