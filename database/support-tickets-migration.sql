-- Support Ticket System Migration
-- This adds/updates the necessary tables for the support ticket management system

-- Create ENUM types for support tickets
DO $$ BEGIN
    CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'pending', 'closed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create support_tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    status ticket_status DEFAULT 'open',
    priority ticket_priority DEFAULT 'medium',
    category VARCHAR(100) DEFAULT 'general',
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create ticket_replies table
CREATE TABLE IF NOT EXISTS ticket_replies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_support_tickets_restaurant_id ON support_tickets(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at);
CREATE INDEX IF NOT EXISTS idx_ticket_replies_ticket_id ON ticket_replies(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_replies_created_at ON ticket_replies(created_at);

-- Create updated_at trigger for support_tickets
CREATE OR REPLACE FUNCTION update_support_tickets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_support_tickets_updated_at ON support_tickets;
CREATE TRIGGER trigger_update_support_tickets_updated_at
    BEFORE UPDATE ON support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_support_tickets_updated_at();

-- Insert some sample support tickets for testing
INSERT INTO support_tickets (subject, message, priority, status, category)
VALUES
    ('Menu item missing nutritional information', 'I noticed that the Grilled Chicken Salad is missing the protein content in the nutritional label. Can you please add this?', 'medium', 'open', 'menu'),
    ('Delivery was delayed', 'My order was supposed to arrive at 12:30 PM but arrived at 1:15 PM. The food was cold.', 'high', 'in_progress', 'delivery'),
    ('Question about meal plans', 'Do you offer weekly meal plan subscriptions for weight loss?', 'low', 'pending', 'general'),
    ('Payment issue', 'I was charged twice for my order #1234. Please help!', 'urgent', 'open', 'billing'),
    ('Great service!', 'Just wanted to say thank you for the excellent healthy meals. Keep it up!', 'low', 'closed', 'feedback')
ON CONFLICT DO NOTHING;

-- Grant permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON support_tickets TO authenticated;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ticket_replies TO authenticated;
