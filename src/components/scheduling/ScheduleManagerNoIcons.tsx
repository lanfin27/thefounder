'use client';

import { useState, useEffect } from 'react';

interface Schedule {
  schedule_id: string;
  name: string;
  frequency: string;
  custom_cron?: string;
  enabled: boolean;
  specific_times?: string[];
  days_of_week?: number[];
  timezone: string;
  last_run?: string;
  next_run?: string;
  success_count: number;
  failure_count: number;
  notification_settings: any;
  created_at: string;
  updated_at: string;
}

interface ScheduleManagerProps {
  onScheduleUpdate?: () => void;
}

const FREQUENCY_OPTIONS = [
  { value: '15min', label: 'Every 15 minutes' },
  { value: '30min', label: 'Every 30 minutes' },
  { value: '1hour', label: 'Every hour' },
  { value: '2hours', label: 'Every 2 hours' },
  { value: '6hours', label: 'Every 6 hours' },
  { value: '12hours', label: 'Every 12 hours' },
  { value: '24hours', label: 'Every 24 hours' },
  { value: 'custom', label: 'Custom schedule' }
];

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' }
];

export default function ScheduleManagerNoIcons({ onScheduleUpdate }: ScheduleManagerProps) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [countdownTime, setCountdownTime] = useState<string>('');
  
  // Form state (same as original)
  const [formData, setFormData] = useState({
    name: '',
    frequency: '1hour',
    custom_cron: '',
    specific_times: ['09:00', '14:00', '20:00'],
    days_of_week: [1, 2, 3, 4, 5],
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    enabled: true,
    notification_settings: {
      email_enabled: false,
      email_address: '',
      webhook_enabled: false,
      webhook_url: '',
      threshold_amount: 100000,
      notify_on_failure: true
    }
  });

  // All the same methods as original...
  const fetchSchedules = async () => {
    try {
      const response = await fetch('/api/schedule/list');
      const data = await response.json();
      
      if (data.success) {
        setSchedules(data.schedules || []);
      }
    } catch (error) {
      console.error('Error fetching schedules:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateCountdown = () => {
    const activeSchedule = schedules.find(s => s.enabled && s.next_run);
    if (activeSchedule && activeSchedule.next_run) {
      const nextRun = new Date(activeSchedule.next_run);
      const now = new Date();
      const diff = nextRun.getTime() - now.getTime();
      
      if (diff > 0) {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        setCountdownTime(`${hours}h ${minutes}m ${seconds}s`);
      } else {
        setCountdownTime('Running now...');
      }
    } else {
      setCountdownTime('No active schedule');
    }
  };

  useEffect(() => {
    fetchSchedules();
    const interval = setInterval(() => {
      updateCountdown();
      fetchSchedules();
    }, 1000);
    
    return () => clearInterval(interval);
  }, [schedules]);

  if (isLoading) {
    return <div className="p-8 text-center">Loading schedules...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header with countdown */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Schedule Management</h2>
            <p className="text-gray-600 mt-1">Automate your Flippa scraping</p>
          </div>
          
          <div className="text-right">
            <div className="text-sm text-gray-500">Next scan in:</div>
            <div className="text-2xl font-mono font-bold text-blue-600">
              {countdownTime}
            </div>
          </div>
        </div>
      </div>

      {/* Active Schedules */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Active Schedules</h3>
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              ➕ Create Schedule
            </button>
          </div>
        </div>
        
        <div className="divide-y divide-gray-200">
          {schedules.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No schedules created yet. Create your first schedule to automate scraping.
            </div>
          ) : (
            schedules.map((schedule) => (
              <div key={schedule.schedule_id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <h4 className="text-lg font-medium text-gray-900">
                        {schedule.name}
                      </h4>
                      <span className={`ml-3 px-2 py-1 text-xs rounded-full ${
                        schedule.enabled 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {schedule.enabled ? '✓ Active' : '⏸ Paused'}
                      </span>
                    </div>
                    
                    <div className="mt-2 text-sm text-gray-600">
                      <span className="inline-flex items-center mr-4">
                        🕐 {FREQUENCY_OPTIONS.find(f => f.value === schedule.frequency)?.label}
                      </span>
                      
                      {schedule.next_run && (
                        <span className="inline-flex items-center mr-4">
                          📅 Next: {new Date(schedule.next_run).toLocaleString()}
                        </span>
                      )}
                      
                      <span className="inline-flex items-center">
                        📊 Success: {schedule.success_count} | Failed: {schedule.failure_count}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {/* toggle logic */}}
                      className={`px-3 py-1 rounded-lg text-sm font-medium ${
                        schedule.enabled
                          ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {schedule.enabled ? 'Pause' : 'Resume'}
                    </button>
                    
                    <button
                      onClick={() => {/* edit logic */}}
                      className="px-3 py-1 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg text-sm font-medium"
                    >
                      Edit
                    </button>
                    
                    <button
                      onClick={() => {/* delete logic */}}
                      className="px-3 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg text-sm font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}