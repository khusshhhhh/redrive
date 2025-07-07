import prisma from './prismadb';
import supabase from './supabase';

// Type definitions for database operations
export interface DualDatabaseResult<T> {
  mongo: T;
  supabase: any;
  success: boolean;
  error?: string;
}

// Helper function to convert MongoDB ID to UUID mapping
const mongoToUuidMap = new Map<string, string>();

// Helper function to convert Prisma model to Supabase format
function convertPrismaToSupabase(data: any, tableName: string): any {
  const converted = { ...data };
  
  // Convert id field
  if (converted.id) {
    converted.mongo_id = converted.id;
    delete converted.id;
  }
  
  // Convert camelCase to snake_case for Supabase
  const fieldMappings: Record<string, Record<string, string>> = {
    users: {
      emailVerified: 'email_verified',
      hashedPassword: 'hashed_password',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      favoriteIds: 'favorite_ids',
      streetAddress: 'street_address',
      dreamDestinations: 'dream_destinations',
      licenseImage: 'license_image',
      licenseType: 'license_type',
      profileVerified: 'profile_verified'
    },
    accounts: {
      userId: 'user_id',
      providerAccountId: 'provider_account_id',
      refreshToken: 'refresh_token',
      accessToken: 'access_token',
      expiresAt: 'expires_at',
      tokenType: 'token_type',
      idToken: 'id_token',
      sessionState: 'session_state'
    },
    listings: {
      imageSrcs: 'image_srcs',
      createdAt: 'created_at',
      guestCount: 'guest_count',
      doorCount: 'door_count',
      sleepCount: 'sleep_count',
      fuelType: 'fuel_type',
      fuelEconomy: 'fuel_economy',
      driveChain: 'drive_chain',
      userId: 'user_id',
      regoNumber: 'rego_number',
      regoEndDate: 'rego_end_date',
      regoImage: 'rego_image',
      cleaningFeeOption: 'cleaning_fee_option',
      cleaningFeeAmount: 'cleaning_fee_amount',
      returnCleaningFeeAmount: 'return_cleaning_fee_amount'
    },
    reservations: {
      userId: 'user_id',
      listingId: 'listing_id',
      startDate: 'start_date',
      endDate: 'end_date',
      totalPrice: 'total_price',
      redriveFee: 'redrive_fee',
      serviceFee: 'service_fee',
      insuranceType: 'insurance_type',
      insuranceFee: 'insurance_fee',
      totalFees: 'total_fees',
      createdAt: 'created_at'
    },
    reviews: {
      userId: 'user_id',
      listingId: 'listing_id',
      createdAt: 'created_at'
    },
    chats: {
      participantIds: 'participant_ids',
      createdAt: 'created_at'
    },
    messages: {
      chatId: 'chat_id',
      senderId: 'sender_id',
      imageUrl: 'image_url',
      readByIds: 'read_by_ids',
      createdAt: 'created_at'
    }
  };
  
  const mappings = fieldMappings[tableName] || {};
  
  Object.keys(mappings).forEach(prismaField => {
    if (converted[prismaField] !== undefined) {
      converted[mappings[prismaField]] = converted[prismaField];
      delete converted[prismaField];
    }
  });
  
  return converted;
}

// Helper function to generate UUID for new records
function generateUUID(): string {
  return crypto.randomUUID();
}

