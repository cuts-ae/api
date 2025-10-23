-- Extended Seed Data for cuts.ae Platform
-- This file adds more restaurants, menu items, and variety

-- Additional demo users for more restaurants
INSERT INTO users (id, email, phone, password_hash, first_name, last_name, role, created_at, updated_at) VALUES
('33333333-3333-3333-3333-333333333333', 'owner3@example.com', '+971501234569', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Khalid', 'Al Suwaidi', 'restaurant_owner', NOW(), NOW()),
('44444444-4444-4444-4444-444444444444', 'owner4@example.com', '+971501234570', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Layla', 'Mohammed', 'restaurant_owner', NOW(), NOW()),
('55555555-5555-5555-5555-555555555555', 'owner5@example.com', '+971501234571', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Omar', 'Rashid', 'restaurant_owner', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Additional restaurants with modern slugs
INSERT INTO restaurants (id, owner_id, name, slug, description, cuisine_type, address, phone, email, commission_rate, is_active, operating_hours, average_prep_time) VALUES
('dddddddd-dddd-dddd-dddd-dddddddddddd', '33333333-3333-3333-3333-333333333333', 'ABS Protein Kitchen', 'absaprotein', 'Premium protein-focused meal prep for fitness enthusiasts', ARRAY['Protein', 'Healthy', 'Meal Prep'],
 '{"street": "Sheikh Zayed Road", "city": "Dubai", "state": "Dubai", "postal_code": "12348", "country": "UAE"}'::jsonb,
 '+971501111114', 'contact@absaprotein.ae', 0.15, true,
 '{"monday": {"open": "06:00", "close": "22:00"}, "tuesday": {"open": "06:00", "close": "22:00"}, "wednesday": {"open": "06:00", "close": "22:00"}, "thursday": {"open": "06:00", "close": "22:00"}, "friday": {"open": "06:00", "close": "22:00"}, "saturday": {"open": "07:00", "close": "22:00"}, "sunday": {"open": "07:00", "close": "22:00"}}'::jsonb,
 20),

('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '44444444-4444-4444-4444-444444444444', 'Clean Eats Dubai', 'cleaneats', 'Fresh, clean, and nutritious meals delivered daily', ARRAY['Healthy', 'Organic', 'Gluten-Free'],
 '{"street": "Jumeirah Beach Road", "city": "Dubai", "state": "Dubai", "postal_code": "12349", "country": "UAE"}'::jsonb,
 '+971501111115', 'hello@cleaneats.ae', 0.15, true,
 '{"monday": {"open": "07:00", "close": "21:00"}, "tuesday": {"open": "07:00", "close": "21:00"}, "wednesday": {"open": "07:00", "close": "21:00"}, "thursday": {"open": "07:00", "close": "21:00"}, "friday": {"open": "07:00", "close": "21:00"}, "saturday": {"open": "08:00", "close": "22:00"}, "sunday": {"open": "08:00", "close": "22:00"}}'::jsonb,
 25),

('ffffffff-ffff-ffff-ffff-ffffffffffff', '55555555-5555-5555-5555-555555555555', 'Macro Meals UAE', 'macromealsuae', 'Perfectly balanced macros for your fitness goals', ARRAY['Protein', 'Low-Carb', 'Keto'],
 '{"street": "Business Bay", "city": "Dubai", "state": "Dubai", "postal_code": "12350", "country": "UAE"}'::jsonb,
 '+971501111116', 'orders@macromealsuae.com', 0.15, true,
 '{"monday": {"open": "06:00", "close": "20:00"}, "tuesday": {"open": "06:00", "close": "20:00"}, "wednesday": {"open": "06:00", "close": "20:00"}, "thursday": {"open": "06:00", "close": "20:00"}, "friday": {"open": "06:00", "close": "20:00"}, "saturday": {"open": "07:00", "close": "20:00"}, "sunday": {"open": "07:00", "close": "20:00"}}'::jsonb,
 18)
ON CONFLICT (id) DO NOTHING;

-- ABS Protein Kitchen menu items
INSERT INTO menu_items (id, restaurant_id, name, description, base_price, category, is_available, prep_time) VALUES
-- Breakfast
('d1000000-0000-0000-0000-000000000001', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Protein Pancake Stack', 'Fluffy protein pancakes with berries and sugar-free syrup', 42.00, 'breakfast', true, 15),
('d1000000-0000-0000-0000-000000000002', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Egg White Omelette Bowl', 'Egg whites, spinach, mushrooms, turkey, and cheese', 38.00, 'breakfast', true, 12),
('d1000000-0000-0000-0000-000000000003', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Overnight Oats Power Bowl', 'Oats, protein powder, chia seeds, banana, almond butter', 35.00, 'breakfast', true, 5),

-- Lunch
('d1000000-0000-0000-0000-000000000004', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Double Chicken Rice Bowl', 'Two grilled chicken breasts, brown rice, steamed vegetables', 62.00, 'lunch', true, 18),
('d1000000-0000-0000-0000-000000000005', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Beef and Sweet Potato Power Plate', 'Lean beef, roasted sweet potato, green beans', 68.00, 'lunch', true, 20),
('d1000000-0000-0000-0000-000000000006', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Salmon Quinoa Bowl', 'Grilled salmon, quinoa, roasted veggies, lemon dill sauce', 72.00, 'lunch', true, 20),
('d1000000-0000-0000-0000-000000000007', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Turkey Meatball Pasta', 'High-protein pasta, turkey meatballs, marinara', 58.00, 'lunch', true, 22),

-- Dinner
('d1000000-0000-0000-0000-000000000008', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Steak and Broccoli', '200g sirloin steak, steamed broccoli, mashed cauliflower', 82.00, 'dinner', true, 25),
('d1000000-0000-0000-0000-000000000009', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Grilled Chicken Teriyaki', 'Teriyaki chicken breast, brown rice, stir-fried vegetables', 58.00, 'dinner', true, 20),
('d1000000-0000-0000-0000-000000000010', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Fish Tacos (High Protein)', 'Grilled white fish, whole wheat tortillas, coleslaw', 55.00, 'dinner', true, 18),

-- Snacks
('d1000000-0000-0000-0000-000000000011', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Protein Cookie Box (6pc)', 'Homemade protein cookies, various flavors', 32.00, 'snacks', true, 5),
('d1000000-0000-0000-0000-000000000012', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Greek Yogurt Parfait', 'Greek yogurt, granola, mixed berries, honey', 28.00, 'snacks', true, 5)
ON CONFLICT (id) DO NOTHING;

-- Clean Eats Dubai menu items
INSERT INTO menu_items (id, restaurant_id, name, description, base_price, category, is_available, prep_time) VALUES
-- Breakfast
('e1000000-0000-0000-0000-000000000001', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Acai Smoothie Bowl', 'Acai, banana, granola, fresh berries, coconut flakes', 45.00, 'breakfast', true, 10),
('e1000000-0000-0000-0000-000000000002', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Avocado Sourdough Toast', 'Sourdough, smashed avocado, poached eggs, microgreens', 42.00, 'breakfast', true, 12),
('e1000000-0000-0000-0000-000000000003', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Green Detox Smoothie', 'Spinach, kale, cucumber, green apple, ginger, lemon', 32.00, 'breakfast', true, 8),

-- Lunch
('e1000000-0000-0000-0000-000000000004', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Rainbow Buddha Bowl', 'Quinoa, roasted chickpeas, colorful veggies, tahini dressing', 52.00, 'lunch', true, 18),
('e1000000-0000-0000-0000-000000000005', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Mediterranean Falafel Wrap', 'Homemade falafel, hummus, fresh veggies, whole wheat wrap', 48.00, 'lunch', true, 15),
('e1000000-0000-0000-0000-000000000006', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Grilled Halloumi Salad', 'Grilled halloumi, mixed greens, pomegranate, balsamic', 55.00, 'lunch', true, 12),
('e1000000-0000-0000-0000-000000000007', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Vegan Sushi Bowl', 'Sushi rice, avocado, cucumber, carrots, edamame, sesame', 48.00, 'lunch', true, 15),

-- Dinner
('e1000000-0000-0000-0000-000000000008', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Grilled Sea Bass', 'Whole sea bass, lemon herb sauce, roasted vegetables', 88.00, 'dinner', true, 25),
('e1000000-0000-0000-0000-000000000009', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Chicken Pesto Zoodles', 'Spiralized zucchini, grilled chicken, homemade pesto', 58.00, 'dinner', true, 18),
('e1000000-0000-0000-0000-000000000010', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Stuffed Bell Peppers', 'Bell peppers stuffed with quinoa, vegetables, herbs', 52.00, 'dinner', true, 22),

-- Beverages
('e1000000-0000-0000-0000-000000000011', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Cold-Pressed Juice (500ml)', 'Daily rotating flavors of fresh juice', 28.00, 'beverages', true, 5),
('e1000000-0000-0000-0000-000000000012', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Matcha Latte', 'Premium matcha, oat milk, honey', 32.00, 'beverages', true, 8)
ON CONFLICT (id) DO NOTHING;

-- Macro Meals UAE menu items
INSERT INTO menu_items (id, restaurant_id, name, description, base_price, category, is_available, prep_time) VALUES
-- Breakfast
('f1000000-0000-0000-0000-000000000001', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'Keto Breakfast Plate', 'Scrambled eggs, bacon, avocado, sautéed spinach', 48.00, 'breakfast', true, 15),
('f1000000-0000-0000-0000-000000000002', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'Low-Carb Protein Waffles', 'Almond flour waffles, sugar-free syrup, berries', 42.00, 'breakfast', true, 18),

-- Lunch
('f1000000-0000-0000-0000-000000000003', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'Macro-Perfect Chicken Bowl', 'Grilled chicken (40g protein), sweet potato, broccoli', 58.00, 'lunch', true, 18),
('f1000000-0000-0000-0000-000000000004', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'High-Protein Burrito Bowl', 'Ground turkey, black beans, peppers, salsa, guacamole', 62.00, 'lunch', true, 20),
('f1000000-0000-0000-0000-000000000005', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'Keto Salmon Plate', 'Pan-seared salmon, cauliflower rice, asparagus', 78.00, 'lunch', true, 20),
('f1000000-0000-0000-0000-000000000006', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'Low-Carb Burger Bowl', 'Beef patty, cheese, pickles, lettuce wrap, no bun', 65.00, 'lunch', true, 18),

-- Dinner
('f1000000-0000-0000-0000-000000000007', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'Ribeye Steak Plate', '250g ribeye, roasted Brussels sprouts, cauliflower mash', 95.00, 'dinner', true, 25),
('f1000000-0000-0000-0000-000000000008', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'Grilled Shrimp Skewers', 'Jumbo shrimp, zucchini noodles, garlic butter sauce', 72.00, 'dinner', true, 18),
('f1000000-0000-0000-0000-000000000009', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'Chicken Alfredo (Low-Carb)', 'Chicken breast, zucchini noodles, keto alfredo sauce', 62.00, 'dinner', true, 20),

-- Meal Prep Packages
('f1000000-0000-0000-0000-000000000010', 'ffffffff-ffff-ffff-ffff-ffffffffffff', '5-Day Meal Prep (Weight Loss)', '5 lunches + 5 dinners, macro-calculated for weight loss', 295.00, 'meal-prep', true, 120),
('f1000000-0000-0000-0000-000000000011', 'ffffffff-ffff-ffff-ffff-ffffffffffff', '5-Day Meal Prep (Muscle Gain)', '5 lunches + 5 dinners, high-protein for muscle building', 325.00, 'meal-prep', true, 120)
ON CONFLICT (id) DO NOTHING;

-- Add nutritional information for new menu items
INSERT INTO nutritional_info (menu_item_id, serving_size, calories, protein, carbohydrates, fat, fiber, sugar, sodium, allergens) VALUES
-- ABS Protein Kitchen
('d1000000-0000-0000-0000-000000000001', '1 stack (250g)', 420, 35, 48, 8, 5, 10, 380, ARRAY['eggs', 'dairy', 'gluten']),
('d1000000-0000-0000-0000-000000000002', '1 bowl (300g)', 280, 38, 12, 8, 3, 4, 520, ARRAY['eggs', 'dairy']),
('d1000000-0000-0000-0000-000000000004', '1 plate (500g)', 680, 82, 58, 12, 6, 3, 620, ARRAY[]::text[]),
('d1000000-0000-0000-0000-000000000008', '1 plate (400g)', 620, 58, 28, 28, 5, 4, 480, ARRAY[]::text[]),

-- Clean Eats Dubai
('e1000000-0000-0000-0000-000000000001', '1 bowl (350g)', 380, 12, 65, 8, 10, 28, 120, ARRAY[]::text[]),
('e1000000-0000-0000-0000-000000000004', '1 bowl (400g)', 520, 18, 68, 18, 12, 8, 420, ARRAY[]::text[]),
('e1000000-0000-0000-0000-000000000008', '1 plate (350g)', 480, 42, 18, 24, 4, 3, 520, ARRAY['fish']),

-- Macro Meals UAE
('f1000000-0000-0000-0000-000000000001', '1 plate (350g)', 520, 35, 8, 38, 4, 2, 680, ARRAY['eggs']),
('f1000000-0000-0000-0000-000000000003', '1 bowl (450g)', 580, 48, 52, 16, 7, 5, 580, ARRAY[]::text[]),
('f1000000-0000-0000-0000-000000000007', '1 plate (400g)', 720, 62, 12, 48, 3, 2, 520, ARRAY[]::text[])
ON CONFLICT (menu_item_id) DO NOTHING;

-- Add sample orders with different statuses
INSERT INTO orders (id, order_number, customer_id, restaurants, status, delivery_address, subtotal, delivery_fee, service_fee, total_amount, payment_status, created_at) VALUES
('o1000000-0000-0000-0000-000000000001', 'ORD-20251023-ABC001', '33333333-3333-3333-3333-333333333333',
 ARRAY['dddddddd-dddd-dddd-dddd-dddddddddddd']::uuid[], 'pending',
 '{"street": "Marina Walk", "city": "Dubai", "state": "Dubai", "postal_code": "12351", "country": "UAE"}'::jsonb,
 120.00, 10.00, 6.00, 136.00, 'paid', NOW()),

('o1000000-0000-0000-0000-000000000002', 'ORD-20251023-ABC002', '44444444-4444-4444-4444-444444444444',
 ARRAY['eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee']::uuid[], 'confirmed',
 '{"street": "Downtown Boulevard", "city": "Dubai", "state": "Dubai", "postal_code": "12352", "country": "UAE"}'::jsonb,
 95.00, 10.00, 4.75, 109.75, 'paid', NOW()),

('o1000000-0000-0000-0000-000000000003', 'ORD-20251023-ABC003', '33333333-3333-3333-3333-333333333333',
 ARRAY['ffffffff-ffff-ffff-ffff-ffffffffffff']::uuid[], 'preparing',
 '{"street": "Sheikh Mohammed Bin Rashid Blvd", "city": "Dubai", "state": "Dubai", "postal_code": "12353", "country": "UAE"}'::jsonb,
 315.00, 15.00, 15.75, 345.75, 'paid', NOW()),

('o1000000-0000-0000-0000-000000000004', 'ORD-20251023-ABC004', '44444444-4444-4444-4444-444444444444',
 ARRAY['dddddddd-dddd-dddd-dddd-dddddddddddd']::uuid[], 'ready',
 '{"street": "Palm Jumeirah", "city": "Dubai", "state": "Dubai", "postal_code": "12354", "country": "UAE"}'::jsonb,
 180.00, 12.00, 9.00, 201.00, 'paid', NOW() - INTERVAL '30 minutes')
ON CONFLICT (id) DO NOTHING;

-- Add order items for the new orders
INSERT INTO order_items (order_id, menu_item_id, restaurant_id, quantity, base_price, item_total, nutritional_summary) VALUES
('o1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000004', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 2, 62.00, 124.00, '{"calories": 1360, "protein": 164, "carbohydrates": 116, "fat": 24}'::jsonb),
('o1000000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000001', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 1, 45.00, 45.00, '{"calories": 380, "protein": 12, "carbohydrates": 65, "fat": 8}'::jsonb),
('o1000000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000004', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 1, 52.00, 52.00, '{"calories": 520, "protein": 18, "carbohydrates": 68, "fat": 18}'::jsonb),
('o1000000-0000-0000-0000-000000000003', 'f1000000-0000-0000-0000-000000000010', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 1, 295.00, 295.00, '{"calories": 12000, "protein": 600, "carbohydrates": 800, "fat": 300}'::jsonb),
('o1000000-0000-0000-0000-000000000004', 'd1000000-0000-0000-0000-000000000008', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 2, 82.00, 164.00, '{"calories": 1440, "protein": 124, "carbohydrates": 24, "fat": 96}'::jsonb)
ON CONFLICT (order_id, menu_item_id) DO NOTHING;

SELECT 'Extended seed data inserted successfully!' AS message;
SELECT 'New restaurants added:' AS info;
SELECT '- @absaprotein (ABS Protein Kitchen)' AS restaurant;
SELECT '- @cleaneats (Clean Eats Dubai)' AS restaurant;
SELECT '- @macromealsuae (Macro Meals UAE)' AS restaurant;
