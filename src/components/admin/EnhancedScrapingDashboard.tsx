// components/admin/EnhancedScrapingDashboard.tsx
import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

interface ScrapingMetrics {
  totalListings: number;
  fieldCompletionRate: number;
  extractionRates: {
    title: number;
    price: number;
    revenue: number;
    multiple: number;
    category: number;
  };
  recentExtractions: FlippaListing[];
  sessionInfo: ScrapingSession;
  realTimeProgress: {
    currentPage: number;
    listingsPerMinute: number;
    estimatedCompletion: string;
    status: 'idle' | 'running' | 'completed' | 'error';
  };
}

interface FlippaListing {
  id: string;
  title: string;
  price: number;
  monthly_revenue: number;
  monthly_profit: number;
  multiple: number;
  category: string;
  url: string;
  source: string;
  created_at: string;
  extraction_quality_score: number;
}

interface ScrapingSession {
  id: number;
  session_id: string;
  total_listings: number;
  pages_processed: number;
  success_rate: number;
  processing_time: number;
  method: string;
  started_at: string;
  completed_at: string;
  performance_metrics: {
    apifyLevel: boolean;
    speedImprovement: number;
    qualityImprovement: number;
    cloudflareBypass: boolean;
    distributedWorkers: number;
  };
}

// Tooltip component for better UX
const Tooltip: React.FC<{ children: React.ReactNode; text: string }> = ({ children, text }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {children}
      </div>
      {showTooltip && (
        <div className="absolute z-10 w-64 px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg bottom-full left-1/2 transform -translate-x-1/2 mb-2">
          <div className="absolute w-2 h-2 bg-gray-900 transform rotate-45 left-1/2 -translate-x-1/2 -bottom-1"></div>
          {text}
        </div>
      )}
    </div>
  );
};

