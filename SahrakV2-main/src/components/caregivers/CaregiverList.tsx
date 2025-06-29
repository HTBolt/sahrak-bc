import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Edit3, 
  Trash2, 
  Shield, 
  ShieldCheck,
  Search,
  Stethoscope,
  Heart,
  Users
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { 
  CaregiverAccess, 
  deleteCaregiverAccess, 
  revokeCaregiverAccess,
  getCaregiverTypeLabel,
  getAccessLevelLabel,
  getAccessLevelColor,
  getStatusColor
} from '../../lib/caregivers';
import toast from 'react-hot-toast';

interface CaregiverListProps {
  caregivers: CaregiverAccess[];
  loading: boolean;
  onRefresh: () => void;
  onEdit: (caregiver: CaregiverAccess) => void;
}

export const CaregiverList: React.FC<CaregiverListProps> = ({
  caregivers,
  loading,
  onRefresh,
  onEdit
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'doctor' | 'nurse' | 'family'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'revoked'>('all');
  const [selectedCaregiver, setSelectedCaregiver] = useState<CaregiverAccess | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Filter caregivers based on search and filters
  const filteredCaregivers = caregivers.filter(caregiver => {
    const matchesSearch = 
      caregiver.caregiver?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      caregiver.caregiver?.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      caregiver.relationship_type.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || caregiver.caregiver?.caregiver_type === filterType;
    const matchesStatus = filterStatus === 'all' || caregiver.status === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleDelete = async () => {
    if (!selectedCaregiver) return;

    setActionLoading('delete');
    
    try {
      const { error } = await deleteCaregiverAccess(selectedCaregiver.id);
      if (error) throw error;
      
      toast.success('Caregiver removed successfully');
      onRefresh();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error('Failed to remove caregiver');
    } finally {
      setActionLoading(null);
      setShowDeleteModal(false);
      setSelectedCaregiver(null);
    }
  };

  const handleRevoke = async () => {
    if (!selectedCaregiver) return;

    setActionLoading('revoke');
    
    try {
      const { error } = await revokeCaregiverAccess(selectedCaregiver.id);
      if (error) throw error;
      
      toast.success('Caregiver access revoked');
      onRefresh();
    } catch (error: any) {
      console.error('Revoke error:', error);
      toast.error('Failed to revoke access');
    } finally {
      setActionLoading(null);
      setShowRevokeModal(false);
      setSelectedCaregiver(null);
    }
  };

  const getCaregiverIcon = (type: string) => {
    switch (type) {
      case 'doctor': return <Stethoscope className="w-5 h-5 text-blue-500" />;
      case 'nurse': return <Heart className="w-5 h-5 text-green-500" />;
      case 'family': return <Users className="w-5 h-5 text-orange-500" />;
      default: return <User className="w-5 h-5 text-gray-500" />;
    }
  };

  const getAccessSummary = (caregiver: CaregiverAccess) => {
    const accessLevels = [
      caregiver.documents_access,
      caregiver.medications_access,
      caregiver.appointments_access,
      caregiver.mood_tracker_access,
      caregiver.progress_tracker_access,
      caregiver.emergency_info_access
    ];

    const fullAccess = accessLevels.filter(level => level === 'full').length;
    const viewAccess = accessLevels.filter(level => level === 'view').length;
    const noAccess = accessLevels.filter(level => level === 'none').length;

    if (fullAccess > 0) {
      return { level: 'full', count: fullAccess, total: 6 };
    } else if (viewAccess > 0) {
      return { level: 'view', count: viewAccess, total: 6 };
    } else {
      return { level: 'none', count: noAccess, total: 6 };
    }
  };

  if (loading) {
    return (
      <Card className="p-6 bg-slate-800 border-slate-700">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
          <span className="ml-3 text-slate-400">Loading caregivers...</span>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-6 bg-slate-800 border-slate-700">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <h2 className="text-xl font-semibold text-white mb-3 sm:mb-0">
            My Caregivers ({caregivers.length})
          </h2>
          
          {caregivers.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search caregivers..."
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
                <option value="doctor">Doctors</option>
                <option value="nurse">Nurses</option>
                <option value="family">Family</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="revoked">Revoked</option>
              </select>
            </div>
          )}
        </div>

        {filteredCaregivers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-300 mb-2">
              {caregivers.length === 0 
                ? 'No caregivers added yet'
                : 'No caregivers match your search'
              }
            </h3>
            <p className="text-slate-500">
              {caregivers.length === 0 
                ? 'Add your first caregiver to start sharing your health information'
                : 'Try adjusting your search terms or filters'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredCaregivers.map((caregiverAccess) => {
              const caregiver = caregiverAccess.caregiver;
              if (!caregiver) return null;

              const statusColor = getStatusColor(caregiverAccess.status);
              const accessSummary = getAccessSummary(caregiverAccess);
              const isProcessing = actionLoading === caregiverAccess.id;

              return (
                <div
                  key={caregiverAccess.id}
                  className="flex flex-col lg:flex-row lg:items-center justify-between p-4 bg-slate-700/50 rounded-lg hover:bg-slate-700/70 transition-colors"
                >
                  <div className="flex items-start space-x-4 flex-1">
                    {getCaregiverIcon(caregiver.caregiver_type)}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-white text-lg">
                            {caregiver.name}
                          </h3>
                          <p className="text-slate-400 text-sm">
                            {getCaregiverTypeLabel(caregiver.caregiver_type)} • {caregiverAccess.relationship_type}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2 mt-1 sm:mt-0">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${statusColor}`}>
                            <span className="ml-1 capitalize">{caregiverAccess.status}</span>
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm text-slate-400 mb-2">
                        <div className="flex items-center space-x-1">
                          <Mail className="w-4 h-4" />
                          <span className="truncate">{caregiver.email}</span>
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          <Phone className="w-4 h-4" />
                          <span>{caregiver.phone}</span>
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          <MapPin className="w-4 h-4" />
                          <span className="truncate">{caregiver.address}</span>
                        </div>
                      </div>

                      {/* Access Summary */}
                      <div className="flex items-center space-x-2 text-sm">
                        <ShieldCheck className="w-4 h-4 text-cyan-400" />
                        <span className="text-slate-300">
                          Access: {accessSummary.count} of {accessSummary.total} modules
                        </span>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getAccessLevelColor(accessSummary.level)}`}>
                          {getAccessLevelLabel(accessSummary.level)}
                        </span>
                      </div>
                      
                      <p className="text-slate-500 text-xs mt-1">
                        Added {format(parseISO(caregiverAccess.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 mt-4 lg:mt-0 lg:ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(caregiverAccess)}
                      className="text-cyan-400 hover:text-cyan-300"
                      title="Edit access permissions"
                    >
                      <Edit3 size={16} />
                    </Button>
                    
                    {caregiverAccess.status === 'active' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedCaregiver(caregiverAccess);
                          setShowRevokeModal(true);
                        }}
                        className="text-orange-400 hover:text-orange-300"
                        title="Revoke access"
                      >
                        <Shield size={16} />
                      </Button>
                    )}
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedCaregiver(caregiverAccess);
                        setShowDeleteModal(true);
                      }}
                      className="text-red-400 hover:text-red-300"
                      title="Remove caregiver"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
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
        title="Remove Caregiver"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300">
            Are you sure you want to remove "{selectedCaregiver?.caregiver?.name}" as your caregiver? 
            This will permanently delete their access to your health information and cannot be undone.
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
              Remove Caregiver
            </Button>
          </div>
        </div>
      </Modal>

      {/* Revoke Access Modal */}
      <Modal
        isOpen={showRevokeModal}
        onClose={() => setShowRevokeModal(false)}
        title="Revoke Access"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300">
            Are you sure you want to revoke access for "{selectedCaregiver?.caregiver?.name}"? 
            They will no longer be able to view or modify your health information. You can restore access later if needed.
          </p>
          
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => setShowRevokeModal(false)}
              disabled={actionLoading === 'revoke'}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleRevoke}
              loading={actionLoading === 'revoke'}
            >
              Revoke Access
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};