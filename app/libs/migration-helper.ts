import { DualDatabaseService } from './dual-database';
import prisma from './prismadb';

/**
 * Migration Helper Utility
 * Provides utilities to gradually migrate from Prisma-only to dual database operations
 */

// Feature flag helper
export function isDualDatabaseEnabled(): boolean {
  return process.env.ENABLE_DUAL_DATABASE === 'true';
}

export function shouldSyncOnWrite(): boolean {
  return process.env.SUPABASE_SYNC_ON_WRITE === 'true';
}

/**
 * Wrapper functions that provide backwards compatibility
 * Use these to gradually migrate your existing code
 */
export class MigrationHelper {
  
  // User operations with backwards compatibility
  static async createUser(data: any) {
    if (isDualDatabaseEnabled()) {
      const result = await DualDatabaseService.createUser(data);
      
      // Handle partial failures gracefully
      if (!result.success && result.mongo) {
        console.warn('⚠️ User created in MongoDB but failed in Supabase:', result.error);
        return result.mongo;
      } else if (!result.success) {
        throw new Error(`Failed to create user: ${result.error}`);
      }
      
      console.log('✅ User created in both databases');
      return result.mongo;
    } else {
      // Fallback to original Prisma-only operation
      return await prisma.user.create({ data });
    }
  }
  
  static async updateUser(id: string, data: any) {
    if (isDualDatabaseEnabled()) {
      const result = await DualDatabaseService.updateUser(id, data);
      
      if (!result.success && result.mongo) {
        console.warn('⚠️ User updated in MongoDB but failed in Supabase:', result.error);
        return result.mongo;
      } else if (!result.success) {
        throw new Error(`Failed to update user: ${result.error}`);
      }
      
      return result.mongo;
    } else {
      return await prisma.user.update({ where: { id }, data });
    }
  }
  
  // Listing operations with backwards compatibility
  static async createListing(data: any) {
    if (isDualDatabaseEnabled()) {
      const result = await DualDatabaseService.createListing(data);
      
      if (!result.success && result.mongo) {
        console.warn('⚠️ Listing created in MongoDB but failed in Supabase:', result.error);
        return result.mongo;
      } else if (!result.success) {
        throw new Error(`Failed to create listing: ${result.error}`);
      }
      
      console.log('✅ Listing created in both databases');
      return result.mongo;
    } else {
      return await prisma.listing.create({ data });
    }
  }
  
  static async updateListing(id: string, data: any) {
    if (isDualDatabaseEnabled()) {
      const result = await DualDatabaseService.updateListing(id, data);
      
      if (!result.success && result.mongo) {
        console.warn('⚠️ Listing updated in MongoDB but failed in Supabase:', result.error);
        return result.mongo;
      } else if (!result.success) {
        throw new Error(`Failed to update listing: ${result.error}`);
      }
      
      return result.mongo;
    } else {
      return await prisma.listing.update({ where: { id }, data });
    }
  }
  
  static async deleteListing(id: string) {
    if (isDualDatabaseEnabled()) {
      const result = await DualDatabaseService.deleteListing(id);
      
      if (!result.success && result.mongo) {
        console.warn('⚠️ Listing deleted in MongoDB but failed in Supabase:', result.error);
        return result.mongo;
      } else if (!result.success) {
        throw new Error(`Failed to delete listing: ${result.error}`);
      }
      
      return result.mongo;
    } else {
      return await prisma.listing.delete({ where: { id } });
    }
  }
  
  // Reservation operations with backwards compatibility
  static async createReservation(data: any) {
    if (isDualDatabaseEnabled()) {
      const result = await DualDatabaseService.createReservation(data);
      
      if (!result.success && result.mongo) {
        console.warn('⚠️ Reservation created in MongoDB but failed in Supabase:', result.error);
        return result.mongo;
      } else if (!result.success) {
        throw new Error(`Failed to create reservation: ${result.error}`);
      }
      
      return result.mongo;
    } else {
      return await prisma.reservation.create({ data });
    }
  }
  
  static async updateReservation(id: string, data: any) {
    if (isDualDatabaseEnabled()) {
      const result = await DualDatabaseService.updateReservation(id, data);
      
      if (!result.success && result.mongo) {
        console.warn('⚠️ Reservation updated in MongoDB but failed in Supabase:', result.error);
        return result.mongo;
      } else if (!result.success) {
        throw new Error(`Failed to update reservation: ${result.error}`);
      }
      
      return result.mongo;
    } else {
      return await prisma.reservation.update({ where: { id }, data });
    }
  }
  
