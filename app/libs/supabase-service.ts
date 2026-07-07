import { createClient } from '@supabase/supabase-js';
import { Database } from '@/app/types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-role-key';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn('Supabase env vars missing; using placeholder credentials for local development.');
}

// Create a service client with elevated permissions (use carefully!)
export const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey);

// Regular client for standard operations
export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey);

export class SupabaseService {
  
  // Analytics and reporting queries that leverage SQL
  static async getListingAnalytics(timeframe: 'day' | 'week' | 'month' = 'month') {
    const timeCondition = {
      day: "created_at >= NOW() - INTERVAL '1 day'",
      week: "created_at >= NOW() - INTERVAL '1 week'",
      month: "created_at >= NOW() - INTERVAL '1 month'"
    };

    const { data, error } = await supabaseAdmin.rpc('get_listing_analytics', {
      time_condition: timeCondition[timeframe]
    });

    if (error) {
      console.error('Analytics query error:', error);
      return null;
    }

    return data;
  }

  // Get listings with advanced filters using SQL
  static async getListingsWithFilters(filters: {
    state?: string;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    fuelType?: string;
    year?: { min?: number; max?: number };
    nearLocation?: { lat: number; lng: number; radiusKm: number };
  }) {
    let query = supabaseClient
      .from('listings')
      .select(`
        *,
        users:user_id (
          name,
          email,
          profile_verified
        )
      `);

    if (filters.state) {
      query = query.eq('state', filters.state);
    }

    if (filters.category) {
      query = query.eq('category', filters.category);
    }

    if (filters.minPrice) {
      query = query.gte('price', filters.minPrice);
    }

    if (filters.maxPrice) {
      query = query.lte('price', filters.maxPrice);
    }

    if (filters.fuelType) {
      query = query.eq('fuel_type', filters.fuelType);
    }

    if (filters.year?.min) {
      query = query.gte('year', filters.year.min);
    }

    if (filters.year?.max) {
      query = query.lte('year', filters.year.max);
    }

    // For location-based queries, you'd need PostGIS extension
    if (filters.nearLocation) {
      // This requires PostGIS extension to be enabled in Supabase
      const { lat, lng, radiusKm } = filters.nearLocation;
      // Note: RPC calls need to be made directly on the client, not on a query
      // This is a placeholder - you'd implement this differently
      console.log('Location filtering requires custom RPC function');
    }

    const { data, error } = await query;

    if (error) {
      console.error('Filtered listings query error:', error);
      return null;
    }

    return data;
  }

  // Get reservation statistics with SQL aggregations
  static async getReservationStats(userId?: string) {
    let query = supabaseAdmin
      .from('reservations')
      .select(`
        status,
        total_price,
        created_at,
        start_date,
        end_date,
        listings:listing_id (
          title,
          category,
          state
        )
      `);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Reservation stats error:', error);
      return null;
    }

    // Process data to get statistics
    const stats = {
      total: data?.length || 0,
      byStatus: {} as Record<string, number>,
      totalRevenue: 0,
      averagePrice: 0,
      byState: {} as Record<string, number>
    };

    data?.forEach(reservation => {
      // Count by status
      stats.byStatus[reservation.status] = (stats.byStatus[reservation.status] || 0) + 1;
      
      // Sum revenue
      stats.totalRevenue += reservation.total_price;
      
      // Count by state
      const listing = Array.isArray(reservation.listings) ? reservation.listings[0] : reservation.listings;
      if (listing?.state) {
        stats.byState[listing.state] = (stats.byState[listing.state] || 0) + 1;
      }
    });

    stats.averagePrice = stats.total > 0 ? stats.totalRevenue / stats.total : 0;

