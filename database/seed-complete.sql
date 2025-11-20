-- Complete Seed Data for cuts.ae Platform
-- This replaces all existing seed data with correct @cuts.ae emails
-- Password for ALL users: password123

-- First, clear existing data (optional - comment out if you want to preserve data)
TRUNCATE TABLE order_items CASCADE;
TRUNCATE TABLE orders CASCADE;
TRUNCATE TABLE nutritional_info CASCADE;
TRUNCATE TABLE menu_items CASCADE;
TRUNCATE TABLE restaurants CASCADE;
TRUNCATE TABLE customer_profiles CASCADE;
TRUNCATE TABLE support_agents CASCADE;
TRUNCATE TABLE users CASCADE;

-- Insert demo users with @cuts.ae emails
-- Password hash for "password123" using bcrypt with 10 rounds
INSERT INTO users (id, email, phone, password_hash, first_name, last_name, role, created_at, updated_at) VALUES
-- Admin
('99999999-9999-9999-9999-999999999999', 'admin@cuts.ae', '+971501234599', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Admin', 'User', 'admin', NOW(), NOW()),

-- Restaurant Owners
('11111111-1111-1111-1111-111111111111', 'owner1@cuts.ae', '+971501234567', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Ahmed', 'Al Maktoum', 'restaurant_owner', NOW(), NOW()),
('22222222-2222-2222-2222-222222222222', 'owner2@cuts.ae', '+971501234568', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Fatima', 'Al Nahyan', 'restaurant_owner', NOW(), NOW()),
('33333333-3333-3333-3333-333333333333', 'owner3@cuts.ae', '+971501234569', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Khalid', 'Al Suwaidi', 'restaurant_owner', NOW(), NOW()),

-- Support Agents
('88888888-8888-8888-8888-888888888888', 'support@cuts.ae', '+971501234588', '$2b$10$y3QstpxM8pOU2dlzlA1uAetzQf0536ualAA8dZ9hjN8gDROEc2TeO', 'Support', 'Agent', 'support', NOW(), NOW()),
('77777777-7777-7777-7777-777777777777', 'agent@cuts.ae', '+971501234577', '$2b$10$y3QstpxM8pOU2dlzlA1uAetzQf0536ualAA8dZ9hjN8gDROEc2TeO', 'Sarah', 'Mohammed', 'support', NOW(), NOW()),

-- Customers
('44444444-4444-4444-4444-444444444444', 'customer1@cuts.ae', '+971501234570', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Omar', 'Hassan', 'customer', NOW(), NOW()),
('55555555-5555-5555-5555-555555555555', 'customer2@cuts.ae', '+971501234571', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Sara', 'Ahmed', 'customer', NOW(), NOW()),
('66666666-6666-6666-6666-666666666666', 'customer3@cuts.ae', '+971501234572', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Layla', 'Ibrahim', 'customer', NOW(), NOW());

-- Note: support_agents table does not exist in current schema

-- Insert customer profiles
INSERT INTO customer_profiles (user_id, height, weight, age, gender, activity_level, goal, daily_calorie_target, daily_protein_target, daily_carbs_target, daily_fat_target) VALUES
('44444444-4444-4444-4444-444444444444', 175, 80, 28, 'male', 'moderate', 'weight_loss', 2000, 175, 150, 67),
('55555555-5555-5555-5555-555555555555', 165, 65, 25, 'female', 'active', 'muscle_gain', 2300, 173, 259, 64),
('66666666-6666-6666-6666-666666666666', 170, 70, 30, 'female', 'moderate', 'maintenance', 2100, 140, 200, 70);

-- Insert restaurants
INSERT INTO restaurants (id, owner_id, name, slug, description, cuisine_type, address, phone, email, commission_rate, is_active, operating_hours, average_prep_time) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Healthy Bites Abu Dhabi', 'healthy-bites-abu-dhabi', 'Fresh, nutritious meals for health-conscious individuals', ARRAY['Healthy', 'Mediterranean', 'Salads'],
 '{"street": "Corniche Road", "city": "Abu Dhabi", "state": "Abu Dhabi", "postal_code": "12345", "country": "UAE"}'::jsonb,
 '+971501111111', 'contact@healthybites.ae', 0.15, true,
 '{"monday": {"open": "07:00", "close": "22:00"}, "tuesday": {"open": "07:00", "close": "22:00"}, "wednesday": {"open": "07:00", "close": "22:00"}, "thursday": {"open": "07:00", "close": "22:00"}, "friday": {"open": "07:00", "close": "22:00"}, "saturday": {"open": "08:00", "close": "23:00"}, "sunday": {"open": "08:00", "close": "23:00"}}'::jsonb,
 30),

('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'Protein Palace', 'protein-palace', 'High-protein meals for athletes and fitness enthusiasts', ARRAY['Healthy', 'Protein', 'Fitness'],
 '{"street": "Al Wahda Street", "city": "Abu Dhabi", "state": "Abu Dhabi", "postal_code": "12346", "country": "UAE"}'::jsonb,
 '+971501111112', 'hello@proteinpalace.ae', 0.15, true,
 '{"monday": {"open": "06:00", "close": "21:00"}, "tuesday": {"open": "06:00", "close": "21:00"}, "wednesday": {"open": "06:00", "close": "21:00"}, "thursday": {"open": "06:00", "close": "21:00"}, "friday": {"open": "06:00", "close": "21:00"}, "saturday": {"open": "07:00", "close": "22:00"}, "sunday": {"open": "07:00", "close": "22:00"}}'::jsonb,
 25),

('cccccccc-cccc-cccc-cccc-cccccccccccc', '22222222-2222-2222-2222-222222222222', 'Green Garden Cafe', 'green-garden-cafe', 'Plant-based organic meals', ARRAY['Vegan', 'Organic', 'Healthy'],
 '{"street": "Marina Mall", "city": "Abu Dhabi", "state": "Abu Dhabi", "postal_code": "12347", "country": "UAE"}'::jsonb,
 '+971501111113', 'info@greengarden.ae', 0.15, true,
 '{"monday": {"open": "08:00", "close": "22:00"}, "tuesday": {"open": "08:00", "close": "22:00"}, "wednesday": {"open": "08:00", "close": "22:00"}, "thursday": {"open": "08:00", "close": "22:00"}, "friday": {"open": "08:00", "close": "23:00"}, "saturday": {"open": "08:00", "close": "23:00"}, "sunday": {"open": "08:00", "close": "22:00"}}'::jsonb,
 35);

-- Insert menu items for Healthy Bites Abu Dhabi
INSERT INTO menu_items (id, restaurant_id, name, description, base_price, category, is_available, prep_time) VALUES
-- Breakfast
('a1111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Avocado Toast with Poached Eggs', 'Whole grain toast with smashed avocado, two poached eggs, cherry tomatoes', 35.00, 'breakfast', true, 15),
('a1111111-1111-1111-1111-111111111112', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Greek Yogurt Parfait', 'Greek yogurt layered with granola, fresh berries, and honey', 28.00, 'breakfast', true, 10),
('a1111111-1111-1111-1111-111111111113', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Protein Pancakes', 'High-protein pancakes with banana and maple syrup', 32.00, 'breakfast', true, 20),

-- Lunch
('a1111111-1111-1111-1111-111111111114', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Grilled Chicken Caesar Salad', 'Romaine lettuce, grilled chicken breast, parmesan, whole grain croutons', 45.00, 'lunch', true, 15),
('a1111111-1111-1111-1111-111111111115', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Quinoa Buddha Bowl', 'Quinoa, roasted vegetables, chickpeas, tahini dressing', 42.00, 'lunch', true, 20),
('a1111111-1111-1111-1111-111111111116', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Mediterranean Wrap', 'Whole wheat wrap with hummus, grilled vegetables, feta', 38.00, 'lunch', true, 12),

-- Dinner
('a1111111-1111-1111-1111-111111111117', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Grilled Salmon with Vegetables', 'Atlantic salmon fillet with steamed broccoli and sweet potato', 68.00, 'dinner', true, 25),
('a1111111-1111-1111-1111-111111111118', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Lean Turkey Meatballs', 'Turkey meatballs with zucchini noodles and marinara sauce', 52.00, 'dinner', true, 30),
('a1111111-1111-1111-1111-111111111119', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Grilled Chicken with Brown Rice', 'Herb-marinated chicken breast with brown rice and mixed vegetables', 48.00, 'dinner', true, 25);

-- Insert menu items for Protein Palace
INSERT INTO menu_items (id, restaurant_id, name, description, base_price, category, is_available, prep_time) VALUES
('b2222222-2222-2222-2222-222222222221', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Power Breakfast Bowl', 'Scrambled eggs, turkey sausage, spinach, sweet potato hash', 42.00, 'breakfast', true, 18),
('b2222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Muscle Builder Wrap', 'Grilled chicken, egg whites, vegetables in whole wheat wrap', 38.00, 'breakfast', true, 15),

('b2222222-2222-2222-2222-222222222223', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'High-Protein Chicken Bowl', 'Double chicken breast, quinoa, broccoli, black beans', 58.00, 'lunch', true, 20),
('b2222222-2222-2222-2222-222222222224', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Lean Beef Burger', 'Grass-fed beef patty with sweet potato fries', 55.00, 'lunch', true, 22),

('b2222222-2222-2222-2222-222222222225', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Grilled Steak with Vegetables', '200g sirloin steak with asparagus and quinoa', 78.00, 'dinner', true, 28),
('b2222222-2222-2222-2222-222222222226', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Protein Power Pasta', 'High-protein pasta with lean turkey bolognese', 52.00, 'dinner', true, 25);

-- Insert nutritional information
INSERT INTO nutritional_info (menu_item_id, serving_size, calories, protein, carbohydrates, fat, fiber, sugar, sodium, allergens) VALUES
-- Healthy Bites
('a1111111-1111-1111-1111-111111111111', '1 plate (300g)', 420, 18, 38, 24, 9, 4, 420, ARRAY['gluten', 'eggs']),
('a1111111-1111-1111-1111-111111111112', '1 bowl (250g)', 280, 15, 42, 6, 3, 22, 85, ARRAY['dairy']),
('a1111111-1111-1111-1111-111111111113', '3 pancakes (200g)', 380, 28, 45, 8, 4, 12, 320, ARRAY['eggs', 'dairy']),
('a1111111-1111-1111-1111-111111111114', '1 bowl (350g)', 450, 42, 28, 18, 6, 4, 680, ARRAY['dairy', 'gluten']),
('a1111111-1111-1111-1111-111111111115', '1 bowl (400g)', 520, 18, 68, 18, 12, 8, 420, ARRAY[]::text[]),
('a1111111-1111-1111-1111-111111111116', '1 wrap (280g)', 420, 16, 52, 16, 8, 5, 680, ARRAY['gluten', 'dairy']),
('a1111111-1111-1111-1111-111111111117', '1 plate (350g)', 520, 45, 32, 22, 6, 8, 480, ARRAY['fish']),
('a1111111-1111-1111-1111-111111111118', '1 plate (380g)', 480, 48, 36, 16, 7, 9, 720, ARRAY[]::text[]),
('a1111111-1111-1111-1111-111111111119', '1 plate (380g)', 520, 52, 48, 12, 6, 4, 560, ARRAY[]::text[]),

-- Protein Palace
('b2222222-2222-2222-2222-222222222221', '1 bowl (380g)', 520, 38, 42, 20, 6, 6, 680, ARRAY['eggs']),
('b2222222-2222-2222-2222-222222222222', '1 wrap (300g)', 420, 42, 38, 12, 6, 3, 720, ARRAY['eggs', 'gluten']),
('b2222222-2222-2222-2222-222222222223', '1 bowl (450g)', 680, 82, 58, 14, 8, 5, 820, ARRAY[]::text[]),
('b2222222-2222-2222-2222-222222222224', '1 burger (350g)', 620, 48, 48, 24, 7, 8, 880, ARRAY['gluten']),
('b2222222-2222-2222-2222-222222222225', '1 plate (400g)', 680, 58, 42, 28, 6, 4, 720, ARRAY[]::text[]),
('b2222222-2222-2222-2222-222222222226', '1 plate (380g)', 580, 52, 62, 14, 8, 8, 680, ARRAY['gluten']);

-- Insert sample orders
INSERT INTO orders (id, order_number, customer_id, restaurants, status, delivery_address, subtotal, delivery_fee, service_fee, total_amount, payment_status, created_at) VALUES
('d1111111-1111-1111-1111-111111111111', 'ORD-20251117-ABC123', '44444444-4444-4444-4444-444444444444',
 ARRAY['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa']::uuid[],
 'delivered',
 '{"street": "Al Bateen", "city": "Abu Dhabi", "state": "Abu Dhabi", "postal_code": "12348", "country": "UAE"}'::jsonb,
 90.00, 10.00, 4.50, 104.50, 'paid', NOW() - INTERVAL '2 days'),

('d2222222-2222-2222-2222-222222222222', 'ORD-20251117-DEF456', '55555555-5555-5555-5555-555555555555',
 ARRAY['bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb']::uuid[],
 'confirmed',
 '{"street": "Khalidiya", "city": "Abu Dhabi", "state": "Abu Dhabi", "postal_code": "12349", "country": "UAE"}'::jsonb,
 110.00, 10.00, 5.50, 125.50, 'paid', NOW());

-- Insert order items
INSERT INTO order_items (order_id, menu_item_id, restaurant_id, quantity, base_price, item_total, nutritional_summary) VALUES
('d1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111114', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 1, 45.00, 45.00,
 '{"calories": 450, "protein": 42, "carbohydrates": 28, "fat": 18}'::jsonb),
('d1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111115', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 1, 42.00, 42.00,
 '{"calories": 520, "protein": 18, "carbohydrates": 68, "fat": 18}'::jsonb),

('d2222222-2222-2222-2222-222222222222', 'b2222222-2222-2222-2222-222222222223', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 2, 58.00, 116.00,
 '{"calories": 1360, "protein": 164, "carbohydrates": 116, "fat": 28}'::jsonb);

SELECT 'Seed data inserted successfully!' AS message;
SELECT '' AS separator;
SELECT '=== LOGIN CREDENTIALS FOR TESTING ===' AS info;
SELECT '' AS separator;
SELECT 'Restaurant Owner: owner1@cuts.ae / password123' AS credentials;
SELECT 'Restaurant Owner: owner2@cuts.ae / password123' AS credentials;
SELECT 'Restaurant Owner: owner3@cuts.ae / password123' AS credentials;
SELECT 'Admin: admin@cuts.ae / password123' AS credentials;
SELECT 'Support Agent: support@cuts.ae / TabsTriggerIsnt2026*$' AS credentials;
SELECT 'Support Agent: agent@cuts.ae / TabsTriggerIsnt2026*$' AS credentials;
SELECT 'Customer: customer1@cuts.ae / password123' AS credentials;
SELECT 'Customer: customer2@cuts.ae / password123' AS credentials;
SELECT 'Customer: customer3@cuts.ae / password123' AS credentials;