  // Review operations with backwards compatibility
  static async createReview(data: any) {
    if (isDualDatabaseEnabled()) {
      const result = await DualDatabaseService.createReview(data);
      
      if (!result.success && result.mongo) {
        console.warn('⚠️ Review created in MongoDB but failed in Supabase:', result.error);
        return result.mongo;
      } else if (!result.success) {
        throw new Error(`Failed to create review: ${result.error}`);
      }
      
      return result.mongo;
    } else {
      return await prisma.review.create({ data });
    }
  }
  
  // Message and Chat operations
  static async createMessage(data: any) {
    if (isDualDatabaseEnabled()) {
      const result = await DualDatabaseService.createMessage(data);
      
      if (!result.success && result.mongo) {
        console.warn('⚠️ Message created in MongoDB but failed in Supabase:', result.error);
        return result.mongo;
      } else if (!result.success) {
        throw new Error(`Failed to create message: ${result.error}`);
      }
      
      return result.mongo;
    } else {
      return await prisma.message.create({ data });
    }
  }
  
  static async createChat(data: any) {
    if (isDualDatabaseEnabled()) {
      const result = await DualDatabaseService.createChat(data);
      
      if (!result.success && result.mongo) {
        console.warn('⚠️ Chat created in MongoDB but failed in Supabase:', result.error);
        return result.mongo;
      } else if (!result.success) {
        throw new Error(`Failed to create chat: ${result.error}`);
      }
      
      return result.mongo;
    } else {
      return await prisma.chat.create({ data });
    }
  }
}

/**
 * Utility functions for migration management
 */
export class MigrationUtils {
  
  // Test dual database connection
  static async testConnections() {
    try {
      // Test MongoDB via Prisma
      const mongoTest = await prisma.user.findFirst();
      console.log('✅ MongoDB connection successful');
      
      // Test Supabase
      if (isDualDatabaseEnabled()) {
        const { DualDatabaseService } = await import('./dual-database');
        const syncResult = await DualDatabaseService.syncMongoToSupabase('users', 1);
        console.log('✅ Supabase connection successful');
      }
      
      return true;
    } catch (error) {
      console.error('❌ Database connection test failed:', error);
      return false;
    }
  }
  
  // Get migration status
  static async getMigrationStatus() {
    const status = {
      dualDatabaseEnabled: isDualDatabaseEnabled(),
      syncOnWriteEnabled: shouldSyncOnWrite(),
      mongoConnected: false,
      supabaseConnected: false,
      tables: {
        users: { mongo: 0, supabase: 0 },
        listings: { mongo: 0, supabase: 0 },
        reservations: { mongo: 0, supabase: 0 },
        reviews: { mongo: 0, supabase: 0 }
      }
    };
    
    try {
      // Check MongoDB counts
      status.tables.users.mongo = await prisma.user.count();
      status.tables.listings.mongo = await prisma.listing.count();
      status.tables.reservations.mongo = await prisma.reservation.count();
      status.tables.reviews.mongo = await prisma.review.count();
      status.mongoConnected = true;
    } catch (error) {
      console.error('MongoDB connection failed:', error);
    }
    
    if (isDualDatabaseEnabled()) {
      try {
        const supabase = (await import('./supabase')).default;
        
        // Check Supabase counts
        const usersCount = await supabase.from('users').select('count', { count: 'exact' });
        const listingsCount = await supabase.from('listings').select('count', { count: 'exact' });
        const reservationsCount = await supabase.from('reservations').select('count', { count: 'exact' });
        const reviewsCount = await supabase.from('reviews').select('count', { count: 'exact' });
        
        status.tables.users.supabase = usersCount.count || 0;
        status.tables.listings.supabase = listingsCount.count || 0;
        status.tables.reservations.supabase = reservationsCount.count || 0;
        status.tables.reviews.supabase = reviewsCount.count || 0;
        status.supabaseConnected = true;
      } catch (error) {
        console.error('Supabase connection failed:', error);
      }
    }
    
    return status;
  }
  
  // Batch sync utility
  static async batchSync(tableName: string, batchSize: number = 100) {
    if (!isDualDatabaseEnabled()) {
      throw new Error('Dual database is not enabled');
    }
    
    const { DualDatabaseService } = await import('./dual-database');
    
    let totalSynced = 0;
    let totalErrors = 0;
    let hasMore = true;
    
    while (hasMore) {
      console.log(`Syncing batch for ${tableName}...`);
      const result = await DualDatabaseService.syncMongoToSupabase(tableName, batchSize);
      
      totalSynced += result.synced;
      totalErrors += result.errors;
      
      // If we synced less than batch size, we're done
      hasMore = result.synced === batchSize;
      
      console.log(`Batch complete: ${result.synced} synced, ${result.errors} errors`);
      
      // Add a small delay to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return { totalSynced, totalErrors };
  }
}