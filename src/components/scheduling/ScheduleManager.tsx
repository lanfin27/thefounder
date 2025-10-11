'use client';

import { useState, useEffect } from 'react';
import { 
  Clock, 
  Calendar, 
  Bell, 
  BarChart3,
  Play,
  Pause,
  Trash2,
  Plus,
  Settings
} from 'lucide-react';

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

export default function ScheduleManager({ onScheduleUpdate }: ScheduleManagerProps) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [countdownTime, setCountdownTime] = useState<string>('');
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    frequency: '1hour',
    custom_cron: '',
    specific_times: ['09:00', '14:00', '20:00'],
    days_of_week: [1, 2, 3, 4, 5], // Monday to Friday
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

  // Fetch schedules
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

  // Calculate countdown to next run
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

  // Create or update schedule
  const saveSchedule = async () => {
    try {
      const endpoint = editingSchedule 
        ? `/api/schedule/update/${editingSchedule.schedule_id}`
        : '/api/schedule/create';
      
      const method = editingSchedule ? 'PUT' : 'POST';
      
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const result = await response.json();
      
      if (result.success) {
        await fetchSchedules();
        setShowCreateForm(false);
        setEditingSchedule(null);
        resetForm();
        onScheduleUpdate?.();
      }
    } catch (error) {
      console.error('Error saving schedule:', error);
    }
  };

  // Delete schedule
  const deleteSchedule = async (scheduleId: string) => {
    if (!confirm('Are you sure you want to delete this schedule?')) return;
    
    try {
      const response = await fetch(`/api/schedule/delete/${scheduleId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        await fetchSchedules();
        onScheduleUpdate?.();
      }
    } catch (error) {
      console.error('Error deleting schedule:', error);
    }
  };

  // Toggle schedule enabled/disabled
  const toggleSchedule = async (scheduleId: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/schedule/toggle/${scheduleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      });
      
      if (response.ok) {
        await fetchSchedules();
        onScheduleUpdate?.();
      }
    } catch (error) {
      console.error('Error toggling schedule:', error);
    }
  };

  // Test notification
  const testNotification = async () => {
    try {
      const response = await fetch('/api/schedule/test-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData.notification_settings)
      });
      
      const result = await response.json();
      if (result.success) {
        alert('Test notification sent successfully!');
      } else {
        alert('Failed to send test notification');
      }
    } catch (error) {
      console.error('Error testing notification:', error);
      alert('Error sending test notification');
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
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
  };

  // Load schedule for editing
  const editSchedule = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setFormData({
      name: schedule.name,
      frequency: schedule.frequency,
      custom_cron: schedule.custom_cron || '',
      specific_times: schedule.specific_times || ['09:00', '14:00', '20:00'],
      days_of_week: schedule.days_of_week || [1, 2, 3, 4, 5],
      timezone: schedule.timezone,
      enabled: schedule.enabled,
      notification_settings: schedule.notification_settings || {
        email_enabled: false,
        email_address: '',
        webhook_enabled: false,
        webhook_url: '',
        threshold_amount: 100000,
        notify_on_failure: true
      }
    });
    setShowCreateForm(true);
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
              <Plus className="w-5 h-5 mr-2" />
              Create Schedule
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
                        {schedule.enabled ? 'Active' : 'Paused'}
                      </span>
                    </div>
                    
                    <div className="mt-2 text-sm text-gray-600">
                      <span className="inline-flex items-center mr-4">
                        <Clock className="w-4 h-4 mr-1" />
                        {FREQUENCY_OPTIONS.find(f => f.value === schedule.frequency)?.label}
                      </span>
                      
                      {schedule.next_run && (
                        <span className="inline-flex items-center mr-4">
                          <Calendar className="w-4 h-4 mr-1" />
                          Next: {new Date(schedule.next_run).toLocaleString()}
                        </span>
                      )}
                      
                      <span className="inline-flex items-center">
                        <BarChart3 className="w-4 h-4 mr-1" />
                        Success: {schedule.success_count} | Failed: {schedule.failure_count}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => toggleSchedule(schedule.schedule_id, !schedule.enabled)}
                      className={`p-2 rounded-lg ${
                        schedule.enabled
                          ? 'text-yellow-600 hover:bg-yellow-50'
                          : 'text-green-600 hover:bg-green-50'
                      }`}
                    >
                      {schedule.enabled ? (
                        <Pause className="w-5 h-5" />
                      ) : (
                        <Play className="w-5 h-5" />
                      )}
                    </button>
                    
                    <button
                      onClick={() => editSchedule(schedule)}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                      <Settings className="w-5 h-5" />
                    </button>
                    
                    <button
                      onClick={() => deleteSchedule(schedule.schedule_id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create/Edit Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold">
                {editingSchedule ? 'Edit Schedule' : 'Create New Schedule'}
              </h3>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Basic Settings */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Schedule Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Daily Morning Scan"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Frequency
                </label>
                <select
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                >
                  {FREQUENCY_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              
              {formData.frequency === 'custom' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custom Cron Expression
                  </label>
                  <input
                    type="text"
                    value={formData.custom_cron}
                    onChange={(e) => setFormData({ ...formData, custom_cron: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0 9,14,20 * * *"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Example: "0 9,14,20 * * *" runs at 9 AM, 2 PM, and 8 PM daily
                  </p>
                </div>
              )}
              
              {/* Specific Times */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Specific Times (optional)
                </label>
                <div className="space-y-2">
                  {formData.specific_times.map((time, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input
                        type="time"
                        value={time}
                        onChange={(e) => {
                          const newTimes = [...formData.specific_times];
                          newTimes[index] = e.target.value;
                          setFormData({ ...formData, specific_times: newTimes });
                        }}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      />
                      <button
                        onClick={() => {
                          const newTimes = formData.specific_times.filter((_, i) => i !== index);
                          setFormData({ ...formData, specific_times: newTimes });
                        }}
                        className="text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      setFormData({ 
                        ...formData, 
                        specific_times: [...formData.specific_times, '12:00'] 
                      });
                    }}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    + Add Time
                  </button>
                </div>
              </div>
              
              {/* Days of Week */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Days of Week
                </label>
                <div className="flex space-x-2">
                  {DAYS_OF_WEEK.map(day => (
                    <label key={day.value} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.days_of_week.includes(day.value)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              days_of_week: [...formData.days_of_week, day.value].sort()
                            });
                          } else {
                            setFormData({
                              ...formData,
                              days_of_week: formData.days_of_week.filter(d => d !== day.value)
                            });
                          }
                        }}
                        className="mr-1"
                      />
                      <span className="text-sm">{day.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Notification Settings */}
              <div className="border-t pt-6">
                <h4 className="text-lg font-medium mb-4">Notification Settings</h4>
                
                <div className="space-y-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.notification_settings.email_enabled}
                      onChange={(e) => setFormData({
                        ...formData,
                        notification_settings: {
                          ...formData.notification_settings,
                          email_enabled: e.target.checked
                        }
                      })}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium">Enable Email Notifications</span>
                  </label>
                  
                  {formData.notification_settings.email_enabled && (
                    <input
                      type="email"
                      value={formData.notification_settings.email_address}
                      onChange={(e) => setFormData({
                        ...formData,
                        notification_settings: {
                          ...formData.notification_settings,
                          email_address: e.target.value
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      placeholder="your@email.com"
                    />
                  )}
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.notification_settings.webhook_enabled}
                      onChange={(e) => setFormData({
                        ...formData,
                        notification_settings: {
                          ...formData.notification_settings,
                          webhook_enabled: e.target.checked
                        }
                      })}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium">Enable Webhook Notifications</span>
                  </label>
                  
                  {formData.notification_settings.webhook_enabled && (
                    <input
                      type="url"
                      value={formData.notification_settings.webhook_url}
                      onChange={(e) => setFormData({
                        ...formData,
                        notification_settings: {
                          ...formData.notification_settings,
                          webhook_url: e.target.value
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      placeholder="https://hooks.slack.com/services/..."
                    />
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notification Threshold (only notify for listings above)
                    </label>
                    <div className="flex items-center">
                      <span className="mr-2">$</span>
                      <input
                        type="number"
                        value={formData.notification_settings.threshold_amount}
                        onChange={(e) => setFormData({
                          ...formData,
                          notification_settings: {
                            ...formData.notification_settings,
                            threshold_amount: parseInt(e.target.value) || 0
                          }
                        })}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  
                  <button
                    type="button"
                    onClick={testNotification}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    Test Notification
                  </button>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingSchedule(null);
                  resetForm();
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={saveSchedule}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {editingSchedule ? 'Update Schedule' : 'Create Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}