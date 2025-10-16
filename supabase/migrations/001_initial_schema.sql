-- PrimeX Database Schema - Fixed for Supabase Cloud
-- Initial migration for Aries lending protocol integration

-- Enable necessary extensions (Supabase cloud compatible)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;

-- User profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_address TEXT UNIQUE NOT NULL,
  username TEXT,
  email TEXT,
  avatar_url TEXT,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Positions table for tracking user lending/borrowing positions
CREATE TABLE IF NOT EXISTS positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  user_address TEXT NOT NULL,
  asset_symbol TEXT NOT NULL,
  coin_type TEXT NOT NULL,
  position_type TEXT NOT NULL CHECK (position_type IN ('supply', 'borrow')),
  amount TEXT NOT NULL, -- Store as string to handle large numbers
  amount_usd TEXT NOT NULL,
  entry_price TEXT NOT NULL,
  current_price TEXT NOT NULL,
  pnl TEXT DEFAULT '0',
  pnl_percent TEXT DEFAULT '0',
  current_apr TEXT DEFAULT '0',
  opened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for positions
CREATE INDEX IF NOT EXISTS idx_positions_user_address ON positions (user_address);
CREATE INDEX IF NOT EXISTS idx_positions_asset ON positions (asset_symbol);
CREATE INDEX IF NOT EXISTS idx_positions_type ON positions (position_type);
CREATE INDEX IF NOT EXISTS idx_positions_updated ON positions (updated_at);

-- Price history table for tracking asset prices
CREATE TABLE IF NOT EXISTS price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  price_usd DECIMAL(20, 8) NOT NULL,
  volume_24h DECIMAL(20, 8),
  market_cap DECIMAL(20, 8),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_history_symbol ON price_history (symbol);
CREATE INDEX IF NOT EXISTS idx_price_history_timestamp ON price_history (timestamp);

-- APR history table for tracking interest rates
CREATE TABLE IF NOT EXISTS apr_history (
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

CREATE INDEX IF NOT EXISTS idx_apr_history_symbol ON apr_history (symbol);
CREATE INDEX IF NOT EXISTS idx_apr_history_timestamp ON apr_history (timestamp);

-- Transactions table for tracking user actions
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_address TEXT NOT NULL,
  transaction_hash TEXT UNIQUE NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('supply', 'withdraw', 'borrow', 'repay', 'liquidation')),
  asset_symbol TEXT NOT NULL,
  amount TEXT NOT NULL,
  amount_usd TEXT NOT NULL,
  gas_fee TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
  block_number BIGINT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions (user_address);
