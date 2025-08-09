'use client';

import { useEffect, useState } from 'react';

export default function TestDashboardsPage() {
  const [results, setResults] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function testAPIs() {
      const tests = [
        { name: 'Dashboard Stats', url: '/api/dashboard/stats' },
        { name: 'Dashboard Charts', url: '/api/dashboard/charts' },
        { name: 'Dashboard Listings', url: '/api/dashboard/listings?limit=5' },
        { name: 'Monitoring Status', url: '/api/monitoring/status' }
      ];

      const testResults: any = {};

      for (const test of tests) {
        try {
          const response = await fetch(test.url);
          const data = await response.json();
          
          testResults[test.name] = {
            status: response.ok ? 'success' : 'error',
            statusCode: response.status,
            data: data
          };
        } catch (error: any) {
          testResults[test.name] = {
            status: 'error',
            error: error.message
          };
        }
      }

      setResults(testResults);
      setLoading(false);
    }

    testAPIs();
  }, []);

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Dashboard API Test Results</h1>
      
      {Object.entries(results).map(([name, result]: [string, any]) => (
        <div key={name} className="mb-8 p-6 bg-gray-50 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">
            {name} - 
            <span className={result.status === 'success' ? 'text-green-600' : 'text-red-600'}>
              {' '}{result.status === 'success' ? '✅ Success' : '❌ Error'}
            </span>
          </h2>
          
          {result.statusCode && (
            <p className="mb-2">Status Code: {result.statusCode}</p>
          )}
          
          {result.error && (
            <p className="text-red-600 mb-2">Error: {result.error}</p>
          )}
          
          {result.data && (
            <div className="bg-white p-4 rounded border">
              <pre className="text-xs overflow-auto">
                {JSON.stringify(result.data, null, 2)}
              </pre>
            </div>
          )}
        </div>
      ))}
      
      <div className="mt-8 p-6 bg-blue-50 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Quick Links to Dashboards</h2>
        <div className="space-y-2">
          <a href="/admin" className="block text-blue-600 hover:underline">
            → Admin Dashboard
          </a>
          <a href="/admin/scraping-status" className="block text-blue-600 hover:underline">
            → Scraping Status (Real-time)
          </a>
          <a href="/admin/flippa-listings" className="block text-blue-600 hover:underline">
            → Flippa Listings Browser
          </a>
          <a href="/admin/scraping" className="block text-blue-600 hover:underline">
            → Scraping Control Panel
          </a>
        </div>
      </div>
    </div>
  );
}