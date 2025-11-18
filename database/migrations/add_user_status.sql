-- Add status column to users table for admin management

-- Create user_status enum
DO $$ BEGIN
    CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add status column to users table (default to 'active')
ALTER TABLE users
ADD COLUMN IF NOT EXISTS status user_status DEFAULT 'active';

-- Create index for status filtering
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
