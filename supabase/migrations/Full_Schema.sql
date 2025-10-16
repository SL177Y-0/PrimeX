-- ============================================================================
-- PrimeX Complete Database Setup
-- ============================================================================
-- This migration drops all existing tables and creates a fresh wallet-based schema
-- Combines migrations 001, 002, 003, 004 into one comprehensive setup
-- 
-- CAUTION: This will DELETE ALL EXISTING DATA!
-- Only run this on a fresh database or when you want to start over
-- ============================================================================

-- ============================================================================
-- STEP 1: Drop Everything (Clean Slate)
-- ============================================================================

-- Disable RLS temporarily
ALTER TABLE IF EXISTS profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS positions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS portfolio_snapshots DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS rewards DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS leverage_positions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS staking_positions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS swap_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS price_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS apr_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS liquidations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS system_metrics DISABLE ROW LEVEL SECURITY;

-- Drop all views
DROP VIEW IF EXISTS user_stats CASCADE;

-- Drop all tables (CASCADE removes dependent objects)
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS positions CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS portfolio_snapshots CASCADE;
DROP TABLE IF EXISTS rewards CASCADE;
DROP TABLE IF EXISTS liquidations CASCADE;
DROP TABLE IF EXISTS price_history CASCADE;
DROP TABLE IF EXISTS apr_history CASCADE;
DROP TABLE IF EXISTS system_metrics CASCADE;
DROP TABLE IF EXISTS reserve_cache CASCADE;
DROP TABLE IF EXISTS leverage_positions CASCADE;
DROP TABLE IF EXISTS staking_positions CASCADE;
DROP TABLE IF EXISTS swap_history CASCADE;

-- Drop all functions
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS create_profile_if_not_exists(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS create_profile_if_not_exists(TEXT) CASCADE;
DROP FUNCTION IF EXISTS track_connection_method(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS set_session_config(TEXT, TEXT, BOOLEAN) CASCADE;

-- ============================================================================
-- STEP 2: Enable Extensions
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;

-- ============================================================================
-- STEP 3: Create Tables (Wallet-Based Schema)
-- ============================================================================

-- Profiles: User identity based on Aptos wallet address
-- PRIMARY KEY ensures no duplicate addresses
CREATE TABLE profiles (
  user_address TEXT PRIMARY KEY,  -- Aptos wallet address (0x...) - UNIQUE, no duplicates allowed
  username TEXT UNIQUE,  -- Username must be unique if set
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
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT user_address_not_empty CHECK (user_address != ''),
  -- ✅ Allow demo-user for testing OR valid Aptos address
  CONSTRAINT user_address_format CHECK (
    user_address = 'demo-user' OR 
    user_address ~ '^0x[a-fA-F0-9]{64}$'
  )
);

-- Positions: User lending/borrowing positions
CREATE TABLE positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_address TEXT NOT NULL REFERENCES profiles(user_address) ON DELETE CASCADE,
  asset_symbol TEXT NOT NULL,
  coin_type TEXT NOT NULL,
  position_type TEXT NOT NULL CHECK (position_type IN ('supply', 'borrow')),
  amount TEXT NOT NULL,
  amount_usd TEXT NOT NULL,
  entry_price TEXT NOT NULL,
  current_price TEXT NOT NULL,
  pnl TEXT DEFAULT '0',
  pnl_percent TEXT DEFAULT '0',
  current_apr TEXT DEFAULT '0',
  opened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  closed_at TIMESTAMP WITH TIME ZONE  -- NULL = open position
);

-- Price History: Track asset prices over time
CREATE TABLE price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  price_usd DECIMAL(20, 8) NOT NULL,
  volume_24h DECIMAL(20, 8),
  market_cap DECIMAL(20, 8),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- APR History: Track interest rates over time
CREATE TABLE apr_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coin_type TEXT NOT NULL,
  symbol TEXT NOT NULL,
  supply_apr DECIMAL(8, 4) NOT NULL,
  borrow_apr DECIMAL(8, 4) NOT NULL,
  utilization DECIMAL(8, 4) NOT NULL,
  total_supplied TEXT NOT NULL,
  total_borrowed TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions: User action history
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_address TEXT NOT NULL REFERENCES profiles(user_address) ON DELETE CASCADE,  -- ✅ Added foreign key
  transaction_hash TEXT UNIQUE NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('supply', 'withdraw', 'borrow', 'repay', 'liquidation', 'swap', 'stake', 'unstake')),  -- ✅ Added swap/stake types
  asset_symbol TEXT NOT NULL,
  amount TEXT NOT NULL,
  amount_usd TEXT NOT NULL,
  gas_fee TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
  block_number BIGINT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Portfolio Snapshots: Historical PnL tracking