    return stats;
  }

  // Advanced search with full-text search
  static async fullTextSearch(searchTerm: string, table: 'listings' | 'users' = 'listings') {
    if (table === 'listings') {
      const { data, error } = await supabaseClient
        .from('listings')
        .select(`
          *,
          users:user_id (name, profile_verified)
        `)
        .textSearch('title', searchTerm)
        .or(`description.ilike.%${searchTerm}%,company.ilike.%${searchTerm}%`);

      if (error) {
        console.error('Full text search error:', error);
        return null;
      }

      return data;
    }

    return null;
  }

  // Get trending listings based on views/reservations
  static async getTrendingListings(limit: number = 10) {
    // This would require a views table or reservation count
    const { data, error } = await supabaseAdmin
      .from('listings')
      .select(`
        *,
        reservation_count:reservations(count),
        users:user_id (name, profile_verified)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Trending listings error:', error);
      return null;
    }

    return data;
  }

  // Get user activity timeline
  static async getUserActivity(userId: string) {
    const [listings, reservations, reviews, messages] = await Promise.all([
      supabaseClient.from('listings').select('id, title, created_at').eq('user_id', userId),
      supabaseClient.from('reservations').select('id, status, created_at, listings:listing_id(title)').eq('user_id', userId),
      supabaseClient.from('reviews').select('id, rating, created_at, listings:listing_id(title)').eq('user_id', userId),
      supabaseClient.from('messages').select('id, text, created_at, chats:chat_id(id)').eq('sender_id', userId)
    ]);

    // Combine and sort by date
    const activities = [
      ...(listings.data?.map(item => ({ ...item, type: 'listing' })) || []),
      ...(reservations.data?.map(item => ({ ...item, type: 'reservation' })) || []),
      ...(reviews.data?.map(item => ({ ...item, type: 'review' })) || []),
      ...(messages.data?.map(item => ({ ...item, type: 'message' })) || [])
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return activities;
  }

  // Bulk operations
  static async bulkUpdateListings(updates: Array<{ id: string; data: any }>) {
    const results = [];
    
    for (const update of updates) {
      const { data, error } = await supabaseAdmin
        .from('listings')
        .update(update.data)
        .eq('id', update.id)
        .select()
        .single();
      
      results.push({ id: update.id, data, error });
    }
    
    return results;
  }

  // Data validation and cleanup
  static async validateDataIntegrity() {
    const checks = [];

    // Check for orphaned records
    const orphanedReservations = await supabaseAdmin
      .from('reservations')
      .select('id, user_id, listing_id')
      .is('user_id', null)
      .or('listing_id.is.null');

    checks.push({
      check: 'orphaned_reservations',
      count: orphanedReservations.data?.length || 0,
      issues: orphanedReservations.data || []
    });

    // Check for invalid date ranges
    const invalidDateReservations = await supabaseAdmin
      .from('reservations')
      .select('id, start_date, end_date')
      .gte('start_date', 'end_date');

    checks.push({
      check: 'invalid_date_reservations',
      count: invalidDateReservations.data?.length || 0,
      issues: invalidDateReservations.data || []
    });

    return checks;
  }

  // Export data for backup/migration
  static async exportTableData(tableName: string, limit: number = 1000) {
    const { data, error } = await supabaseAdmin
      .from(tableName)
      .select('*')
      .limit(limit);

    if (error) {
      console.error(`Export error for ${tableName}:`, error);
      return null;
    }

    return {
      table: tableName,
      count: data?.length || 0,
      data,
      exported_at: new Date().toISOString()
    };
  }

  // Real-time subscriptions helper
  static subscribeToTable(
    tableName: string, 
    callback: (payload: any) => void,
    filter?: string
  ) {
    let subscription = supabaseClient
      .channel(`${tableName}_changes`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: tableName,
        filter
      }, callback);

    return subscription.subscribe();
  }

  // Geographic queries (requires PostGIS)
  static async getNearbyListings(lat: number, lng: number, radiusKm: number = 50) {
    const { data, error } = await supabaseClient.rpc('nearby_listings', {
      lat,
      lng,
      radius_km: radiusKm
    });

    if (error) {
      console.error('Nearby listings error:', error);
      return null;
    }

    return data;
  }
}