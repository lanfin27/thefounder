'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Activity, FileJson } from 'lucide-react';
import PriceTrendChart from './PriceTrendChart';

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

export default function BackupViewerEnhanced() {
  const [backupData, setBackupData] = useState<BackupData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedListing, setSelectedListing] = useState<string | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    fetchBackupData();
    const interval = setInterval(fetchBackupData, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedListing && backupData?.analytics) {
      const listing = backupData.analytics.listings.find(l => l.title === selectedListing);
      if (listing) {
        // Prepare chart data
        const data = listing.changes.map((change: any) => ({
          timestamp: change.timestamp,
          price: change.newPrice,
          label: new Date(change.timestamp).toLocaleDateString()
        }));
        setChartData(data);
      }
    } else {
      setChartData([]);
    }
  }, [selectedListing, backupData]);

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
      {/* Header with Statistics */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold flex items-center">
            <FileJson className="w-5 h-5 mr-2" />
            JSON Backup Data Analysis
          </h2>
          {backupData.lastUpdated && (
            <span className="text-sm text-gray-500">
              Last scan: {new Date(backupData.lastUpdated).toLocaleString()}
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
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Listings List */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Tracked Listings</h3>
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
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
                      {listing.totalChanges} price updates
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
                      {Math.abs(listing.changes[listing.changes.length - 1].percentChange).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chart Area */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Price Trend Chart</h3>
          {selectedListing ? (
            <div>
              <h4 className="text-md font-medium text-gray-700 mb-4">{selectedListing}</h4>
              <PriceTrendChart data={chartData} height={300} />
              
              {/* Price History Table */}
              <div className="mt-6">
                <h5 className="text-sm font-medium text-gray-700 mb-2">Price History</h5>
                <div className="border rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Old Price</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">New Price</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Change</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {analytics.listings
                        .find(l => l.title === selectedListing)
                        ?.changes.map((change: any, idx: number) => (
                          <tr key={idx}>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {new Date(change.timestamp).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900 text-right">
                              ${change.oldPrice.toLocaleString()}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900 text-right">
                              ${change.newPrice.toLocaleString()}
                            </td>
                            <td className={`px-4 py-2 text-sm text-right font-medium ${
                              change.change > 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {change.change > 0 ? '+' : ''}{change.percentChange.toFixed(1)}%
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-500">
              Select a listing to view its price trend
            </div>
          )}
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Market Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-gray-600 mb-2">Price Movement Distribution</p>
            <div className="flex items-center space-x-2">
              <div className="flex-1 bg-gray-200 rounded-full h-4 overflow-hidden">
                <div 
                  className="bg-green-500 h-full"
                  style={{ width: `${(analytics.priceIncreases / analytics.totalChanges) * 100}%` }}
                />
              </div>
              <span className="text-sm text-gray-700">
                {((analytics.priceIncreases / analytics.totalChanges) * 100).toFixed(0)}% up
              </span>
            </div>
          </div>
          
          <div>
            <p className="text-sm text-gray-600 mb-2">Total Tracked Listings</p>
            <p className="text-2xl font-bold">{analytics.listings.length}</p>
          </div>
          
          <div>
            <p className="text-sm text-gray-600 mb-2">Avg Updates per Listing</p>
            <p className="text-2xl font-bold">
              {(analytics.totalChanges / analytics.listings.length).toFixed(1)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}