-- Add closed_at column to positions table
-- This migration fixes the "column positions.closed_at does not exist" errors

-- Add the closed_at column
ALTER TABLE positions 
ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

-- Add index for performance on queries filtering by closed_at
CREATE INDEX IF NOT EXISTS idx_positions_closed_at ON positions(closed_at) WHERE closed_at IS NOT NULL;

-- Add composite index for user queries with closed_at filter
CREATE INDEX IF NOT EXISTS idx_positions_user_open ON positions(user_address, closed_at) WHERE closed_at IS NULL;

-- Comment for documentation
COMMENT ON COLUMN positions.closed_at IS 'Timestamp when the position was closed. NULL indicates an open position.';
