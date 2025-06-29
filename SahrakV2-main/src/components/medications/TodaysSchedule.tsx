import React, { useState } from 'react';
import { format } from 'date-fns';
import { Clock, Check, X, Pill, AlertCircle } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { MedicationSchedule, markMedicationTaken, undoMedicationTaken, formatTime } from '../../lib/medications';
import toast from 'react-hot-toast';

interface TodaysScheduleProps {
  schedule: MedicationSchedule[];
  loading: boolean;
  onRefresh: () => void;
}

export const TodaysSchedule: React.FC<TodaysScheduleProps> = ({
  schedule,
  loading,
  onRefresh
}) => {
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleMarkTaken = async (item: MedicationSchedule) => {
    const key = `${item.medication_id}-${item.time}`;
    setProcessingId(key);

    try {
      if (item.taken) {
        // Undo taken
        const { error } = await undoMedicationTaken(item.medication_id, item.time);
        if (error) throw error;
        toast.success('Medication marked as not taken');
      } else {
        // Mark as taken
        const { error } = await markMedicationTaken(item.medication_id, item.time);
        if (error) throw error;
        toast.success('Medication marked as taken');
      }
      
      onRefresh();
    } catch (error: any) {
      console.error('Error updating medication status:', error);
      toast.error('Failed to update medication status');
    } finally {
      setProcessingId(null);
    }
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

  const getStatusColor = (item: MedicationSchedule) => {
    if (item.taken) return 'text-green-400 bg-green-900/20 border-green-800';
    
    const status = getTimeStatus(item.time);
    switch (status) {
      case 'upcoming': return 'text-blue-400 bg-blue-900/20 border-blue-800';
      case 'current': return 'text-orange-400 bg-orange-900/20 border-orange-800';
      case 'overdue': return 'text-red-400 bg-red-900/20 border-red-800';
      default: return 'text-slate-400 bg-slate-900/20 border-slate-800';
    }
  };

  const getStatusText = (item: MedicationSchedule) => {
    if (item.taken) return 'Taken';
    
    const status = getTimeStatus(item.time);
    switch (status) {
      case 'upcoming': return 'Upcoming';
      case 'current': return 'Due Now';
      case 'overdue': return 'Overdue';
      default: return 'Pending';
    }
  };

  if (loading) {
    return (
      <Card className="p-6 bg-slate-800 border-slate-700">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
          <span className="ml-3 text-slate-400">Loading today's schedule...</span>
        </div>
      </Card>
    );
  }

  const takenCount = schedule.filter(item => item.taken).length;
  const overdueCount = schedule.filter(item => !item.taken && getTimeStatus(item.time) === 'overdue').length;

  // Sort schedule: pending first (by time), then taken (by time)
  const sortedSchedule = [...schedule].sort((a, b) => {
    // If one is taken and other is not, pending comes first
    if (a.taken !== b.taken) {
      return a.taken ? 1 : -1;
    }
    
    // If both have same taken status, sort by time
    return a.time.localeCompare(b.time);
  });

  return (
    <Card className="p-6 bg-slate-800 border-slate-700">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white mb-2">Today's Medications</h2>
          <p className="text-slate-400 text-sm">
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
        
        <div className="text-right">
          <p className="text-2xl font-bold text-white">
            {takenCount}/{schedule.length}
          </p>
          <p className="text-sm text-slate-400">Completed</p>
          {overdueCount > 0 && (
            <p className="text-xs text-red-400 mt-1">
              {overdueCount} overdue
            </p>
          )}
        </div>
      </div>

      {schedule.length === 0 ? (
        <div className="text-center py-8">
          <Pill className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-300 mb-2">
            No medications scheduled for today
          </h3>
          <p className="text-slate-500">
            You're all set! No medications to take today.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedSchedule.map((item) => {
            const key = `${item.medication_id}-${item.time}`;
            const isProcessing = processingId === key;
            const statusColor = getStatusColor(item);
            const statusText = getStatusText(item);
            const isOverdue = !item.taken && getTimeStatus(item.time) === 'overdue';

            return (
              <div
                key={key}
                className={`
                  grid grid-cols-1 lg:grid-cols-3 gap-4 p-4 rounded-lg border transition-all
                  ${item.taken 
                    ? 'bg-green-900/10 border-green-800/50' 
                    : isOverdue 
                      ? 'bg-red-900/10 border-red-800/50' 
                      : 'bg-slate-700/50 border-slate-600'
                  }
                `}
              >
                {/* Column 1: Medication Details */}
                <div className="flex items-center space-x-4">
                  <div className={`p-2 rounded-lg ${item.taken ? 'bg-green-600' : 'bg-slate-600'}`}>
                    <Pill className="w-5 h-5 text-white" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white">{item.medication_name}</h3>
                    <p className="text-slate-400 text-sm">{item.dosage}</p>
                    {item.taken && item.taken_at && (
                      <p className="text-green-400 text-xs mt-1">
                        Taken at {format(new Date(item.taken_at), 'h:mm a')}
                      </p>
                    )}
                  </div>
                </div>

                {/* Column 2: Instructions */}
                <div className="flex items-center lg:justify-center">
                  {item.instructions ? (
                    <p className="text-slate-300 text-sm italic bg-slate-600/30 px-3 py-2 rounded-lg">
                      {item.instructions}
                    </p>
                  ) : (
                    <p className="text-slate-500 text-sm italic">
                      No special instructions
                    </p>
                  )}
                </div>

                {/* Column 3: Time and Action */}
                <div className="flex items-center justify-between lg:justify-end space-x-4">
                  <div className="text-right">
                    <div className="flex items-center space-x-2 mb-1">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span className="text-white font-medium">
                        {formatTime(item.time)}
                      </span>
                    </div>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${statusColor}`}>
                      {statusText}
                    </span>
                  </div>
                  
                  <Button
                    variant={item.taken ? "outline" : "primary"}
                    size="sm"
                    onClick={() => handleMarkTaken(item)}
                    loading={isProcessing}
                    disabled={isProcessing}
                    className={`
                      ${item.taken 
                        ? 'text-green-400 border-green-600 hover:bg-green-900/20' 
                        : 'bg-cyan-600 hover:bg-cyan-700'
                      }
                    `}
                  >
                    {item.taken ? (
                      <>
                        <Check size={16} className="mr-1" />
                        Taken
                      </>
                    ) : (
                      <>
                        <Check size={16} className="mr-1" />
                        Mark Taken
                      </>
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};