'use client';

import { useEffect, useState } from 'react';
import ScheduleManager from '@/components/scheduling/ScheduleManager';
import ScheduleHistory from '@/components/scheduling/ScheduleHistory';
import BackupViewer from '@/components/dashboard/BackupViewer';
import IncrementalMonitoringDashboard from '@/components/dashboard/IncrementalMonitoringDashboard';

interface ScrapingStats {
  totalListings: number;
  recentListings: number;
  todayListings: number;
  lastScraped: string;
  isRunning: boolean;
  currentPage?: number;
  errors?: string[];
}

interface ScrapingLog {
  id: string;
  timestamp: string;
  level: 'info' | 'error' | 'success';
  message: string;
}

export default function ScrapingStatusPage() {
  const [stats, setStats] = useState<ScrapingStats>({
    totalListings: 0,
    recentListings: 0,
    todayListings: 0,
    lastScraped: 'Never',
    isRunning: false
  });
  
  const [logs, setLogs] = useState<ScrapingLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [triggerError, setTriggerError] = useState('');
  const [isTriggering, setIsTriggering] = useState(false);
  const [activeTab, setActiveTab] = useState<'incremental' | 'results' | 'settings'>('incremental');
  
  // Fetch scraping statistics from API
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/monitoring/stats');
      const result = await response.json();
      
      if (result.success) {
        setStats({
          totalListings: result.data.totalListings,
          recentListings: result.data.recentListings,
          todayListings: result.data.todayListings,
          lastScraped: result.data.lastUpdate ? new Date(result.data.lastUpdate).toLocaleString() : 'Never',
          isRunning: result.data.isRunning || false
        });
      }
      
      // Check monitoring status
      const monitoringResponse = await fetch('/api/monitoring/status');
      const monitoringResult = await monitoringResponse.json();
      
      if (monitoringResult) {
        setStats(prev => ({
          ...prev,
          isRunning: monitoringResult.status === 'running'
        }));
        
        // Convert activity to logs
        if (monitoringResult.recentActivity) {
          const newLogs = monitoringResult.recentActivity.map((activity: any, index: number) => ({
            id: `log-${Date.now()}-${index}`,
            timestamp: activity.timestamp || new Date().toISOString(),
            level: activity.status === 'error' ? 'error' : activity.status === 'completed' ? 'success' : 'info',
            message: activity.message || `${activity.type || 'Activity'}: ${activity.status || 'unknown'}`
          }));
          setLogs(newLogs);
        }
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Manual trigger for scraping
  const triggerScraping = async () => {
    setIsTriggering(true);
    setTriggerError('');
    
    try {
      const response = await fetch('/api/monitoring/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          manual: true,
          options: {
            pages: 1,
            category: 'all'
          }
        })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to start scraping');
      }
      
      // Add success log
      setLogs(prev => [{
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        level: 'success',
        message: 'Scraping started successfully'
      }, ...prev]);
      
      // Refresh stats
      setTimeout(fetchStats, 2000);
    } catch (error: any) {
      setTriggerError(error.message);
      setLogs(prev => [{
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        level: 'error',
        message: `Failed to start scraping: ${error.message}`
      }, ...prev]);
    } finally {
      setIsTriggering(false);
    }
  };
  
  // Stop scraping
  const stopScraping = async () => {
    try {
      const response = await fetch('/api/monitoring/stop', {
        method: 'POST'
      });
      
      if (response.ok) {
        setStats(prev => ({ ...prev, isRunning: false }));
        setLogs(prev => [{
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString(),
          level: 'info',
          message: 'Scraping stopped'
        }, ...prev]);
      }
    } catch (error) {
      console.error('Error stopping scraping:', error);
    }
  };
  
  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl">Loading scraping status...</div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Scraping Dashboard</h1>
        
        {/* Simplified Tab Navigation */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('incremental')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'incremental'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Start Incremental Scan
            </button>
            <button
              onClick={() => setActiveTab('results')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'results'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              View Results
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'settings'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Settings
            </button>
          </nav>
        </div>
        
        {/* Tab Content */}
        {activeTab === 'incremental' && (
          <div>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Total Listings</h3>
            <p className="text-3xl font-bold text-gray-900">{stats.totalListings.toLocaleString()}</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Recent (7 days)</h3>
            <p className="text-3xl font-bold text-blue-600">{stats.recentListings.toLocaleString()}</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Today</h3>
            <p className="text-3xl font-bold text-green-600">{stats.todayListings.toLocaleString()}</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Status</h3>
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${stats.isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
              <p className="text-lg font-medium">{stats.isRunning ? 'Running' : 'Idle'}</p>
            </div>
          </div>
        </div>
        
        {/* Control Panel */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-xl font-semibold mb-4">Control Panel</h2>
          
          <div className="flex gap-4">
            <button
              onClick={triggerScraping}
              disabled={stats.isRunning || isTriggering}
              className={`px-6 py-2 rounded-lg font-medium ${
                stats.isRunning || isTriggering
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isTriggering ? 'Starting...' : 'Start Incremental Scan'}
            </button>
            
            <button
              onClick={stopScraping}
              disabled={!stats.isRunning}
              className={`px-6 py-2 rounded-lg font-medium ${
                !stats.isRunning
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              Stop Scraping
            </button>
            
            <button
              onClick={fetchStats}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
            >
              Refresh
            </button>
          </div>
          
          {triggerError && (
            <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-lg">
              {triggerError}
            </div>
          )}
        </div>
        
        {/* Activity Logs */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Activity Logs</h2>
          
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-gray-500">No recent activity</p>
            ) : (
              logs.map(log => (
                <div
                  key={log.id}
                  className={`p-3 rounded-lg ${
                    log.level === 'error' ? 'bg-red-50' :
                    log.level === 'success' ? 'bg-green-50' :
                    'bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <span className={`inline-block px-2 py-1 text-xs rounded-full mr-2 ${
                        log.level === 'error' ? 'bg-red-200 text-red-800' :
                        log.level === 'success' ? 'bg-green-200 text-green-800' :
                        'bg-gray-200 text-gray-800'
                      }`}>
                        {log.level.toUpperCase()}
                      </span>
                      <span className="text-sm">{log.message}</span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
        {/* Last Update Info */}
        <div className="mt-4 text-center text-sm text-gray-500">
          Last updated: {stats.lastScraped}
        </div>
          </div>
        )}
        
        {/* Results Tab - Show monitoring dashboard */}
        {activeTab === 'results' && (
          <IncrementalMonitoringDashboard />
        )}
        
        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <ScheduleManager onScheduleUpdate={fetchStats} />
        )}
      </div>
    </div>
  );
}