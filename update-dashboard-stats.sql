-- Add orders for today for each restaurant
-- Burj Al Arab orders
INSERT INTO orders (id, order_number, customer_id, restaurants, total_amount, status, payment_status, created_at, updated_at)
SELECT 
  uuid_generate_v4(),
  'ORD' || LPAD(floor(random() * 99999999)::text, 8, '0'),
  (SELECT id FROM users WHERE role = 'customer' LIMIT 1 OFFSET floor(random() * 5)::int),
  ARRAY[(SELECT id FROM restaurants WHERE slug = 'burj-al-arab')]::uuid[],
  (random() * 200 + 50)::numeric(10,2),
  CASE floor(random() * 4)::int
    WHEN 0 THEN 'pending'
    WHEN 1 THEN 'confirmed'
    WHEN 2 THEN 'preparing'
    ELSE 'delivered'
  END,
  'paid',
  NOW() - (random() * interval '12 hours'),
  NOW() - (random() * interval '12 hours')
FROM generate_series(1, 15);

-- Atlantis The Palm orders
INSERT INTO orders (id, order_number, customer_id, restaurants, total_amount, status, payment_status, created_at, updated_at)
SELECT 
  uuid_generate_v4(),
  'ORD' || LPAD(floor(random() * 99999999)::text, 8, '0'),
  (SELECT id FROM users WHERE role = 'customer' LIMIT 1 OFFSET floor(random() * 5)::int),
  ARRAY[(SELECT id FROM restaurants WHERE slug = 'atlantis-the-palm')]::uuid[],
  (random() * 250 + 60)::numeric(10,2),
  CASE floor(random() * 4)::int
    WHEN 0 THEN 'pending'
    WHEN 1 THEN 'confirmed'
    WHEN 2 THEN 'preparing'
    ELSE 'delivered'
  END,
  'paid',
  NOW() - (random() * interval '12 hours'),
  NOW() - (random() * interval '12 hours')
FROM generate_series(1, 12);

-- Emirates Palace orders
INSERT INTO orders (id, order_number, customer_id, restaurants, total_amount, status, payment_status, created_at, updated_at)
SELECT 
  uuid_generate_v4(),
  'ORD' || LPAD(floor(random() * 99999999)::text, 8, '0'),
  (SELECT id FROM users WHERE role = 'customer' LIMIT 1 OFFSET floor(random() * 5)::int),
  ARRAY[(SELECT id FROM restaurants WHERE slug = 'emirates-palace')]::uuid[],
  (random() * 180 + 40)::numeric(10,2),
  CASE floor(random() * 4)::int
    WHEN 0 THEN 'pending'
    WHEN 1 THEN 'confirmed'
    WHEN 2 THEN 'preparing'
    ELSE 'delivered'
  END,
  'paid',
  NOW() - (random() * interval '12 hours'),
  NOW() - (random() * interval '12 hours')
FROM generate_series(1, 10);

SELECT 'Orders created successfully!' as message;