CREATE TABLE portfolio_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_address TEXT NOT NULL REFERENCES profiles(user_address) ON DELETE CASCADE,  -- ✅ Added foreign key
  total_supplied_usd TEXT NOT NULL,
  total_borrowed_usd TEXT NOT NULL,
  net_worth_usd TEXT NOT NULL,
  health_factor TEXT,
  total_pnl_usd TEXT DEFAULT '0',
  daily_pnl_usd TEXT DEFAULT '0',
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rewards: Track user rewards
CREATE TABLE rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_address TEXT NOT NULL REFERENCES profiles(user_address) ON DELETE CASCADE,  -- ✅ Added foreign key
  asset_symbol TEXT NOT NULL,
  reward_type TEXT NOT NULL CHECK (reward_type IN ('supply', 'borrow', 'liquidity_mining', 'staking')),  -- ✅ Added staking
  amount TEXT NOT NULL,
  amount_usd TEXT NOT NULL,
  claimed BOOLEAN DEFAULT FALSE,
  claimed_at TIMESTAMP WITH TIME ZONE,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Liquidations: Track liquidation events
CREATE TABLE liquidations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  liquidated_user TEXT NOT NULL,
  liquidator_user TEXT NOT NULL,
  collateral_asset TEXT NOT NULL,
  debt_asset TEXT NOT NULL,
  collateral_amount TEXT NOT NULL,
  debt_amount TEXT NOT NULL,
  liquidation_bonus TEXT NOT NULL,
  transaction_hash TEXT NOT NULL,
  block_number BIGINT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System Metrics: Protocol-wide statistics
CREATE TABLE system_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name TEXT NOT NULL,
  metric_value TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reserve Cache: Cache Aries protocol reserve data
CREATE TABLE reserve_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coin_type TEXT UNIQUE NOT NULL,
  symbol TEXT NOT NULL,
  data JSONB NOT NULL,
  last_fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- ============================================================================
-- NEW TABLES FOR TRADING FEATURES
-- ============================================================================

-- Leverage Positions: Track leveraged trading positions
CREATE TABLE leverage_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_address TEXT NOT NULL REFERENCES profiles(user_address) ON DELETE CASCADE,
  position_id UUID REFERENCES positions(id) ON DELETE CASCADE,
  leverage_ratio DECIMAL(4, 2) NOT NULL,  -- e.g., 2.5x, 5.0x, 10.0x
  margin_amount TEXT NOT NULL,
  margin_amount_usd TEXT NOT NULL,
  liquidation_price TEXT NOT NULL,
  current_price TEXT NOT NULL,
  funding_rate TEXT DEFAULT '0',
  unrealized_pnl TEXT DEFAULT '0',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  closed_at TIMESTAMP WITH TIME ZONE  -- NULL = open position
);

-- Staking Positions: Track liquid staking positions
CREATE TABLE staking_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_address TEXT NOT NULL REFERENCES profiles(user_address) ON DELETE CASCADE,
  stake_amount TEXT NOT NULL,
  stake_amount_usd TEXT NOT NULL,
  validator_address TEXT,
  protocol_name TEXT NOT NULL,  -- e.g., 'Amnis Finance', 'Tortuga'
  annual_percentage_yield TEXT NOT NULL,
  rewards_earned TEXT DEFAULT '0',
  rewards_claimed TEXT DEFAULT '0',
  staked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  unstaked_at TIMESTAMP WITH TIME ZONE
);