export class DualDatabaseService {
  // User operations
  static async createUser(data: any): Promise<DualDatabaseResult<any>> {
    try {
      // Create in MongoDB first
      const mongoUser = await prisma.user.create({ data });
      
      // Convert and create in Supabase
      const supabaseData = convertPrismaToSupabase(mongoUser, 'users');
      const { data: supabaseUser, error: supabaseError } = await supabase
        .from('users')
        .insert(supabaseData)
        .select()
        .single();
      
      if (supabaseError) {
        console.error('Supabase user creation error:', supabaseError);
        // Note: In production, you might want to rollback the MongoDB transaction
      }
      
      return {
        mongo: mongoUser,
        supabase: supabaseUser,
        success: !supabaseError,
        error: supabaseError?.message
      };
    } catch (error) {
      return {
        mongo: null,
        supabase: null,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  static async updateUser(id: string, data: any): Promise<DualDatabaseResult<any>> {
    try {
      // Update in MongoDB
      const mongoUser = await prisma.user.update({
        where: { id },
        data
      });
      
      // Update in Supabase
      const supabaseData = convertPrismaToSupabase(data, 'users');
      const { data: supabaseUser, error: supabaseError } = await supabase
        .from('users')
        .update(supabaseData)
        .eq('mongo_id', id)
        .select()
        .single();
      
      return {
        mongo: mongoUser,
        supabase: supabaseUser,
        success: !supabaseError,
        error: supabaseError?.message
      };
    } catch (error) {
      return {
        mongo: null,
        supabase: null,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  // Listing operations
  static async createListing(data: any): Promise<DualDatabaseResult<any>> {
    try {
      // Create in MongoDB first
      const mongoListing = await prisma.listing.create({ data });
      
      // Convert and create in Supabase
      const supabaseData = convertPrismaToSupabase(mongoListing, 'listings');
      const { data: supabaseListing, error: supabaseError } = await supabase
        .from('listings')
        .insert(supabaseData)
        .select()
        .single();
      
      if (supabaseError) {
        console.error('Supabase listing creation error:', supabaseError);
      }
      
      return {
        mongo: mongoListing,
        supabase: supabaseListing,
        success: !supabaseError,
        error: supabaseError?.message
      };
    } catch (error) {
      return {
        mongo: null,
        supabase: null,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  static async updateListing(id: string, data: any): Promise<DualDatabaseResult<any>> {
    try {
      // Update in MongoDB
      const mongoListing = await prisma.listing.update({
        where: { id },
        data
      });
      
      // Update in Supabase
      const supabaseData = convertPrismaToSupabase(data, 'listings');
      const { data: supabaseListing, error: supabaseError } = await supabase
        .from('listings')
        .update(supabaseData)
        .eq('mongo_id', id)
        .select()
        .single();
      
      return {
        mongo: mongoListing,
        supabase: supabaseListing,
        success: !supabaseError,
        error: supabaseError?.message
      };
    } catch (error) {
      return {
        mongo: null,
        supabase: null,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  static async deleteListing(id: string): Promise<DualDatabaseResult<any>> {
    try {
      // Delete from MongoDB
      const mongoListing = await prisma.listing.delete({
        where: { id }
      });
      
      // Delete from Supabase
      const { data: supabaseListing, error: supabaseError } = await supabase
        .from('listings')
        .delete()
        .eq('mongo_id', id)
        .select()
        .single();
      
      return {
        mongo: mongoListing,
        supabase: supabaseListing,
        success: !supabaseError,
        error: supabaseError?.message
      };
    } catch (error) {
      return {
        mongo: null,
        supabase: null,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  // Reservation operations
  static async createReservation(data: any): Promise<DualDatabaseResult<any>> {
    try {
      // Create in MongoDB first
      const mongoReservation = await prisma.reservation.create({ data });
      
      // Convert and create in Supabase
      const supabaseData = convertPrismaToSupabase(mongoReservation, 'reservations');
      const { data: supabaseReservation, error: supabaseError } = await supabase
        .from('reservations')
        .insert(supabaseData)
        .select()
        .single();
      
      return {
        mongo: mongoReservation,
        supabase: supabaseReservation,
        success: !supabaseError,
        error: supabaseError?.message
      };
    } catch (error) {
      return {
        mongo: null,
        supabase: null,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  static async updateReservation(id: string, data: any): Promise<DualDatabaseResult<any>> {
    try {
      // Update in MongoDB
      const mongoReservation = await prisma.reservation.update({
        where: { id },
        data
      });
      
      // Update in Supabase
      const supabaseData = convertPrismaToSupabase(data, 'reservations');
      const { data: supabaseReservation, error: supabaseError } = await supabase
        .from('reservations')
        .update(supabaseData)
        .eq('mongo_id', id)
        .select()
        .single();
      
      return {
        mongo: mongoReservation,
        supabase: supabaseReservation,
        success: !supabaseError,
        error: supabaseError?.message
      };
    } catch (error) {
      return {
        mongo: null,
        supabase: null,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  // Review operations
  static async createReview(data: any): Promise<DualDatabaseResult<any>> {
    try {
      // Create in MongoDB first
      const mongoReview = await prisma.review.create({ data });
      
      // Convert and create in Supabase
      const supabaseData = convertPrismaToSupabase(mongoReview, 'reviews');
      const { data: supabaseReview, error: supabaseError } = await supabase
        .from('reviews')
        .insert(supabaseData)
        .select()
        .single();
      
      return {
        mongo: mongoReview,
        supabase: supabaseReview,
        success: !supabaseError,
        error: supabaseError?.message
      };
    } catch (error) {
      return {
        mongo: null,
        supabase: null,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  // Chat operations
  static async createChat(data: any): Promise<DualDatabaseResult<any>> {
    try {
      // Create in MongoDB first
      const mongoChat = await prisma.chat.create({ data });
      
      // Convert and create in Supabase
      const supabaseData = convertPrismaToSupabase(mongoChat, 'chats');
      const { data: supabaseChat, error: supabaseError } = await supabase
        .from('chats')
        .insert(supabaseData)
        .select()
        .single();
      
      return {
        mongo: mongoChat,
        supabase: supabaseChat,
        success: !supabaseError,
        error: supabaseError?.message
      };
    } catch (error) {
      return {
        mongo: null,
        supabase: null,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  // Message operations
  static async createMessage(data: any): Promise<DualDatabaseResult<any>> {
    try {
      // Create in MongoDB first
      const mongoMessage = await prisma.message.create({ data });
      
      // Convert and create in Supabase
      const supabaseData = convertPrismaToSupabase(mongoMessage, 'messages');
      const { data: supabaseMessage, error: supabaseError } = await supabase
        .from('messages')
        .insert(supabaseData)
        .select()
        .single();
      
      return {
        mongo: mongoMessage,
        supabase: supabaseMessage,
        success: !supabaseError,
        error: supabaseError?.message
      };
    } catch (error) {
      return {
        mongo: null,
        supabase: null,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  // Sync operations - to sync existing MongoDB data to Supabase
  static async syncMongoToSupabase(tableName: string, limit: number = 100): Promise<{ synced: number; errors: number }> {
    let synced = 0;
    let errors = 0;
    
    try {
      switch (tableName) {
        case 'users':
          const users = await prisma.user.findMany({ take: limit });
          for (const user of users) {
            try {
              const supabaseData = convertPrismaToSupabase(user, 'users');
              const { error } = await supabase
                .from('users')
                .upsert(supabaseData, { onConflict: 'mongo_id' });
              
              if (error) {
                console.error(`Error syncing user ${user.id}:`, error);
                errors++;
              } else {
                synced++;
              }
            } catch (e) {
              errors++;
            }
          }
          break;
          
        case 'listings':
          const listings = await prisma.listing.findMany({ take: limit });
          for (const listing of listings) {
            try {
              const supabaseData = convertPrismaToSupabase(listing, 'listings');
              const { error } = await supabase
                .from('listings')
                .upsert(supabaseData, { onConflict: 'mongo_id' });
              
              if (error) {
                console.error(`Error syncing listing ${listing.id}:`, error);
                errors++;
              } else {
                synced++;
              }
            } catch (e) {
              errors++;
            }
          }
          break;
          
        // Add more cases for other tables as needed
        default:
          throw new Error(`Unsupported table: ${tableName}`);
      }
    } catch (error) {
      console.error(`Sync error for ${tableName}:`, error);
    }
    
    return { synced, errors };
  }
}