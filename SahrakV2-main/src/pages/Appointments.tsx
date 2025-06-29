import React, { useState, useEffect } from 'react';
import { Plus, Calendar, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { AppointmentForm } from '../components/appointments/AppointmentForm';
import { AppointmentList } from '../components/appointments/AppointmentList';
import { 
  getUserAppointments,
  getUpcomingAppointments,
  getPastAppointments,
  getAppointmentStats,
  Appointment
} from '../lib/appointments';
import toast from 'react-hot-toast';

const Appointments: React.FC = () => {
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [pastAppointments, setPastAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    upcoming: 0,
    completed: 0,
    cancelled: 0,
    past: 0
  });
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);

  const loadData = async () => {
    try {
      const [
        allApptsResult,
        upcomingApptsResult,
        pastApptsResult,
        statsResult
      ] = await Promise.all([
        getUserAppointments(),
        getUpcomingAppointments(),
        getPastAppointments(),
        getAppointmentStats()
      ]);

      if (allApptsResult.error) throw allApptsResult.error;
      if (upcomingApptsResult.error) throw upcomingApptsResult.error;
      if (pastApptsResult.error) throw pastApptsResult.error;

      setAllAppointments(allApptsResult.data || []);
      setUpcomingAppointments(upcomingApptsResult.data || []);
      setPastAppointments(pastApptsResult.data || []);
      setStats(statsResult);

    } catch (error: any) {
      console.error('Error loading appointments:', error);
      toast.error('Failed to load appointments');
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
    setEditingAppointment(null);
    loadData();
  };

  const handleEdit = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setShowForm(true);
  };

  const handleAddNew = () => {
    setEditingAppointment(null);
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
          <p className="text-slate-400">Loading your appointments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="mb-4 sm:mb-0">
          <h1 className="text-3xl font-bold text-white mb-2">Appointments</h1>
          <p className="text-slate-400">
            Schedule and manage your medical appointments, tests, and follow-ups
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
            <span>Schedule Appointment</span>
          </Button>
        </div>
      </div>

      {/* Upcoming Appointments */}
      <AppointmentList
        appointments={upcomingAppointments}
        title="Upcoming Appointments"
        loading={false}
        onRefresh={loadData}
        onEdit={handleEdit}
        showActions={true}
      />

      {/* Past Appointments */}
      {pastAppointments.length > 0 && (
        <AppointmentList
          appointments={pastAppointments}
          title="Past Appointments"
          loading={false}
          onRefresh={loadData}
          onEdit={handleEdit}
          showActions={true}
        />
      )}

      {/* Appointment Form Modal */}
      <AppointmentForm
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingAppointment(null);
        }}
        onSuccess={handleFormSuccess}
        appointment={editingAppointment}
      />
    </div>
  );
};

export default Appointments;