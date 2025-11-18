-- UAE Healthy Restaurants Seed Data
-- Health-focused catering platform for UAE
-- Run this after schema.sql to populate with UAE-specific healthy restaurants

-- Clear existing data (optional - comment out if you want to keep existing data)
DELETE FROM order_items;
DELETE FROM orders;
DELETE FROM nutritional_info;
DELETE FROM menu_items;
DELETE FROM restaurants;
DELETE FROM customer_profiles;
DELETE FROM users WHERE role != 'admin';

-- Insert demo users (password: "password123")
-- Hash: $2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty

INSERT INTO users (id, email, phone, password_hash, first_name, last_name, role, created_at, updated_at) VALUES
-- Restaurant Owner (owns 3 restaurants)
('11111111-1111-1111-1111-111111111111', 'owner1@cuts.ae', '+971501234567', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Ahmed', 'Al Maktoum', 'restaurant_owner', NOW(), NOW()),

-- Additional restaurant owners
('22222222-2222-2222-2222-222222222222', 'owner2@cuts.ae', '+971501234568', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Fatima', 'Al Nahyan', 'restaurant_owner', NOW(), NOW()),
('23333333-3333-3333-3333-333333333333', 'owner3@cuts.ae', '+971501234577', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Mohammed', 'Hassan', 'restaurant_owner', NOW(), NOW()),

-- Customers
('33333333-3333-3333-3333-333333333333', 'customer1@cuts.ae', '+971501234569', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Omar', 'Hassan', 'customer', NOW(), NOW()),
('44444444-4444-4444-4444-444444444444', 'customer2@cuts.ae', '+971501234570', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Sara', 'Ahmed', 'customer', NOW(), NOW()),
('55555555-5555-5555-5555-555555555555', 'customer3@cuts.ae', '+971501234571', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Layla', 'Ibrahim', 'customer', NOW(), NOW());

-- Insert customer profiles
INSERT INTO customer_profiles (user_id, height, weight, age, gender, activity_level, goal, daily_calorie_target, daily_protein_target, daily_carbs_target, daily_fat_target) VALUES
('33333333-3333-3333-3333-333333333333', 175, 80, 28, 'male', 'moderate', 'weight_loss', 2000, 175, 150, 67),
('44444444-4444-4444-4444-444444444444', 165, 65, 25, 'female', 'active', 'muscle_gain', 2300, 173, 259, 64),
('55555555-5555-5555-5555-555555555555', 170, 70, 30, 'female', 'light', 'weight_loss', 1800, 135, 180, 60);

-- Insert UAE Healthy Restaurants
-- Owner 1 owns 3 restaurants (as requested)
INSERT INTO restaurants (id, owner_id, name, slug, description, cuisine_type, address, phone, email, commission_rate, is_active, operating_hours, average_prep_time) VALUES

-- Restaurant 1: Fit & Fresh Abu Dhabi (Owner 1)
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111',
 'Fit & Fresh Abu Dhabi', 'fitfresh-abudhabi',
 'Premium healthy meal prep and catering service focusing on balanced nutrition and fresh ingredients',
 ARRAY['Healthy', 'Mediterranean', 'Protein-Rich'],
 '{"street": "Al Maryah Island", "city": "Abu Dhabi", "emirate": "Abu Dhabi", "postal_code": "12345", "country": "UAE"}'::jsonb,
 '+971501234501', 'contact@fitfresh.ae', 0.15, true,
 '{"monday": {"open": "06:00", "close": "22:00"}, "tuesday": {"open": "06:00", "close": "22:00"}, "wednesday": {"open": "06:00", "close": "22:00"}, "thursday": {"open": "06:00", "close": "22:00"}, "friday": {"open": "07:00", "close": "23:00"}, "saturday": {"open": "07:00", "close": "23:00"}, "sunday": {"open": "07:00", "close": "22:00"}}'::jsonb,
 25),

-- Restaurant 2: Protein Hub Dubai (Owner 1)
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111',
 'Protein Hub Dubai', 'proteinhub-dubai',
 'High-protein meals for athletes, fitness enthusiasts, and health-conscious individuals',
 ARRAY['Healthy', 'High-Protein', 'Fitness'],
 '{"street": "Dubai Marina", "city": "Dubai", "emirate": "Dubai", "postal_code": "23456", "country": "UAE"}'::jsonb,
 '+971501234502', 'hello@proteinhub.ae', 0.15, true,
 '{"monday": {"open": "06:00", "close": "21:00"}, "tuesday": {"open": "06:00", "close": "21:00"}, "wednesday": {"open": "06:00", "close": "21:00"}, "thursday": {"open": "06:00", "close": "21:00"}, "friday": {"open": "06:00", "close": "21:00"}, "saturday": {"open": "07:00", "close": "22:00"}, "sunday": {"open": "07:00", "close": "22:00"}}'::jsonb,
 20),

-- Restaurant 3: Green Bowl Sharjah (Owner 1)
('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111',
 'Green Bowl Sharjah', 'greenbowl-sharjah',
 'Plant-based, organic meals with complete nutritional profiles for mindful eating',
 ARRAY['Vegan', 'Organic', 'Plant-Based'],
 '{"street": "Al Majaz Waterfront", "city": "Sharjah", "emirate": "Sharjah", "postal_code": "34567", "country": "UAE"}'::jsonb,
 '+971501234503', 'info@greenbowl.ae', 0.15, true,
 '{"monday": {"open": "08:00", "close": "22:00"}, "tuesday": {"open": "08:00", "close": "22:00"}, "wednesday": {"open": "08:00", "close": "22:00"}, "thursday": {"open": "08:00", "close": "22:00"}, "friday": {"open": "08:00", "close": "23:00"}, "saturday": {"open": "08:00", "close": "23:00"}, "sunday": {"open": "08:00", "close": "22:00"}}'::jsonb,
 30),

-- Restaurant 4: Macro Meals UAE (Owner 2)
('dddddddd-dddd-dddd-dddd-dddddddddddd', '22222222-2222-2222-2222-222222222222',
 'Macro Meals UAE', 'macromeals-uae',
 'Perfectly balanced macros for weight management and performance optimization',
 ARRAY['Healthy', 'Balanced', 'Macro-Counted'],
 '{"street": "Business Bay", "city": "Dubai", "emirate": "Dubai", "postal_code": "23457", "country": "UAE"}'::jsonb,
 '+971501234504', 'support@macromeals.ae', 0.15, true,
 '{"monday": {"open": "07:00", "close": "22:00"}, "tuesday": {"open": "07:00", "close": "22:00"}, "wednesday": {"open": "07:00", "close": "22:00"}, "thursday": {"open": "07:00", "close": "22:00"}, "friday": {"open": "07:00", "close": "22:00"}, "saturday": {"open": "08:00", "close": "23:00"}, "sunday": {"open": "08:00", "close": "22:00"}}'::jsonb,
 28),

-- Restaurant 5: Clean Eats Kitchen (Owner 2)
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '22222222-2222-2222-2222-222222222222',
 'Clean Eats Kitchen', 'cleaneats-kitchen',
 'Wholesome, clean eating made simple with no processed ingredients',
 ARRAY['Healthy', 'Clean-Eating', 'Whole-Foods'],
 '{"street": "JBR Walk", "city": "Dubai", "emirate": "Dubai", "postal_code": "23458", "country": "UAE"}'::jsonb,
 '+971501234505', 'hello@cleaneats.ae', 0.15, true,
 '{"monday": {"open": "07:00", "close": "22:00"}, "tuesday": {"open": "07:00", "close": "22:00"}, "wednesday": {"open": "07:00", "close": "22:00"}, "thursday": {"open": "07:00", "close": "22:00"}, "friday": {"open": "08:00", "close": "23:00"}, "saturday": {"open": "08:00", "close": "23:00"}, "sunday": {"open": "08:00", "close": "22:00"}}'::jsonb,
 25),

-- Restaurant 6: Fuel Station Abu Dhabi (Owner 3)
('ffffffff-ffff-ffff-ffff-ffffffffffff', '23333333-3333-3333-3333-333333333333',
 'Fuel Station Abu Dhabi', 'fuelstation-abudhabi',
 'Performance nutrition for active lifestyles with chef-crafted healthy meals',
 ARRAY['Healthy', 'Performance', 'Energy-Focused'],
 '{"street": "Yas Island", "city": "Abu Dhabi", "emirate": "Abu Dhabi", "postal_code": "12346", "country": "UAE"}'::jsonb,
 '+971501234506', 'contact@fuelstation.ae', 0.15, true,
 '{"monday": {"open": "06:00", "close": "22:00"}, "tuesday": {"open": "06:00", "close": "22:00"}, "wednesday": {"open": "06:00", "close": "22:00"}, "thursday": {"open": "06:00", "close": "22:00"}, "friday": {"open": "06:00", "close": "22:00"}, "saturday": {"open": "07:00", "close": "23:00"}, "sunday": {"open": "07:00", "close": "22:00"}}'::jsonb,
 22);

-- Menu Items for Fit & Fresh Abu Dhabi
INSERT INTO menu_items (id, restaurant_id, name, description, base_price, category, is_available, prep_time) VALUES
-- Breakfast
('a1000001-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Power Breakfast Bowl', 'Scrambled eggs, turkey bacon, avocado, sweet potato hash, spinach', 42.00, 'breakfast', true, 18),
('a1000002-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Greek Yogurt Parfait', 'Low-fat Greek yogurt, fresh berries, granola, honey drizzle', 28.00, 'breakfast', true, 10),
('a1000003-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Protein Pancakes Stack', 'High-protein pancakes, banana, almond butter, maple syrup', 35.00, 'breakfast', true, 20),
('a1000004-0000-0000-0000-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Egg White Omelette', 'Egg whites, mushrooms, tomatoes, spinach, feta cheese', 32.00, 'breakfast', true, 15),

-- Lunch
('a1000005-0000-0000-0000-000000000005', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Grilled Chicken Caesar', 'Grilled chicken breast, romaine, parmesan, whole grain croutons, light caesar', 48.00, 'lunch', true, 15),
('a1000006-0000-0000-0000-000000000006', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Quinoa Power Bowl', 'Quinoa, grilled chicken, roasted vegetables, tahini dressing', 52.00, 'lunch', true, 20),
('a1000007-0000-0000-0000-000000000007', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Mediterranean Wrap', 'Whole wheat wrap, hummus, grilled vegetables, feta, olives', 38.00, 'lunch', true, 12),
('a1000008-0000-0000-0000-000000000008', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Tuna Poke Bowl', 'Fresh tuna, brown rice, edamame, avocado, sesame dressing', 58.00, 'lunch', true, 15),

-- Dinner
('a1000009-0000-0000-0000-000000000009', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Grilled Salmon Plate', 'Atlantic salmon, steamed broccoli, quinoa, lemon herb sauce', 72.00, 'dinner', true, 25),
('a1000010-0000-0000-0000-000000000010', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Lean Turkey Meatballs', 'Turkey meatballs, zucchini noodles, marinara sauce, basil', 55.00, 'dinner', true, 28),
('a1000011-0000-0000-0000-000000000011', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Herb Chicken Brown Rice', 'Herb-marinated chicken, brown rice, mixed vegetables', 52.00, 'dinner', true, 25),
('a1000012-0000-0000-0000-000000000012', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Beef Stir Fry', 'Lean beef strips, mixed vegetables, brown rice, ginger soy sauce', 62.00, 'dinner', true, 22);

-- Menu Items for Protein Hub Dubai
INSERT INTO menu_items (id, restaurant_id, name, description, base_price, category, is_available, prep_time) VALUES
-- Breakfast
('b2000001-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Muscle Builder Breakfast', 'Egg whites, lean beef, spinach, mushrooms, whole grain toast', 45.00, 'breakfast', true, 20),
('b2000002-0000-0000-0000-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'High Protein Smoothie Bowl', 'Protein powder, Greek yogurt, berries, almond butter, granola', 35.00, 'breakfast', true, 10),

-- Lunch
('b2000003-0000-0000-0000-000000000003', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Double Chicken Bowl', 'Double grilled chicken, quinoa, black beans, vegetables', 65.00, 'lunch', true, 22),
('b2000004-0000-0000-0000-000000000004', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Lean Beef Burger', 'Grass-fed beef patty, sweet potato fries, side salad', 58.00, 'lunch', true, 25),
('b2000005-0000-0000-0000-000000000005', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Tuna Protein Salad', 'Grilled tuna, mixed greens, quinoa, chickpeas, olive oil dressing', 52.00, 'lunch', true, 15),

-- Dinner
('b2000006-0000-0000-0000-000000000006', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Grilled Steak Platter', '250g sirloin steak, asparagus, sweet potato mash', 85.00, 'dinner', true, 30),
('b2000007-0000-0000-0000-000000000007', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Protein Power Pasta', 'High-protein pasta, lean turkey bolognese, vegetables', 55.00, 'dinner', true, 25),
('b2000008-0000-0000-0000-000000000008', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Grilled Chicken Thighs', 'Marinated chicken thighs, basmati rice, steamed vegetables', 58.00, 'dinner', true, 28);

-- Menu Items for Green Bowl Sharjah
INSERT INTO menu_items (id, restaurant_id, name, description, base_price, category, is_available, prep_time) VALUES
-- Breakfast
('c3000001-0000-0000-0000-000000000001', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Vegan Power Bowl', 'Tofu scramble, roasted vegetables, quinoa, avocado', 38.00, 'breakfast', true, 18),
('c3000002-0000-0000-0000-000000000002', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Acai Berry Bowl', 'Acai puree, granola, fresh fruits, chia seeds, coconut flakes', 32.00, 'breakfast', true, 12),

-- Lunch
('c3000003-0000-0000-0000-000000000003', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Buddha Bowl', 'Brown rice, chickpeas, roasted vegetables, tahini dressing', 42.00, 'lunch', true, 20),
('c3000004-0000-0000-0000-000000000004', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Falafel Wrap', 'Whole wheat wrap, falafel, hummus, vegetables, tahini', 35.00, 'lunch', true, 15),
('c3000005-0000-0000-0000-000000000005', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Quinoa Tabbouleh Salad', 'Quinoa, parsley, tomatoes, cucumber, lemon dressing', 38.00, 'lunch', true, 10),

-- Dinner
('c3000006-0000-0000-0000-000000000006', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Lentil Curry Bowl', 'Red lentil curry, brown rice, vegetables, naan bread', 45.00, 'dinner', true, 25),
('c3000007-0000-0000-0000-000000000007', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Vegan Burger', 'Plant-based patty, sweet potato fries, salad', 48.00, 'dinner', true, 22),
('c3000008-0000-0000-0000-000000000008', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Tofu Stir Fry', 'Marinated tofu, mixed vegetables, brown rice, teriyaki sauce', 42.00, 'dinner', true, 20);

-- Nutritional Information (Complete data for FDA-style labels)
INSERT INTO nutritional_info (menu_item_id, serving_size, calories, protein, carbohydrates, fat, fiber, sugar, sodium, allergens) VALUES
-- Fit & Fresh Abu Dhabi
('a1000001-0000-0000-0000-000000000001', '1 bowl (400g)', 485, 32, 42, 20, 8, 6, 680, ARRAY['eggs']),
('a1000002-0000-0000-0000-000000000002', '1 bowl (250g)', 280, 18, 38, 6, 4, 22, 95, ARRAY['dairy']),
('a1000003-0000-0000-0000-000000000003', '3 pancakes (220g)', 420, 32, 48, 12, 5, 15, 380, ARRAY['eggs', 'dairy', 'nuts']),
('a1000004-0000-0000-0000-000000000004', '1 omelette (280g)', 245, 28, 8, 12, 2, 4, 520, ARRAY['eggs', 'dairy']),
('a1000005-0000-0000-0000-000000000005', '1 bowl (380g)', 465, 45, 32, 18, 6, 4, 720, ARRAY['dairy', 'gluten']),
('a1000006-0000-0000-0000-000000000006', '1 bowl (420g)', 540, 38, 58, 18, 10, 6, 480, ARRAY[]::text[]),
('a1000007-0000-0000-0000-000000000007', '1 wrap (300g)', 425, 16, 58, 16, 9, 5, 680, ARRAY['gluten', 'dairy']),
('a1000008-0000-0000-0000-000000000008', '1 bowl (380g)', 520, 38, 52, 18, 6, 4, 520, ARRAY['fish', 'soy']),
('a1000009-0000-0000-0000-000000000009', '1 plate (380g)', 565, 48, 38, 25, 7, 5, 520, ARRAY['fish']),
('a1000010-0000-0000-0000-000000000010', '1 plate (400g)', 485, 52, 38, 14, 8, 9, 780, ARRAY[]::text[]),
('a1000011-0000-0000-0000-000000000011', '1 plate (400g)', 545, 55, 52, 14, 6, 4, 580, ARRAY[]::text[]),
('a1000012-0000-0000-0000-000000000012', '1 plate (380g)', 580, 45, 54, 20, 6, 6, 820, ARRAY['soy']),

-- Protein Hub Dubai
('b2000001-0000-0000-0000-000000000001', '1 plate (380g)', 525, 48, 38, 22, 6, 4, 720, ARRAY['eggs', 'gluten']),
('b2000002-0000-0000-0000-000000000002', '1 bowl (350g)', 420, 35, 48, 12, 6, 20, 180, ARRAY['dairy', 'nuts']),
('b2000003-0000-0000-0000-000000000003', '1 bowl (480g)', 725, 85, 62, 16, 10, 5, 880, ARRAY[]::text[]),
('b2000004-0000-0000-0000-000000000004', '1 burger + fries (420g)', 685, 52, 55, 28, 8, 8, 920, ARRAY['gluten']),
('b2000005-0000-0000-0000-000000000005', '1 salad (380g)', 485, 45, 38, 18, 8, 4, 520, ARRAY['fish']),
('b2000006-0000-0000-0000-000000000006', '1 plate (450g)', 725, 62, 48, 32, 6, 6, 780, ARRAY[]::text[]),
('b2000007-0000-0000-0000-000000000007', '1 plate (400g)', 620, 55, 68, 16, 9, 8, 720, ARRAY['gluten']),
('b2000008-0000-0000-0000-000000000008', '1 plate (420g)', 665, 58, 62, 22, 6, 4, 680, ARRAY[]::text[]),

-- Green Bowl Sharjah
('c3000001-0000-0000-0000-000000000001', '1 bowl (380g)', 425, 22, 48, 18, 10, 6, 520, ARRAY['soy']),
('c3000002-0000-0000-0000-000000000002', '1 bowl (320g)', 385, 8, 62, 12, 12, 28, 45, ARRAY[]::text[]),
('c3000003-0000-0000-0000-000000000003', '1 bowl (420g)', 485, 16, 72, 14, 12, 8, 520, ARRAY[]::text[]),
('c3000004-0000-0000-0000-000000000004', '1 wrap (280g)', 420, 18, 58, 14, 10, 5, 680, ARRAY['gluten']),
('c3000005-0000-0000-0000-000000000005', '1 bowl (300g)', 385, 12, 58, 12, 8, 4, 420, ARRAY[]::text[]),
('c3000006-0000-0000-0000-000000000006', '1 bowl (420g)', 525, 22, 78, 14, 14, 6, 620, ARRAY['gluten']),
('c3000007-0000-0000-0000-000000000007', '1 burger + fries (380g)', 585, 28, 68, 22, 10, 8, 820, ARRAY['gluten', 'soy']),
('c3000008-0000-0000-0000-000000000008', '1 plate (380g)', 485, 28, 62, 14, 8, 10, 780, ARRAY['soy']);

-- Insert Orders with Different States
-- Status: preparing (5 orders)
INSERT INTO orders (id, order_number, customer_id, restaurants, status, delivery_address, subtotal, delivery_fee, service_fee, total_amount, payment_status, created_at, updated_at) VALUES
('00000001-0000-0000-0000-000000000001', 'ORD-20251117-001', '33333333-3333-3333-3333-333333333333', ARRAY['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa']::uuid[],
 'preparing', '{"street": "Al Bateen", "city": "Abu Dhabi", "building": "Tower 3", "flat": "1205"}'::jsonb,
 100.00, 10.00, 5.00, 115.00, 'paid', NOW() - INTERVAL '15 minutes', NOW() - INTERVAL '10 minutes'),

('00000002-0000-0000-0000-000000000002', 'ORD-20251117-002', '44444444-4444-4444-4444-444444444444', ARRAY['bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb']::uuid[],
 'preparing', '{"street": "Dubai Marina", "city": "Dubai", "building": "Marina Heights", "flat": "805"}'::jsonb,
 123.00, 12.00, 6.15, 141.15, 'paid', NOW() - INTERVAL '20 minutes', NOW() - INTERVAL '12 minutes'),

('00000003-0000-0000-0000-000000000003', 'ORD-20251117-003', '55555555-5555-5555-5555-555555555555', ARRAY['cccccccc-cccc-cccc-cccc-cccccccccccc']::uuid[],
 'preparing', '{"street": "Al Majaz", "city": "Sharjah", "building": "Crystal Tower", "flat": "603"}'::jsonb,
 80.00, 10.00, 4.00, 94.00, 'paid', NOW() - INTERVAL '10 minutes', NOW() - INTERVAL '5 minutes'),

('00000004-0000-0000-0000-000000000004', 'ORD-20251117-004', '33333333-3333-3333-3333-333333333333', ARRAY['dddddddd-dddd-dddd-dddd-dddddddddddd']::uuid[],
 'preparing', '{"street": "Business Bay", "city": "Dubai", "building": "Executive Towers", "flat": "1502"}'::jsonb,
 145.00, 12.00, 7.25, 164.25, 'paid', NOW() - INTERVAL '25 minutes', NOW() - INTERVAL '15 minutes'),

('00000005-0000-0000-0000-000000000005', 'ORD-20251117-005', '44444444-4444-4444-4444-444444444444', ARRAY['eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee']::uuid[],
 'preparing', '{"street": "JBR", "city": "Dubai", "building": "Sadaf 6", "flat": "1102"}'::jsonb,
 92.00, 10.00, 4.60, 106.60, 'paid', NOW() - INTERVAL '18 minutes', NOW() - INTERVAL '8 minutes'),

-- Status: ready (3 orders in queue)
('00000006-0000-0000-0000-000000000006', 'ORD-20251117-006', '55555555-5555-5555-5555-555555555555', ARRAY['ffffffff-ffff-ffff-ffff-ffffffffffff']::uuid[],
 'ready', '{"street": "Yas Island", "city": "Abu Dhabi", "building": "Yas Bay Residences", "flat": "704"}'::jsonb,
 110.00, 10.00, 5.50, 125.50, 'paid', NOW() - INTERVAL '40 minutes', NOW() - INTERVAL '2 minutes'),

('00000007-0000-0000-0000-000000000007', 'ORD-20251117-007', '33333333-3333-3333-3333-333333333333', ARRAY['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa']::uuid[],
 'ready', '{"street": "Corniche", "city": "Abu Dhabi", "building": "Nation Towers", "flat": "2301"}'::jsonb,
 87.00, 10.00, 4.35, 101.35, 'paid', NOW() - INTERVAL '35 minutes', NOW() - INTERVAL '3 minutes'),

('00000008-0000-0000-0000-000000000008', 'ORD-20251117-008', '44444444-4444-4444-4444-444444444444', ARRAY['bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb']::uuid[],
 'ready', '{"street": "Palm Jumeirah", "city": "Dubai", "building": "Golden Mile", "flat": "905"}'::jsonb,
 158.00, 15.00, 7.90, 180.90, 'paid', NOW() - INTERVAL '45 minutes', NOW() - INTERVAL '5 minutes'),

-- Status: in_transit (10 orders being delivered)
('00000009-0000-0000-0000-000000000009', 'ORD-20251117-009', '55555555-5555-5555-5555-555555555555', ARRAY['cccccccc-cccc-cccc-cccc-cccccccccccc']::uuid[],
 'in_transit', '{"street": "Al Khan", "city": "Sharjah", "building": "Sharjah Grand", "flat": "408"}'::jsonb,
 95.00, 10.00, 4.75, 109.75, 'paid', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '15 minutes'),

('00000010-0000-0000-0000-000000000010', 'ORD-20251117-010', '33333333-3333-3333-3333-333333333333', ARRAY['dddddddd-dddd-dddd-dddd-dddddddddddd']::uuid[],
 'in_transit', '{"street": "DIFC", "city": "Dubai", "building": "Gate Village", "flat": "1205"}'::jsonb,
 132.00, 12.00, 6.60, 150.60, 'paid', NOW() - INTERVAL '50 minutes', NOW() - INTERVAL '12 minutes'),

('00000011-0000-0000-0000-000000000011', 'ORD-20251117-011', '44444444-4444-4444-4444-444444444444', ARRAY['eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee']::uuid[],
 'in_transit', '{"street": "Downtown Dubai", "city": "Dubai", "building": "Burj Khalifa", "flat": "4502"}'::jsonb,
 175.00, 15.00, 8.75, 198.75, 'paid', NOW() - INTERVAL '55 minutes', NOW() - INTERVAL '10 minutes'),

('00000012-0000-0000-0000-000000000012', 'ORD-20251117-012', '55555555-5555-5555-5555-555555555555', ARRAY['ffffffff-ffff-ffff-ffff-ffffffffffff']::uuid[],
 'in_transit', '{"street": "Saadiyat Island", "city": "Abu Dhabi", "building": "Park View", "flat": "902"}'::jsonb,
 118.00, 10.00, 5.90, 133.90, 'paid', NOW() - INTERVAL '1 hour 10 minutes', NOW() - INTERVAL '18 minutes'),

('00000013-0000-0000-0000-000000000013', 'ORD-20251117-013', '33333333-3333-3333-3333-333333333333', ARRAY['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa']::uuid[],
 'in_transit', '{"street": "Khalifa City", "city": "Abu Dhabi", "building": "City Tower", "flat": "1508"}'::jsonb,
 104.00, 10.00, 5.20, 119.20, 'paid', NOW() - INTERVAL '1 hour 5 minutes', NOW() - INTERVAL '20 minutes'),

('00000014-0000-0000-0000-000000000014', 'ORD-20251117-014', '44444444-4444-4444-4444-444444444444', ARRAY['bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb']::uuid[],
 'in_transit', '{"street": "Al Barsha", "city": "Dubai", "building": "Mall of Emirates Residences", "flat": "705"}'::jsonb,
 141.00, 12.00, 7.05, 160.05, 'paid', NOW() - INTERVAL '58 minutes', NOW() - INTERVAL '14 minutes'),

('00000015-0000-0000-0000-000000000015', 'ORD-20251117-015', '55555555-5555-5555-5555-555555555555', ARRAY['cccccccc-cccc-cccc-cccc-cccccccccccc']::uuid[],
 'in_transit', '{"street": "Al Nahda", "city": "Sharjah", "building": "Palm Tower", "flat": "1203"}'::jsonb,
 78.00, 10.00, 3.90, 91.90, 'paid', NOW() - INTERVAL '1 hour 15 minutes', NOW() - INTERVAL '22 minutes'),

('00000016-0000-0000-0000-000000000016', 'ORD-20251117-016', '33333333-3333-3333-3333-333333333333', ARRAY['dddddddd-dddd-dddd-dddd-dddddddddddd']::uuid[],
 'in_transit', '{"street": "Dubai Hills", "city": "Dubai", "building": "Park Heights", "flat": "603"}'::jsonb,
 156.00, 12.00, 7.80, 175.80, 'paid', NOW() - INTERVAL '52 minutes', NOW() - INTERVAL '16 minutes'),

('00000017-0000-0000-0000-000000000017', 'ORD-20251117-017', '44444444-4444-4444-4444-444444444444', ARRAY['eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee']::uuid[],
 'in_transit', '{"street": "City Walk", "city": "Dubai", "building": "Boulevard Central", "flat": "808"}'::jsonb,
 128.00, 12.00, 6.40, 146.40, 'paid', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '19 minutes'),

('00000018-0000-0000-0000-000000000018', 'ORD-20251117-018', '55555555-5555-5555-5555-555555555555', ARRAY['ffffffff-ffff-ffff-ffff-ffffffffffff']::uuid[],
 'in_transit', '{"street": "Reem Island", "city": "Abu Dhabi", "building": "Shams Tower", "flat": "1605"}'::jsonb,
 112.00, 10.00, 5.60, 127.60, 'paid', NOW() - INTERVAL '1 hour 8 minutes', NOW() - INTERVAL '25 minutes'),

-- Status: delivered (20 completed orders)
('00000019-0000-0000-0000-000000000019', 'ORD-20251117-019', '33333333-3333-3333-3333-333333333333', ARRAY['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa']::uuid[],
 'delivered', '{"street": "Al Raha Beach", "city": "Abu Dhabi", "building": "Al Bandar", "flat": "1102"}'::jsonb,
 98.00, 10.00, 4.90, 112.90, 'paid', NOW() - INTERVAL '3 hours', NOW() - INTERVAL '2 hours 15 minutes'),

('00000020-0000-0000-0000-000000000020', 'ORD-20251116-020', '44444444-4444-4444-4444-444444444444', ARRAY['bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb']::uuid[],
 'delivered', '{"street": "Dubai Marina", "city": "Dubai", "building": "Princess Tower", "flat": "3405"}'::jsonb,
 145.00, 12.00, 7.25, 164.25, 'paid', NOW() - INTERVAL '1 day', NOW() - INTERVAL '23 hours'),

('00000021-0000-0000-0000-000000000021', 'ORD-20251116-021', '55555555-5555-5555-5555-555555555555', ARRAY['cccccccc-cccc-cccc-cccc-cccccccccccc']::uuid[],
 'delivered', '{"street": "Al Majaz", "city": "Sharjah", "building": "Oasis Tower", "flat": "907"}'::jsonb,
 85.00, 10.00, 4.25, 99.25, 'paid', NOW() - INTERVAL '1 day 2 hours', NOW() - INTERVAL '1 day 1 hour'),

('00000022-0000-0000-0000-000000000022', 'ORD-20251116-022', '33333333-3333-3333-3333-333333333333', ARRAY['dddddddd-dddd-dddd-dddd-dddddddddddd']::uuid[],
 'delivered', '{"street": "Business Bay", "city": "Dubai", "building": "Bay Square", "flat": "2208"}'::jsonb,
 162.00, 12.00, 8.10, 182.10, 'paid', NOW() - INTERVAL '1 day 5 hours', NOW() - INTERVAL '1 day 4 hours'),

('00000023-0000-0000-0000-000000000023', 'ORD-20251116-023', '44444444-4444-4444-4444-444444444444', ARRAY['eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee']::uuid[],
 'delivered', '{"street": "JBR", "city": "Dubai", "building": "Murjan 1", "flat": "1505"}'::jsonb,
 118.00, 10.00, 5.90, 133.90, 'paid', NOW() - INTERVAL '1 day 8 hours', NOW() - INTERVAL '1 day 7 hours'),

('00000024-0000-0000-0000-000000000024', 'ORD-20251115-024', '55555555-5555-5555-5555-555555555555', ARRAY['ffffffff-ffff-ffff-ffff-ffffffffffff']::uuid[],
 'delivered', '{"street": "Yas Island", "city": "Abu Dhabi", "building": "Ansam", "flat": "604"}'::jsonb,
 125.00, 10.00, 6.25, 141.25, 'paid', NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day 23 hours'),

('00000025-0000-0000-0000-000000000025', 'ORD-20251115-025', '33333333-3333-3333-3333-333333333333', ARRAY['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa']::uuid[],
 'delivered', '{"street": "Corniche", "city": "Abu Dhabi", "building": "Etihad Towers", "flat": "1805"}'::jsonb,
 142.00, 10.00, 7.10, 159.10, 'paid', NOW() - INTERVAL '2 days 3 hours', NOW() - INTERVAL '2 days 2 hours'),

('00000026-0000-0000-0000-000000000026', 'ORD-20251115-026', '44444444-4444-4444-4444-444444444444', ARRAY['bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb']::uuid[],
 'delivered', '{"street": "Palm Jumeirah", "city": "Dubai", "building": "Tiara Residences", "flat": "1203"}'::jsonb,
 168.00, 15.00, 8.40, 191.40, 'paid', NOW() - INTERVAL '2 days 6 hours', NOW() - INTERVAL '2 days 5 hours'),

('00000027-0000-0000-0000-000000000027', 'ORD-20251114-027', '55555555-5555-5555-5555-555555555555', ARRAY['cccccccc-cccc-cccc-cccc-cccccccccccc']::uuid[],
 'delivered', '{"street": "Al Khan", "city": "Sharjah", "building": "Al Majaz Premiere", "flat": "702"}'::jsonb,
 92.00, 10.00, 4.60, 106.60, 'paid', NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days 23 hours'),

('00000028-0000-0000-0000-000000000028', 'ORD-20251114-028', '33333333-3333-3333-3333-333333333333', ARRAY['dddddddd-dddd-dddd-dddd-dddddddddddd']::uuid[],
 'delivered', '{"street": "DIFC", "city": "Dubai", "building": "ICD Brookfield Place", "flat": "2506"}'::jsonb,
 155.00, 12.00, 7.75, 174.75, 'paid', NOW() - INTERVAL '3 days 4 hours', NOW() - INTERVAL '3 days 3 hours'),

('00000029-0000-0000-0000-000000000029', 'ORD-20251114-029', '44444444-4444-4444-4444-444444444444', ARRAY['eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee']::uuid[],
 'delivered', '{"street": "Downtown Dubai", "city": "Dubai", "building": "Address Boulevard", "flat": "3308"}'::jsonb,
 178.00, 15.00, 8.90, 201.90, 'paid', NOW() - INTERVAL '3 days 8 hours', NOW() - INTERVAL '3 days 7 hours'),

('00000030-0000-0000-0000-000000000030', 'ORD-20251113-030', '55555555-5555-5555-5555-555555555555', ARRAY['ffffffff-ffff-ffff-ffff-ffffffffffff']::uuid[],
 'delivered', '{"street": "Saadiyat Island", "city": "Abu Dhabi", "building": "Soho Square", "flat": "1405"}'::jsonb,
 135.00, 10.00, 6.75, 151.75, 'paid', NOW() - INTERVAL '4 days', NOW() - INTERVAL '3 days 23 hours'),

('00000031-0000-0000-0000-000000000031', 'ORD-20251113-031', '33333333-3333-3333-3333-333333333333', ARRAY['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa']::uuid[],
 'delivered', '{"street": "Al Reef", "city": "Abu Dhabi", "building": "Contemporary Village", "flat": "805"}'::jsonb,
 108.00, 10.00, 5.40, 123.40, 'paid', NOW() - INTERVAL '4 days 5 hours', NOW() - INTERVAL '4 days 4 hours'),

('00000032-0000-0000-0000-000000000032', 'ORD-20251112-032', '44444444-4444-4444-4444-444444444444', ARRAY['bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb']::uuid[],
 'delivered', '{"street": "Al Barsha", "city": "Dubai", "building": "Al Barsha South", "flat": "1102"}'::jsonb,
 148.00, 12.00, 7.40, 167.40, 'paid', NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 days 23 hours'),

('00000033-0000-0000-0000-000000000033', 'ORD-20251112-033', '55555555-5555-5555-5555-555555555555', ARRAY['cccccccc-cccc-cccc-cccc-cccccccccccc']::uuid[],
 'delivered', '{"street": "Muwaileh", "city": "Sharjah", "building": "University City", "flat": "503"}'::jsonb,
 74.00, 10.00, 3.70, 87.70, 'paid', NOW() - INTERVAL '5 days 6 hours', NOW() - INTERVAL '5 days 5 hours'),

('00000034-0000-0000-0000-000000000034', 'ORD-20251111-034', '33333333-3333-3333-3333-333333333333', ARRAY['dddddddd-dddd-dddd-dddd-dddddddddddd']::uuid[],
 'delivered', '{"street": "Dubai Hills", "city": "Dubai", "building": "Acacia", "flat": "906"}'::jsonb,
 163.00, 12.00, 8.15, 183.15, 'paid', NOW() - INTERVAL '6 days', NOW() - INTERVAL '5 days 23 hours'),

('00000035-0000-0000-0000-000000000035', 'ORD-20251111-035', '44444444-4444-4444-4444-444444444444', ARRAY['eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee']::uuid[],
 'delivered', '{"street": "La Mer", "city": "Dubai", "building": "Nikki Beach Resort", "flat": "1708"}'::jsonb,
 195.00, 15.00, 9.75, 219.75, 'paid', NOW() - INTERVAL '6 days 8 hours', NOW() - INTERVAL '6 days 7 hours'),

('00000036-0000-0000-0000-000000000036', 'ORD-20251110-036', '55555555-5555-5555-5555-555555555555', ARRAY['ffffffff-ffff-ffff-ffff-ffffffffffff']::uuid[],
 'delivered', '{"street": "Al Reem Island", "city": "Abu Dhabi", "building": "Marina Square", "flat": "2205"}'::jsonb,
 122.00, 10.00, 6.10, 138.10, 'paid', NOW() - INTERVAL '7 days', NOW() - INTERVAL '6 days 23 hours'),

('00000037-0000-0000-0000-000000000037', 'ORD-20251110-037', '33333333-3333-3333-3333-333333333333', ARRAY['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa']::uuid[],
 'delivered', '{"street": "Khalidiya", "city": "Abu Dhabi", "building": "Khalidiya Tower", "flat": "1504"}'::jsonb,
 115.00, 10.00, 5.75, 130.75, 'paid', NOW() - INTERVAL '7 days 10 hours', NOW() - INTERVAL '7 days 9 hours'),

('00000038-0000-0000-0000-000000000038', 'ORD-20251109-038', '44444444-4444-4444-4444-444444444444', ARRAY['bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb']::uuid[],
 'delivered', '{"street": "Dubai Marina", "city": "Dubai", "building": "Marina Promenade", "flat": "2802"}'::jsonb,
 152.00, 12.00, 7.60, 171.60, 'paid', NOW() - INTERVAL '8 days', NOW() - INTERVAL '7 days 23 hours');

-- Insert order items
INSERT INTO order_items (order_id, menu_item_id, restaurant_id, quantity, base_price, item_total, nutritional_summary) VALUES
-- Order 1 items
('00000001-0000-0000-0000-000000000001', 'a1000005-0000-0000-0000-000000000005', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 1, 48.00, 48.00, '{"calories": 465, "protein": 45, "carbs": 32, "fat": 18}'::jsonb),
('00000001-0000-0000-0000-000000000001', 'a1000009-0000-0000-0000-000000000009', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 1, 52.00, 52.00, '{"calories": 565, "protein": 48, "carbs": 38, "fat": 25}'::jsonb),

-- Order 2 items
('00000002-0000-0000-0000-000000000002', 'b2000003-0000-0000-0000-000000000003', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 1, 65.00, 65.00, '{"calories": 725, "protein": 85, "carbs": 62, "fat": 16}'::jsonb),
('00000002-0000-0000-0000-000000000002', 'b2000006-0000-0000-0000-000000000006', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 1, 58.00, 58.00, '{"calories": 725, "protein": 62, "carbs": 48, "fat": 32}'::jsonb),

-- Order 3 items
('00000003-0000-0000-0000-000000000003', 'c3000003-0000-0000-0000-000000000003', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 1, 42.00, 42.00, '{"calories": 485, "protein": 16, "carbs": 72, "fat": 14}'::jsonb),
('00000003-0000-0000-0000-000000000003', 'c3000005-0000-0000-0000-000000000005', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 1, 38.00, 38.00, '{"calories": 385, "protein": 12, "carbs": 58, "fat": 12}'::jsonb);

-- Success message
SELECT 'UAE Healthy Restaurants seed data loaded successfully!' as message;
SELECT 'Owner 1 (owner1@cuts.ae) owns 3 restaurants: Fit & Fresh, Protein Hub, Green Bowl' as owner_info;
SELECT 'Orders created: 5 preparing, 3 ready, 10 in_transit, 20 delivered' as order_status;
