-- Supabase PostgreSQL Schema for Redrive App
-- This schema mirrors the Prisma MongoDB models for dual database setup

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE profile_verified_enum AS ENUM ('Y', 'N');
CREATE TYPE reservation_status_enum AS ENUM ('REVIEWING', 'APPROVED', 'DECLINED');
CREATE TYPE cleaning_fee_option_enum AS ENUM ('YES', 'NO', 'UPON_RETURNING');

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255),
    email VARCHAR(255) UNIQUE,
    email_verified TIMESTAMPTZ,
    number VARCHAR(50),
    image TEXT,
    hashed_password TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    favorite_ids UUID[] DEFAULT '{}',
    
    -- Address fields
    street_address TEXT,
    suburb VARCHAR(255),
    state VARCHAR(255),
    postcode VARCHAR(20),
    
    -- Profile fields
    hobbies TEXT[] DEFAULT '{}',
    dream_destinations TEXT[] DEFAULT '{}',
    
    -- License verification
    license_image TEXT,
    license_type VARCHAR(100),
    profile_verified profile_verified_enum DEFAULT 'N',
    
    -- MongoDB equivalent field
    mongo_id VARCHAR(24) UNIQUE
);

-- Accounts table (for NextAuth)
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    provider_account_id VARCHAR(255) NOT NULL,
    refresh_token TEXT,
    access_token TEXT,
    expires_at INTEGER,
    token_type VARCHAR(50),
    scope TEXT,
    id_token TEXT,
    session_state TEXT,
    
    -- MongoDB equivalent field
    mongo_id VARCHAR(24) UNIQUE,
    
    UNIQUE(provider, provider_account_id)
);

-- Listings table
CREATE TABLE listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    company VARCHAR(255) NOT NULL,
    modal VARCHAR(255) NOT NULL,
    image_srcs TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    category VARCHAR(100) NOT NULL,
    guest_count INTEGER DEFAULT 0,
    door_count INTEGER DEFAULT 0,
    sleep_count INTEGER DEFAULT 0,
    fuel_type VARCHAR(50) NOT NULL,
    fuel_economy DECIMAL(5,2),
    drive_chain VARCHAR(50) NOT NULL,
    year INTEGER NOT NULL,
    information TEXT,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    price INTEGER NOT NULL,
    amenities TEXT[] DEFAULT '{}',
    
    -- Badge system
    badge VARCHAR(100),
    
    -- Location fields
    state VARCHAR(100) NOT NULL,
    suburb VARCHAR(255) NOT NULL,
    address TEXT DEFAULT '',
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- Registration details
    rego_number VARCHAR(20) UNIQUE,
    rego_end_date DATE,
    rego_image TEXT,
    
    -- Cleaning fee details
    cleaning_fee_option cleaning_fee_option_enum,
    cleaning_fee_amount INTEGER,
    return_cleaning_fee_amount INTEGER,
    
    -- MongoDB equivalent field
    mongo_id VARCHAR(24) UNIQUE
);

-- Reservations table
CREATE TABLE reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_price INTEGER NOT NULL,
    redrive_fee INTEGER DEFAULT 0,
    service_fee INTEGER DEFAULT 0,
    insurance_type VARCHAR(50) NOT NULL,
    insurance_fee INTEGER DEFAULT 0,
    total_fees INTEGER DEFAULT 0,
    status reservation_status_enum DEFAULT 'REVIEWING',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- MongoDB equivalent field
    mongo_id VARCHAR(24) UNIQUE
);

-- Reviews table
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- MongoDB equivalent field
    mongo_id VARCHAR(24) UNIQUE,
    
    UNIQUE(user_id, listing_id)
);

-- Badges table
CREATE TABLE badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    
    -- MongoDB equivalent field
    mongo_id VARCHAR(24) UNIQUE
);

-- Chats table
CREATE TABLE chats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    participant_ids UUID[] NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- MongoDB equivalent field
    mongo_id VARCHAR(24) UNIQUE
);

-- Messages table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    text TEXT,
    image_url TEXT,
    read_by_ids UUID[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- MongoDB equivalent field
    mongo_id VARCHAR(24) UNIQUE
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_mongo_id ON users(mongo_id);
CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_accounts_provider ON accounts(provider, provider_account_id);
CREATE INDEX idx_listings_user_id ON listings(user_id);
CREATE INDEX idx_listings_category ON listings(category);
CREATE INDEX idx_listings_state_suburb ON listings(state, suburb);
CREATE INDEX idx_listings_mongo_id ON listings(mongo_id);
CREATE INDEX idx_reservations_user_id ON reservations(user_id);
CREATE INDEX idx_reservations_listing_id ON reservations(listing_id);
CREATE INDEX idx_reservations_status ON reservations(status);
CREATE INDEX idx_reviews_user_id ON reviews(user_id);
CREATE INDEX idx_reviews_listing_id ON reviews(listing_id);
CREATE INDEX idx_messages_chat_id ON messages(chat_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for users table
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (you can customize these based on your needs)
CREATE POLICY "Users can view their own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own data" ON users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Anyone can view listings" ON listings FOR SELECT USING (true);
CREATE POLICY "Users can create their own listings" ON listings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own listings" ON listings FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own reservations" ON reservations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create reservations" ON reservations FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view reviews" ON reviews FOR SELECT USING (true);
CREATE POLICY "Users can create reviews" ON reviews FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view chats they participate in" ON chats FOR SELECT USING (auth.uid() = ANY(participant_ids));
CREATE POLICY "Users can view messages in their chats" ON messages FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM chats 
        WHERE chats.id = messages.chat_id 
        AND auth.uid() = ANY(chats.participant_ids)
    )
);