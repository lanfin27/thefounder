'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface ScrapingStats {
  totalListings: number;
  recentListings: number;
  soldListings: number;
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
    soldListings: 0,
    lastScraped: 'Never',
    isRunning: false
  });
  
  const [logs, setLogs] = useState<ScrapingLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [triggerError, setTriggerError] = useState('');
  const [isTriggering, setIsTriggering] = useState(false);
  
  // Fetch scraping statistics
  const fetchStats = async () => {
    try {
      // Total listings
      const { count: totalCount } = await supabase
        .from('flippa_listings')
        .select('*', { count: 'exact', head: true });
      
      // Recent listings (last 7 days)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const { count: recentCount } = await supabase
        .from('flippa_listings')
        .select('*', { count: 'exact', head: true })
        .gte('scraped_at', weekAgo.toISOString());
      
      // Sold listings
      const { data: soldData } = await supabase
        .from('flippa_listings')
        .select('raw_data')
        .not('raw_data', 'is', null);
      
      const soldCount = soldData?.filter(item => 
        item.raw_data?.listing_status === 'sold'
      ).length || 0;
      
      // Last scraped
      const { data: lastScrapedData } = await supabase
        .from('flippa_listings')
        .select('scraped_at')
        .order('scraped_at', { ascending: false })
        .limit(1);
      
      setStats({
        totalListings: totalCount || 0,
        recentListings: recentCount || 0,
        soldListings: soldCount,
        lastScraped: lastScrapedData?.[0]?.scraped_at || 'Never',
        isRunning: false
      });
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
      const response = await fetch('/api/scraping/trigger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': process.env.NEXT_PUBLIC_ADMIN_TOKEN || ''
        },
        body: JSON.stringify({
          type: 'complete',
          options: {
            clearFilters: true,
            recentlySold: true,
            sortBy: 'most_recent',
            itemsPerPage: 100
          }
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to trigger scraping');
      }
      
      const result = await response.json();
      
      // Add success log
      setLogs(prev => [{
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        level: 'success',
        message: `Scraping job started: ${result.jobId}`
      }, ...prev.slice(0, 99)]);
      
      // Update running status
      setStats(prev => ({ ...prev, isRunning: true }));
      
    } catch (error) {
      setTriggerError(error instanceof Error ? error.message : 'Unknown error');
      
      // Add error log
      setLogs(prev => [{
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        level: 'error',
        message: `Failed to trigger scraping: ${error}`
      }, ...prev.slice(0, 99)]);
    } finally {
      setIsTriggering(false);
    }
  };
  
  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    if (timestamp === 'Never') return timestamp;
    const date = new Date(timestamp);
    return date.toLocaleString();
  };
  
  // Auto-refresh stats
  useEffect(() => {
    fetchStats();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Simulated real-time logs (in production, use WebSocket or SSE)
  useEffect(() => {
    if (stats.isRunning) {
      const logInterval = setInterval(() => {
        setLogs(prev => [{
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          level: 'info',
          message: `Processing page ${Math.floor(Math.random() * 10) + 1}...`
        }, ...prev.slice(0, 99)]);
      }, 5000);
      
      return () => clearInterval(logInterval);
    }
  }, [stats.isRunning]);
  
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading scraping status...</div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Flippa Scraping Status</h1>
      
      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Total Listings</h3>
          <p className="text-3xl font-bold text-gray-900">{stats.totalListings.toLocaleString()}</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Recent (7 days)</h3>
          <p className="text-3xl font-bold text-blue-600">{stats.recentListings.toLocaleString()}</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Sold Listings</h3>
          <p className="text-3xl font-bold text-green-600">{stats.soldListings.toLocaleString()}</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Last Scraped</h3>
          <p className="text-sm font-semibold text-gray-900">{formatTimestamp(stats.lastScraped)}</p>
        </div>
      </div>
      
      {/* Manual Trigger Section */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h2 className="text-xl font-bold mb-4">Manual Controls</h2>
        
        <div className="flex items-center gap-4">
          <button
            onClick={triggerScraping}
            disabled={isTriggering || stats.isRunning}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              isTriggering || stats.isRunning
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isTriggering ? 'Triggering...' : stats.isRunning ? 'Running...' : 'Start Complete Scrape'}
          </button>
          
          {stats.isRunning && (
            <span className="flex items-center text-sm text-gray-600">
              <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></span>
              Scraping in progress...
            </span>
          )}
        </div>
        
        {triggerError && (
          <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {triggerError}
          </div>
        )}
      </div>
      
      {/* Activity Log */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">Activity Log</h2>
        
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {logs.length === 0 ? (
            <p className="text-gray-500">No recent activity</p>
          ) : (
            logs.map(log => (
              <div
                key={log.id}
                className={`p-3 rounded-lg flex items-start gap-3 ${
                  log.level === 'error' ? 'bg-red-50' : 
                  log.level === 'success' ? 'bg-green-50' : 
                  'bg-gray-50'
                }`}
              >
                <span className={`text-xs font-medium ${
                  log.level === 'error' ? 'text-red-600' : 
                  log.level === 'success' ? 'text-green-600' : 
                  'text-gray-600'
                }`}>
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span className="text-sm text-gray-800 flex-1">{log.message}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}