import React, { useState, useEffect } from 'react';
import { Plus, Users, RefreshCw, Stethoscope, Heart, UserCheck } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { CaregiverForm } from '../components/caregivers/CaregiverForm';
import { CaregiverList } from '../components/caregivers/CaregiverList';
import { 
  getUserCaregivers,
  getCaregiverStats,
  CaregiverAccess
} from '../lib/caregivers';
import toast from 'react-hot-toast';

const Caregivers: React.FC = () => {
  const [caregivers, setCaregivers] = useState<CaregiverAccess[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    doctors: 0,
    nurses: 0,
    family: 0
  });
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingCaregiver, setEditingCaregiver] = useState<CaregiverAccess | null>(null);

  const loadData = async () => {
    try {
      const [caregiversResult, statsResult] = await Promise.all([
        getUserCaregivers(),
        getCaregiverStats()
      ]);

      if (caregiversResult.error) throw caregiversResult.error;

      setCaregivers(caregiversResult.data || []);
      setStats(statsResult);

    } catch (error: any) {
      console.error('Error loading caregivers:', error);
      toast.error('Failed to load caregivers');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingCaregiver(null);
    loadData();
  };

  const handleEdit = (caregiver: CaregiverAccess) => {
    setEditingCaregiver(caregiver);
    setShowForm(true);
  };

  const handleAddNew = () => {
    setEditingCaregiver(null);
    setShowForm(true);
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading your caregivers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="mb-4 sm:mb-0">
          <h1 className="text-3xl font-bold text-white mb-2">Caregivers</h1>
          <p className="text-slate-400">
            Manage who can access your health information and what they can see or modify
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            onClick={handleRefresh}
            disabled={refreshing}
            className="text-slate-400 hover:text-slate-300"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </Button>
          
          <Button
            onClick={handleAddNew}
            className="inline-flex items-center space-x-2"
          >
            <Plus size={16} />
            <span>Add Caregiver</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats.total > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 bg-slate-800 border-slate-700">
            <div className="flex items-center space-x-3">
              <Users className="w-8 h-8 text-cyan-400" />
              <div>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
                <p className="text-sm text-slate-400">Total Caregivers</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 bg-slate-800 border-slate-700">
            <div className="flex items-center space-x-3">
              <UserCheck className="w-8 h-8 text-green-400" />
              <div>
                <p className="text-2xl font-bold text-white">{stats.active}</p>
                <p className="text-sm text-slate-400">Active Access</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 bg-slate-800 border-slate-700">
            <div className="flex items-center space-x-3">
              <Stethoscope className="w-8 h-8 text-blue-400" />
              <div>
                <p className="text-2xl font-bold text-white">{stats.doctors}</p>
                <p className="text-sm text-slate-400">Doctors</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 bg-slate-800 border-slate-700">
            <div className="flex items-center space-x-3">
              <Heart className="w-8 h-8 text-orange-400" />
              <div>
                <p className="text-2xl font-bold text-white">{stats.family}</p>
                <p className="text-sm text-slate-400">Family Members</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Information Card */}
      {stats.total === 0 && (
        <Card className="p-6 bg-gradient-to-r from-blue-900/20 to-cyan-900/20 border-blue-800/50">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-blue-600 rounded-lg">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white mb-2">
                Share Your Health Information Securely
              </h3>
              <p className="text-blue-100 mb-4">
                Add caregivers like doctors, nurses, or family members to give them controlled access to your health data. 
                You can specify exactly what information they can see and whether they can make updates on your behalf.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <Stethoscope className="w-4 h-4 text-blue-400" />
                  <span className="text-blue-200">Healthcare Providers</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Heart className="w-4 h-4 text-blue-400" />
                  <span className="text-blue-200">Nurses & Caregivers</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-blue-400" />
                  <span className="text-blue-200">Family Members</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Caregivers List */}
      <CaregiverList
        caregivers={caregivers}
        loading={false}
        onRefresh={loadData}
        onEdit={handleEdit}
      />

      {/* Caregiver Form Modal */}
      <CaregiverForm
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingCaregiver(null);
        }}
        onSuccess={handleFormSuccess}
        caregiverAccess={editingCaregiver}
      />
    </div>
  );
};

export default Caregivers;