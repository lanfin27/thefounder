'use client';

import { useState, useEffect } from 'react';
import { 
  Activity, TrendingUp, TrendingDown, AlertCircle, 
  Filter, RefreshCw, Calendar, Search, ChevronDown,
  Eye, DollarSign, Clock, Hash, Settings
} from 'lucide-react';

interface Change {
  change_id: string;
  listing_id: string;
  change_type: 'new' | 'modified' | 'deleted' | 'restored';
  changed_fields: Array<{
    field: string;
    old_value: any;
    new_value: any;
  }>;
  change_timestamp: string;
  change_score: number;
  listing: any;
}

interface ChangeStats {
  total: number;
  new: number;
  modified: number;
  deleted: number;
  highValue: number;
  fieldFrequency: Record<string, number>;
  period: string;
}

export default function IncrementalMonitoringDashboard() {
  const [changes, setChanges] = useState<Change[]>([]);
  const [stats, setStats] = useState<ChangeStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedChange, setSelectedChange] = useState<Change | null>(null);
  const [setupStatus, setSetupStatus] = useState<any>(null);
  const [showSetup, setShowSetup] = useState(false);
  
  // Filters
  const [filters, setFilters] = useState({
    type: '',
    minScore: 0,
    days: 7,
    limit: 50
  });
  
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    checkSetup();
    fetchChanges();
  }, [filters]);

  const checkSetup = async () => {
    try {
      const response = await fetch('/api/monitoring/test-setup');
      const result = await response.json();
      if (result.success) {
        setSetupStatus(result.data);
        if (!result.data.systemReady) {
          setShowSetup(true);
        }
      }
    } catch (error) {
      console.error('Error checking setup:', error);
    }
  };

  const fetchChanges = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.type) params.append('type', filters.type);
      params.append('minScore', filters.minScore.toString());
      params.append('days', filters.days.toString());
      params.append('limit', filters.limit.toString());

      const response = await fetch(`/api/monitoring/changes?${params}`);
      const result = await response.json();

      if (result.success) {
        setChanges(result.data.changes);
        setStats(result.data.stats);
      }
    } catch (error) {
      console.error('Error fetching changes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const startIncrementalScan = async () => {
    setIsScanning(true);
    try {
      const response = await fetch('/api/monitoring/incremental', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maxPages: 5,
          checkModified: true,
          notifyHighValue: true
        })
      });

      const result = await response.json();
      if (result.success) {
        // Refresh changes after scan
        setTimeout(fetchChanges, 2000);
      }
    } catch (error) {
      console.error('Error starting scan:', error);
    } finally {
      setIsScanning(false);
    }
  };

  const getChangeTypeColor = (type: string) => {
    switch (type) {
      case 'new': return 'bg-green-100 text-green-800';
      case 'modified': return 'bg-blue-100 text-blue-800';
      case 'deleted': return 'bg-red-100 text-red-800';
      case 'restored': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-red-600';
    if (score >= 60) return 'text-orange-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-gray-600';
  };

  const filteredChanges = changes.filter(change => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        change.listing?.title?.toLowerCase().includes(term) ||
        change.listing?.property_name?.toLowerCase().includes(term) ||
        change.listing_id.includes(term)
      );
    }
    return true;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Setup Status Alert */}
      {showSetup && setupStatus && (
        <div className={`rounded-lg p-6 ${setupStatus.systemReady ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                System Setup Status: {setupStatus.summary.status}
              </h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <h4 className="font-medium mb-2">Database Tables</h4>
                  <ul className="space-y-1 text-sm">
                    <li>Enhanced Table: {setupStatus.summary.tables.enhanced}</li>
                    <li>Change Log: {setupStatus.summary.tables.changeLog}</li>
                    <li>Statistics: {setupStatus.summary.tables.stats}</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Data Status</h4>
                  <ul className="space-y-1 text-sm">
                    <li>Excel File: {setupStatus.summary.data.excelFile}</li>
                    <li>Baseline Records: {setupStatus.summary.data.baselineRecords.toLocaleString()}</li>
                  </ul>
                </div>
              </div>
              {setupStatus.instructions.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Setup Instructions:</h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    {setupStatus.instructions.map((instruction: string, idx: number) => (
                      <li key={idx}>{instruction}</li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
            <button
              onClick={() => setShowSetup(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              &times;
            </button>
          </div>
        </div>
      )}
      {/* Header with Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Incremental Monitoring</h2>
            <p className="text-gray-600 mt-1">Track changes across {stats?.total || 0} Flippa listings</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSetup(!showSetup)}
              className="px-4 py-2 rounded-lg font-medium flex items-center gap-2 bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              <Settings className="w-4 h-4" />
              Setup Status
            </button>
            <button
              onClick={startIncrementalScan}
              disabled={isScanning || !setupStatus?.systemReady}
              className={`px-6 py-2 rounded-lg font-medium flex items-center gap-2 ${
                isScanning || !setupStatus?.systemReady
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
            {isScanning ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Activity className="w-4 h-4" />
                Start Incremental Scan
              </>
            )}
          </button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Changes</p>
                <p className="text-2xl font-bold">{stats?.total || 0}</p>
              </div>
              <Hash className="w-8 h-8 text-gray-400" />
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">New Listings</p>
                <p className="text-2xl font-bold text-green-600">{stats?.new || 0}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-400" />
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Modified</p>
                <p className="text-2xl font-bold text-blue-600">{stats?.modified || 0}</p>
              </div>
              <Activity className="w-8 h-8 text-blue-400" />
            </div>
          </div>

          <div className="bg-red-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Deleted</p>
                <p className="text-2xl font-bold text-red-600">{stats?.deleted || 0}</p>
              </div>
              <TrendingDown className="w-8 h-8 text-red-400" />
            </div>
          </div>

          <div className="bg-orange-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">High Value</p>
                <p className="text-2xl font-bold text-orange-600">{stats?.highValue || 0}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-orange-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Filter className="w-5 h-5" />
          Filters
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search listings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Change Type */}
          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Types</option>
            <option value="new">New</option>
            <option value="modified">Modified</option>
            <option value="deleted">Deleted</option>
          </select>

          {/* Min Score */}
          <select
            value={filters.minScore}
            onChange={(e) => setFilters({ ...filters, minScore: parseInt(e.target.value) })}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="0">All Scores</option>
            <option value="40">Score ≥ 40</option>
            <option value="60">Score ≥ 60</option>
            <option value="80">Score ≥ 80</option>
          </select>

          {/* Time Period */}
          <select
            value={filters.days}
            onChange={(e) => setFilters({ ...filters, days: parseInt(e.target.value) })}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="1">Last 24 hours</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>

          {/* Refresh */}
          <button
            onClick={fetchChanges}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Changes List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">Recent Changes</h3>
        </div>
        
        <div className="divide-y">
          {filteredChanges.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No changes found for the selected filters
            </div>
          ) : (
            filteredChanges.map((change) => (
              <div
                key={change.change_id}
                className="p-6 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => setSelectedChange(change)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${getChangeTypeColor(change.change_type)}`}>
                        {change.change_type.toUpperCase()}
                      </span>
                      <span className={`text-sm font-bold ${getScoreColor(change.change_score)}`}>
                        Score: {change.change_score}
                      </span>
                      <span className="text-sm text-gray-500">
                        {new Date(change.change_timestamp).toLocaleString()}
                      </span>
                    </div>
                    
                    <h4 className="font-medium text-lg mb-1">
                      {change.listing?.title || `Listing ${change.listing_id}`}
                    </h4>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      {change.listing?.price && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          ${change.listing.price.toLocaleString()}
                        </span>
                      )}
                      {change.listing?.property_type && (
                        <span>{change.listing.property_type}</span>
                      )}
                      {change.listing?.category && (
                        <span>{change.listing.category}</span>
                      )}
                    </div>
                    
                    {change.change_type === 'modified' && change.changed_fields.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-600">
                          Changed: {change.changed_fields.map(f => f.field).join(', ')}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Change Details Modal */}
      {selectedChange && (
        <ChangeDetailsModal
          change={selectedChange}
          onClose={() => setSelectedChange(null)}
        />
      )}
    </div>
  );
}

// Change Details Modal Component
function ChangeDetailsModal({ change, onClose }: { change: Change; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-black opacity-30" onClick={onClose}></div>
        
        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
            <h3 className="text-xl font-bold">Change Details</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              &times;
            </button>
          </div>
          
          <div className="p-6 space-y-6">
            {/* Change Info */}
            <div>
              <h4 className="font-semibold mb-2">Change Information</h4>
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm text-gray-600">Type</dt>
                  <dd className="font-medium">{change.change_type}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-600">Score</dt>
                  <dd className="font-medium">{change.change_score}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-600">Timestamp</dt>
                  <dd className="font-medium">{new Date(change.change_timestamp).toLocaleString()}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-600">Listing ID</dt>
                  <dd className="font-medium">{change.listing_id}</dd>
                </div>
              </dl>
            </div>

            {/* Field Changes */}
            {change.change_type === 'modified' && change.changed_fields.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Field Changes</h4>
                <div className="space-y-3">
                  {change.changed_fields.map((field, index) => (
                    <div key={index} className="border rounded-lg p-4 bg-gray-50">
                      <div className="font-medium mb-2">{field.field}</div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-sm text-gray-600">Old Value:</span>
                          <div className="mt-1 p-2 bg-red-50 rounded">
                            {JSON.stringify(field.old_value)}
                          </div>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">New Value:</span>
                          <div className="mt-1 p-2 bg-green-50 rounded">
                            {JSON.stringify(field.new_value)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Listing Details */}
            {change.listing && (
              <div>
                <h4 className="font-semibold mb-2">Current Listing Data</h4>
                <div className="border rounded-lg p-4 bg-gray-50">
                  <pre className="text-sm overflow-x-auto">
                    {JSON.stringify(change.listing, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}