-- Swap History: Track token swap transactions
CREATE TABLE swap_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_address TEXT NOT NULL REFERENCES profiles(user_address) ON DELETE CASCADE,
  from_token TEXT NOT NULL,
  to_token TEXT NOT NULL,
  from_amount TEXT NOT NULL,
  to_amount TEXT NOT NULL,
  exchange_rate TEXT NOT NULL,
  price_impact TEXT DEFAULT '0',
  slippage TEXT DEFAULT '0',
  transaction_hash TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- STEP 4: Create Indexes for Performance
-- ============================================================================

-- Profiles indexes
CREATE INDEX idx_profiles_username ON profiles (username) WHERE username IS NOT NULL;
CREATE INDEX idx_profiles_email ON profiles (email) WHERE email IS NOT NULL;
CREATE INDEX idx_profiles_created_at ON profiles (created_at);
CREATE INDEX idx_profiles_last_activity ON profiles (last_activity_at);

-- Positions indexes
CREATE INDEX idx_positions_user_address ON positions (user_address);
CREATE INDEX idx_positions_asset_symbol ON positions (asset_symbol);
CREATE INDEX idx_positions_position_type ON positions (position_type);
CREATE INDEX idx_positions_opened_at ON positions (opened_at);
CREATE INDEX idx_positions_closed_at ON positions (closed_at) WHERE closed_at IS NOT NULL;
CREATE INDEX idx_positions_user_open ON positions (user_address, closed_at) WHERE closed_at IS NULL;

-- Price history indexes
CREATE INDEX idx_price_history_symbol ON price_history (symbol);
CREATE INDEX idx_price_history_timestamp ON price_history (timestamp);

-- APR history indexes
CREATE INDEX idx_apr_history_symbol ON apr_history (symbol);
CREATE INDEX idx_apr_history_timestamp ON apr_history (timestamp);

-- Transactions indexes
CREATE INDEX idx_transactions_user ON transactions (user_address);
CREATE INDEX idx_transactions_hash ON transactions (transaction_hash);
CREATE INDEX idx_transactions_type ON transactions (transaction_type);
CREATE INDEX idx_transactions_timestamp ON transactions (timestamp);

-- Portfolio snapshots indexes
CREATE INDEX idx_portfolio_snapshots_user ON portfolio_snapshots (user_address);
CREATE INDEX idx_portfolio_snapshots_timestamp ON portfolio_snapshots (timestamp);

-- Rewards indexes
CREATE INDEX idx_rewards_user ON rewards (user_address);
CREATE INDEX idx_rewards_asset ON rewards (asset_symbol);
CREATE INDEX idx_rewards_claimed ON rewards (claimed);

-- Liquidations indexes
CREATE INDEX idx_liquidations_liquidated ON liquidations (liquidated_user);
CREATE INDEX idx_liquidations_liquidator ON liquidations (liquidator_user);
CREATE INDEX idx_liquidations_timestamp ON liquidations (timestamp);

-- System metrics indexes
CREATE INDEX idx_system_metrics_name ON system_metrics (metric_name);
CREATE INDEX idx_system_metrics_timestamp ON system_metrics (timestamp);

-- Reserve cache indexes
CREATE INDEX idx_reserve_cache_coin_type ON reserve_cache (coin_type);
CREATE INDEX idx_reserve_cache_expires ON reserve_cache (expires_at);

-- Leverage positions indexes
CREATE INDEX idx_leverage_positions_user ON leverage_positions (user_address);
CREATE INDEX idx_leverage_positions_position ON leverage_positions (position_id);
CREATE INDEX idx_leverage_positions_closed ON leverage_positions (closed_at) WHERE closed_at IS NULL;

-- Staking positions indexes
CREATE INDEX idx_staking_positions_user ON staking_positions (user_address);
CREATE INDEX idx_staking_positions_protocol ON staking_positions (protocol_name);
CREATE INDEX idx_staking_positions_unstaked ON staking_positions (unstaked_at) WHERE unstaked_at IS NULL;

-- Swap history indexes
CREATE INDEX idx_swap_history_user ON swap_history (user_address);
CREATE INDEX idx_swap_history_hash ON swap_history (transaction_hash);
CREATE INDEX idx_swap_history_status ON swap_history (status);
CREATE INDEX idx_swap_history_timestamp ON swap_history (created_at);

