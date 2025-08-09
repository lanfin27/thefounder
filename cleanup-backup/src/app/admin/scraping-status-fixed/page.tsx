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
  categories?: Record<string, number>;
  priceRange?: {
    min: number;
    max: number;
    average: number;
    highValue: number;
  };
}

interface ScrapingLog {
  id: string;
  timestamp: string;
  level: 'info' | 'error' | 'success';
  message: string;
}

export default function ScrapingStatusFixedPage() {
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
  const [dataSource, setDataSource] = useState('');
  
  // Fetch scraping statistics from SQLite database
  const fetchStats = async () => {
    try {
      // First try to get data from SQLite baseline
      const baselineResponse = await fetch('/api/scraping/database-stats');
      if (baselineResponse.ok) {
        const baselineData = await baselineResponse.json();
        
        if (baselineData.success) {
          setStats(baselineData.stats);
          setLogs(baselineData.logs || []);
          setDataSource(baselineData.source);
          setIsLoading(false);
          return;
        }
      }
      
      // Fallback to Supabase (will show 0)
      const { count: totalCount } = await supabase
        .from('flippa_listings')
        .select('*', { count: 'exact', head: true });
      
      setStats({
        totalListings: totalCount || 0,
        recentListings: 0,
        soldListings: 0,
        lastScraped: 'Never',
        isRunning: false
      });
      setDataSource('Supabase (empty)');
      
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Use mock data as last resort
      setStats({
        totalListings: 5636,
        recentListings: 845,
        soldListings: 451,
        lastScraped: new Date().toISOString(),
        isRunning: false,
        categories: {
          'E-commerce': 2134,
          'Content': 1523,
          'SaaS': 987,
          'Apps': 656,
          'Services': 336
        }
      });
      setDataSource('Mock data (API unavailable)');
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
  
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading scraping status...</div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Flippa Scraping Status (Fixed)</h1>
      
      {/* Data Source Indicator */}
      <div className="mb-4 p-3 bg-blue-50 rounded-lg">
        <span className="text-sm text-blue-700">Data Source: {dataSource}</span>
      </div>
      
      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Total Listings</h3>
          <p className="text-3xl font-bold text-gray-900">{stats.totalListings.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">From baseline database</p>
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
          <h3 className="text-sm font-medium text-gray-500 mb-2">Last Import</h3>
          <p className="text-sm font-semibold text-gray-900">{formatTimestamp(stats.lastScraped)}</p>
        </div>
      </div>
      
      {/* Category Breakdown */}
      {stats.categories && (
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-xl font-bold mb-4">Category Distribution</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {Object.entries(stats.categories).slice(0, 10).map(([category, count]) => (
              <div key={category} className="text-center">
                <p className="text-2xl font-bold text-gray-800">{count.toLocaleString()}</p>
                <p className="text-sm text-gray-600">{category}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Price Range */}
      {stats.priceRange && (
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-xl font-bold mb-4">Price Statistics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Minimum</p>
              <p className="text-xl font-bold">${stats.priceRange.min.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Average</p>
              <p className="text-xl font-bold">${stats.priceRange.average.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Maximum</p>
              <p className="text-xl font-bold">${stats.priceRange.max.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">High Value (>$100K)</p>
              <p className="text-xl font-bold">{stats.priceRange.highValue.toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}
      
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
        <h2 className="text-xl font-bold mb-4">Activity Log (From Database)</h2>
        
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