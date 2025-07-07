'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';

/**
 * Example React component showing how to use the dual database setup
 * This demonstrates the frontend integration patterns
 */
export default function DualDatabaseExample() {
  const [loading, setLoading] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<any>(null);

  // Example: Create a listing using the dual database
  const handleCreateListing = async () => {
    setLoading(true);
    try {
      const listingData = {
        title: "Test Vehicle",
        description: "A test vehicle for dual database demo",
        category: "Car",
        company: "Toyota",
        modal: "Camry",
        year: 2023,
        fuelType: "Petrol",
        driveChain: "FWD",
        price: 150,
        state: "NSW",
        suburb: "Sydney",
        address: "123 Test Street",
        guestCount: 4,
        doorCount: 4,
        sleepCount: 2
      };

      // This would call the dual database API route
      const response = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(listingData)
      });

      if (response.ok) {
        const listing = await response.json();
        toast.success('✅ Listing created in both databases!');
        console.log('Created listing:', listing);
      } else {
        const error = await response.json();
        toast.error(`❌ Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error creating listing:', error);
      toast.error('❌ Failed to create listing');
    } finally {
      setLoading(false);
    }
  };

  // Example: Get migration status
  const handleGetMigrationStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/migration/status');
      if (response.ok) {
        const data = await response.json();
        setMigrationStatus(data.status);
        toast.success('✅ Migration status retrieved');
      } else {
        toast.error('❌ Failed to get migration status');
      }
    } catch (error) {
      console.error('Error getting migration status:', error);
      toast.error('❌ Failed to get migration status');
    } finally {
      setLoading(false);
    }
  };

  // Example: Test database connections
  const handleTestConnections = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/migration/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test-connections' })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast.success('✅ Database connections successful');
        } else {
          toast.error('❌ Database connection failed');
        }
      } else {
        toast.error('❌ Connection test failed');
      }
    } catch (error) {
      console.error('Error testing connections:', error);
      toast.error('❌ Connection test failed');
    } finally {
      setLoading(false);
    }
  };

  // Example: Sync data from MongoDB to Supabase
  const handleSyncData = async (tableName: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableName, limit: 10 })
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`✅ Synced ${data.synced} ${tableName} records`);
      } else {
        const error = await response.json();
        toast.error(`❌ Sync failed: ${error.error}`);
      }
    } catch (error) {
      console.error('Error syncing data:', error);
      toast.error('❌ Sync failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Dual Database Integration Examples</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Database Operations */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Database Operations</h2>
          <div className="space-y-3">
            <button
              onClick={handleCreateListing}
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Test Listing'}
            </button>
            
            <button
              onClick={handleTestConnections}
              disabled={loading}
              className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
            >
              {loading ? 'Testing...' : 'Test Connections'}
            </button>
          </div>
        </div>

        {/* Migration Tools */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Migration Tools</h2>
          <div className="space-y-3">
            <button
              onClick={handleGetMigrationStatus}
              disabled={loading}
              className="w-full px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Get Migration Status'}
            </button>
            
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleSyncData('users')}
                disabled={loading}
                className="px-3 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50 text-sm"
              >
                Sync Users
              </button>
              <button
                onClick={() => handleSyncData('listings')}
                disabled={loading}
                className="px-3 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50 text-sm"
              >
                Sync Listings
              </button>
            </div>
          </div>
        </div>

        {/* Migration Status Display */}
        {migrationStatus && (
          <div className="md:col-span-2 bg-gray-50 p-4 rounded-lg">
            <h2 className="text-lg font-semibold mb-4">Migration Status</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="font-medium">Dual DB Enabled:</p>
                <p className={migrationStatus.dualDatabaseEnabled ? 'text-green-600' : 'text-red-600'}>
                  {migrationStatus.dualDatabaseEnabled ? '✅ Yes' : '❌ No'}
                </p>
              </div>
              <div>
                <p className="font-medium">MongoDB:</p>
                <p className={migrationStatus.mongoConnected ? 'text-green-600' : 'text-red-600'}>
                  {migrationStatus.mongoConnected ? '✅ Connected' : '❌ Disconnected'}
                </p>
              </div>
              <div>
                <p className="font-medium">Supabase:</p>
                <p className={migrationStatus.supabaseConnected ? 'text-green-600' : 'text-red-600'}>
                  {migrationStatus.supabaseConnected ? '✅ Connected' : '❌ Disconnected'}
                </p>
              </div>
              <div>
                <p className="font-medium">Sync on Write:</p>
                <p className={migrationStatus.syncOnWriteEnabled ? 'text-green-600' : 'text-gray-600'}>
                  {migrationStatus.syncOnWriteEnabled ? '✅ Enabled' : '⭕ Disabled'}
                </p>
              </div>
            </div>
            
            <div className="mt-4">
              <h3 className="font-medium mb-2">Record Counts:</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                {Object.entries(migrationStatus.tables).map(([table, counts]: [string, any]) => (
                  <div key={table} className="bg-white p-2 rounded">
                    <p className="font-medium capitalize">{table}:</p>
                    <p>MongoDB: {counts.mongo}</p>
                    <p>Supabase: {counts.supabase}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Usage Examples */}
      <div className="mt-8 bg-gray-50 p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-4">Code Examples</h2>
        <div className="space-y-4">
          
          <div>
            <h3 className="font-medium mb-2">1. Using MigrationHelper (Backwards Compatible):</h3>
            <pre className="bg-gray-800 text-green-400 p-3 rounded text-sm overflow-x-auto">
{`import { MigrationHelper } from '@/app/libs/migration-helper';

// This works whether dual database is enabled or not
const listing = await MigrationHelper.createListing(data);`}
            </pre>
          </div>

          <div>
            <h3 className="font-medium mb-2">2. Using DualDatabaseService (Direct):</h3>
            <pre className="bg-gray-800 text-green-400 p-3 rounded text-sm overflow-x-auto">
{`import { DualDatabaseService } from '@/app/libs/dual-database';

const result = await DualDatabaseService.createListing(data);
if (result.success) {
  console.log('Created in both databases');
} else {
  console.log('Partial failure:', result.error);
}`}
            </pre>
          </div>

          <div>
            <h3 className="font-medium mb-2">3. Supabase-Only Advanced Queries:</h3>
            <pre className="bg-gray-800 text-green-400 p-3 rounded text-sm overflow-x-auto">
{`import { SupabaseService } from '@/app/libs/supabase-service';

// Advanced filtering
const listings = await SupabaseService.getListingsWithFilters({
  state: 'NSW',
  minPrice: 100,
  maxPrice: 500
});

// Real-time subscriptions
const subscription = SupabaseService.subscribeToTable(
  'listings',
  (payload) => console.log('New listing:', payload)
);`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}