-- ============================================================================
-- STEP 5: Create Helper Functions
-- ============================================================================

-- Trigger function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON profiles 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_positions_updated_at 
  BEFORE UPDATE ON positions 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Function to set session config (used by wallet auth service)
-- Note: Using custom name to avoid conflict with built-in set_config
CREATE OR REPLACE FUNCTION set_session_config(
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

-- Function to auto-create or update profile on wallet connect
-- Prevents duplicate users - uses UPSERT pattern
CREATE OR REPLACE FUNCTION create_profile_if_not_exists(
  wallet_address TEXT,
  wallet_name TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  -- Insert new profile or update existing one
  INSERT INTO profiles (
    user_address,
    preferences,
    created_at,
    updated_at,
    last_activity_at
  )
  VALUES (
    wallet_address,
    CASE 
      WHEN wallet_name IS NOT NULL THEN jsonb_build_object('wallet_name', wallet_name, 'notifications', true, 'theme', 'dark')
      ELSE '{}'::jsonb
    END,
    NOW(),
    NOW(),
    NOW()
  )
  ON CONFLICT (user_address) 
  DO UPDATE SET
    last_activity_at = NOW(),
    updated_at = NOW(),
    -- Add wallet_name to preferences if not already present
    preferences = CASE
      WHEN wallet_name IS NOT NULL AND NOT profiles.preferences ? 'wallet_name' THEN
        profiles.preferences || jsonb_build_object('wallet_name', wallet_name)
      ELSE
        profiles.preferences
    END;
    
  RAISE NOTICE 'Profile created/updated for address: %', wallet_address;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to track connection methods (prevent duplicate tracking)
CREATE OR REPLACE FUNCTION track_connection_method(
  wallet_address TEXT,
  method TEXT
)
RETURNS VOID AS $$
DECLARE
  existing_methods jsonb;
BEGIN
  -- Get existing connection methods
  SELECT preferences->'connection_methods' INTO existing_methods
  FROM profiles
  WHERE user_address = wallet_address;
  
  -- Initialize if null
  IF existing_methods IS NULL THEN
    existing_methods = '[]'::jsonb;
  END IF;
  
  -- Add method if not already tracked
  IF NOT existing_methods ? method THEN
    UPDATE profiles
    SET preferences = preferences || jsonb_build_object(
      'connection_methods',
      existing_methods || to_jsonb(ARRAY[method])
    )
    WHERE user_address = wallet_address;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 6: Create Views for Analytics
-- ============================================================================

-- User statistics view
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

-- ============================================================================
-- STEP 7: Enable Row Level Security (RLS)
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE leverage_positions ENABLE ROW LEVEL SECURITY;  -- ✅ New table
ALTER TABLE staking_positions ENABLE ROW LEVEL SECURITY;   -- ✅ New table
ALTER TABLE swap_history ENABLE ROW LEVEL SECURITY;        -- ✅ New table

-- Public tables (read-only for everyone)
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE apr_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE liquidations ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 8: Create RLS Policies
-- ============================================================================

-- Profiles: Public read, owner can update
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

-- Positions: Users can view own, service can manage
CREATE POLICY "Users can view own positions" 
  ON positions FOR SELECT 
  USING (
    user_address = current_setting('app.user_address', true) 
    OR current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  );

CREATE POLICY "Service role can manage positions" 
  ON positions FOR ALL 
  USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- Transactions: Users can view own, service can manage
CREATE POLICY "Users can view own transactions" 
  ON transactions FOR SELECT 
  USING (
    user_address = current_setting('app.user_address', true)
    OR current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  );

CREATE POLICY "Service role can manage transactions" 
  ON transactions FOR ALL 
  USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- Portfolio snapshots: Users can view own, service can manage
CREATE POLICY "Users can view own portfolio snapshots" 
  ON portfolio_snapshots FOR SELECT 
  USING (
    user_address = current_setting('app.user_address', true)
    OR current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  );

CREATE POLICY "Service role can manage portfolio snapshots" 
  ON portfolio_snapshots FOR ALL 
  USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- Rewards: Users can view own, service can manage
CREATE POLICY "Users can view own rewards" 
  ON rewards FOR SELECT 
  USING (
    user_address = current_setting('app.user_address', true)
    OR current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  );

CREATE POLICY "Service role can manage rewards" 
  ON rewards FOR ALL 
  USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- Leverage Positions: Users can view own, service can manage
CREATE POLICY "Users can view own leverage positions" 
  ON leverage_positions FOR SELECT 
  USING (
    user_address = current_setting('app.user_address', true)
    OR current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  );

CREATE POLICY "Service role can manage leverage positions" 
  ON leverage_positions FOR ALL 
  USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- Staking Positions: Users can view own, service can manage
CREATE POLICY "Users can view own staking positions" 
  ON staking_positions FOR SELECT 
  USING (
    user_address = current_setting('app.user_address', true)
    OR current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  );

CREATE POLICY "Service role can manage staking positions" 
  ON staking_positions FOR ALL 
  USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- Swap History: Users can view own, service can manage
CREATE POLICY "Users can view own swap history" 
  ON swap_history FOR SELECT 
  USING (
    user_address = current_setting('app.user_address', true)
    OR current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  );

CREATE POLICY "Service role can manage swap history" 
  ON swap_history FOR ALL 
  USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- Public data: Everyone can read
CREATE POLICY "Public read access for price history" 
  ON price_history FOR SELECT 
  TO anon, authenticated 
  USING (true);

CREATE POLICY "Public read access for APR history" 
  ON apr_history FOR SELECT 
  TO anon, authenticated 
  USING (true);

CREATE POLICY "Public read access for liquidations" 
  ON liquidations FOR SELECT 
  TO anon, authenticated 
  USING (true);

CREATE POLICY "Public read access for system metrics" 
  ON system_metrics FOR SELECT 
  TO anon, authenticated 
  USING (true);

-- Service role manages public data
CREATE POLICY "Service role can manage price history" 
  ON price_history FOR ALL 
  USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

CREATE POLICY "Service role can manage APR history" 
  ON apr_history FOR ALL 
  USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

CREATE POLICY "Service role can manage liquidations" 
  ON liquidations FOR ALL 
  USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

CREATE POLICY "Service role can manage system metrics" 
  ON system_metrics FOR ALL 
  USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- ============================================================================
-- STEP 9: Add Documentation Comments
-- ============================================================================

COMMENT ON TABLE profiles IS 'User profiles indexed by Aptos wallet address (Petra/Martian/Pontem/Google compatible). PRIMARY KEY prevents duplicate addresses.';
COMMENT ON COLUMN profiles.user_address IS 'Primary key: Unique Aptos wallet address from connected wallet (Extension/Mobile/Google). Enforces uniqueness - no duplicate users possible.';
COMMENT ON COLUMN profiles.username IS 'Optional username, must be unique if set';
COMMENT ON COLUMN profiles.reputation_score IS 'User reputation based on protocol activity and behavior';
COMMENT ON TABLE positions IS 'User lending and borrowing positions with PnL tracking';
COMMENT ON COLUMN positions.closed_at IS 'NULL indicates open position, timestamp indicates when position was closed';
COMMENT ON FUNCTION create_profile_if_not_exists(TEXT, TEXT) IS 'Creates or updates user profile on wallet connection. Uses UPSERT to prevent duplicates. Updates last_activity_at if user already exists.';
COMMENT ON FUNCTION track_connection_method IS 'Tracks which connection methods a user has used (Extension/Mobile/Google). Prevents duplicate tracking.';
COMMENT ON FUNCTION set_session_config IS 'Sets session config for RLS policies (used by wallet auth service)';
COMMENT ON VIEW user_stats IS 'Aggregated statistics per user for analytics and dashboards';

-- ============================================================================
-- STEP 10: Success Message
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ PrimeX database setup complete!';
  RAISE NOTICE '   - All tables created with wallet-based schema';
  RAISE NOTICE '   - Indexes created for performance';
  RAISE NOTICE '   - RLS policies configured';
  RAISE NOTICE '   - Ready for Petra wallet integration';
END $$;
