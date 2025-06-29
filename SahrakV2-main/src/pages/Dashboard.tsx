import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { 
  Heart, 
  Brain, 
  Calendar, 
  Pill, 
  AlertTriangle, 
  TrendingUp,
  Activity,
  Clock,
  Plus,
  ArrowRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useUserData } from '../hooks/useUserData';
import { Button } from '../components/ui/Button';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { formatTime } from '../lib/medications';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { 
    profile, 
    todaysSchedule, 
    upcomingAppointments, 
    wellnessScores, 
    loading, 
    error 
  } = useUserData();

  const quickActions = [
    { 
      icon: AlertTriangle, 
      label: 'SOS', 
      subtitle: 'Emergency help', 
      color: 'bg-primary-600',
      path: '/sos'
    },
    { 
      icon: Pill, 
      label: 'Medications', 
      subtitle: 'View reminders', 
      color: 'bg-secondary-600',
      path: '/medications'
    },
    { 
      icon: Calendar, 
      label: 'Appointments', 
      subtitle: 'Schedule visit', 
      color: 'bg-primary-700',
      path: '/appointments'
    },
    { 
      icon: TrendingUp, 
      label: 'Progress', 
      subtitle: 'Track health', 
      color: 'bg-secondary-700',
      path: '/progress'
    },
  ];

  const formatAppointmentDate = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'MMM d');
  };

  const getTimeStatus = (time: string) => {
    const now = new Date();
    const [hours, minutes] = time.split(':').map(Number);
    const scheduleTime = new Date();
    scheduleTime.setHours(hours, minutes, 0, 0);
    
    const diffMinutes = (now.getTime() - scheduleTime.getTime()) / (1000 * 60);
    
    if (diffMinutes < -30) return 'upcoming';
    if (diffMinutes <= 30) return 'current';
    return 'overdue';
  };

  const getStatusColor = (item: any) => {
    const status = getTimeStatus(item.time);
    switch (status) {
      case 'upcoming': return 'text-blue-400 bg-blue-900/20 border-blue-800';
      case 'current': return 'text-orange-400 bg-orange-900/20 border-orange-800';
      case 'overdue': return 'text-red-400 bg-red-900/20 border-red-800';
      default: return 'text-slate-400 bg-slate-900/20 border-slate-800';
    }
  };

  const getStatusText = (item: any) => {
    const status = getTimeStatus(item.time);
    switch (status) {
      case 'upcoming': return 'Upcoming';
      case 'current': return 'Due Now';
      case 'overdue': return 'Overdue';
      default: return 'Pending';
    }
  };

  const getAppointmentTypeLabel = (type: string) => {
    switch (type) {
      case 'consultation': return 'Consultation';
      case 'test': return 'Medical Test';
      case 'followup': return 'Follow-up';
      default: return type;
    }
  };

  const getWellnessStatus = (score: number) => {
    if (score >= 85) return { label: 'Excellent', color: 'text-green-400', bgColor: 'bg-green-900/20' };
    if (score >= 70) return { label: 'Good', color: 'text-orange-400', bgColor: 'bg-orange-900/20' };
    if (score >= 50) return { label: 'Fair', color: 'text-yellow-400', bgColor: 'bg-yellow-900/20' };
    return { label: 'Needs Attention', color: 'text-red-400', bgColor: 'bg-red-900/20' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading your health data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-400 mb-4">Error loading dashboard: {error}</p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const physicalStatus = getWellnessStatus(wellnessScores.physical);
  const mentalStatus = getWellnessStatus(wellnessScores.mental);

  // Filter to only pending medications and sort by time (earliest first)
  const pendingMedications = todaysSchedule
    .filter(item => !item.taken)
    .sort((a, b) => a.time.localeCompare(b.time));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Health Dashboard</h1>
          <p className="text-slate-400">
            Welcome back, {profile?.first_name || 'User'}! Last updated: {format(new Date(), 'MMM d, yyyy')}
          </p>
        </div>
      </div>

      {/* Wellness Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-6 bg-slate-800 border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Physical Wellness</h3>
                <p className="text-slate-400 text-sm">Based on vitals, activity, and health data</p>
              </div>
              <Activity className="h-8 w-8 text-primary-500" />
            </div>
            <div className="flex items-end space-x-2 mb-4">
              <span className={`text-4xl font-bold ${physicalStatus.color}`}>
                {wellnessScores.physical}
              </span>
              <span className="text-slate-400 text-lg mb-1">/100</span>
            </div>
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${physicalStatus.bgColor} ${physicalStatus.color}`}>
              {physicalStatus.label}
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-6 bg-slate-800 border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Mental Wellness</h3>
                <p className="text-slate-400 text-sm">Based on mood tracking and stress levels</p>
              </div>
              <Brain className="h-8 w-8 text-secondary-500" />
            </div>
            <div className="flex items-end space-x-2 mb-4">
              <span className={`text-4xl font-bold ${mentalStatus.color}`}>
                {wellnessScores.mental}
              </span>
              <span className="text-slate-400 text-lg mb-1">/100</span>
            </div>
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${mentalStatus.bgColor} ${mentalStatus.color}`}>
              {mentalStatus.label}
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {quickActions.map((action, index) => (
          <Card 
            key={index} 
            className="p-6 bg-slate-800 border-slate-700 hover:bg-slate-700/50 transition-colors cursor-pointer"
            onClick={() => navigate(action.path)}
          >
            <div className="flex flex-col items-center text-center space-y-3">
              <div className={`p-4 rounded-xl ${action.color}`}>
                <action.icon size={24} className="text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white">{action.label}</h3>
                <p className="text-sm text-slate-400">{action.subtitle}</p>
              </div>
            </div>
          </Card>
        ))}
      </motion.div>

      {/* Pending Medications & Upcoming Appointments */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="p-6 bg-slate-800 border-slate-700">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <Pill className="h-6 w-6 text-primary-500" />
                <h3 className="text-xl font-semibold text-white">Pending Medications</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/medications')}
                className="text-primary-500 hover:text-primary-400"
              >
                <Plus size={16} className="mr-1" />
                Add
              </Button>
            </div>
            
            <div className="space-y-4">
              {pendingMedications.length > 0 ? (
                <>
                  {pendingMedications.slice(0, 2).map((item) => {
                    const statusColor = getStatusColor(item);
                    const statusText = getStatusText(item);
                    
                    return (
                      <div key={`${item.medication_id}-${item.time}`} className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
                        <div>
                          <h4 className="font-semibold text-white">{item.medication_name}</h4>
                          <p className="text-slate-400 text-sm">{item.dosage}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-primary-500 font-medium">
                            {formatTime(item.time)}
                          </p>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${statusColor}`}>
                            {statusText}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  
                  {pendingMedications.length > 2 && (
                    <div className="text-center pt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate('/medications')}
                        className="text-primary-500 hover:text-primary-400"
                      >
                        View {pendingMedications.length - 2} more pending medications
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <Pill className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400 mb-4">No pending medications for today</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/medications')}
                  >
                    Add Medication
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="p-6 bg-slate-800 border-slate-700">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <Calendar className="h-6 w-6 text-secondary-500" />
                <h3 className="text-xl font-semibold text-white">Upcoming Appointments</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/appointments')}
                className="text-secondary-500 hover:text-secondary-400"
              >
                <Plus size={16} className="mr-1" />
                Schedule
              </Button>
            </div>
            
            <div className="space-y-4">
              {upcomingAppointments.length > 0 ? (
                upcomingAppointments.map((appointment) => (
                  <div key={appointment.id} className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
                    <div>
                      <h4 className="font-semibold text-white">{appointment.title}</h4>
                      <p className="text-slate-400 text-sm">
                        {getAppointmentTypeLabel(appointment.appointment_type)}
                        {appointment.doctor_name && ` • Dr. ${appointment.doctor_name}`}
                      </p>
                      {appointment.location_name && (
                        <p className="text-slate-500 text-xs mt-1">{appointment.location_name}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-secondary-500 font-medium">
                        {formatAppointmentDate(appointment.appointment_date)}
                      </p>
                      <p className="text-slate-400 text-sm">
                        {format(parseISO(`2000-01-01T${appointment.appointment_time}`), 'h:mm a')}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400 mb-4">No upcoming appointments</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/appointments')}
                  >
                    Schedule Appointment
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </motion.div>
      </div>

      {/* View All Data Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="text-center"
      >
        <Button
          variant="outline"
          onClick={() => navigate('/progress')}
          className="inline-flex items-center space-x-2"
        >
          <TrendingUp size={16} />
          <span>View Detailed Health Progress</span>
          <ArrowRight size={16} />
        </Button>
      </motion.div>
    </div>
  );
};

export default Dashboard;