CREATE INDEX IF NOT EXISTS idx_transactions_hash ON transactions (transaction_hash);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions (transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON transactions (timestamp);

-- Portfolio snapshots for PnL tracking
CREATE TABLE IF NOT EXISTS portfolio_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_address TEXT NOT NULL,
  total_supplied_usd TEXT NOT NULL,
  total_borrowed_usd TEXT NOT NULL,
  net_worth_usd TEXT NOT NULL,
  health_factor TEXT,
  total_pnl_usd TEXT DEFAULT '0',
  daily_pnl_usd TEXT DEFAULT '0',
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_user ON portfolio_snapshots (user_address);
CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_timestamp ON portfolio_snapshots (timestamp);

-- Rewards tracking table
CREATE TABLE IF NOT EXISTS rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_address TEXT NOT NULL,
  asset_symbol TEXT NOT NULL,
  reward_type TEXT NOT NULL CHECK (reward_type IN ('supply', 'borrow', 'liquidity_mining')),
  amount TEXT NOT NULL,
  amount_usd TEXT NOT NULL,
  claimed BOOLEAN DEFAULT FALSE,
  claimed_at TIMESTAMP WITH TIME ZONE,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rewards_user ON rewards (user_address);
CREATE INDEX IF NOT EXISTS idx_rewards_asset ON rewards (asset_symbol);
CREATE INDEX IF NOT EXISTS idx_rewards_claimed ON rewards (claimed);

-- Liquidations table
CREATE TABLE IF NOT EXISTS liquidations (
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

CREATE INDEX IF NOT EXISTS idx_liquidations_liquidated ON liquidations (liquidated_user);
CREATE INDEX IF NOT EXISTS idx_liquidations_liquidator ON liquidations (liquidator_user);
CREATE INDEX IF NOT EXISTS idx_liquidations_timestamp ON liquidations (timestamp);

-- System metrics table
CREATE TABLE IF NOT EXISTS system_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name TEXT NOT NULL,
  metric_value TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_metrics_name ON system_metrics (metric_name);
CREATE INDEX IF NOT EXISTS idx_system_metrics_timestamp ON system_metrics (timestamp);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_positions_updated_at ON positions;
CREATE TRIGGER update_positions_updated_at BEFORE UPDATE ON positions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (user_address = current_setting('request.jwt.claims', true)::json->>'user_address');
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (user_address = current_setting('request.jwt.claims', true)::json->>'user_address');
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (user_address = current_setting('request.jwt.claims', true)::json->>'user_address');

-- Drop existing position policies
DROP POLICY IF EXISTS "Users can view own positions" ON positions;
DROP POLICY IF EXISTS "Service can manage positions" ON positions;

-- Positions policies
CREATE POLICY "Users can view own positions" ON positions FOR SELECT USING (user_address = current_setting('request.jwt.claims', true)::json->>'user_address');
CREATE POLICY "Service can manage positions" ON positions FOR ALL USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- Drop existing transaction policies
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
DROP POLICY IF EXISTS "Service can manage transactions" ON transactions;

-- Transactions policies
CREATE POLICY "Users can view own transactions" ON transactions FOR SELECT USING (user_address = current_setting('request.jwt.claims', true)::json->>'user_address');
CREATE POLICY "Service can manage transactions" ON transactions FOR ALL USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- Drop existing portfolio policies
DROP POLICY IF EXISTS "Users can view own portfolio snapshots" ON portfolio_snapshots;
DROP POLICY IF EXISTS "Service can manage portfolio snapshots" ON portfolio_snapshots;

-- Portfolio snapshots policies
CREATE POLICY "Users can view own portfolio snapshots" ON portfolio_snapshots FOR SELECT USING (user_address = current_setting('request.jwt.claims', true)::json->>'user_address');
CREATE POLICY "Service can manage portfolio snapshots" ON portfolio_snapshots FOR ALL USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- Drop existing reward policies
DROP POLICY IF EXISTS "Users can view own rewards" ON rewards;
DROP POLICY IF EXISTS "Service can manage rewards" ON rewards;

-- Rewards policies
CREATE POLICY "Users can view own rewards" ON rewards FOR SELECT USING (user_address = current_setting('request.jwt.claims', true)::json->>'user_address');
CREATE POLICY "Service can manage rewards" ON rewards FOR ALL USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- Drop existing public policies
DROP POLICY IF EXISTS "Public read access for price history" ON price_history;
DROP POLICY IF EXISTS "Public read access for APR history" ON apr_history;
DROP POLICY IF EXISTS "Public read access for liquidations" ON liquidations;
DROP POLICY IF EXISTS "Public read access for system metrics" ON system_metrics;

-- Public read access for price and APR history (no sensitive data)
CREATE POLICY "Public read access for price history" ON price_history FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access for APR history" ON apr_history FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access for liquidations" ON liquidations FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access for system metrics" ON system_metrics FOR SELECT TO anon, authenticated USING (true);

-- Drop existing service policies
DROP POLICY IF EXISTS "Service role can manage price history" ON price_history;
DROP POLICY IF EXISTS "Service role can manage APR history" ON apr_history;
DROP POLICY IF EXISTS "Service role can manage liquidations" ON liquidations;
DROP POLICY IF EXISTS "Service role can manage system metrics" ON system_metrics;

-- Service role can manage all data
CREATE POLICY "Service role can manage price history" ON price_history FOR ALL USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');
CREATE POLICY "Service role can manage APR history" ON apr_history FOR ALL USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');
CREATE POLICY "Service role can manage liquidations" ON liquidations FOR ALL USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');
CREATE POLICY "Service role can manage system metrics" ON system_metrics FOR ALL USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');
