-- Add operating_status field to restaurants table
-- This allows restaurant owners to control when they accept orders

-- Create ENUM type for operating status
DO $$ BEGIN
    CREATE TYPE operating_status AS ENUM ('open', 'not_accepting_orders', 'closed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add operating_status column to restaurants table
ALTER TABLE restaurants
ADD COLUMN IF NOT EXISTS operating_status operating_status DEFAULT 'open';

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_restaurants_operating_status ON restaurants(operating_status);

-- Add comment to document the field
COMMENT ON COLUMN restaurants.operating_status IS 'Current operating status: open (accepting orders), not_accepting_orders (visible but not taking orders), closed (not accepting orders)';

-- Success message
SELECT 'Operating status field added successfully!' AS message;