export const EnhancedScrapingDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<ScrapingMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isScrapingActive, setIsScrapingActive] = useState(false);
  const [realTimeUpdates, setRealTimeUpdates] = useState(true);
  const [louisDeconinckActive, setLouisDeconinckActive] = useState(false);
  const [louisDeconinckProgress, setLouisDeconinckProgress] = useState({
    sessionId: null as string | null,
    progress: 0,
    listingsCount: 0,
    message: ''
  });
  const [browserSimulationActive, setBrowserSimulationActive] = useState(false);
  const [browserSimulationStatus, setBrowserSimulationStatus] = useState<{
    active: boolean;
    activeSessions: number;
    sessionsCompleted: number;
    currentPersonas: string[];
  }>({
    active: false,
    activeSessions: 0,
    sessionsCompleted: 0,
    currentPersonas: []
  });
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const louisDeconinckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const browserSimulationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    fetchMetrics();
    
    if (realTimeUpdates) {
      intervalRef.current = setInterval(fetchMetrics, 5000); // Update every 5 seconds
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (louisDeconinckIntervalRef.current) {
        clearInterval(louisDeconinckIntervalRef.current);
      }
      if (browserSimulationIntervalRef.current) {
        clearInterval(browserSimulationIntervalRef.current);
      }
    };
  }, [realTimeUpdates]);

  const fetchMetrics = async () => {
    try {
      // Fetch comprehensive metrics
      const metricsData = await Promise.all([
        fetchListingMetrics(),
        fetchRecentExtractions(),
        fetchSessionInfo(),
        fetchRealTimeProgress()
      ]);

      setMetrics({
        ...metricsData[0],
        recentExtractions: metricsData[1],
        sessionInfo: metricsData[2],
        realTimeProgress: metricsData[3]
      });
      
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
      setIsLoading(false);
    }
  };

  const fetchListingMetrics = async () => {
    // Get total count
    const { count: totalCount } = await supabase
      .from('flippa_listings')
      .select('*', { count: 'exact', head: true });

    // Get sample for analysis (last 1000 listings)
    const { data: listings } = await supabase
      .from('flippa_listings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (!listings || listings.length === 0) {
      return {
        totalListings: 0,
        fieldCompletionRate: 0,
        extractionRates: {
          title: 0,
          price: 0,
          revenue: 0,
          multiple: 0,
          category: 0
        }
      };
    }

    // Calculate enhanced extraction rates
    const extractionRates = {
      title: calculateExtractionRate(listings, 'title', (val) => 
        val && typeof val === 'string' && val.length > 5 && 
        !val.includes('unified_') && !val.includes('enhanced_')
      ),
      price: calculateExtractionRate(listings, 'price', (val) => 
        val && typeof val === 'number' && val > 500 && val < 50000000
      ),
      revenue: calculateExtractionRate(listings, 'monthly_revenue', (val) => 
        val && typeof val === 'number' && val > 0 && val < 1000000
      ),
      multiple: calculateExtractionRate(listings, 'multiple', (val) => 
        val && typeof val === 'number' && val > 0 && val < 100
      ),
      category: calculateExtractionRate(listings, 'category', (val) => 
        val && typeof val === 'string' && val.length > 2 && 
        val !== 'Unknown' && val !== ''
      )
    };

    // Calculate overall field completion rate
    const totalFields = 5; // title, price, revenue, multiple, category
    const averageCompletionRate = Object.values(extractionRates)
      .reduce((sum, rate) => sum + rate, 0) / totalFields;

    return {
      totalListings: totalCount || 0,
      fieldCompletionRate: Math.round(averageCompletionRate * 10) / 10,
      extractionRates
    };
  };

  const calculateExtractionRate = (listings: any[], field: string, validator: (val: any) => boolean): number => {
    const validCount = listings.filter(listing => validator(listing[field])).length;
    return Math.round((validCount / listings.length) * 1000) / 10; // Round to 1 decimal
  };

  const fetchRecentExtractions = async (): Promise<FlippaListing[]> => {
    const { data: listings } = await supabase
      .from('flippa_listings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    return (listings || []).map(listing => ({
      ...listing,
      extraction_quality_score: calculateQualityScore(listing)
    }));
  };

  const calculateQualityScore = (listing: any): number => {
    let score = 0;
    const checks = [
      { field: 'title', weight: 25, valid: listing.title && listing.title.length > 5 },
      { field: 'price', weight: 25, valid: listing.price && listing.price > 500 },
      { field: 'monthly_revenue', weight: 20, valid: listing.monthly_revenue && listing.monthly_revenue > 0 },
      { field: 'multiple', weight: 15, valid: listing.multiple && listing.multiple > 0 },
      { field: 'category', weight: 10, valid: listing.category && listing.category !== 'Unknown' },
      { field: 'url', weight: 5, valid: listing.url && listing.url.includes('flippa') }
    ];

    checks.forEach(check => {
      if (check.valid) score += check.weight;
    });

    return score;
  };

  const fetchSessionInfo = async (): Promise<ScrapingSession> => {
    const { data: session } = await supabase
      .from('scraping_sessions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!session) {
      return {
        id: 0,
        session_id: 'no-session',
        total_listings: 0,
        pages_processed: 0,
        success_rate: 0,
        processing_time: 0,
        method: 'standard', // ✅ Ensure method always has a value
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        performance_metrics: {
          apifyLevel: false,
          speedImprovement: 1,
          qualityImprovement: 1,
          cloudflareBypass: false,
          distributedWorkers: 1
        }
      };
    }

    // ✅ Add safety check for existing session data
    const safeSession = {
      ...session,
      method: session.method || 'standard', // Fallback if method is null/undefined
      performance_metrics: session.configuration ? {
        apifyLevel: session.configuration?.type?.includes('apify') || false,
        speedImprovement: session.configuration?.speedImprovement || 1,
        qualityImprovement: session.configuration?.qualityImprovement || 1,
        cloudflareBypass: session.configuration?.cloudflareBypass || false,
        distributedWorkers: session.configuration?.workers || 1
      } : {
        apifyLevel: false,
        speedImprovement: 1,
        qualityImprovement: 1,
        cloudflareBypass: false,
        distributedWorkers: 1
      }
    };

    return safeSession;
  };

  const fetchRealTimeProgress = async () => {
    // Check if scraping is currently active by looking for recent activity
    const { data: recentActivity } = await supabase
      .from('flippa_listings')
      .select('created_at')
      .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Last 5 minutes
      .order('created_at', { ascending: false });

    const isActive = recentActivity && recentActivity.length > 0;
    
    if (isActive) {
      // Calculate real-time metrics
      const recentCount = recentActivity.length;
      const listingsPerMinute = Math.round(recentCount / 5); // Per minute rate
      
      return {
        currentPage: Math.ceil(recentCount / 25), // Assuming 25 listings per page
        listingsPerMinute,
        estimatedCompletion: calculateEstimatedCompletion(listingsPerMinute),
        status: 'running' as const
      };
    }

    return {
      currentPage: 0,
      listingsPerMinute: 0,
      estimatedCompletion: '00:00',
      status: 'idle' as const
    };
  };

  const calculateEstimatedCompletion = (rate: number): string => {
    if (rate === 0) return '00:00';
    
    const remainingListings = 5000 - (metrics?.totalListings || 0);
    const remainingMinutes = Math.ceil(remainingListings / rate);
    
    const hours = Math.floor(remainingMinutes / 60);
    const minutes = remainingMinutes % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const startAdvancedScraping = async () => {
    setIsScrapingActive(true);
    setRealTimeUpdates(true);
    
    try {
      const response = await fetch('/api/scraping/human-like/standard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetListings: 1000,
          websocketUrl: process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:3001'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start standard scraping');
      }

      const data = await response.json();
      console.log('🚀 Standard scraping started:', data);

      // Store session ID for tracking
      localStorage.setItem('currentScrapingSession', data.sessionId);

      // Start real-time updates
      const interval = setInterval(fetchMetrics, 2000); // Every 2 seconds during scraping
      
      // Monitor for completion
      const checkCompletion = setInterval(async () => {
        const sessionResponse = await fetch(`/api/scraping/human-like/standard?sessionId=${data.sessionId}`);
        const sessionData = await sessionResponse.json();
        
        if (sessionData.session?.status === 'completed' || sessionData.session?.status === 'failed') {
          clearInterval(interval);
          clearInterval(checkCompletion);
          setIsScrapingActive(false);
          setRealTimeUpdates(false);
          localStorage.removeItem('currentScrapingSession');
        }
      }, 5000); // Check every 5 seconds

    } catch (error) {
      console.error('Failed to start scraping:', error);
      setIsScrapingActive(false);
    }
  };

  const startHighPerformanceScraping = async () => {
    setIsScrapingActive(true);
    setRealTimeUpdates(true);
    
    try {
      const response = await fetch('/api/scraping/human-like/high-performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetListings: 5000,
          targetCompletionTime: 5, // minutes
          enableParallel: true,
          websocketUrl: process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:3001'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start high-performance scraping');
      }

      const data = await response.json();
      console.log('⚡ High-Performance scraping started:', data);
      
      // Store session ID
      localStorage.setItem('currentScrapingSession', data.sessionId);

      // Start real-time updates
      const interval = setInterval(fetchMetrics, 1000); // Every second for high-performance
      
      // Monitor for completion
      const checkCompletion = setInterval(async () => {
        const sessionResponse = await fetch(`/api/scraping/human-like/high-performance?sessionId=${data.sessionId}`);
        const sessionData = await sessionResponse.json();
        
        if (sessionData.session?.status === 'completed' || sessionData.session?.status === 'failed') {
          clearInterval(interval);
          clearInterval(checkCompletion);
          setIsScrapingActive(false);
          setRealTimeUpdates(false);
          localStorage.removeItem('currentScrapingSession');
        }
      }, 3000); // Check every 3 seconds

    } catch (error) {
      console.error('Failed to start high-performance scraping:', error);
      setIsScrapingActive(false);
    }
  };

  const startLouisDeconinckExtraction = async () => {
    setLouisDeconinckActive(true);
    setLouisDeconinckProgress({
      sessionId: null,
      progress: 0,
      listingsCount: 0,
      message: 'Starting Premium AI-powered extraction...'
    });
    
    try {
      // Start the premium extraction
      const response = await fetch('/api/scraping/human-like/premium', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetListings: 5000,
          qualityThreshold: 95,
          enableAI: true,
          deepAnalysis: true,
          websocketUrl: process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:3001'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to start premium extraction');
      }

      const data = await response.json();
      console.log('🎯 Premium extraction started:', data);
      
      setLouisDeconinckProgress(prev => ({
        ...prev,
        sessionId: data.sessionId,
        message: `Premium extraction started. Target: ${data.targetListings} listings with ${data.features.qualityGuarantee} quality`
      }));
      
      // Store session ID
      localStorage.setItem('currentScrapingSession', data.sessionId);

      // Start polling for progress
      louisDeconinckIntervalRef.current = setInterval(async () => {
        try {
          const progressResponse = await fetch(`/api/scraping/human-like/premium?sessionId=${data.sessionId}`);
          const progressData = await progressResponse.json();
          
          setLouisDeconinckProgress(prev => ({
            ...prev,
            progress: progressData.progress || 0,
            listingsCount: progressData.listings_count || 0,
            message: `Premium extraction... ${progressData.listings_count || 0}/5000 listings (${Math.round(progressData.progress || 0)}%) - Quality: ${progressData.average_quality || 0}%`
          }));

          // Check if completed
          if (progressData.session?.status === 'completed' || progressData.session?.status === 'failed') {
            clearInterval(louisDeconinckIntervalRef.current!);
            setLouisDeconinckActive(false);
            localStorage.removeItem('currentScrapingSession');
            
            if (progressData.session?.status === 'completed') {
              setLouisDeconinckProgress(prev => ({
                ...prev,
                message: `✅ Premium extraction complete! ${progressData.listings_count} high-quality listings extracted.`
              }));
              
              // Refresh main metrics
              fetchMetrics();
            } else {
              setLouisDeconinckProgress(prev => ({
                ...prev,
                message: '❌ Extraction failed. Please check logs.'
              }));
            }
          }
        } catch (error) {
          console.error('Progress check error:', error);
        }
      }, 2000); // Poll every 2 seconds

    } catch (error) {
      console.error('Failed to start premium extraction:', error);
      setLouisDeconinckActive(false);
      setLouisDeconinckProgress(prev => ({
        ...prev,
        message: '❌ Failed to start extraction'
      }));
    }
  };

  const startBrowserSimulation = async () => {
    setBrowserSimulationActive(true);
    
    try {
      const response = await fetch('/api/scraping/browser-simulation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'start',
          config: {
            headless: true,
            maxSessions: 3,
            sessionInterval: { min: 30, max: 120 },
            websocketUrl: process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:3001'
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start browser simulation');
      }

      const data = await response.json();
      console.log('🤖 Browser simulation started:', data);

      // Start polling for status
      browserSimulationIntervalRef.current = setInterval(async () => {
        try {
          const statusResponse = await fetch('/api/scraping/browser-simulation');
          const statusData = await statusResponse.json();
          
          setBrowserSimulationStatus(statusData.status || {
            active: false,
            activeSessions: 0,
            sessionsCompleted: 0,
            currentPersonas: []
          });

          // Update main metrics when sessions complete
          if (statusData.status?.sessionsCompleted > browserSimulationStatus.sessionsCompleted) {
            fetchMetrics();
          }
        } catch (error) {
          console.error('Status check error:', error);
        }
      }, 3000); // Poll every 3 seconds

    } catch (error) {
      console.error('Failed to start browser simulation:', error);
      setBrowserSimulationActive(false);
    }
  };

  const stopBrowserSimulation = async () => {
    try {
      const response = await fetch('/api/scraping/browser-simulation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'stop'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to stop browser simulation');
      }

      const data = await response.json();
      console.log('🛑 Browser simulation stopped:', data);

      // Clear interval
      if (browserSimulationIntervalRef.current) {
        clearInterval(browserSimulationIntervalRef.current);
        browserSimulationIntervalRef.current = null;
      }

      setBrowserSimulationActive(false);
      setBrowserSimulationStatus({
        active: false,
        activeSessions: 0,
        sessionsCompleted: 0,
        currentPersonas: []
      });

    } catch (error) {
      console.error('Failed to stop browser simulation:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center justify-center h-96">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-600">Loading dashboard metrics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-600 font-medium mb-2">Failed to load metrics</p>
            <p className="text-gray-600 mb-4">There was an error connecting to the database.</p>
            <button
              onClick={fetchMetrics}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header with Real-time Status */}
        <div className="mb-8">
          <div className="flex flex-col space-y-4">
            {/* Title and Status Row */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  The Founder - Scraping Dashboard
                </h1>
                <p className="text-gray-600 mt-1">Manage and monitor your data extraction processes</p>
              </div>
              {metrics.realTimeProgress.status === 'running' && (
                <div className="flex items-center text-green-600 bg-green-50 px-4 py-2 rounded-lg">
                  <div className="animate-pulse w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                  <span className="font-medium">Live Scraping Active</span>
                </div>
              )}
            </div>
            
            {/* Action Buttons Section */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Scraping Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Standard Scraper Button */}
                <div className="group">
                  <button
                    onClick={startAdvancedScraping}
                    disabled={isScrapingActive}
                    className={`w-full p-4 rounded-lg border-2 transition-all duration-200 ${
                      isScrapingActive
                        ? 'bg-gray-50 border-gray-300 cursor-not-allowed'
                        : 'bg-white border-blue-200 hover:border-blue-400 hover:shadow-md group-hover:bg-blue-50'
                    }`}
                  >
                    <div className="flex flex-col items-center space-y-2">
                      <span className="text-2xl">🚀</span>
                      <h3 className={`font-semibold ${
                        isScrapingActive ? 'text-gray-400' : 'text-blue-600'
                      }`}>
                        {isScrapingActive ? 'Scraping in Progress...' : 'Standard Scraper'}
                      </h3>
                      <p className="text-sm text-gray-600 text-center">
                        Reliable extraction with moderate speed
                      </p>
                      <div className="text-xs text-gray-500">
                        ~100 listings/minute
                      </div>
                    </div>
                  </button>
                  {!isScrapingActive && (
                    <div className="mt-2 text-xs text-center text-gray-500">
                      Recommended for regular updates
                    </div>
                  )}
                </div>

                {/* High-Performance Scraper Button */}
                <div className="group">
                  <button
                    onClick={startHighPerformanceScraping}
                    disabled={isScrapingActive}
                    className={`w-full p-4 rounded-lg border-2 transition-all duration-200 ${
                      isScrapingActive
                        ? 'bg-gray-50 border-gray-300 cursor-not-allowed'
                        : 'bg-white border-green-200 hover:border-green-400 hover:shadow-md group-hover:bg-green-50'
                    }`}
                  >
                    <div className="flex flex-col items-center space-y-2">
                      <span className="text-2xl">⚡</span>
                      <h3 className={`font-semibold ${
                        isScrapingActive ? 'text-gray-400' : 'text-green-600'
                      }`}>
                        {isScrapingActive ? 'Scraping in Progress...' : 'High-Performance'}
                      </h3>
                      <p className="text-sm text-gray-600 text-center">
                        Ultra-fast parallel extraction
                      </p>
                      <div className="text-xs text-gray-500">
                        ~1000 listings/minute (10x faster)
                      </div>
                    </div>
                  </button>
                  {!isScrapingActive && (
                    <div className="mt-2 text-xs text-center text-gray-500">
                      Best for large-scale operations
                    </div>
                  )}
                </div>

                {/* Louis Deconinck Method Button */}
                <div className="group">
                  <button
                    onClick={startLouisDeconinckExtraction}
                    disabled={isScrapingActive || louisDeconinckActive}
                    className={`w-full p-4 rounded-lg border-2 transition-all duration-200 ${
                      isScrapingActive || louisDeconinckActive
                        ? 'bg-gray-50 border-gray-300 cursor-not-allowed'
                        : 'bg-white border-purple-200 hover:border-purple-400 hover:shadow-md group-hover:bg-purple-50'
                    }`}
                  >
                    <div className="flex flex-col items-center space-y-2">
                      <span className="text-2xl">🎯</span>
                      <h3 className={`font-semibold ${
                        isScrapingActive || louisDeconinckActive ? 'text-gray-400' : 'text-purple-600'
                      }`}>
                        {louisDeconinckActive ? 'Extracting Data...' : 'Premium Extraction'}
                      </h3>
                      <p className="text-sm text-gray-600 text-center">
                        Advanced AI-powered extraction
                      </p>
                      <div className="text-xs text-gray-500">
                        5000+ listings guaranteed
                      </div>
                    </div>
                  </button>
                  {!isScrapingActive && !louisDeconinckActive && (
                    <div className="mt-2 text-xs text-center text-gray-500">
                      Highest quality & completeness
                    </div>
                  )}
                </div>

                {/* Browser Simulation Button */}
                <div className="group">
                  <button
                    onClick={browserSimulationActive ? stopBrowserSimulation : startBrowserSimulation}
                    disabled={isScrapingActive || louisDeconinckActive}
                    className={`w-full p-4 rounded-lg border-2 transition-all duration-200 ${
                      browserSimulationActive
                        ? 'bg-red-50 border-red-300 hover:border-red-400'
                        : isScrapingActive || louisDeconinckActive
                        ? 'bg-gray-50 border-gray-300 cursor-not-allowed'
                        : 'bg-white border-indigo-200 hover:border-indigo-400 hover:shadow-md group-hover:bg-indigo-50'
                    }`}
                  >
                    <div className="flex flex-col items-center space-y-2">
                      <span className="text-2xl">🤖</span>
                      <h3 className={`font-semibold ${
                        browserSimulationActive ? 'text-red-600' : 
                        isScrapingActive || louisDeconinckActive ? 'text-gray-400' : 'text-indigo-600'
                      }`}>
                        {browserSimulationActive ? 'Stop Simulation' : 'Browser Simulation'}
                      </h3>
                      <p className="text-sm text-gray-600 text-center">
                        {browserSimulationActive ? 'Click to stop simulation' : 'Human-like browsing patterns'}
                      </p>
                      <div className="text-xs text-gray-500">
                        {browserSimulationActive 
                          ? `${browserSimulationStatus.activeSessions} active sessions`
                          : 'Multiple personas & behaviors'
                        }
                      </div>
                    </div>
                  </button>
                  {!isScrapingActive && !louisDeconinckActive && !browserSimulationActive && (
                    <div className="mt-2 text-xs text-center text-gray-500">
                      Advanced anti-detection system
                    </div>
                  )}
                  {browserSimulationActive && browserSimulationStatus.currentPersonas.length > 0 && (
                    <div className="mt-2 text-xs text-center text-gray-600">
                      Active: {browserSimulationStatus.currentPersonas.slice(0, 2).join(', ')}
                      {browserSimulationStatus.currentPersonas.length > 2 && '...'}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Feature Comparison */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-gray-600">Speed</span>
                    <div className="flex space-x-1">
                      <span className="text-blue-500">★★★</span>
                      <span className="text-gray-300">★★</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-gray-600">Quality</span>
                    <div className="flex space-x-1">
                      <span className="text-green-500">★★★★</span>
                      <span className="text-gray-300">★</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-gray-600">Scale</span>
                    <div className="flex space-x-1">
                      <span className="text-purple-500">★★★★★</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Quick Actions Bar */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">Quick Actions:</span>
                    <Tooltip text="Toggle automatic dashboard updates every 5 seconds">
                      <button
                        onClick={() => setRealTimeUpdates(!realTimeUpdates)}
                        className={`px-3 py-1 text-sm rounded-md transition-colors ${
                          realTimeUpdates
                            ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {realTimeUpdates ? '📊 Updates: ON' : '📊 Updates: OFF'}
                      </button>
                    </Tooltip>
                    <Tooltip text="Manually refresh all dashboard metrics">
                      <button
                        onClick={fetchMetrics}
                        className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                      >
                        🔄 Refresh Stats
                      </button>
                    </Tooltip>
                  </div>
                  <div className="text-sm text-gray-500">
                    Last updated: {new Date().toLocaleTimeString()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
          
          {/* Real-time Progress Bar */}
          {metrics.realTimeProgress.status === 'running' && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">
                  📈 Processing Page {metrics.realTimeProgress.currentPage}
                </span>
                <span className="text-sm text-gray-600 font-medium">
                  {metrics.realTimeProgress.listingsPerMinute} listings/min
                </span>
              </div>
              <div className="w-full bg-white rounded-full h-3 shadow-inner">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500 relative overflow-hidden"
                  style={{ 
                    width: `${Math.min((metrics.totalListings / 5000) * 100, 100)}%` 
                  }}
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                </div>
              </div>
              <div className="flex justify-between items-center mt-2 text-xs text-gray-600">
                <span className="font-medium">{metrics.totalListings.toLocaleString()}/5,000 listings</span>
                <span className="font-medium">ETA: {metrics.realTimeProgress.estimatedCompletion}</span>
              </div>
            </div>
          )}
          
          {/* LouisDeconinck Progress Bar */}
          {louisDeconinckActive && (
            <div className="bg-white rounded-lg p-4 border border-purple-200 mt-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-purple-700">
                  🎯 LouisDeconinck Extraction
                </span>
                <span className="text-sm text-purple-600 font-medium">
                  {Math.round(louisDeconinckProgress.progress)}% Complete
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-purple-600 h-3 rounded-full transition-all duration-500 relative overflow-hidden"
                  style={{ 
                    width: `${louisDeconinckProgress.progress}%` 
                  }}
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                </div>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-sm text-gray-700">
                  {louisDeconinckProgress.message}
                </span>
                <span className="text-sm font-medium text-purple-600">
                  {louisDeconinckProgress.listingsCount.toLocaleString()} listings
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Status Overview Section */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">System Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* System Status Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-gray-900">System Status</h3>
              <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                {metrics.sessionInfo.performance_metrics?.apifyLevel ? 'Apify-Level' : 'Standard'}
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {formatDuration(metrics.sessionInfo.processing_time)}
            </div>
            <div className="text-sm text-gray-500 mb-3">Last session runtime</div>
            
            {metrics.sessionInfo.performance_metrics?.apifyLevel && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Speed Improvement:</span>
                  <span className="font-medium text-green-600">
                    {metrics.sessionInfo.performance_metrics?.speedImprovement || 1}x
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Distributed Workers:</span>
                  <span className="font-medium">
                    {metrics.sessionInfo.performance_metrics?.distributedWorkers || 1}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Cloudflare Bypass:</span>
                  <span className={`font-medium ${
                    metrics.sessionInfo.performance_metrics?.cloudflareBypass 
                      ? 'text-green-600' : 'text-gray-400'
                  }`}>
                    {metrics.sessionInfo.performance_metrics?.cloudflareBypass ? '✅ Active' : '❌ Disabled'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Database Status Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-gray-900">Database</h3>
              <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                Connected
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {metrics.totalListings.toLocaleString()}
            </div>
            <div className="text-sm text-gray-500 mb-3">Total listings</div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Success Rate:</span>
                <span className="font-medium text-green-600">
                  {metrics.sessionInfo.success_rate || 0}%
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Pages Processed:</span>
                <span className="font-medium">{metrics.sessionInfo.pages_processed || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Method:</span>
                <span className="font-medium capitalize">
                  {(metrics.sessionInfo.method || 'standard').replace(/[-_]/g, ' ')}
                </span>
              </div>
            </div>
          </div>

          {/* Enhanced Field Completion Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-gray-900">Field Completion Rate</h3>
              <div className="text-right">
                <div className="text-sm text-gray-500">Target: 95%+</div>
              </div>
            </div>
            <div className="text-center mb-4">
              <div className="text-4xl font-bold text-gray-900 mb-2">
                {metrics.fieldCompletionRate}%
              </div>
              <div className="flex justify-center space-x-2">
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                  {metrics.fieldCompletionRate >= 95 ? 'Exceeds Apify Standard' : 
                   metrics.fieldCompletionRate >= 80 ? 'High Quality' :
                   metrics.fieldCompletionRate >= 60 ? 'Good Quality' : 'Needs Improvement'}
                </span>
              </div>
            </div>
            
            {/* Progress indicators for each field */}
            <div className="space-y-2">
              {Object.entries(metrics.extractionRates).map(([field, rate]) => (
                <div key={field} className="flex items-center justify-between text-sm">
                  <span className="capitalize text-gray-600">{field}:</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          rate >= 90 ? 'bg-green-500' :
                          rate >= 70 ? 'bg-yellow-500' :
                          rate >= 50 ? 'bg-orange-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(rate, 100)}%` }}
                      ></div>
                    </div>
                    <span className="font-medium w-12 text-right">{rate}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Detailed Extraction Metrics */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Extraction Quality Metrics</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(metrics.extractionRates).map(([field, rate]) => {
            const getTargetRate = (field: string) => {
              switch (field) {
                case 'title': return 95;
                case 'price': return 100;
                case 'revenue': return 80;
                case 'multiple': return 75;
                case 'category': return 90;
                default: return 80;
              }
            };

            const target = getTargetRate(field);
            const status = rate >= target ? 'excellent' : 
                         rate >= target * 0.8 ? 'good' : 
                         rate >= target * 0.6 ? 'fair' : 'poor';

            return (
              <div key={field} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-900 capitalize">
                    {field} Extraction
                  </h4>
                  <span className={`px-2 py-1 text-xs font-medium rounded ${
                    status === 'excellent' ? 'bg-green-100 text-green-800' :
                    status === 'good' ? 'bg-blue-100 text-blue-800' :
                    status === 'fair' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {status === 'excellent' ? 'Excellent' :
                     status === 'good' ? 'Good' :
                     status === 'fair' ? 'Fair' : 'Needs Work'}
                  </span>
                </div>
                
                {/* Progress Circle */}
                <div className="flex items-center justify-between">
                  <div className="relative">
                    <svg className="w-16 h-16" viewBox="0 0 36 36">
                      <path
                        className="text-gray-200"
                        stroke="currentColor"
                        strokeWidth="2"
                        fill="transparent"
                        d="M18 2.0845
                          a 15.9155 15.9155 0 0 1 0 31.831
                          a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className={`${
                          status === 'excellent' ? 'text-green-500' :
                          status === 'good' ? 'text-blue-500' :
                          status === 'fair' ? 'text-yellow-500' :
                          'text-red-500'
                        }`}
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        fill="transparent"
                        strokeDasharray={`${rate}, 100`}
                        d="M18 2.0845
                          a 15.9155 15.9155 0 0 1 0 31.831
                          a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg font-bold text-gray-900">{rate}%</span>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Target: {target}%</div>
                    <div className={`text-sm font-medium ${
                      rate >= target ? 'text-green-600' : 'text-orange-600'
                    }`}>
                      {rate >= target ? '✅ Met' : `📈 Need +${target - rate}%`}
                    </div>
                  </div>
                </div>

                {/* Success Rate Indicator */}
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Success Rate</span>
                    <span>{rate}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${
                        status === 'excellent' ? 'bg-green-500' :
                        status === 'good' ? 'bg-blue-500' :
                        status === 'fair' ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(rate, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        </div>

        {/* Enhanced Recent Extractions */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Recent Extractions</h2>
            <div className="flex items-center space-x-2 mt-2 sm:mt-0">
              <span className="text-sm text-gray-500">
                Latest 10 listings
              </span>
              <button
                onClick={fetchMetrics}
                className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">

          <div className="overflow-x-auto">
            {/* Mobile-friendly view for small screens */}
            <div className="block sm:hidden">
              {metrics.recentExtractions.map((listing, index) => (
                <div key={listing.id} className="p-4 border-b border-gray-200">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 text-sm truncate">
                        {listing.title || 'Untitled Business'}
                      </h4>
                      <p className="text-xs text-gray-500">ID: {listing.id}</p>
                    </div>
                    <div className="flex items-center">
                      <span className={`text-sm font-medium ${
                        listing.extraction_quality_score >= 90 ? 'text-green-600' :
                        listing.extraction_quality_score >= 70 ? 'text-blue-600' :
                        listing.extraction_quality_score >= 50 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {listing.extraction_quality_score}%
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-500">Price:</span>
                      <span className="ml-1 font-medium">
                        {listing.price ? `$${listing.price.toLocaleString()}` : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Revenue:</span>
                      <span className="ml-1 font-medium">
                        {listing.monthly_revenue ? `$${listing.monthly_revenue.toLocaleString()}` : '$0'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Multiple:</span>
                      <span className="ml-1 font-medium">
                        {listing.multiple ? `${listing.multiple}x` : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Category:</span>
                      <span className="ml-1 font-medium">
                        {listing.category || 'Unknown'}
                      </span>
                    </div>
                  </div>
                  {listing.url && (
                    <a
                      href={listing.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      View Listing →
                    </a>
                  )}
                </div>
              ))}
            </div>
            
            {/* Desktop table view */}
            <table className="min-w-full divide-y divide-gray-200 hidden sm:table">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Business
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Monthly Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Multiple
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quality Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {metrics.recentExtractions.map((listing, index) => (
                  <tr key={listing.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                          {listing.title || 'Untitled Business'}
                        </div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          ID: {listing.id}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {listing.price ? `$${listing.price.toLocaleString()}` : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {listing.monthly_revenue ? `$${listing.monthly_revenue.toLocaleString()}` : '$0'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {listing.multiple ? `${listing.multiple}x` : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        listing.category && listing.category !== 'Unknown'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {listing.category || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex-1">
                          <div className={`text-sm font-medium ${
                            listing.extraction_quality_score >= 90 ? 'text-green-600' :
                            listing.extraction_quality_score >= 70 ? 'text-blue-600' :
                            listing.extraction_quality_score >= 50 ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {listing.extraction_quality_score}%
                          </div>
                          <div className="w-16 bg-gray-200 rounded-full h-1.5 mt-1">
                            <div
                              className={`h-1.5 rounded-full ${
                                listing.extraction_quality_score >= 90 ? 'bg-green-500' :
                                listing.extraction_quality_score >= 70 ? 'bg-blue-500' :
                                listing.extraction_quality_score >= 50 ? 'bg-yellow-500' :
                                'bg-red-500'
                              }`}
                              style={{ width: `${listing.extraction_quality_score}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-2">
                        {listing.url && (
                          <a
                            href={listing.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            View →
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};

const formatDuration = (milliseconds: number): string => {
  const minutes = Math.floor(milliseconds / 1000 / 60);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (hours > 0) {
    return `${hours}h ${remainingMinutes}m`;
  }
  return `${remainingMinutes}m`;
};

export default EnhancedScrapingDashboard;