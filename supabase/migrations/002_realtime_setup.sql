-- Real-time setup for PrimeX
-- Enable real-time for tables that need live updates

-- Enable real-time for positions table
ALTER PUBLICATION supabase_realtime ADD TABLE positions;

-- Enable real-time for transactions table
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;

-- Enable real-time for portfolio snapshots
ALTER PUBLICATION supabase_realtime ADD TABLE portfolio_snapshots;

-- Enable real-time for rewards
ALTER PUBLICATION supabase_realtime ADD TABLE rewards;

-- Enable real-time for price history (for live price updates)
ALTER PUBLICATION supabase_realtime ADD TABLE price_history;

-- Enable real-time for APR history (for live rate updates)
ALTER PUBLICATION supabase_realtime ADD TABLE apr_history;

-- Create functions for real-time triggers

-- Function to notify position changes
CREATE OR REPLACE FUNCTION notify_position_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify real-time subscribers about position changes
  PERFORM pg_notify(
    'position_change',
    json_build_object(
      'user_address', COALESCE(NEW.user_address, OLD.user_address),
      'operation', TG_OP,
      'position_id', COALESCE(NEW.id, OLD.id),
      'asset_symbol', COALESCE(NEW.asset_symbol, OLD.asset_symbol)
    )::text
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Function to notify portfolio changes
CREATE OR REPLACE FUNCTION notify_portfolio_change()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify(
    'portfolio_change',
    json_build_object(
      'user_address', COALESCE(NEW.user_address, OLD.user_address),
      'operation', TG_OP,
      'snapshot_id', COALESCE(NEW.id, OLD.id)
    )::text
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Function to notify price changes
CREATE OR REPLACE FUNCTION notify_price_change()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify(
    'price_change',
    json_build_object(
      'symbol', NEW.symbol,
      'price_usd', NEW.price_usd,
      'timestamp', NEW.timestamp
    )::text
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for real-time notifications
CREATE TRIGGER position_change_trigger
  AFTER INSERT OR UPDATE OR DELETE ON positions
  FOR EACH ROW EXECUTE FUNCTION notify_position_change();

CREATE TRIGGER portfolio_change_trigger
  AFTER INSERT OR UPDATE OR DELETE ON portfolio_snapshots
  FOR EACH ROW EXECUTE FUNCTION notify_portfolio_change();

CREATE TRIGGER price_change_trigger
  AFTER INSERT ON price_history
  FOR EACH ROW EXECUTE FUNCTION notify_price_change();

-- Create indexes for real-time performance
CREATE INDEX IF NOT EXISTS idx_positions_realtime 
  ON positions (user_address, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_portfolio_realtime 
  ON portfolio_snapshots (user_address, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_price_realtime 
  ON price_history (symbol, timestamp DESC);

-- Create materialized view for fast portfolio aggregation
CREATE MATERIALIZED VIEW portfolio_summary AS
SELECT 
  p.user_address,
  COUNT(CASE WHEN p.position_type = 'supply' THEN 1 END) as supply_positions,
  COUNT(CASE WHEN p.position_type = 'borrow' THEN 1 END) as borrow_positions,
  SUM(CASE WHEN p.position_type = 'supply' THEN p.amount_usd::DECIMAL ELSE 0 END) as total_supplied_usd,
  SUM(CASE WHEN p.position_type = 'borrow' THEN p.amount_usd::DECIMAL ELSE 0 END) as total_borrowed_usd,
  SUM(p.pnl::DECIMAL) as total_pnl_usd,
  MAX(p.updated_at) as last_updated
FROM positions p
GROUP BY p.user_address;

-- Create unique index on materialized view
CREATE UNIQUE INDEX idx_portfolio_summary_user ON portfolio_summary (user_address);

-- Create function to refresh portfolio summary
CREATE OR REPLACE FUNCTION refresh_portfolio_summary()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY portfolio_summary;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to refresh portfolio summary on position changes
CREATE TRIGGER refresh_portfolio_summary_trigger
  AFTER INSERT OR UPDATE OR DELETE ON positions
  FOR EACH STATEMENT EXECUTE FUNCTION refresh_portfolio_summary();
