'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Activity, FileJson } from 'lucide-react';

interface BackupData {
  success: boolean;
  data: any[];
  analytics: {
    totalChanges: number;
    priceIncreases: number;
    priceDecreases: number;
    averageChange: number;
    listings: any[];
  };
  lastUpdated: string | null;
}

export default function BackupViewer() {
  const [backupData, setBackupData] = useState<BackupData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedListing, setSelectedListing] = useState<string | null>(null);

  useEffect(() => {
    fetchBackupData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchBackupData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchBackupData = async () => {
    try {
      const response = await fetch('/api/backup/changes');
      const data = await response.json();
      setBackupData(data);
    } catch (error) {
      console.error('Error fetching backup data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!backupData || !backupData.success) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <FileJson className="w-5 h-5 mr-2" />
          Backup Data Viewer
        </h2>
        <p className="text-gray-500">No backup data available</p>
      </div>
    );
  }

  const { analytics } = backupData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold flex items-center">
            <FileJson className="w-5 h-5 mr-2" />
            JSON Backup Data
          </h2>
          {backupData.lastUpdated && (
            <span className="text-sm text-gray-500">
              Last updated: {new Date(backupData.lastUpdated).toLocaleString()}
            </span>
          )}
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Changes</p>
                <p className="text-2xl font-bold">{analytics.totalChanges}</p>
              </div>
              <Activity className="w-8 h-8 text-gray-400" />
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Price Increases</p>
                <p className="text-2xl font-bold text-green-600">{analytics.priceIncreases}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-400" />
            </div>
          </div>

          <div className="bg-red-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Price Decreases</p>
                <p className="text-2xl font-bold text-red-600">{analytics.priceDecreases}</p>
              </div>
              <TrendingDown className="w-8 h-8 text-red-400" />
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Change</p>
                <p className="text-2xl font-bold text-blue-600">
                  ${analytics.averageChange.toLocaleString()}
                </p>
              </div>
              <span className="text-2xl">💰</span>
            </div>
          </div>
        </div>

        {/* Listings with Price Trends */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Price Trends by Listing</h3>
          <div className="space-y-3">
            {analytics.listings.map((listing, index) => (
              <div
                key={index}
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  selectedListing === listing.title 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedListing(
                  selectedListing === listing.title ? null : listing.title
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{listing.title}</h4>
                    <p className="text-sm text-gray-600">
                      {listing.totalChanges} price changes
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold">
                      ${listing.latestPrice.toLocaleString()}
                    </p>
                    <div className={`flex items-center text-sm ${
                      listing.priceDirection === 'up' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {listing.priceDirection === 'up' ? (
                        <TrendingUp className="w-4 h-4 mr-1" />
                      ) : (
                        <TrendingDown className="w-4 h-4 mr-1" />
                      )}
                      {listing.priceDirection === 'up' ? 'Increased' : 'Decreased'}
                    </div>
                  </div>
                </div>

                {/* Expanded Price History */}
                {selectedListing === listing.title && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="space-y-2">
                      {listing.changes.map((change: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">
                            {new Date(change.timestamp).toLocaleString()}
                          </span>
                          <div className="flex items-center space-x-4">
                            <span className="text-gray-600">
                              ${change.oldPrice.toLocaleString()}
                            </span>
                            <span className="text-gray-400">→</span>
                            <span className={`font-medium ${
                              change.change > 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              ${change.newPrice.toLocaleString()}
                            </span>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              change.change > 0 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {change.change > 0 ? '+' : ''}{change.percentChange.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Raw Data Preview */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Raw Changes</h3>
        <div className="bg-gray-50 rounded-lg p-4 font-mono text-xs overflow-x-auto">
          <pre>{JSON.stringify(backupData.data.slice(-2), null, 2)}</pre>
        </div>
      </div>
    </div>
  );
}