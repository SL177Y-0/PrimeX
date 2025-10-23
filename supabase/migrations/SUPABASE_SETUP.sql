-- ============================================================================
-- Aries Markets - Complete Supabase Database Schema
-- ============================================================================
-- Execute this SQL in your Supabase SQL Editor to set up all required tables,
-- indexes, and functions for the Aries Markets Lend & Borrow feature.
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLE: profiles
-- ============================================================================
-- Primary profile table referenced by walletAuthService and databaseService

CREATE TABLE IF NOT EXISTS profiles (
  user_address TEXT PRIMARY KEY,
  username TEXT,
  email TEXT,
  avatar_url TEXT,
  bio TEXT,
  twitter_handle TEXT,
  discord_handle TEXT,
  preferences JSONB DEFAULT '{}'::jsonb,
  total_volume_usd NUMERIC DEFAULT 0,
  total_transactions INTEGER DEFAULT 0,
  reputation_score NUMERIC DEFAULT 0,
  wallet_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_last_activity ON profiles(last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_wallet_name ON profiles(wallet_name) WHERE wallet_name IS NOT NULL;

COMMENT ON TABLE profiles IS 'Primary user profile table for PrimeX';
COMMENT ON COLUMN profiles.preferences IS 'JSON blob storing feature flags (e.g., *_initialized) and settings';

-- ============================================================================
-- FUNCTION: create_profile_if_not_exists
-- ============================================================================
-- Prevent duplicate profile creation when wallets connect multiple times

CREATE OR REPLACE FUNCTION create_profile_if_not_exists(
  wallet_address TEXT,
  wallet_name TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO profiles (
    user_address,
    wallet_name,
    preferences,
    created_at,
    updated_at,
    last_activity_at
  )
  VALUES (
    wallet_address,
    wallet_name,
    jsonb_build_object(),
    NOW(),
    NOW(),
    NOW()
  )
  ON CONFLICT (user_address)
  DO UPDATE SET
    wallet_name = COALESCE(EXCLUDED.wallet_name, profiles.wallet_name),
    updated_at = NOW(),
    last_activity_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_profile_if_not_exists IS 'Idempotent profile creator used by walletAuthService';

-- ============================================================================
-- FUNCTION: set_session_config (for RLS session hints)
-- ============================================================================

CREATE OR REPLACE FUNCTION set_session_config(
  setting_name TEXT,
  setting_value TEXT,
  is_local BOOLEAN DEFAULT TRUE
)
RETURNS VOID AS $$
DECLARE
  sql TEXT;
BEGIN
  IF is_local THEN
    sql := format('SELECT set_config(%L, %L, true);', setting_name, setting_value);
  ELSE
    sql := format('SELECT set_config(%L, %L, false);', setting_name, setting_value);
  END IF;
  EXECUTE sql;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION set_session_config IS 'Helper to set session variables for RLS policy checks';

-- ============================================================================
-- TABLE: reserve_cache (Aptos reserve caching)
-- ============================================================================

CREATE TABLE IF NOT EXISTS reserve_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coin_type TEXT NOT NULL UNIQUE,
  symbol TEXT,
  data JSONB NOT NULL,
  last_fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reserve_cache_coin_type ON reserve_cache(coin_type);
CREATE INDEX IF NOT EXISTS idx_reserve_cache_expires ON reserve_cache(expires_at DESC);

COMMENT ON TABLE reserve_cache IS 'Caches Aptos reserve responses for faster mobile reads';

-- ============================================================================
-- TABLE: positions (generic positions table used by databaseService)
-- ============================================================================

CREATE TABLE IF NOT EXISTS positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_address TEXT NOT NULL,
  asset_symbol TEXT,
  coin_type TEXT,
  position_type TEXT,
  amount TEXT,
  amount_usd TEXT,
  entry_price TEXT,
  current_price TEXT,
  current_apr TEXT,
  pnl TEXT,
  pnl_percent TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  closed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_positions_user ON positions(user_address);
CREATE INDEX IF NOT EXISTS idx_positions_type ON positions(position_type);
CREATE INDEX IF NOT EXISTS idx_positions_open ON positions(closed_at) WHERE closed_at IS NULL;

COMMENT ON TABLE positions IS 'Generic positions table backing lend/borrow persistence';

-- ============================================================================
-- TABLE: leverage_positions
-- ============================================================================

CREATE TABLE IF NOT EXISTS leverage_positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_address TEXT NOT NULL,
  position_id TEXT,
  leverage_ratio NUMERIC NOT NULL,
  margin_amount TEXT NOT NULL,
  margin_amount_usd TEXT NOT NULL,
  liquidation_price TEXT,
  current_price TEXT,
  funding_rate TEXT,
  unrealized_pnl TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  closed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_leverage_user ON leverage_positions(user_address);
CREATE INDEX IF NOT EXISTS idx_leverage_open ON leverage_positions(closed_at) WHERE closed_at IS NULL;

COMMENT ON TABLE leverage_positions IS 'Leverage trading positions (initialized even if empty)';

-- ============================================================================
-- TABLE: staking_positions
-- ============================================================================

CREATE TABLE IF NOT EXISTS staking_positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_address TEXT NOT NULL,
  stake_amount TEXT NOT NULL,
  stake_amount_usd TEXT NOT NULL,
  validator_address TEXT,
  protocol_name TEXT NOT NULL,
  annual_percentage_yield TEXT NOT NULL,
  rewards_earned TEXT,
  staked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  unstaked_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_staking_user ON staking_positions(user_address);
CREATE INDEX IF NOT EXISTS idx_staking_protocol ON staking_positions(protocol_name);

COMMENT ON TABLE staking_positions IS 'Liquid staking positions saved through databaseService';

-- ============================================================================
-- TABLE: swap_history
-- ============================================================================

CREATE TABLE IF NOT EXISTS swap_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_address TEXT NOT NULL,
  from_token TEXT NOT NULL,
  to_token TEXT NOT NULL,
  from_amount TEXT NOT NULL,
  to_amount TEXT NOT NULL,
  exchange_rate TEXT,
  price_impact TEXT,
  slippage TEXT,
  transaction_hash TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_swap_user ON swap_history(user_address);
CREATE INDEX IF NOT EXISTS idx_swap_status ON swap_history(status);

COMMENT ON TABLE swap_history IS 'Token swap activity logged for analytics and receipts';

-- ============================================================================
-- VIEW: user_stats (aggregated metrics consumed by walletAuthService)
-- ============================================================================

CREATE OR REPLACE VIEW user_stats AS
SELECT
  p.user_address,
  p.created_at,
  p.total_transactions,
  p.total_volume_usd,
  COALESCE(p.total_volume_usd, 0) AS total_supplied,
  0::NUMERIC AS total_borrowed,
  (
    SELECT COUNT(*)
    FROM positions pos
    WHERE pos.user_address = p.user_address
      AND (pos.closed_at IS NULL)
  ) AS total_positions,
  (
    SELECT COUNT(*)
    FROM transactions t
    WHERE t.user_address = p.user_address
  ) AS total_transactions_calc
FROM profiles p;

COMMENT ON VIEW user_stats IS 'Aggregate profile metrics exposed to the app for dashboards';

-- ============================================================================
-- TABLE: lend_borrow_positions
-- ============================================================================
-- Stores user's supply and borrow positions with real-time tracking

CREATE TABLE IF NOT EXISTS lend_borrow_positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_address TEXT NOT NULL,
  asset_symbol TEXT NOT NULL,
  coin_type TEXT NOT NULL,
  position_type TEXT NOT NULL CHECK (position_type IN ('supply', 'borrow')),
  amount TEXT NOT NULL,
  amount_usd TEXT NOT NULL,
  entry_price TEXT NOT NULL,
  current_price TEXT NOT NULL,
  current_apr TEXT NOT NULL,
  pnl TEXT,
  pnl_percent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_user_asset_position UNIQUE(user_address, asset_symbol, position_type)
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_lend_borrow_user ON lend_borrow_positions(user_address);
CREATE INDEX IF NOT EXISTS idx_lend_borrow_asset ON lend_borrow_positions(asset_symbol);
CREATE INDEX IF NOT EXISTS idx_lend_borrow_type ON lend_borrow_positions(position_type);
CREATE INDEX IF NOT EXISTS idx_lend_borrow_updated ON lend_borrow_positions(updated_at DESC);

COMMENT ON TABLE lend_borrow_positions IS 'User lending and borrowing positions from Aries Markets';
COMMENT ON COLUMN lend_borrow_positions.coin_type IS 'Full Move type e.g. 0x1::aptos_coin::AptosCoin';
COMMENT ON COLUMN lend_borrow_positions.current_apr IS 'Current APR as percentage string';

-- ============================================================================
-- TABLE: transactions
-- ============================================================================
-- Stores all Aries Markets transactions (supply, borrow, repay, withdraw)

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_address TEXT NOT NULL,
  transaction_hash TEXT UNIQUE NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('supply', 'withdraw', 'borrow', 'repay', 'claim_reward')),
  asset_symbol TEXT NOT NULL,
  amount TEXT NOT NULL,
  amount_usd TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  confirmed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tx_user ON transactions(user_address);
CREATE INDEX IF NOT EXISTS idx_tx_hash ON transactions(transaction_hash);
CREATE INDEX IF NOT EXISTS idx_tx_type ON transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_tx_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_tx_created ON transactions(created_at DESC);

COMMENT ON TABLE transactions IS 'All Aries Markets transactions';
COMMENT ON COLUMN transactions.transaction_hash IS 'Aptos blockchain transaction hash';
COMMENT ON COLUMN transactions.status IS 'pending = submitted, confirmed = on-chain, failed = reverted';

-- ============================================================================
-- TABLE: user_profiles
-- ============================================================================
-- Stores user profile information and aggregated stats

CREATE TABLE IF NOT EXISTS user_profiles (
  user_address TEXT PRIMARY KEY,
  aries_profile_name TEXT DEFAULT 'default',
  has_aries_profile BOOLEAN DEFAULT FALSE,
  total_supplied_usd NUMERIC DEFAULT 0,
  total_borrowed_usd NUMERIC DEFAULT 0,
  health_factor NUMERIC,
  net_apy NUMERIC,
  last_sync_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profile_sync ON user_profiles(last_sync_at DESC);
CREATE INDEX IF NOT EXISTS idx_profile_health ON user_profiles(health_factor) WHERE health_factor IS NOT NULL;

COMMENT ON TABLE user_profiles IS 'User profiles and aggregated portfolio stats';
COMMENT ON COLUMN user_profiles.health_factor IS 'Current health factor (NULL if no borrows)';

-- ============================================================================
-- TABLE: reserve_snapshots
-- ============================================================================
-- Historical snapshots of reserve data for analytics

CREATE TABLE IF NOT EXISTS reserve_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_symbol TEXT NOT NULL,
  coin_type TEXT NOT NULL,
  total_supplied NUMERIC NOT NULL,
  total_borrowed NUMERIC NOT NULL,
  utilization NUMERIC NOT NULL,
  supply_apr NUMERIC NOT NULL,
  borrow_apr NUMERIC NOT NULL,
  price_usd NUMERIC NOT NULL,
  snapshot_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_snapshot_asset ON reserve_snapshots(asset_symbol);
CREATE INDEX IF NOT EXISTS idx_snapshot_time ON reserve_snapshots(snapshot_at DESC);

COMMENT ON TABLE reserve_snapshots IS 'Historical reserve data for charts and analytics';

-- ============================================================================
-- FUNCTION: save_lend_borrow_position
-- ============================================================================
-- Upserts a user's lending or borrowing position

CREATE OR REPLACE FUNCTION save_lend_borrow_position(
  p_user_address TEXT,
  p_asset_symbol TEXT,
  p_coin_type TEXT,
  p_position_type TEXT,
  p_amount TEXT,
  p_amount_usd TEXT,
  p_entry_price TEXT,
  p_current_price TEXT,
  p_current_apr TEXT,
  p_pnl TEXT DEFAULT NULL,
  p_pnl_percent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO lend_borrow_positions (
    user_address, asset_symbol, coin_type, position_type,
    amount, amount_usd, entry_price, current_price, current_apr,
    pnl, pnl_percent, updated_at
  )
  VALUES (
    p_user_address, p_asset_symbol, p_coin_type, p_position_type,
    p_amount, p_amount_usd, p_entry_price, p_current_price, p_current_apr,
    p_pnl, p_pnl_percent, NOW()
  )
  ON CONFLICT (user_address, asset_symbol, position_type)
  DO UPDATE SET
    amount = EXCLUDED.amount,
    amount_usd = EXCLUDED.amount_usd,
    current_price = EXCLUDED.current_price,
    current_apr = EXCLUDED.current_apr,
    pnl = EXCLUDED.pnl,
    pnl_percent = EXCLUDED.pnl_percent,
    updated_at = NOW()
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION save_lend_borrow_position IS 'Upsert user lending/borrowing position';

-- ============================================================================
-- FUNCTION: save_transaction
-- ============================================================================
-- Records a new transaction

CREATE OR REPLACE FUNCTION save_transaction(
  p_user_address TEXT,
  p_transaction_hash TEXT,
  p_transaction_type TEXT,
  p_asset_symbol TEXT,
  p_amount TEXT,
  p_amount_usd TEXT
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO transactions (
    user_address, transaction_hash, transaction_type,
    asset_symbol, amount, amount_usd, status
  )
  VALUES (
    p_user_address, p_transaction_hash, p_transaction_type,
    p_asset_symbol, p_amount, p_amount_usd, 'pending'
  )
  ON CONFLICT (transaction_hash) DO NOTHING
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION save_transaction IS 'Record new transaction';

-- ============================================================================
-- FUNCTION: update_transaction_status
-- ============================================================================
-- Updates transaction status after blockchain confirmation

CREATE OR REPLACE FUNCTION update_transaction_status(
  p_transaction_hash TEXT,
  p_status TEXT,
  p_error_message TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE transactions
  SET 
    status = p_status,
    error_message = p_error_message,
    confirmed_at = CASE WHEN p_status = 'confirmed' THEN NOW() ELSE confirmed_at END
  WHERE transaction_hash = p_transaction_hash;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION update_transaction_status IS 'Update transaction status after blockchain confirmation';

-- ============================================================================
-- FUNCTION: get_user_portfolio
-- ============================================================================
-- Retrieves complete user portfolio with all positions

CREATE OR REPLACE FUNCTION get_user_portfolio(p_user_address TEXT)
RETURNS TABLE (
  position_type TEXT,
  asset_symbol TEXT,
  amount TEXT,
  amount_usd TEXT,
  current_apr TEXT,
  pnl TEXT,
  pnl_percent TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    lbp.position_type,
    lbp.asset_symbol,
    lbp.amount,
    lbp.amount_usd,
    lbp.current_apr,
    lbp.pnl,
    lbp.pnl_percent
  FROM lend_borrow_positions lbp
  WHERE lbp.user_address = p_user_address
  ORDER BY lbp.amount_usd DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_user_portfolio IS 'Get complete user portfolio';

-- ============================================================================
-- FUNCTION: get_user_transactions
-- ============================================================================
-- Retrieves user transaction history

CREATE OR REPLACE FUNCTION get_user_transactions(
  p_user_address TEXT,
  p_limit INT DEFAULT 50
)
RETURNS TABLE (
  transaction_hash TEXT,
  transaction_type TEXT,
  asset_symbol TEXT,
  amount TEXT,
  amount_usd TEXT,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.transaction_hash,
    t.transaction_type,
    t.asset_symbol,
    t.amount,
    t.amount_usd,
    t.status,
    t.created_at
  FROM transactions t
  WHERE t.user_address = p_user_address
  ORDER BY t.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_user_transactions IS 'Get user transaction history';

-- ============================================================================
-- FUNCTION: update_user_profile
-- ============================================================================
-- Updates user profile with aggregated stats

CREATE OR REPLACE FUNCTION update_user_profile(
  p_user_address TEXT,
  p_has_profile BOOLEAN DEFAULT NULL,
  p_total_supplied NUMERIC DEFAULT NULL,
  p_total_borrowed NUMERIC DEFAULT NULL,
  p_health_factor NUMERIC DEFAULT NULL,
  p_net_apy NUMERIC DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO user_profiles (
    user_address, 
    has_aries_profile,
    total_supplied_usd,
    total_borrowed_usd,
    health_factor,
    net_apy,
    last_sync_at
  )
  VALUES (
    p_user_address,
    COALESCE(p_has_profile, FALSE),
    COALESCE(p_total_supplied, 0),
    COALESCE(p_total_borrowed, 0),
    p_health_factor,
    p_net_apy,
    NOW()
  )
  ON CONFLICT (user_address)
  DO UPDATE SET
    has_aries_profile = COALESCE(p_has_profile, user_profiles.has_aries_profile),
    total_supplied_usd = COALESCE(p_total_supplied, user_profiles.total_supplied_usd),
    total_borrowed_usd = COALESCE(p_total_borrowed, user_profiles.total_borrowed_usd),
    health_factor = COALESCE(p_health_factor, user_profiles.health_factor),
    net_apy = COALESCE(p_net_apy, user_profiles.net_apy),
    last_sync_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION update_user_profile IS 'Update user profile with current stats';

-- ============================================================================
-- RLS (Row Level Security) Policies
-- ============================================================================
-- Enable RLS on all tables

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE reserve_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE leverage_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE staking_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE swap_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE lend_borrow_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE reserve_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own profile" ON profiles
  FOR ALL USING (auth.jwt() ->> 'sub' = user_address) WITH CHECK (auth.jwt() ->> 'sub' = user_address);

CREATE POLICY "Users cache reserves" ON reserve_cache
  FOR SELECT USING (true)
  WITH CHECK (true);

CREATE POLICY "Users manage own positions" ON positions
  FOR ALL USING (auth.jwt() ->> 'sub' = user_address) WITH CHECK (auth.jwt() ->> 'sub' = user_address);

CREATE POLICY "Users manage own leverage positions" ON leverage_positions
  FOR ALL USING (auth.jwt() ->> 'sub' = user_address) WITH CHECK (auth.jwt() ->> 'sub' = user_address);

CREATE POLICY "Users manage own staking positions" ON staking_positions
  FOR ALL USING (auth.jwt() ->> 'sub' = user_address) WITH CHECK (auth.jwt() ->> 'sub' = user_address);

CREATE POLICY "Users manage own swap history" ON swap_history
  FOR ALL USING (auth.jwt() ->> 'sub' = user_address) WITH CHECK (auth.jwt() ->> 'sub' = user_address);

-- Users can only read their own data
CREATE POLICY "Users can view own positions" ON lend_borrow_positions
  FOR SELECT USING (auth.uid()::text = user_address OR user_address = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can view own transactions" ON transactions
  FOR SELECT USING (auth.uid()::text = user_address OR user_address = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid()::text = user_address OR user_address = current_setting('request.jwt.claims', true)::json->>'sub');

-- Public can view reserve snapshots (analytics)
CREATE POLICY "Anyone can view reserve snapshots" ON reserve_snapshots
  FOR SELECT USING (true);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify setup

-- List all tables
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%lend%' OR table_name LIKE '%transaction%';

-- List all functions
-- SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name LIKE '%position%';

-- Test position save
-- SELECT save_lend_borrow_position('0xtest', 'APT', '0x1::aptos_coin::AptosCoin', 'supply', '100', '1000', '10', '10', '5.5', '0', '0');

-- Test transaction save
-- SELECT save_transaction('0xtest', '0xtxhash123', 'supply', 'APT', '100', '1000');

-- Get user portfolio
-- SELECT * FROM get_user_portfolio('0xtest');

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'PrimeX Supabase schema setup complete!';
  RAISE NOTICE 'Tables created: profiles, reserve_cache, positions, leverage_positions, staking_positions, swap_history, lend_borrow_positions, transactions, user_profiles, reserve_snapshots';
  RAISE NOTICE 'Functions created: create_profile_if_not_exists, set_session_config, save_lend_borrow_position, save_transaction, update_transaction_status, get_user_portfolio, get_user_transactions, update_user_profile';
  RAISE NOTICE 'RLS policies enabled for security';
END $$;
