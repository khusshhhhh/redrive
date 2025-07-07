# Supabase Dual Database Setup Guide

This guide will help you set up Supabase as a secondary SQL database alongside your existing MongoDB setup.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Supabase Project Setup](#supabase-project-setup)
3. [Environment Configuration](#environment-configuration)
4. [Database Schema Setup](#database-schema-setup)
5. [Code Integration](#code-integration)
6. [Data Synchronization](#data-synchronization)
7. [API Usage](#api-usage)
8. [Advanced Features](#advanced-features)
9. [Troubleshooting](#troubleshooting)

## Prerequisites

- Existing Next.js application with MongoDB and Prisma
- Supabase account (free tier available)
- Node.js and npm/yarn installed

## Supabase Project Setup

1. **Create a Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Click "Start your project"
   - Create a new organization or use existing
   - Create a new project
   - Choose a region close to your users
   - Set a secure database password

2. **Get Project Credentials**
   - Navigate to Settings > API
   - Copy your Project URL
   - Copy your `anon` public key
   - Copy your `service_role` secret key (keep this secure!)

## Environment Configuration

1. **Copy Environment Variables**
   ```bash
   cp .env.example .env.local
   ```

2. **Update Environment Variables**
   ```env
   # Add these to your .env.local file
   NEXT_PUBLIC_SUPABASE_URL="https://your-project-id.supabase.co"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
   SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"
   
   # Optional feature flags
   ENABLE_DUAL_DATABASE="true"
   SUPABASE_SYNC_ON_WRITE="true"
   ```

## Database Schema Setup

1. **Run the SQL Schema**
   - Go to your Supabase Dashboard
   - Navigate to SQL Editor
   - Copy the contents of `supabase/schema.sql`
   - Execute the SQL to create all tables and indexes

2. **Enable Extensions (Optional)**
   ```sql
   -- For geographic queries
   CREATE EXTENSION IF NOT EXISTS postgis;
   
   -- For full-text search
   CREATE EXTENSION IF NOT EXISTS pg_trgm;
   ```

## Code Integration

### Using the Dual Database Service

Replace your existing Prisma-only operations with dual database operations:

```typescript
// Before (Prisma only)
const listing = await prisma.listing.create({ data: listingData });

// After (Dual database)
const result = await DualDatabaseService.createListing(listingData);
if (result.success) {
  console.log('Created in both databases:', result.mongo.id);
} else {
  console.error('Error:', result.error);
}
```

### Updating API Routes

1. **Update Existing Routes**
   - Replace direct Prisma calls with `DualDatabaseService` calls
   - See `app/api/listings/route-dual.ts` for an example

2. **Gradual Migration**
   - You can gradually migrate routes one by one
   - Keep the original route as backup during transition

### Error Handling

The dual database service handles partial failures gracefully:

```typescript
const result = await DualDatabaseService.createListing(data);

if (!result.success && result.mongo) {
  // MongoDB succeeded, Supabase failed - log and continue
  console.warn('Partial success: MongoDB ✅, Supabase ❌');
  return result.mongo;
} else if (!result.success) {
  // Both failed
  throw new Error('Complete failure');
}
```

## Data Synchronization

### Initial Data Migration

Sync existing MongoDB data to Supabase:

```bash
# Using the sync API (requires authentication)
curl -X POST http://localhost:3000/api/sync \
  -H "Content-Type: application/json" \
  -d '{"tableName": "users", "limit": 100}'

curl -X POST http://localhost:3000/api/sync \
  -H "Content-Type: application/json" \
  -d '{"tableName": "listings", "limit": 100}'
```

### Programmatic Sync

```typescript
// Sync all users
const userSync = await DualDatabaseService.syncMongoToSupabase('users');
console.log(`Synced ${userSync.synced} users, ${userSync.errors} errors`);

// Sync all listings
const listingSync = await DualDatabaseService.syncMongoToSupabase('listings');
console.log(`Synced ${listingSync.synced} listings, ${listingSync.errors} errors`);
```

## API Usage

### Regular Database Operations

Use the dual database service in your API routes:

```typescript
import { DualDatabaseService } from '@/app/libs/dual-database';

// Create operations
const result = await DualDatabaseService.createListing(data);
const result = await DualDatabaseService.createUser(data);
const result = await DualDatabaseService.createReservation(data);

// Update operations
const result = await DualDatabaseService.updateListing(id, data);
const result = await DualDatabaseService.updateUser(id, data);

// Delete operations (implemented for listings)
const result = await DualDatabaseService.deleteListing(id);
```

### Supabase-Only Operations

For advanced SQL queries, use the Supabase service:

```typescript
import { SupabaseService } from '@/app/libs/supabase-service';

// Advanced filtering
const listings = await SupabaseService.getListingsWithFilters({
  state: 'NSW',
  minPrice: 100,
  maxPrice: 500,
  fuelType: 'Petrol'
});

// Analytics
const stats = await SupabaseService.getReservationStats();

// Full-text search
const results = await SupabaseService.fullTextSearch('luxury car');
```

## Advanced Features

### Real-time Subscriptions

```typescript
import { SupabaseService } from '@/app/libs/supabase-service';

// Subscribe to new listings
const subscription = SupabaseService.subscribeToTable(
  'listings',
  (payload) => {
    console.log('New listing:', payload.new);
  }
);

// Unsubscribe when component unmounts
subscription.unsubscribe();
```

### Geographic Queries

After enabling PostGIS extension:

```sql
-- Create function for nearby listings
CREATE OR REPLACE FUNCTION nearby_listings(lat float, lng float, radius_km float)
RETURNS TABLE(
  id uuid,
  title text,
  distance_km float
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.title,
    (ST_Distance(
      ST_Point(lng, lat)::geography,
      ST_Point(l.longitude, l.latitude)::geography
    ) / 1000) as distance_km
  FROM listings l
  WHERE l.latitude IS NOT NULL 
    AND l.longitude IS NOT NULL
    AND ST_DWithin(
      ST_Point(lng, lat)::geography,
      ST_Point(l.longitude, l.latitude)::geography,
      radius_km * 1000
    )
  ORDER BY distance_km;
END;
$$ LANGUAGE plpgsql;
```

### Bulk Operations

```typescript
// Bulk update multiple listings
const updates = [
  { id: 'listing1', data: { price: 150 } },
  { id: 'listing2', data: { price: 200 } }
];

const results = await SupabaseService.bulkUpdateListings(updates);
```

## Troubleshooting

### Common Issues

1. **Environment Variables Not Loading**
   ```bash
   # Check if variables are set
   echo $NEXT_PUBLIC_SUPABASE_URL
   
   # Restart development server
   npm run dev
   ```

2. **RLS Policy Errors**
   - Ensure Row Level Security policies are correctly configured
   - Use service role key for admin operations
   - Check user authentication status

3. **Type Errors**
   ```typescript
   // Ensure you're using the correct types
   import { Database } from '@/app/types/supabase';
   ```

4. **Connection Issues**
   ```typescript
   // Test connection
   const { data, error } = await supabase.from('users').select('count');
   if (error) console.error('Connection failed:', error);
   ```

### Data Consistency

```typescript
// Validate data integrity
const checks = await SupabaseService.validateDataIntegrity();
console.log('Data validation results:', checks);
```

### Performance Optimization

1. **Indexes**: Ensure proper indexes are created (included in schema.sql)
2. **Query Optimization**: Use `select()` to only fetch needed columns
3. **Pagination**: Always use `limit()` for large datasets
4. **Connection Pooling**: Supabase handles this automatically

## Migration Strategy

### Phase 1: Setup (Week 1)
- [ ] Create Supabase project
- [ ] Set up environment variables
- [ ] Run database schema
- [ ] Test basic connection

### Phase 2: Dual Write (Week 2-3)
- [ ] Implement dual database service
- [ ] Update critical API routes (listings, users)
- [ ] Sync existing data
- [ ] Monitor for errors

### Phase 3: Advanced Features (Week 4+)
- [ ] Implement Supabase-only features
- [ ] Add real-time subscriptions
- [ ] Set up analytics queries
- [ ] Performance optimization

### Phase 4: Optional MongoDB Deprecation
- [ ] Verify data consistency
- [ ] Update all reads to use Supabase
- [ ] Remove MongoDB dependencies (if desired)

## Support

- **Supabase Docs**: [docs.supabase.com](https://docs.supabase.com)
- **PostgreSQL Docs**: [postgresql.org/docs](https://www.postgresql.org/docs/)
- **Project Issues**: Create GitHub issues for project-specific problems

## Best Practices

1. **Always handle partial failures**
2. **Use transactions for critical operations**
3. **Monitor both databases for consistency**
4. **Keep MongoDB as primary source of truth initially**
5. **Test thoroughly before production deployment**
6. **Use feature flags to control dual database behavior**