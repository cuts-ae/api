-- Create customer_invoices table for customer order invoices
CREATE TABLE IF NOT EXISTS customer_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  invoice_number INTEGER NOT NULL,
  invoice_type VARCHAR(50) NOT NULL DEFAULT 'standard',
  amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(order_id, invoice_number)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_customer_invoices_order_id ON customer_invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_customer_invoices_status ON customer_invoices(status);
CREATE INDEX IF NOT EXISTS idx_customer_invoices_created_at ON customer_invoices(created_at DESC);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_customer_invoices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_customer_invoices_updated_at
BEFORE UPDATE ON customer_invoices
FOR EACH ROW
EXECUTE FUNCTION update_customer_invoices_updated_at();

-- Generate initial customer invoices for existing orders
INSERT INTO customer_invoices (order_id, invoice_number, amount, status)
SELECT
  id as order_id,
  1 as invoice_number,
  total_amount as amount,
  CASE
    WHEN payment_status = 'paid' THEN 'paid'
    WHEN payment_status = 'pending' THEN 'pending'
    ELSE 'pending'
  END as status
FROM orders
WHERE id NOT IN (SELECT order_id FROM customer_invoices)
ON CONFLICT (order_id, invoice_number) DO NOTHING;
