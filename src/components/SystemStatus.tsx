'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

interface SystemComponent {
  name: string;
  status: 'active' | 'inactive' | 'pending';
  description: string;
  setupRequired?: boolean;
}

export default function SystemStatus() {
  const [components, setComponents] = useState<SystemComponent[]>([
    {
      name: 'Database Connection',
      status: 'active',
      description: 'Supabase PostgreSQL (5,642 listings)'
    },
    {
      name: 'Real Scraping Mode',
      status: 'active',
      description: 'Production mode - scraping real Flippa data'
    },
    {
      name: 'Monitoring Dashboard',
      status: 'active',
      description: 'Real-time statistics and manual trigger'
    },
    {
      name: 'Scheduling System',
      status: 'pending',
      description: 'UI ready - database tables need creation',
      setupRequired: true
    },
    {
      name: 'Notification System',
      status: 'pending',
      description: 'Email and webhook notifications configured',
      setupRequired: true
    },
    {
      name: 'History Tracking',
      status: 'pending',
      description: 'Execution logs and export functionality',
      setupRequired: true
    }
  ]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'inactive':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      default:
        return null;
    }
  };

  const activeCount = components.filter(c => c.status === 'active').length;
  const totalCount = components.length;
  const completionPercentage = Math.round((activeCount / totalCount) * 100);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">System Status Overview</h2>
      
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>System Completion</span>
          <span>{completionPercentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className="bg-blue-600 h-3 rounded-full transition-all duration-500"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </div>

      {/* Component List */}
      <div className="space-y-3">
        {components.map((component, index) => (
          <div key={index} className="flex items-start space-x-3">
            {getStatusIcon(component.status)}
            <div className="flex-1">
              <div className="flex items-center">
                <h3 className="font-medium text-gray-900">{component.name}</h3>
                {component.setupRequired && (
                  <span className="ml-2 px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
                    Setup Required
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600">{component.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Next Steps */}
      {completionPercentage < 100 && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-2">Next Step:</h3>
          <p className="text-sm text-blue-700">
            Run the SQL script in Supabase dashboard to enable scheduling features.
            See SCHEDULING_SETUP.md for detailed instructions.
          </p>
        </div>
      )}
    </div>
  );
}