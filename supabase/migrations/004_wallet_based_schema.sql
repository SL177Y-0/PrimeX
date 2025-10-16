-- Migration: Wallet-Based Authentication Schema
-- This fixes the schema to use wallet addresses as primary identifiers
-- Eliminates UUID confusion and aligns with Web3 authentication patterns

-- Step 1: Disable RLS temporarily
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE positions DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_snapshots DISABLE ROW LEVEL SECURITY;
ALTER TABLE rewards DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop existing foreign key constraints
ALTER TABLE positions DROP CONSTRAINT IF EXISTS positions_user_id_fkey;

-- Step 3: Modify positions table to use user_address as primary reference
-- Remove user_id column since we'll use user_address directly
ALTER TABLE positions DROP COLUMN IF EXISTS user_id;

-- Step 4: Create new profiles structure (rename old table first)
ALTER TABLE IF EXISTS profiles RENAME TO profiles_old;

-- Create new wallet-based profiles table
CREATE TABLE IF NOT EXISTS profiles (
  user_address TEXT PRIMARY KEY,  -- Aptos wallet address as primary key
  username TEXT,
  email TEXT,
  avatar_url TEXT,
  bio TEXT,
  twitter_handle TEXT,
  discord_handle TEXT,
  preferences JSONB DEFAULT '{}',
  total_volume_usd TEXT DEFAULT '0',
  total_transactions INTEGER DEFAULT 0,
  reputation_score INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 5: Migrate data from old profiles table if exists
INSERT INTO profiles (user_address, username, email, avatar_url, preferences, created_at, updated_at)
SELECT user_address, username, email, avatar_url, preferences, created_at, updated_at
FROM profiles_old
ON CONFLICT (user_address) DO NOTHING;

-- Step 6: Drop old profiles table
DROP TABLE IF EXISTS profiles_old CASCADE;

-- Step 7: Add foreign key to positions referencing new profiles
ALTER TABLE positions 
  ADD CONSTRAINT positions_user_address_fkey 
  FOREIGN KEY (user_address) 
  REFERENCES profiles(user_address) 
  ON DELETE CASCADE;

-- Step 8: Create comprehensive indexes
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles (username) WHERE username IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles (email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles (created_at);
CREATE INDEX IF NOT EXISTS idx_profiles_last_activity ON profiles (last_activity_at);

-- Ensure positions indexes exist
CREATE INDEX IF NOT EXISTS idx_positions_user_address ON positions (user_address);
CREATE INDEX IF NOT EXISTS idx_positions_asset_symbol ON positions (asset_symbol);
CREATE INDEX IF NOT EXISTS idx_positions_position_type ON positions (position_type);
CREATE INDEX IF NOT EXISTS idx_positions_opened_at ON positions (opened_at);

-- Step 9: Update RLS policies for wallet-based auth

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Public can view profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own positions" ON positions;
DROP POLICY IF EXISTS "Service can manage positions" ON positions;
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
DROP POLICY IF EXISTS "Service can manage transactions" ON transactions;
DROP POLICY IF EXISTS "Users can view own portfolio snapshots" ON portfolio_snapshots;
DROP POLICY IF EXISTS "Service can manage portfolio snapshots" ON portfolio_snapshots;
DROP POLICY IF EXISTS "Users can view own rewards" ON rewards;
DROP POLICY IF EXISTS "Service can manage rewards" ON rewards;

-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;

-- Profiles policies (public read for basic info, owner can update)
CREATE POLICY "Public can view profiles" 
  ON profiles FOR SELECT 
  TO anon, authenticated 
  USING (true);

CREATE POLICY "Users can update own profile" 
  ON profiles FOR UPDATE 
  USING (user_address = current_setting('app.user_address', true));

CREATE POLICY "Users can insert own profile" 
  ON profiles FOR INSERT 
  WITH CHECK (user_address = current_setting('app.user_address', true));

CREATE POLICY "Service role can manage profiles" 
  ON profiles FOR ALL 
  USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- Positions policies (users can view own, service can manage)
CREATE POLICY "Users can view own positions" 
  ON positions FOR SELECT 
  USING (
    user_address = current_setting('app.user_address', true) 
    OR current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  );

CREATE POLICY "Service role can manage positions" 
  ON positions FOR ALL 
  USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- Transactions policies
CREATE POLICY "Users can view own transactions" 
  ON transactions FOR SELECT 
  USING (
    user_address = current_setting('app.user_address', true)
    OR current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  );

CREATE POLICY "Service role can manage transactions" 
  ON transactions FOR ALL 
  USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- Portfolio snapshots policies
CREATE POLICY "Users can view own portfolio snapshots" 
  ON portfolio_snapshots FOR SELECT 
  USING (
    user_address = current_setting('app.user_address', true)
    OR current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  );

CREATE POLICY "Service role can manage portfolio snapshots" 
  ON portfolio_snapshots FOR ALL 
  USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- Rewards policies
CREATE POLICY "Users can view own rewards" 
  ON rewards FOR SELECT 
  USING (
    user_address = current_setting('app.user_address', true)
    OR current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  );

CREATE POLICY "Service role can manage rewards" 
  ON rewards FOR ALL 
  USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- Step 10: Create helper functions

-- Function to set session config (used by wallet auth service)
CREATE OR REPLACE FUNCTION set_config(
  setting_name TEXT,
  setting_value TEXT,
  is_local BOOLEAN DEFAULT TRUE
)
RETURNS TEXT AS $$
BEGIN
  PERFORM set_config(setting_name, setting_value, is_local);
  RETURN setting_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-create profile on first interaction
CREATE OR REPLACE FUNCTION create_profile_if_not_exists(wallet_address TEXT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO profiles (user_address)
  VALUES (wallet_address)
  ON CONFLICT (user_address) DO NOTHING;
  
  -- Update last activity
  UPDATE profiles 
  SET last_activity_at = NOW() 
  WHERE user_address = wallet_address;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 11: Add helpful views for analytics
CREATE OR REPLACE VIEW user_stats AS
SELECT 
  p.user_address,
  p.username,
  COUNT(DISTINCT pos.id) as total_positions,
  COUNT(DISTINCT t.id) as total_transactions,
  COALESCE(SUM(CASE WHEN pos.position_type = 'supply' THEN pos.amount_usd::numeric ELSE 0 END), 0) as total_supplied,
  COALESCE(SUM(CASE WHEN pos.position_type = 'borrow' THEN pos.amount_usd::numeric ELSE 0 END), 0) as total_borrowed,
  p.created_at,
  p.last_activity_at
FROM profiles p
LEFT JOIN positions pos ON p.user_address = pos.user_address AND pos.closed_at IS NULL
LEFT JOIN transactions t ON p.user_address = t.user_address
GROUP BY p.user_address, p.username, p.created_at, p.last_activity_at;

-- Add comments for documentation
COMMENT ON TABLE profiles IS 'User profiles indexed by Aptos wallet address (Petra wallet compatible)';
COMMENT ON COLUMN profiles.user_address IS 'Primary key: Aptos wallet address from Petra/Martian/Pontem wallet';
COMMENT ON COLUMN profiles.reputation_score IS 'User reputation based on protocol activity and behavior';
COMMENT ON FUNCTION create_profile_if_not_exists IS 'Auto-creates user profile on first wallet connection';
