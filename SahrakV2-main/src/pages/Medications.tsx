import React, { useState, useEffect } from 'react';
import { Plus, Pill, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { TodaysSchedule } from '../components/medications/TodaysSchedule';
import { MedicationForm } from '../components/medications/MedicationForm';
import { MedicationList } from '../components/medications/MedicationList';
import { 
  getUserMedications,
  getActiveMedications,
  getPastMedications,
  getTodaysSchedule,
  getMedicationStats,
  Medication,
  MedicationSchedule
} from '../lib/medications';
import toast from 'react-hot-toast';

const Medications: React.FC = () => {
  const [allMedications, setAllMedications] = useState<Medication[]>([]);
  const [activeMedications, setActiveMedications] = useState<Medication[]>([]);
  const [pastMedications, setPastMedications] = useState<Medication[]>([]);
  const [todaysSchedule, setTodaysSchedule] = useState<MedicationSchedule[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    completed: 0,
    todaysTaken: 0,
    todaysTotal: 0
  });
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingMedication, setEditingMedication] = useState<Medication | null>(null);

  const loadData = async () => {
    try {
      const [
        allMedsResult,
        activeMedsResult,
        pastMedsResult,
        scheduleResult,
        statsResult
      ] = await Promise.all([
        getUserMedications(),
        getActiveMedications(),
        getPastMedications(),
        getTodaysSchedule(),
        getMedicationStats()
      ]);

      if (allMedsResult.error) throw allMedsResult.error;
      if (activeMedsResult.error) throw activeMedsResult.error;
      if (pastMedsResult.error) throw pastMedsResult.error;
      if (scheduleResult.error) throw scheduleResult.error;

      setAllMedications(allMedsResult.data || []);
      setActiveMedications(activeMedsResult.data || []);
      setPastMedications(pastMedsResult.data || []);
      setTodaysSchedule(scheduleResult.data || []);
      setStats(statsResult);

    } catch (error: any) {
      console.error('Error loading medications:', error);
      toast.error('Failed to load medications');
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
    setEditingMedication(null);
    loadData();
  };

  const handleEdit = (medication: Medication) => {
    setEditingMedication(medication);
    setShowForm(true);
  };

  const handleAddNew = () => {
    setEditingMedication(null);
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
          <p className="text-slate-400">Loading your medications...</p>
        </div>
      </div>
    );
  }

  const pendingCount = stats.todaysTotal - stats.todaysTaken;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="mb-4 sm:mb-0">
          <h1 className="text-3xl font-bold text-white mb-2">Medications</h1>
          <p className="text-slate-400">
            Manage your medications and track your daily schedule
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
            <span>Add Medication</span>
          </Button>
        </div>
      </div>

      {/* Today's Summary Card */}
      {stats.todaysTotal > 0 && (
        <Card className="p-4 bg-slate-800 border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Pill className="w-6 h-6 text-cyan-400" />
              <div>
                <h3 className="text-lg font-semibold text-white">Today's Schedule</h3>
                <p className="text-sm text-slate-400">
                  {stats.todaysTaken} of {stats.todaysTotal} medications taken
                </p>
              </div>
            </div>
            
            <div className="text-right">
              <p className="text-2xl font-bold text-white">{stats.todaysTotal}</p>
              <p className="text-sm text-slate-400">Scheduled</p>
              {pendingCount > 0 && (
                <p className="text-sm text-orange-400 font-medium">
                  {pendingCount} pending
                </p>
              )}
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">Progress</span>
              <span className="text-sm text-slate-400">
                {Math.round((stats.todaysTaken / stats.todaysTotal) * 100)}%
              </span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(stats.todaysTaken / stats.todaysTotal) * 100}%` }}
              />
            </div>
          </div>
        </Card>
      )}

      {/* Today's Schedule */}
      <TodaysSchedule
        schedule={todaysSchedule}
        loading={false}
        onRefresh={loadData}
      />

      {/* Active Medications */}
      <MedicationList
        medications={activeMedications}
        title="Active Medications"
        loading={false}
        onRefresh={loadData}
        onEdit={handleEdit}
        showActions={true}
      />

      {/* Past Medications */}
      {pastMedications.length > 0 && (
        <MedicationList
          medications={pastMedications}
          title="Past Medications"
          loading={false}
          onRefresh={loadData}
          onEdit={handleEdit}
          showActions={true}
        />
      )}

      {/* Medication Form Modal */}
      <MedicationForm
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingMedication(null);
        }}
        onSuccess={handleFormSuccess}
        medication={editingMedication}
      />
    </div>
  );
};

export default Medications;