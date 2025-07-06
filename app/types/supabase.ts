// TypeScript definitions for Supabase database

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          name: string | null;
          email: string | null;
          email_verified: string | null;
          number: string | null;
          image: string | null;
          hashed_password: string | null;
          created_at: string;
          updated_at: string;
          favorite_ids: string[];
          street_address: string | null;
          suburb: string | null;
          state: string | null;
          postcode: string | null;
          hobbies: string[];
          dream_destinations: string[];
          license_image: string | null;
          license_type: string | null;
          profile_verified: 'Y' | 'N';
          mongo_id: string | null;
        };
        Insert: {
          id?: string;
          name?: string | null;
          email?: string | null;
          email_verified?: string | null;
          number?: string | null;
          image?: string | null;
          hashed_password?: string | null;
          created_at?: string;
          updated_at?: string;
          favorite_ids?: string[];
          street_address?: string | null;
          suburb?: string | null;
          state?: string | null;
          postcode?: string | null;
          hobbies?: string[];
          dream_destinations?: string[];
          license_image?: string | null;
          license_type?: string | null;
          profile_verified?: 'Y' | 'N';
          mongo_id?: string | null;
        };
        Update: {
          id?: string;
          name?: string | null;
          email?: string | null;
          email_verified?: string | null;
          number?: string | null;
          image?: string | null;
          hashed_password?: string | null;
          created_at?: string;
          updated_at?: string;
          favorite_ids?: string[];
          street_address?: string | null;
          suburb?: string | null;
          state?: string | null;
          postcode?: string | null;
          hobbies?: string[];
          dream_destinations?: string[];
          license_image?: string | null;
          license_type?: string | null;
          profile_verified?: 'Y' | 'N';
          mongo_id?: string | null;
        };
      };
      
      accounts: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          provider: string;
          provider_account_id: string;
          refresh_token: string | null;
          access_token: string | null;
          expires_at: number | null;
          token_type: string | null;
          scope: string | null;
          id_token: string | null;
          session_state: string | null;
          mongo_id: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          provider: string;
          provider_account_id: string;
          refresh_token?: string | null;
          access_token?: string | null;
          expires_at?: number | null;
          token_type?: string | null;
          scope?: string | null;
          id_token?: string | null;
          session_state?: string | null;
          mongo_id?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          provider?: string;
          provider_account_id?: string;
          refresh_token?: string | null;
          access_token?: string | null;
          expires_at?: number | null;
          token_type?: string | null;
          scope?: string | null;
          id_token?: string | null;
          session_state?: string | null;
          mongo_id?: string | null;
        };
      };
      
      listings: {
        Row: {
          id: string;
          title: string;
          description: string;
          company: string;
          modal: string;
          image_srcs: string[];
          created_at: string;
          category: string;
          guest_count: number;
          door_count: number;
          sleep_count: number;
          fuel_type: string;
          fuel_economy: number | null;
          drive_chain: string;
          year: number;
          information: string | null;
          user_id: string;
          price: number;
          amenities: string[];
          badge: string | null;
          state: string;
          suburb: string;
          address: string;
          latitude: number | null;
          longitude: number | null;
          rego_number: string | null;
          rego_end_date: string | null;
          rego_image: string | null;
          cleaning_fee_option: 'YES' | 'NO' | 'UPON_RETURNING' | null;
          cleaning_fee_amount: number | null;
          return_cleaning_fee_amount: number | null;
          mongo_id: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          company: string;
          modal: string;
          image_srcs?: string[];
          created_at?: string;
          category: string;
          guest_count?: number;
          door_count?: number;
          sleep_count?: number;
          fuel_type: string;
          fuel_economy?: number | null;
          drive_chain: string;
          year: number;
          information?: string | null;
          user_id: string;
          price: number;
          amenities?: string[];
          badge?: string | null;
          state: string;
          suburb: string;
          address?: string;
          latitude?: number | null;
          longitude?: number | null;
          rego_number?: string | null;
          rego_end_date?: string | null;
          rego_image?: string | null;
          cleaning_fee_option?: 'YES' | 'NO' | 'UPON_RETURNING' | null;
          cleaning_fee_amount?: number | null;
          return_cleaning_fee_amount?: number | null;
          mongo_id?: string | null;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          company?: string;
          modal?: string;
          image_srcs?: string[];
          created_at?: string;
          category?: string;
          guest_count?: number;
          door_count?: number;
          sleep_count?: number;
          fuel_type?: string;
          fuel_economy?: number | null;
          drive_chain?: string;
          year?: number;
          information?: string | null;
          user_id?: string;
          price?: number;
          amenities?: string[];
          badge?: string | null;
          state?: string;
          suburb?: string;
          address?: string;
          latitude?: number | null;
          longitude?: number | null;
          rego_number?: string | null;
          rego_end_date?: string | null;
          rego_image?: string | null;
          cleaning_fee_option?: 'YES' | 'NO' | 'UPON_RETURNING' | null;
          cleaning_fee_amount?: number | null;
          return_cleaning_fee_amount?: number | null;
          mongo_id?: string | null;
        };
      };
      
      reservations: {
        Row: {
          id: string;
          user_id: string;
          listing_id: string;
          start_date: string;
          end_date: string;
          total_price: number;
          redrive_fee: number;
          service_fee: number;
          insurance_type: string;
          insurance_fee: number;
          total_fees: number;
          status: 'REVIEWING' | 'APPROVED' | 'DECLINED';
          created_at: string;
          mongo_id: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          listing_id: string;
          start_date: string;
          end_date: string;
          total_price: number;
          redrive_fee?: number;
          service_fee?: number;
          insurance_type: string;
          insurance_fee?: number;
          total_fees?: number;
          status?: 'REVIEWING' | 'APPROVED' | 'DECLINED';
          created_at?: string;
          mongo_id?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          listing_id?: string;
          start_date?: string;
          end_date?: string;
          total_price?: number;
          redrive_fee?: number;
          service_fee?: number;
          insurance_type?: string;
          insurance_fee?: number;
          total_fees?: number;
          status?: 'REVIEWING' | 'APPROVED' | 'DECLINED';
          created_at?: string;
          mongo_id?: string | null;
        };
      };
      
      reviews: {
        Row: {
          id: string;
          user_id: string;
          listing_id: string;
          rating: number;
          text: string;
          created_at: string;
          mongo_id: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          listing_id: string;
          rating: number;
          text: string;
          created_at?: string;
          mongo_id?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          listing_id?: string;
          rating?: number;
          text?: string;
          created_at?: string;
          mongo_id?: string | null;
        };
      };
      
      badges: {
        Row: {
          id: string;
          key: string;
          value: string;
          mongo_id: string | null;
        };
        Insert: {
          id?: string;
          key: string;
          value: string;
          mongo_id?: string | null;
        };
        Update: {
          id?: string;
          key?: string;
          value?: string;
          mongo_id?: string | null;
        };
      };
      
      chats: {
        Row: {
          id: string;
          participant_ids: string[];
          created_at: string;
          mongo_id: string | null;
        };
        Insert: {
          id?: string;
          participant_ids: string[];
          created_at?: string;
          mongo_id?: string | null;
        };
        Update: {
          id?: string;
          participant_ids?: string[];
          created_at?: string;
          mongo_id?: string | null;
        };
      };
      
      messages: {
        Row: {
          id: string;
          chat_id: string;
          sender_id: string;
          text: string | null;
          image_url: string | null;
          read_by_ids: string[];
          created_at: string;
          mongo_id: string | null;
        };
        Insert: {
          id?: string;
          chat_id: string;
          sender_id: string;
          text?: string | null;
          image_url?: string | null;
          read_by_ids?: string[];
          created_at?: string;
          mongo_id?: string | null;
        };
        Update: {
          id?: string;
          chat_id?: string;
          sender_id?: string;
          text?: string | null;
          image_url?: string | null;
          read_by_ids?: string[];
          created_at?: string;
          mongo_id?: string | null;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      profile_verified_enum: 'Y' | 'N';
      reservation_status_enum: 'REVIEWING' | 'APPROVED' | 'DECLINED';
      cleaning_fee_option_enum: 'YES' | 'NO' | 'UPON_RETURNING';
    };
  };
}