-- Massive Seed Data for cuts.ae Platform
-- Generated with AI - 500+ orders, 100 menu items, 50 customers
-- Password for ALL users: password123

-- Clear existing data
TRUNCATE TABLE support_messages CASCADE;
TRUNCATE TABLE support_tickets CASCADE;
TRUNCATE TABLE invoices CASCADE;
TRUNCATE TABLE order_items CASCADE;
TRUNCATE TABLE orders CASCADE;
TRUNCATE TABLE nutritional_info CASCADE;
TRUNCATE TABLE item_variants CASCADE;
TRUNCATE TABLE menu_items CASCADE;
TRUNCATE TABLE restaurants CASCADE;
TRUNCATE TABLE customer_profiles CASCADE;
TRUNCATE TABLE drivers CASCADE;
TRUNCATE TABLE users CASCADE;

-- =============================================================================
-- USERS (1 admin, 1 owner, 50 customers)
-- =============================================================================
-- Password hash for "password123"
INSERT INTO users (id, email, phone, password_hash, first_name, last_name, role, created_at, updated_at) VALUES
-- Admin
('99999999-9999-9999-9999-999999999999', 'admin@cuts.ae', '+971501234599', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Admin', 'User', 'admin', NOW() - INTERVAL '6 months', NOW()),
-- Restaurant Owner
('11111111-1111-1111-1111-111111111111', 'owner@cuts.ae', '+971501234567', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Ahmed', 'Al Maktoum', 'restaurant_owner', NOW() - INTERVAL '6 months', NOW());

-- 50 Customers with UAE names
INSERT INTO users (id, email, phone, password_hash, first_name, last_name, role, created_at, updated_at) VALUES
('c0000001-0000-0000-0000-000000000001', 'customer1@cuts.ae', '+971501000001', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Omar', 'Hassan', 'customer', NOW() - INTERVAL '5 months', NOW()),
('c0000002-0000-0000-0000-000000000002', 'customer2@cuts.ae', '+971501000002', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Fatima', 'Al Nahyan', 'customer', NOW() - INTERVAL '5 months', NOW()),
('c0000003-0000-0000-0000-000000000003', 'customer3@cuts.ae', '+971501000003', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Khalid', 'Ibrahim', 'customer', NOW() - INTERVAL '5 months', NOW()),
('c0000004-0000-0000-0000-000000000004', 'customer4@cuts.ae', '+971501000004', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Sara', 'Ahmed', 'customer', NOW() - INTERVAL '4 months', NOW()),
('c0000005-0000-0000-0000-000000000005', 'customer5@cuts.ae', '+971501000005', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Mohammed', 'Al Suwaidi', 'customer', NOW() - INTERVAL '4 months', NOW()),
('c0000006-0000-0000-0000-000000000006', 'customer6@cuts.ae', '+971501000006', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Layla', 'Rashid', 'customer', NOW() - INTERVAL '4 months', NOW()),
('c0000007-0000-0000-0000-000000000007', 'customer7@cuts.ae', '+971501000007', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Ali', 'Mansoor', 'customer', NOW() - INTERVAL '4 months', NOW()),
('c0000008-0000-0000-0000-000000000008', 'customer8@cuts.ae', '+971501000008', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Noura', 'Al Falasi', 'customer', NOW() - INTERVAL '3 months', NOW()),
('c0000009-0000-0000-0000-000000000009', 'customer9@cuts.ae', '+971501000009', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Hamad', 'Al Ketbi', 'customer', NOW() - INTERVAL '3 months', NOW()),
('c0000010-0000-0000-0000-000000000010', 'customer10@cuts.ae', '+971501000010', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Aisha', 'Mohammed', 'customer', NOW() - INTERVAL '3 months', NOW()),
('c0000011-0000-0000-0000-000000000011', 'customer11@cuts.ae', '+971501000011', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Sultan', 'Al Mazrouei', 'customer', NOW() - INTERVAL '3 months', NOW()),
('c0000012-0000-0000-0000-000000000012', 'customer12@cuts.ae', '+971501000012', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Mariam', 'Al Shamsi', 'customer', NOW() - INTERVAL '3 months', NOW()),
('c0000013-0000-0000-0000-000000000013', 'customer13@cuts.ae', '+971501000013', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Rashid', 'Al Nuaimi', 'customer', NOW() - INTERVAL '2 months', NOW()),
('c0000014-0000-0000-0000-000000000014', 'customer14@cuts.ae', '+971501000014', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Hessa', 'Al Qassimi', 'customer', NOW() - INTERVAL '2 months', NOW()),
('c0000015-0000-0000-0000-000000000015', 'customer15@cuts.ae', '+971501000015', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Saeed', 'Al Muhairi', 'customer', NOW() - INTERVAL '2 months', NOW()),
('c0000016-0000-0000-0000-000000000016', 'customer16@cuts.ae', '+971501000016', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Moza', 'Al Dhaheri', 'customer', NOW() - INTERVAL '2 months', NOW()),
('c0000017-0000-0000-0000-000000000017', 'customer17@cuts.ae', '+971501000017', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Abdullah', 'Al Remeithi', 'customer', NOW() - INTERVAL '2 months', NOW()),
('c0000018-0000-0000-0000-000000000018', 'customer18@cuts.ae', '+971501000018', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Shamma', 'Al Zaabi', 'customer', NOW() - INTERVAL '1 month', NOW()),
('c0000019-0000-0000-0000-000000000019', 'customer19@cuts.ae', '+971501000019', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Mansoor', 'Al Mehairi', 'customer', NOW() - INTERVAL '1 month', NOW()),
('c0000020-0000-0000-0000-000000000020', 'customer20@cuts.ae', '+971501000020', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Latifa', 'Al Qubaisi', 'customer', NOW() - INTERVAL '1 month', NOW()),
('c0000021-0000-0000-0000-000000000021', 'customer21@cuts.ae', '+971501000021', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Majid', 'Al Hosani', 'customer', NOW() - INTERVAL '1 month', NOW()),
('c0000022-0000-0000-0000-000000000022', 'customer22@cuts.ae', '+971501000022', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Amna', 'Al Mansoori', 'customer', NOW() - INTERVAL '1 month', NOW()),
('c0000023-0000-0000-0000-000000000023', 'customer23@cuts.ae', '+971501000023', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Zayed', 'Al Bloushi', 'customer', NOW() - INTERVAL '3 weeks', NOW()),
('c0000024-0000-0000-0000-000000000024', 'customer24@cuts.ae', '+971501000024', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Shamsa', 'Al Khaili', 'customer', NOW() - INTERVAL '3 weeks', NOW()),
('c0000025-0000-0000-0000-000000000025', 'customer25@cuts.ae', '+971501000025', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Ahmed', 'Al Romaithi', 'customer', NOW() - INTERVAL '3 weeks', NOW()),
('c0000026-0000-0000-0000-000000000026', 'customer26@cuts.ae', '+971501000026', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Meera', 'Al Jaberi', 'customer', NOW() - INTERVAL '2 weeks', NOW()),
('c0000027-0000-0000-0000-000000000027', 'customer27@cuts.ae', '+971501000027', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Thani', 'Al Suwaidi', 'customer', NOW() - INTERVAL '2 weeks', NOW()),
('c0000028-0000-0000-0000-000000000028', 'customer28@cuts.ae', '+971501000028', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Mouza', 'Al Neyadi', 'customer', NOW() - INTERVAL '2 weeks', NOW()),
('c0000029-0000-0000-0000-000000000029', 'customer29@cuts.ae', '+971501000029', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Obaid', 'Al Kaabi', 'customer', NOW() - INTERVAL '2 weeks', NOW()),
('c0000030-0000-0000-0000-000000000030', 'customer30@cuts.ae', '+971501000030', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Reem', 'Al Hashemi', 'customer', NOW() - INTERVAL '1 week', NOW()),
('c0000031-0000-0000-0000-000000000031', 'customer31@cuts.ae', '+971501000031', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Khaled', 'Al Mulla', 'customer', NOW() - INTERVAL '1 week', NOW()),
('c0000032-0000-0000-0000-000000000032', 'customer32@cuts.ae', '+971501000032', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Dana', 'Al Sayed', 'customer', NOW() - INTERVAL '1 week', NOW()),
('c0000033-0000-0000-0000-000000000033', 'customer33@cuts.ae', '+971501000033', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Nasser', 'Al Khouri', 'customer', NOW() - INTERVAL '6 days', NOW()),
('c0000034-0000-0000-0000-000000000034', 'customer34@cuts.ae', '+971501000034', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Salama', 'Al Mazrui', 'customer', NOW() - INTERVAL '6 days', NOW()),
('c0000035-0000-0000-0000-000000000035', 'customer35@cuts.ae', '+971501000035', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Jassim', 'Al Balooshi', 'customer', NOW() - INTERVAL '5 days', NOW()),
('c0000036-0000-0000-0000-000000000036', 'customer36@cuts.ae', '+971501000036', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Wadha', 'Al Dhahiri', 'customer', NOW() - INTERVAL '5 days', NOW()),
('c0000037-0000-0000-0000-000000000037', 'customer37@cuts.ae', '+971501000037', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Faisal', 'Al Shamlan', 'customer', NOW() - INTERVAL '4 days', NOW()),
('c0000038-0000-0000-0000-000000000038', 'customer38@cuts.ae', '+971501000038', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Jawaher', 'Al Sharqi', 'customer', NOW() - INTERVAL '4 days', NOW()),
('c0000039-0000-0000-0000-000000000039', 'customer39@cuts.ae', '+971501000039', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Salem', 'Al Ketbi', 'customer', NOW() - INTERVAL '3 days', NOW()),
('c0000040-0000-0000-0000-000000000040', 'customer40@cuts.ae', '+971501000040', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Afra', 'Al Ghaith', 'customer', NOW() - INTERVAL '3 days', NOW()),
('c0000041-0000-0000-0000-000000000041', 'customer41@cuts.ae', '+971501000041', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Humaid', 'Al Tayer', 'customer', NOW() - INTERVAL '2 days', NOW()),
('c0000042-0000-0000-0000-000000000042', 'customer42@cuts.ae', '+971501000042', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Sheikha', 'Al Nahyan', 'customer', NOW() - INTERVAL '2 days', NOW()),
('c0000043-0000-0000-0000-000000000043', 'customer43@cuts.ae', '+971501000043', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Saif', 'Al Ameri', 'customer', NOW() - INTERVAL '2 days', NOW()),
('c0000044-0000-0000-0000-000000000044', 'customer44@cuts.ae', '+971501000044', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Alia', 'Al Rostamani', 'customer', NOW() - INTERVAL '1 day', NOW()),
('c0000045-0000-0000-0000-000000000045', 'customer45@cuts.ae', '+971501000045', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Tariq', 'Al Fardan', 'customer', NOW() - INTERVAL '1 day', NOW()),
('c0000046-0000-0000-0000-000000000046', 'customer46@cuts.ae', '+971501000046', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Hind', 'Al Otaiba', 'customer', NOW() - INTERVAL '12 hours', NOW()),
('c0000047-0000-0000-0000-000000000047', 'customer47@cuts.ae', '+971501000047', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Waleed', 'Al Khoory', 'customer', NOW() - INTERVAL '12 hours', NOW()),
('c0000048-0000-0000-0000-000000000048', 'customer48@cuts.ae', '+971501000048', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Lubna', 'Al Falah', 'customer', NOW() - INTERVAL '6 hours', NOW()),
('c0000049-0000-0000-0000-000000000049', 'customer49@cuts.ae', '+971501000049', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Hamdan', 'Al Sayegh', 'customer', NOW() - INTERVAL '3 hours', NOW()),
('c0000050-0000-0000-0000-000000000050', 'customer50@cuts.ae', '+971501000050', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Asma', 'Al Badi', 'customer', NOW() - INTERVAL '1 hour', NOW());

-- =============================================================================
-- RESTAURANTS (5 restaurants, all owned by owner@cuts.ae)
-- =============================================================================
INSERT INTO restaurants (id, owner_id, name, slug, description, cuisine_type, address, phone, email, commission_rate, is_active, operating_hours, average_prep_time) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111',
 'The Fit Kitchen', 'the-fit-kitchen',
 'Premium healthy meals crafted for fitness enthusiasts. High protein, balanced macros, zero compromise on taste.',
 ARRAY['Healthy', 'Mediterranean', 'Fitness'],
 '{"street": "Al Raha Beach, Building 5", "city": "Abu Dhabi", "emirate": "Abu Dhabi", "country": "UAE"}'::jsonb,
 '+971501111001', 'hello@thefitkitchen.ae', 0.15, true,
 '{"monday": {"open": "06:00", "close": "22:00"}, "tuesday": {"open": "06:00", "close": "22:00"}, "wednesday": {"open": "06:00", "close": "22:00"}, "thursday": {"open": "06:00", "close": "22:00"}, "friday": {"open": "06:00", "close": "23:00"}, "saturday": {"open": "07:00", "close": "23:00"}, "sunday": {"open": "07:00", "close": "22:00"}}'::jsonb,
 25),

('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111',
 'Lean & Green Dubai', 'lean-green-dubai',
 'Plant-forward cuisine for the health-conscious. Organic ingredients, sustainable sourcing, incredible flavors.',
 ARRAY['Vegan', 'Organic', 'Salads'],
 '{"street": "Dubai Marina Walk, Tower 3", "city": "Dubai", "emirate": "Dubai", "country": "UAE"}'::jsonb,
 '+971501111002', 'info@leangreen.ae', 0.15, true,
 '{"monday": {"open": "07:00", "close": "22:00"}, "tuesday": {"open": "07:00", "close": "22:00"}, "wednesday": {"open": "07:00", "close": "22:00"}, "thursday": {"open": "07:00", "close": "22:00"}, "friday": {"open": "07:00", "close": "23:00"}, "saturday": {"open": "08:00", "close": "23:00"}, "sunday": {"open": "08:00", "close": "22:00"}}'::jsonb,
 30),

('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111',
 'Protein Palace', 'protein-palace',
 'The ultimate destination for muscle builders. Macro-optimized meals designed for serious athletes.',
 ARRAY['High Protein', 'Bodybuilding', 'Sports Nutrition'],
 '{"street": "Business Bay, Executive Tower", "city": "Dubai", "emirate": "Dubai", "country": "UAE"}'::jsonb,
 '+971501111003', 'gains@proteinpalace.ae', 0.15, true,
 '{"monday": {"open": "05:00", "close": "23:00"}, "tuesday": {"open": "05:00", "close": "23:00"}, "wednesday": {"open": "05:00", "close": "23:00"}, "thursday": {"open": "05:00", "close": "23:00"}, "friday": {"open": "05:00", "close": "23:00"}, "saturday": {"open": "06:00", "close": "23:00"}, "sunday": {"open": "06:00", "close": "22:00"}}'::jsonb,
 20),

('dddddddd-dddd-dddd-dddd-dddddddddddd', '11111111-1111-1111-1111-111111111111',
 'Keto Kingdom', 'keto-kingdom',
 'Low carb, high fat perfection. Delicious keto-friendly meals that keep you in ketosis without sacrifice.',
 ARRAY['Keto', 'Low Carb', 'Healthy Fats'],
 '{"street": "Al Wasl Road, Jumeirah 1", "city": "Dubai", "emirate": "Dubai", "country": "UAE"}'::jsonb,
 '+971501111004', 'keto@ketokingdom.ae', 0.15, true,
 '{"monday": {"open": "08:00", "close": "21:00"}, "tuesday": {"open": "08:00", "close": "21:00"}, "wednesday": {"open": "08:00", "close": "21:00"}, "thursday": {"open": "08:00", "close": "21:00"}, "friday": {"open": "08:00", "close": "22:00"}, "saturday": {"open": "09:00", "close": "22:00"}, "sunday": {"open": "09:00", "close": "21:00"}}'::jsonb,
 35),

('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '11111111-1111-1111-1111-111111111111',
 'Clean Eats Abu Dhabi', 'clean-eats-abu-dhabi',
 'Simple, clean, wholesome food. No processed ingredients, no added sugars, just real food for real results.',
 ARRAY['Clean Eating', 'Whole Foods', 'Meal Prep'],
 '{"street": "Corniche Road, Nation Towers", "city": "Abu Dhabi", "emirate": "Abu Dhabi", "country": "UAE"}'::jsonb,
 '+971501111005', 'eat@cleaneats.ae', 0.15, true,
 '{"monday": {"open": "06:00", "close": "22:00"}, "tuesday": {"open": "06:00", "close": "22:00"}, "wednesday": {"open": "06:00", "close": "22:00"}, "thursday": {"open": "06:00", "close": "22:00"}, "friday": {"open": "06:00", "close": "23:00"}, "saturday": {"open": "07:00", "close": "23:00"}, "sunday": {"open": "07:00", "close": "22:00"}}'::jsonb,
 25);

-- =============================================================================
-- MENU ITEMS (100 items across 5 restaurants, 20 each)
-- =============================================================================

-- Restaurant A: The Fit Kitchen (20 items)
INSERT INTO menu_items (id, restaurant_id, name, description, base_price, category, is_available, prep_time) VALUES
('a0000001-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Grilled Chicken Quinoa Bowl', 'Herb-marinated chicken breast with tri-color quinoa, roasted vegetables, and tahini dressing', 48.00, 'lunch', true, 15),
('a0000002-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Salmon Teriyaki Rice Bowl', 'Norwegian salmon with brown rice, edamame, avocado, and house teriyaki glaze', 62.00, 'lunch', true, 18),
('a0000003-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Protein Power Breakfast', 'Scrambled eggs, turkey bacon, avocado, sweet potato hash, and whole grain toast', 42.00, 'breakfast', true, 12),
('a0000004-0000-0000-0000-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Greek Yogurt Parfait', 'Thick Greek yogurt layered with granola, fresh berries, honey, and chia seeds', 28.00, 'breakfast', true, 5),
('a0000005-0000-0000-0000-000000000005', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Mediterranean Grilled Steak', 'Grass-fed beef tenderloin with roasted vegetables and chimichurri sauce', 85.00, 'dinner', true, 25),
('a0000006-0000-0000-0000-000000000006', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Avocado Toast Deluxe', 'Smashed avocado on sourdough with poached eggs, cherry tomatoes, and microgreens', 38.00, 'breakfast', true, 10),
('a0000007-0000-0000-0000-000000000007', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Turkey Meatball Zoodles', 'Lean turkey meatballs with zucchini noodles and fresh marinara sauce', 52.00, 'dinner', true, 20),
('a0000008-0000-0000-0000-000000000008', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Protein Pancakes Stack', 'Fluffy protein pancakes with fresh berries, almond butter, and sugar-free maple syrup', 36.00, 'breakfast', true, 15),
('a0000009-0000-0000-0000-000000000009', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Grilled Chicken Caesar Salad', 'Romaine lettuce, grilled chicken, parmesan, whole grain croutons, light Caesar dressing', 45.00, 'lunch', true, 12),
('a0000010-0000-0000-0000-000000000010', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Spicy Tuna Poke Bowl', 'Fresh tuna, sushi rice, cucumber, edamame, seaweed, spicy mayo, and sesame seeds', 58.00, 'lunch', true, 10),
('a0000011-0000-0000-0000-000000000011', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Lean Beef Burger', 'Grass-fed beef patty, whole wheat bun, lettuce, tomato, caramelized onions', 55.00, 'lunch', true, 18),
('a0000012-0000-0000-0000-000000000012', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Baked Salmon with Asparagus', 'Oven-baked salmon fillet with asparagus, lemon butter, and wild rice', 72.00, 'dinner', true, 22),
('a0000013-0000-0000-0000-000000000013', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Green Detox Smoothie', 'Spinach, kale, banana, almond milk, chia seeds, and honey', 25.00, 'beverages', true, 5),
('a0000014-0000-0000-0000-000000000014', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Protein Power Smoothie', 'Whey protein, banana, peanut butter, oats, and almond milk', 28.00, 'beverages', true, 5),
('a0000015-0000-0000-0000-000000000015', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Energy Bites Box', 'Homemade protein balls with dates, oats, dark chocolate, and coconut', 22.00, 'snacks', true, 3),
('a0000016-0000-0000-0000-000000000016', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Hummus & Veggie Plate', 'Creamy hummus with carrot sticks, cucumber, bell peppers, and whole wheat pita', 24.00, 'snacks', true, 5),
('a0000017-0000-0000-0000-000000000017', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Chicken Shawarma Bowl', 'Marinated chicken shawarma, brown rice, pickles, garlic sauce, fresh vegetables', 46.00, 'lunch', true, 15),
('a0000018-0000-0000-0000-000000000018', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Egg White Omelette', 'Fluffy egg whites with spinach, mushrooms, feta cheese, and herbs', 32.00, 'breakfast', true, 10),
('a0000019-0000-0000-0000-000000000019', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Grilled Lamb Chops', 'New Zealand lamb chops with roasted vegetables and mint yogurt sauce', 95.00, 'dinner', true, 28),
('a0000020-0000-0000-0000-000000000020', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Fresh Fruit Bowl', 'Seasonal fresh fruits with Greek yogurt drizzle and granola topping', 26.00, 'snacks', true, 5);

-- Restaurant B: Lean & Green Dubai (20 items)
INSERT INTO menu_items (id, restaurant_id, name, description, base_price, category, is_available, prep_time) VALUES
('b0000001-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Buddha Bowl', 'Quinoa, chickpeas, roasted sweet potato, kale, avocado, tahini dressing', 46.00, 'lunch', true, 15),
('b0000002-0000-0000-0000-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Vegan Pad Thai', 'Rice noodles, tofu, vegetables, peanuts, lime, fresh herbs', 44.00, 'dinner', true, 18),
('b0000003-0000-0000-0000-000000000003', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Acai Superfood Bowl', 'Blended acai, banana, berries, topped with granola, coconut, and honey', 38.00, 'breakfast', true, 8),
('b0000004-0000-0000-0000-000000000004', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Falafel Wrap', 'Crispy falafel, hummus, fresh vegetables, tahini sauce in whole wheat wrap', 35.00, 'lunch', true, 12),
('b0000005-0000-0000-0000-000000000005', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Mushroom Risotto', 'Creamy arborio rice with mixed mushrooms, truffle oil, and parmesan', 52.00, 'dinner', true, 25),
('b0000006-0000-0000-0000-000000000006', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Green Goddess Salad', 'Mixed greens, avocado, cucumber, broccoli, green goddess dressing', 42.00, 'lunch', true, 10),
('b0000007-0000-0000-0000-000000000007', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Overnight Oats', 'Steel cut oats with almond milk, chia seeds, maple syrup, fresh berries', 28.00, 'breakfast', true, 5),
('b0000008-0000-0000-0000-000000000008', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Cauliflower Steak', 'Roasted cauliflower steak with chimichurri and quinoa pilaf', 48.00, 'dinner', true, 22),
('b0000009-0000-0000-0000-000000000009', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Smoothie Bowl', 'Mango, pineapple, coconut milk blend topped with fresh fruits and seeds', 34.00, 'breakfast', true, 8),
('b0000010-0000-0000-0000-000000000010', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Lentil Soup', 'Hearty red lentil soup with cumin, lemon, and fresh herbs', 26.00, 'lunch', true, 10),
('b0000011-0000-0000-0000-000000000011', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Veggie Sushi Roll', 'Avocado, cucumber, carrot, and asparagus maki rolls with miso soup', 42.00, 'lunch', true, 15),
('b0000012-0000-0000-0000-000000000012', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Stuffed Bell Peppers', 'Bell peppers stuffed with quinoa, black beans, corn, and cashew cream', 46.00, 'dinner', true, 25),
('b0000013-0000-0000-0000-000000000013', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Cold Pressed Green Juice', 'Kale, cucumber, celery, apple, ginger, and lemon', 24.00, 'beverages', true, 5),
('b0000014-0000-0000-0000-000000000014', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Golden Turmeric Latte', 'Warm oat milk with turmeric, ginger, cinnamon, and honey', 22.00, 'beverages', true, 5),
('b0000015-0000-0000-0000-000000000015', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Kale Chips', 'Crispy baked kale chips with sea salt and nutritional yeast', 18.00, 'snacks', true, 3),
('b0000016-0000-0000-0000-000000000016', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Avocado Chocolate Mousse', 'Rich chocolate mousse made with avocado, cacao, and maple syrup', 26.00, 'snacks', true, 5),
('b0000017-0000-0000-0000-000000000017', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Mediterranean Mezze', 'Hummus, baba ganoush, tabbouleh, falafel, and pita bread', 55.00, 'dinner', true, 15),
('b0000018-0000-0000-0000-000000000018', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Chia Pudding', 'Coconut chia pudding with mango, passion fruit, and toasted coconut', 28.00, 'breakfast', true, 5),
('b0000019-0000-0000-0000-000000000019', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Jackfruit Tacos', 'Pulled jackfruit, cabbage slaw, avocado crema in corn tortillas', 40.00, 'lunch', true, 15),
('b0000020-0000-0000-0000-000000000020', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Mixed Berry Smoothie', 'Blueberries, raspberries, strawberries, banana, and almond milk', 26.00, 'beverages', true, 5);

-- Restaurant C: Protein Palace (20 items)
INSERT INTO menu_items (id, restaurant_id, name, description, base_price, category, is_available, prep_time) VALUES
('c0000001-0000-0000-0000-000000000001', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Double Chicken Breast Meal', '400g grilled chicken breast with brown rice and steamed broccoli', 58.00, 'lunch', true, 15),
('c0000002-0000-0000-0000-000000000002', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Steak and Eggs', '250g sirloin steak with 4 whole eggs and sweet potato', 72.00, 'breakfast', true, 18),
('c0000003-0000-0000-0000-000000000003', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Mass Gainer Shake', 'Whey protein, oats, banana, peanut butter, whole milk - 1000 calories', 35.00, 'beverages', true, 5),
('c0000004-0000-0000-0000-000000000004', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Bodybuilder Breakfast', '6 egg whites, 2 whole eggs, turkey sausage, oatmeal, and fruit', 48.00, 'breakfast', true, 15),
('c0000005-0000-0000-0000-000000000005', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Grilled Tilapia Plate', 'Grilled tilapia with jasmine rice, asparagus, and lemon butter', 52.00, 'dinner', true, 18),
('c0000006-0000-0000-0000-000000000006', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Beef and Rice Bowl', 'Lean ground beef with white rice, black beans, and salsa', 46.00, 'lunch', true, 12),
('c0000007-0000-0000-0000-000000000007', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Turkey Burger Stack', 'Double turkey patty, egg, cheese, whole wheat bun, side salad', 52.00, 'lunch', true, 15),
('c0000008-0000-0000-0000-000000000008', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'High Protein Pasta', 'Protein pasta with chicken, sun-dried tomatoes, and pesto', 55.00, 'dinner', true, 18),
('c0000009-0000-0000-0000-000000000009', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Salmon Power Bowl', 'Grilled salmon, quinoa, edamame, avocado, and teriyaki sauce', 65.00, 'dinner', true, 20),
('c0000010-0000-0000-0000-000000000010', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Chicken and Waffles', 'Grilled chicken breast with protein waffles and sugar-free syrup', 45.00, 'breakfast', true, 15),
('c0000011-0000-0000-0000-000000000011', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Bison Burger', 'Lean bison patty with sweet potato fries and avocado', 68.00, 'lunch', true, 18),
('c0000012-0000-0000-0000-000000000012', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Pre-Workout Meal', 'Chicken, white rice, banana - optimized for training', 42.00, 'snacks', true, 10),
('c0000013-0000-0000-0000-000000000013', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Post-Workout Shake', 'Whey isolate, dextrose, creatine, glutamine blend', 28.00, 'beverages', true, 5),
('c0000014-0000-0000-0000-000000000014', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Tuna Steak Plate', 'Seared tuna steak with mixed vegetables and brown rice', 72.00, 'dinner', true, 18),
('c0000015-0000-0000-0000-000000000015', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Egg White Scramble', '8 egg whites with spinach, mushrooms, and whole wheat toast', 35.00, 'breakfast', true, 10),
('c0000016-0000-0000-0000-000000000016', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Protein Pancake Stack', '4 protein pancakes with Greek yogurt and berries', 38.00, 'breakfast', true, 12),
('c0000017-0000-0000-0000-000000000017', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Grilled Chicken Wrap', 'Chicken, rice, vegetables in a whole wheat tortilla', 42.00, 'lunch', true, 10),
('c0000018-0000-0000-0000-000000000018', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Cottage Cheese Bowl', 'Low-fat cottage cheese with pineapple and almonds', 26.00, 'snacks', true, 5),
('c0000019-0000-0000-0000-000000000019', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Lamb Shank', 'Slow-cooked lamb shank with mashed sweet potato', 88.00, 'dinner', true, 25),
('c0000020-0000-0000-0000-000000000020', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'BCAA Energy Drink', 'Branched-chain amino acids with caffeine and electrolytes', 22.00, 'beverages', true, 3);

-- Restaurant D: Keto Kingdom (20 items)
INSERT INTO menu_items (id, restaurant_id, name, description, base_price, category, is_available, prep_time) VALUES
('d0000001-0000-0000-0000-000000000001', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Keto Bacon Cheeseburger', 'Beef patty wrapped in lettuce with bacon, cheese, and sugar-free sauce', 55.00, 'lunch', true, 15),
('d0000002-0000-0000-0000-000000000002', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Cauliflower Crust Pizza', 'Low-carb pizza with mozzarella, pepperoni, and olives', 52.00, 'dinner', true, 20),
('d0000003-0000-0000-0000-000000000003', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Bulletproof Coffee', 'Coffee blended with MCT oil and grass-fed butter', 24.00, 'beverages', true, 5),
('d0000004-0000-0000-0000-000000000004', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Keto Eggs Benedict', 'Poached eggs on portobello mushrooms with hollandaise and bacon', 42.00, 'breakfast', true, 15),
('d0000005-0000-0000-0000-000000000005', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Ribeye Steak', '300g ribeye with garlic butter and roasted vegetables', 95.00, 'dinner', true, 25),
('d0000006-0000-0000-0000-000000000006', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Salmon with Avocado Salsa', 'Grilled salmon topped with fresh avocado and tomato salsa', 68.00, 'dinner', true, 18),
('d0000007-0000-0000-0000-000000000007', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Zucchini Lasagna', 'Layers of zucchini, beef bolognese, ricotta, and mozzarella', 58.00, 'dinner', true, 25),
('d0000008-0000-0000-0000-000000000008', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Bacon and Eggs', '4 strips of bacon with 3 fried eggs and avocado', 38.00, 'breakfast', true, 12),
('d0000009-0000-0000-0000-000000000009', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Keto Caesar Salad', 'Romaine, parmesan, bacon bits, keto Caesar dressing', 42.00, 'lunch', true, 10),
('d0000010-0000-0000-0000-000000000010', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Chicken Alfredo Zoodles', 'Grilled chicken with zucchini noodles in creamy alfredo sauce', 52.00, 'dinner', true, 18),
('d0000011-0000-0000-0000-000000000011', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Fat Bomb Plate', 'Assortment of chocolate and peanut butter fat bombs', 28.00, 'snacks', true, 5),
('d0000012-0000-0000-0000-000000000012', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Cheese and Charcuterie', 'Selection of aged cheeses, salami, olives, and nuts', 65.00, 'snacks', true, 10),
('d0000013-0000-0000-0000-000000000013', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Keto Cheesecake', 'Creamy cheesecake with almond flour crust, no sugar added', 32.00, 'snacks', true, 5),
('d0000014-0000-0000-0000-000000000014', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Coconut Chia Pudding', 'Full-fat coconut milk chia pudding with berries', 26.00, 'breakfast', true, 5),
('d0000015-0000-0000-0000-000000000015', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Bunless Hot Dogs', '2 beef hot dogs wrapped in bacon with mustard and sauerkraut', 35.00, 'lunch', true, 10),
('d0000016-0000-0000-0000-000000000016', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Keto Smoothie', 'Avocado, spinach, MCT oil, almond butter, and stevia', 28.00, 'beverages', true, 5),
('d0000017-0000-0000-0000-000000000017', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Pork Belly Bites', 'Crispy pork belly with spicy mayo dipping sauce', 48.00, 'snacks', true, 15),
('d0000018-0000-0000-0000-000000000018', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Keto Omelette', '3-egg omelette with cheese, mushrooms, and spinach', 36.00, 'breakfast', true, 10),
('d0000019-0000-0000-0000-000000000019', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Shrimp Scampi', 'Garlic butter shrimp with zucchini noodles and parmesan', 62.00, 'dinner', true, 18),
('d0000020-0000-0000-0000-000000000020', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Bone Broth', 'Slow-simmered beef bone broth with herbs', 18.00, 'beverages', true, 5);

-- Restaurant E: Clean Eats Abu Dhabi (20 items)
INSERT INTO menu_items (id, restaurant_id, name, description, base_price, category, is_available, prep_time) VALUES
('e0000001-0000-0000-0000-000000000001', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Grilled Chicken Meal Prep', '200g chicken breast, brown rice, mixed vegetables - meal prep ready', 45.00, 'lunch', true, 12),
('e0000002-0000-0000-0000-000000000002', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Salmon and Quinoa Box', 'Baked salmon with quinoa, asparagus, and lemon herb sauce', 58.00, 'dinner', true, 18),
('e0000003-0000-0000-0000-000000000003', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Overnight Oats Jar', 'Steel-cut oats with almond milk, banana, and cinnamon', 24.00, 'breakfast', true, 5),
('e0000004-0000-0000-0000-000000000004', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Turkey and Sweet Potato', 'Lean ground turkey with roasted sweet potato and green beans', 42.00, 'lunch', true, 15),
('e0000005-0000-0000-0000-000000000005', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Egg Muffins (6 pack)', 'Baked egg muffins with vegetables and cheese', 28.00, 'breakfast', true, 8),
('e0000006-0000-0000-0000-000000000006', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Beef Stir Fry', 'Lean beef strips with vegetables and brown rice', 52.00, 'dinner', true, 15),
('e0000007-0000-0000-0000-000000000007', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Tuna Nicoise Salad', 'Seared tuna, eggs, olives, green beans, and potatoes', 55.00, 'lunch', true, 15),
('e0000008-0000-0000-0000-000000000008', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Chicken Tikka Bowl', 'Spiced chicken tikka with basmati rice and cucumber raita', 48.00, 'dinner', true, 18),
('e0000009-0000-0000-0000-000000000009', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Banana Pancakes', 'Banana oat pancakes with Greek yogurt and honey', 32.00, 'breakfast', true, 12),
('e0000010-0000-0000-0000-000000000010', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Shrimp and Vegetables', 'Grilled shrimp with roasted Mediterranean vegetables', 58.00, 'dinner', true, 15),
('e0000011-0000-0000-0000-000000000011', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Veggie Wrap', 'Hummus, falafel, fresh vegetables in whole wheat wrap', 35.00, 'lunch', true, 10),
('e0000012-0000-0000-0000-000000000012', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Grilled Fish Tacos', 'Grilled white fish with cabbage slaw and avocado', 48.00, 'lunch', true, 15),
('e0000013-0000-0000-0000-000000000013', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Fresh Pressed Juice', 'Carrot, apple, ginger, and turmeric juice', 22.00, 'beverages', true, 5),
('e0000014-0000-0000-0000-000000000014', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Protein Smoothie', 'Whey protein, banana, spinach, and almond butter', 26.00, 'beverages', true, 5),
('e0000015-0000-0000-0000-000000000015', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Mixed Nuts Pack', 'Roasted almonds, cashews, walnuts, and pumpkin seeds', 18.00, 'snacks', true, 3),
('e0000016-0000-0000-0000-000000000016', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Greek Salad', 'Tomatoes, cucumbers, olives, feta cheese, olive oil dressing', 32.00, 'lunch', true, 8),
('e0000017-0000-0000-0000-000000000017', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Lamb Kofta Plate', 'Grilled lamb kofta with tabbouleh and tzatziki', 55.00, 'dinner', true, 20),
('e0000018-0000-0000-0000-000000000018', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Shakshuka', 'Eggs poached in spiced tomato sauce with whole wheat bread', 36.00, 'breakfast', true, 15),
('e0000019-0000-0000-0000-000000000019', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Fruit and Nut Bar', 'Homemade bar with dates, oats, almonds, and dark chocolate', 15.00, 'snacks', true, 3),
('e0000020-0000-0000-0000-000000000020', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Detox Water', 'Cucumber, lemon, mint infused water', 12.00, 'beverages', true, 3);

-- =============================================================================
-- NUTRITIONAL INFO (for all 100 menu items)
-- =============================================================================
INSERT INTO nutritional_info (menu_item_id, serving_size, calories, protein, carbohydrates, fat, fiber, sugar, sodium, allergens) VALUES
-- Restaurant A items
('a0000001-0000-0000-0000-000000000001', '400g', 520, 45, 48, 16, 8, 6, 420, ARRAY['sesame']),
('a0000002-0000-0000-0000-000000000002', '380g', 580, 42, 52, 22, 6, 8, 680, ARRAY['fish', 'soy']),
('a0000003-0000-0000-0000-000000000003', '350g', 480, 35, 38, 22, 5, 4, 720, ARRAY['eggs', 'gluten']),
('a0000004-0000-0000-0000-000000000004', '250g', 320, 22, 42, 8, 4, 18, 95, ARRAY['dairy', 'gluten']),
('a0000005-0000-0000-0000-000000000005', '400g', 650, 55, 28, 38, 6, 4, 520, ARRAY[]),
('a0000006-0000-0000-0000-000000000006', '280g', 420, 18, 35, 26, 10, 4, 380, ARRAY['eggs', 'gluten']),
('a0000007-0000-0000-0000-000000000007', '380g', 450, 42, 28, 20, 6, 8, 680, ARRAY[]),
('a0000008-0000-0000-0000-000000000008', '300g', 420, 32, 48, 12, 6, 12, 420, ARRAY['eggs', 'dairy', 'nuts']),
('a0000009-0000-0000-0000-000000000009', '350g', 480, 38, 24, 28, 6, 4, 720, ARRAY['dairy', 'gluten', 'fish']),
('a0000010-0000-0000-0000-000000000010', '360g', 520, 35, 48, 22, 5, 6, 580, ARRAY['fish', 'soy', 'sesame']),
('a0000011-0000-0000-0000-000000000011', '380g', 580, 42, 45, 28, 5, 8, 680, ARRAY['gluten']),
('a0000012-0000-0000-0000-000000000012', '400g', 620, 48, 42, 30, 6, 4, 480, ARRAY['fish', 'dairy']),
('a0000013-0000-0000-0000-000000000013', '400ml', 180, 6, 32, 4, 5, 18, 85, ARRAY[]),
('a0000014-0000-0000-0000-000000000014', '400ml', 380, 32, 42, 12, 6, 22, 180, ARRAY['dairy', 'nuts']),
('a0000015-0000-0000-0000-000000000015', '120g', 280, 12, 32, 14, 5, 18, 45, ARRAY['nuts']),
('a0000016-0000-0000-0000-000000000016', '280g', 320, 12, 38, 16, 8, 4, 420, ARRAY['sesame', 'gluten']),
('a0000017-0000-0000-0000-000000000017', '380g', 520, 38, 52, 18, 6, 6, 780, ARRAY['gluten']),
('a0000018-0000-0000-0000-000000000018', '280g', 320, 28, 12, 18, 3, 3, 520, ARRAY['eggs', 'dairy']),
('a0000019-0000-0000-0000-000000000019', '420g', 720, 58, 32, 42, 5, 4, 620, ARRAY['dairy']),
('a0000020-0000-0000-0000-000000000020', '300g', 280, 8, 48, 6, 8, 35, 25, ARRAY['dairy', 'gluten']),

-- Restaurant B items
('b0000001-0000-0000-0000-000000000001', '420g', 480, 18, 62, 18, 14, 8, 380, ARRAY['sesame']),
('b0000002-0000-0000-0000-000000000002', '380g', 450, 22, 58, 16, 6, 12, 720, ARRAY['soy', 'nuts']),
('b0000003-0000-0000-0000-000000000003', '350g', 380, 12, 65, 10, 12, 35, 45, ARRAY['nuts']),
('b0000004-0000-0000-0000-000000000004', '320g', 420, 16, 52, 18, 10, 6, 680, ARRAY['gluten', 'sesame']),
('b0000005-0000-0000-0000-000000000005', '380g', 520, 18, 62, 24, 4, 4, 580, ARRAY['dairy']),
('b0000006-0000-0000-0000-000000000006', '350g', 380, 12, 28, 26, 10, 6, 320, ARRAY[]),
('b0000007-0000-0000-0000-000000000007', '300g', 320, 12, 52, 8, 8, 18, 85, ARRAY['nuts']),
('b0000008-0000-0000-0000-000000000008', '380g', 420, 15, 42, 22, 8, 6, 420, ARRAY[]),
('b0000009-0000-0000-0000-000000000009', '350g', 360, 10, 58, 12, 8, 32, 35, ARRAY[]),
('b0000010-0000-0000-0000-000000000010', '300g', 280, 15, 42, 6, 12, 8, 580, ARRAY[]),
('b0000011-0000-0000-0000-000000000011', '320g', 380, 14, 52, 14, 6, 4, 620, ARRAY['soy', 'sesame']),
('b0000012-0000-0000-0000-000000000012', '400g', 450, 18, 58, 18, 10, 12, 480, ARRAY['nuts']),
('b0000013-0000-0000-0000-000000000013', '400ml', 120, 4, 28, 1, 4, 22, 45, ARRAY[]),
('b0000014-0000-0000-0000-000000000014', '350ml', 180, 4, 32, 6, 2, 18, 65, ARRAY[]),
('b0000015-0000-0000-0000-000000000015', '80g', 120, 6, 12, 7, 4, 2, 280, ARRAY[]),
('b0000016-0000-0000-0000-000000000016', '150g', 280, 6, 28, 18, 8, 12, 35, ARRAY[]),
('b0000017-0000-0000-0000-000000000017', '450g', 580, 22, 62, 28, 14, 8, 780, ARRAY['gluten', 'sesame']),
('b0000018-0000-0000-0000-000000000018', '280g', 320, 10, 42, 14, 12, 15, 45, ARRAY[]),
('b0000019-0000-0000-0000-000000000019', '340g', 420, 15, 48, 20, 8, 10, 580, ARRAY['gluten']),
('b0000020-0000-0000-0000-000000000020', '400ml', 220, 6, 42, 4, 6, 28, 25, ARRAY[]),

-- Restaurant C items
('c0000001-0000-0000-0000-000000000001', '500g', 680, 82, 52, 16, 6, 4, 520, ARRAY[]),
('c0000002-0000-0000-0000-000000000002', '450g', 780, 62, 48, 38, 5, 6, 680, ARRAY['eggs']),
('c0000003-0000-0000-0000-000000000003', '500ml', 850, 55, 95, 28, 8, 45, 320, ARRAY['dairy', 'nuts']),
('c0000004-0000-0000-0000-000000000004', '420g', 620, 55, 48, 26, 6, 8, 780, ARRAY['eggs']),
('c0000005-0000-0000-0000-000000000005', '400g', 520, 48, 42, 20, 5, 4, 480, ARRAY['fish', 'dairy']),
('c0000006-0000-0000-0000-000000000006', '400g', 550, 42, 52, 20, 8, 6, 620, ARRAY[]),
('c0000007-0000-0000-0000-000000000007', '420g', 620, 55, 48, 26, 6, 8, 720, ARRAY['eggs', 'dairy', 'gluten']),
('c0000008-0000-0000-0000-000000000008', '400g', 580, 52, 58, 18, 5, 6, 680, ARRAY['gluten', 'dairy']),
('c0000009-0000-0000-0000-000000000009', '420g', 620, 48, 52, 26, 6, 8, 580, ARRAY['fish', 'soy']),
('c0000010-0000-0000-0000-000000000010', '380g', 520, 42, 52, 18, 4, 12, 620, ARRAY['eggs', 'dairy', 'gluten']),
('c0000011-0000-0000-0000-000000000011', '400g', 650, 52, 45, 32, 6, 8, 580, ARRAY['gluten']),
('c0000012-0000-0000-0000-000000000012', '320g', 420, 35, 52, 10, 4, 15, 320, ARRAY[]),
('c0000013-0000-0000-0000-000000000013', '400ml', 180, 35, 8, 2, 0, 4, 180, ARRAY['dairy']),
('c0000014-0000-0000-0000-000000000014', '400g', 620, 52, 42, 28, 5, 4, 520, ARRAY['fish']),
('c0000015-0000-0000-0000-000000000015', '280g', 320, 42, 12, 12, 3, 2, 520, ARRAY['eggs']),
('c0000016-0000-0000-0000-000000000016', '350g', 450, 38, 52, 12, 6, 15, 420, ARRAY['eggs', 'dairy', 'gluten']),
('c0000017-0000-0000-0000-000000000017', '340g', 480, 38, 48, 16, 5, 4, 680, ARRAY['gluten']),
('c0000018-0000-0000-0000-000000000018', '250g', 280, 28, 18, 12, 2, 12, 320, ARRAY['dairy', 'nuts']),
('c0000019-0000-0000-0000-000000000019', '450g', 720, 58, 42, 38, 4, 6, 620, ARRAY[]),
('c0000020-0000-0000-0000-000000000020', '400ml', 45, 10, 2, 0, 0, 0, 180, ARRAY[]),

-- Restaurant D items
('d0000001-0000-0000-0000-000000000001', '350g', 680, 48, 8, 52, 4, 3, 820, ARRAY['dairy']),
('d0000002-0000-0000-0000-000000000002', '380g', 580, 32, 18, 45, 5, 6, 920, ARRAY['dairy', 'nuts']),
('d0000003-0000-0000-0000-000000000003', '350ml', 280, 2, 2, 28, 0, 0, 25, ARRAY['dairy']),
('d0000004-0000-0000-0000-000000000004', '320g', 520, 32, 8, 42, 3, 2, 780, ARRAY['eggs', 'dairy']),
('d0000005-0000-0000-0000-000000000005', '450g', 850, 65, 8, 65, 4, 2, 620, ARRAY['dairy']),
('d0000006-0000-0000-0000-000000000006', '380g', 580, 45, 12, 42, 6, 4, 480, ARRAY['fish']),
('d0000007-0000-0000-0000-000000000007', '420g', 620, 42, 18, 48, 6, 8, 720, ARRAY['dairy']),
('d0000008-0000-0000-0000-000000000008', '280g', 520, 28, 4, 45, 3, 1, 920, ARRAY['eggs']),
('d0000009-0000-0000-0000-000000000009', '320g', 450, 32, 12, 35, 5, 4, 680, ARRAY['dairy', 'fish']),
('d0000010-0000-0000-0000-000000000010', '380g', 520, 42, 12, 38, 4, 4, 620, ARRAY['dairy']),
('d0000011-0000-0000-0000-000000000011', '120g', 380, 8, 12, 35, 4, 6, 45, ARRAY['dairy', 'nuts']),
('d0000012-0000-0000-0000-000000000012', '280g', 620, 28, 8, 55, 3, 2, 1200, ARRAY['dairy', 'nuts']),
('d0000013-0000-0000-0000-000000000013', '150g', 380, 12, 15, 32, 3, 4, 180, ARRAY['dairy', 'nuts', 'eggs']),
('d0000014-0000-0000-0000-000000000014', '250g', 320, 8, 18, 26, 8, 8, 45, ARRAY[]),
('d0000015-0000-0000-0000-000000000015', '200g', 480, 22, 6, 42, 2, 2, 1100, ARRAY[]),
('d0000016-0000-0000-0000-000000000016', '400ml', 380, 8, 12, 35, 6, 2, 85, ARRAY['nuts']),
('d0000017-0000-0000-0000-000000000017', '200g', 520, 28, 4, 45, 1, 1, 680, ARRAY[]),
('d0000018-0000-0000-0000-000000000018', '280g', 450, 28, 6, 38, 3, 2, 620, ARRAY['eggs', 'dairy']),
('d0000019-0000-0000-0000-000000000019', '350g', 520, 38, 8, 42, 3, 2, 780, ARRAY['shellfish', 'dairy']),
('d0000020-0000-0000-0000-000000000020', '350ml', 45, 8, 2, 1, 0, 0, 520, ARRAY[]),

-- Restaurant E items
('e0000001-0000-0000-0000-000000000001', '380g', 480, 42, 48, 14, 6, 4, 420, ARRAY[]),
('e0000002-0000-0000-0000-000000000002', '400g', 550, 45, 42, 22, 6, 4, 480, ARRAY['fish']),
('e0000003-0000-0000-0000-000000000003', '300g', 320, 12, 52, 8, 8, 18, 85, ARRAY['nuts']),
('e0000004-0000-0000-0000-000000000004', '380g', 450, 38, 42, 16, 6, 8, 520, ARRAY[]),
('e0000005-0000-0000-0000-000000000005', '240g', 280, 22, 8, 18, 2, 2, 420, ARRAY['eggs', 'dairy']),
('e0000006-0000-0000-0000-000000000006', '400g', 520, 42, 48, 18, 5, 6, 680, ARRAY['soy']),
('e0000007-0000-0000-0000-000000000007', '380g', 480, 38, 32, 24, 5, 4, 620, ARRAY['fish', 'eggs']),
('e0000008-0000-0000-0000-000000000008', '400g', 520, 42, 52, 16, 4, 6, 720, ARRAY['dairy']),
('e0000009-0000-0000-0000-000000000009', '300g', 380, 18, 55, 10, 5, 22, 280, ARRAY['eggs', 'dairy', 'gluten']),
('e0000010-0000-0000-0000-000000000010', '380g', 450, 38, 28, 22, 6, 4, 580, ARRAY['shellfish']),
('e0000011-0000-0000-0000-000000000011', '320g', 380, 15, 48, 16, 8, 6, 620, ARRAY['gluten', 'sesame']),
('e0000012-0000-0000-0000-000000000012', '340g', 420, 32, 38, 18, 6, 4, 580, ARRAY['fish', 'gluten']),
('e0000013-0000-0000-0000-000000000013', '400ml', 120, 2, 28, 1, 2, 22, 25, ARRAY[]),
('e0000014-0000-0000-0000-000000000014', '400ml', 320, 28, 32, 12, 5, 18, 180, ARRAY['dairy', 'nuts']),
('e0000015-0000-0000-0000-000000000015', '100g', 580, 18, 22, 48, 6, 4, 180, ARRAY['nuts']),
('e0000016-0000-0000-0000-000000000016', '300g', 320, 12, 18, 24, 5, 6, 680, ARRAY['dairy']),
('e0000017-0000-0000-0000-000000000017', '400g', 550, 42, 38, 26, 5, 6, 720, ARRAY['dairy', 'gluten']),
('e0000018-0000-0000-0000-000000000018', '350g', 420, 22, 35, 22, 6, 12, 780, ARRAY['eggs', 'gluten']),
('e0000019-0000-0000-0000-000000000019', '80g', 220, 5, 32, 9, 4, 18, 25, ARRAY['nuts', 'gluten']),
('e0000020-0000-0000-0000-000000000020', '500ml', 15, 0, 4, 0, 0, 2, 5, ARRAY[]);

-- =============================================================================
-- ORDERS (500 orders over 90 days)
-- =============================================================================
-- Create a function to generate orders
DO $$
DECLARE
    i INTEGER;
    customer_ids UUID[] := ARRAY[
        'c0000001-0000-0000-0000-000000000001', 'c0000002-0000-0000-0000-000000000002', 'c0000003-0000-0000-0000-000000000003',
        'c0000004-0000-0000-0000-000000000004', 'c0000005-0000-0000-0000-000000000005', 'c0000006-0000-0000-0000-000000000006',
        'c0000007-0000-0000-0000-000000000007', 'c0000008-0000-0000-0000-000000000008', 'c0000009-0000-0000-0000-000000000009',
        'c0000010-0000-0000-0000-000000000010', 'c0000011-0000-0000-0000-000000000011', 'c0000012-0000-0000-0000-000000000012',
        'c0000013-0000-0000-0000-000000000013', 'c0000014-0000-0000-0000-000000000014', 'c0000015-0000-0000-0000-000000000015',
        'c0000016-0000-0000-0000-000000000016', 'c0000017-0000-0000-0000-000000000017', 'c0000018-0000-0000-0000-000000000018',
        'c0000019-0000-0000-0000-000000000019', 'c0000020-0000-0000-0000-000000000020', 'c0000021-0000-0000-0000-000000000021',
        'c0000022-0000-0000-0000-000000000022', 'c0000023-0000-0000-0000-000000000023', 'c0000024-0000-0000-0000-000000000024',
        'c0000025-0000-0000-0000-000000000025', 'c0000026-0000-0000-0000-000000000026', 'c0000027-0000-0000-0000-000000000027',
        'c0000028-0000-0000-0000-000000000028', 'c0000029-0000-0000-0000-000000000029', 'c0000030-0000-0000-0000-000000000030',
        'c0000031-0000-0000-0000-000000000031', 'c0000032-0000-0000-0000-000000000032', 'c0000033-0000-0000-0000-000000000033',
        'c0000034-0000-0000-0000-000000000034', 'c0000035-0000-0000-0000-000000000035', 'c0000036-0000-0000-0000-000000000036',
        'c0000037-0000-0000-0000-000000000037', 'c0000038-0000-0000-0000-000000000038', 'c0000039-0000-0000-0000-000000000039',
        'c0000040-0000-0000-0000-000000000040', 'c0000041-0000-0000-0000-000000000041', 'c0000042-0000-0000-0000-000000000042',
        'c0000043-0000-0000-0000-000000000043', 'c0000044-0000-0000-0000-000000000044', 'c0000045-0000-0000-0000-000000000045',
        'c0000046-0000-0000-0000-000000000046', 'c0000047-0000-0000-0000-000000000047', 'c0000048-0000-0000-0000-000000000048',
        'c0000049-0000-0000-0000-000000000049', 'c0000050-0000-0000-0000-000000000050'
    ];
    restaurant_ids UUID[] := ARRAY[
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        'cccccccc-cccc-cccc-cccc-cccccccccccc', 'dddddddd-dddd-dddd-dddd-dddddddddddd',
        'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'
    ];
    addresses JSONB[] := ARRAY[
        '{"street": "Marina Pinnacle Tower 1, Apt 2304", "city": "Dubai", "emirate": "Dubai", "country": "UAE"}'::jsonb,
        '{"street": "Al Raha Beach, Villa 15", "city": "Abu Dhabi", "emirate": "Abu Dhabi", "country": "UAE"}'::jsonb,
        '{"street": "JBR The Walk, Building 5", "city": "Dubai", "emirate": "Dubai", "country": "UAE"}'::jsonb,
        '{"street": "Corniche Road, Tower 3, Floor 18", "city": "Abu Dhabi", "emirate": "Abu Dhabi", "country": "UAE"}'::jsonb,
        '{"street": "Business Bay, Executive Tower B", "city": "Dubai", "emirate": "Dubai", "country": "UAE"}'::jsonb,
        '{"street": "Al Wasl Road, Villa 42", "city": "Dubai", "emirate": "Dubai", "country": "UAE"}'::jsonb,
        '{"street": "Yas Island, Yas Acres", "city": "Abu Dhabi", "emirate": "Abu Dhabi", "country": "UAE"}'::jsonb,
        '{"street": "Downtown Dubai, Boulevard Point", "city": "Dubai", "emirate": "Dubai", "country": "UAE"}'::jsonb,
        '{"street": "Al Reem Island, Gate Towers", "city": "Abu Dhabi", "emirate": "Abu Dhabi", "country": "UAE"}'::jsonb,
        '{"street": "Palm Jumeirah, Fairmont Residences", "city": "Dubai", "emirate": "Dubai", "country": "UAE"}'::jsonb
    ];
    statuses TEXT[] := ARRAY['pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'delivered', 'delivered', 'delivered', 'delivered', 'delivered', 'cancelled'];
    payment_statuses TEXT[] := ARRAY['paid', 'paid', 'paid', 'paid', 'paid', 'paid', 'paid', 'paid', 'pending', 'failed', 'refunded'];
    order_date TIMESTAMP;
    customer_id UUID;
    restaurant_id UUID;
    status TEXT;
    payment_status TEXT;
    address JSONB;
    subtotal DECIMAL;
    delivery_fee DECIMAL;
    service_fee DECIMAL;
    total_amount DECIMAL;
BEGIN
    FOR i IN 1..500 LOOP
        -- Random values
        order_date := NOW() - (random() * 90 || ' days')::interval - (random() * 24 || ' hours')::interval;
        customer_id := customer_ids[1 + floor(random() * 50)::int];
        restaurant_id := restaurant_ids[1 + floor(random() * 5)::int];
        status := statuses[1 + floor(random() * 11)::int];
        payment_status := payment_statuses[1 + floor(random() * 11)::int];
        address := addresses[1 + floor(random() * 10)::int];
        subtotal := 50 + floor(random() * 150)::decimal;
        delivery_fee := CASE WHEN subtotal > 100 THEN 0 ELSE 10 END;
        service_fee := round(subtotal * 0.05, 2);
        total_amount := subtotal + delivery_fee + service_fee;

        -- If cancelled, maybe refunded
        IF status = 'cancelled' THEN
            payment_status := CASE WHEN random() > 0.5 THEN 'refunded' ELSE 'failed' END;
        END IF;

        INSERT INTO orders (
            id, order_number, customer_id, restaurants, status,
            delivery_address, subtotal, delivery_fee, service_fee,
            total_amount, payment_status, created_at, updated_at
        ) VALUES (
            ('d' || LPAD(i::text, 7, '0') || '-0000-0000-0000-00000000' || LPAD((i % 100)::text, 4, '0'))::uuid,
            'ORD-' || to_char(order_date, 'YYYYMMDD') || '-' || LPAD(i::text, 5, '0'),
            customer_id,
            ARRAY[restaurant_id],
            status::order_status,
            address,
            subtotal,
            delivery_fee,
            service_fee,
            total_amount,
            payment_status::payment_status,
            order_date,
            order_date + interval '30 minutes'
        );
    END LOOP;
END $$;

-- =============================================================================
-- ORDER ITEMS (1-4 items per order)
-- =============================================================================
DO $$
DECLARE
    order_rec RECORD;
    menu_item_rec RECORD;
    item_count INTEGER;
    j INTEGER;
    restaurant_id UUID;
    menu_items_for_restaurant UUID[];
    selected_item UUID;
    quantity INTEGER;
    item_price DECIMAL;
BEGIN
    FOR order_rec IN SELECT id, restaurants[1] as restaurant_id FROM orders LOOP
        restaurant_id := order_rec.restaurant_id;
        item_count := 1 + floor(random() * 4)::int;

        -- Get menu items for this restaurant
        SELECT array_agg(id) INTO menu_items_for_restaurant
        FROM menu_items WHERE menu_items.restaurant_id = order_rec.restaurant_id;

        IF menu_items_for_restaurant IS NOT NULL AND array_length(menu_items_for_restaurant, 1) > 0 THEN
            FOR j IN 1..item_count LOOP
                selected_item := menu_items_for_restaurant[1 + floor(random() * array_length(menu_items_for_restaurant, 1))::int];
                quantity := 1 + floor(random() * 3)::int;

                SELECT base_price INTO item_price FROM menu_items WHERE id = selected_item;

                INSERT INTO order_items (
                    order_id, menu_item_id, restaurant_id, quantity,
                    base_price, item_total, nutritional_summary
                ) VALUES (
                    order_rec.id,
                    selected_item,
                    restaurant_id,
                    quantity,
                    item_price,
                    item_price * quantity,
                    '{"calories": 450, "protein": 35, "carbohydrates": 45, "fat": 18}'::jsonb
                );
            END LOOP;
        END IF;
    END LOOP;
END $$;

-- Update order subtotals based on actual items
UPDATE orders o SET
    subtotal = COALESCE((SELECT SUM(item_total) FROM order_items WHERE order_id = o.id), o.subtotal),
    total_amount = COALESCE((SELECT SUM(item_total) FROM order_items WHERE order_id = o.id), o.subtotal) + o.delivery_fee + o.service_fee;

-- =============================================================================
-- INVOICES (200 invoices over 12 months)
-- =============================================================================
DO $$
DECLARE
    i INTEGER;
    restaurant_ids UUID[] := ARRAY[
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        'cccccccc-cccc-cccc-cccc-cccccccccccc', 'dddddddd-dddd-dddd-dddd-dddddddddddd',
        'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'
    ];
    statuses TEXT[] := ARRAY['pending', 'paid', 'paid', 'paid', 'paid'];
    restaurant_id UUID;
    invoice_date DATE;
    period_start DATE;
    period_end DATE;
    gross_amount DECIMAL;
    commission_amount DECIMAL;
    net_amount DECIMAL;
    status TEXT;
BEGIN
    FOR i IN 1..200 LOOP
        restaurant_id := restaurant_ids[1 + floor(random() * 5)::int];
        invoice_date := (NOW() - (random() * 365 || ' days')::interval)::date;
        period_start := date_trunc('month', invoice_date)::date;
        period_end := (period_start + interval '1 month' - interval '1 day')::date;
        gross_amount := 5000 + floor(random() * 25000)::decimal;
        commission_amount := round(gross_amount * 0.15, 2);
        net_amount := gross_amount - commission_amount;
        status := statuses[1 + floor(random() * 5)::int];

        INSERT INTO invoices (
            id, invoice_number, type, entity_id, period_start, period_end,
            total_orders, gross_amount, commission_amount, net_amount, status, created_at
        ) VALUES (
            ('f' || LPAD(i::text, 7, '0') || '-0000-0000-0000-00000000' || LPAD((i % 100)::text, 4, '0'))::uuid,
            'INV-' || to_char(invoice_date, 'YYYYMM') || '-' || LPAD(i::text, 4, '0'),
            'restaurant_payout',
            restaurant_id,
            period_start,
            period_end,
            50 + floor(random() * 200)::int,
            gross_amount,
            commission_amount,
            net_amount,
            status,
            invoice_date
        );
    END LOOP;
END $$;

-- =============================================================================
-- SUMMARY
-- =============================================================================
SELECT 'Massive seed completed!' AS message;
SELECT
    (SELECT COUNT(*) FROM users) AS users,
    (SELECT COUNT(*) FROM restaurants) AS restaurants,
    (SELECT COUNT(*) FROM menu_items) AS menu_items,
    (SELECT COUNT(*) FROM nutritional_info) AS nutritional_info,
    (SELECT COUNT(*) FROM orders) AS orders,
    (SELECT COUNT(*) FROM order_items) AS order_items,
    (SELECT COUNT(*) FROM invoices) AS invoices;

-- Login info
SELECT '=== LOGIN CREDENTIALS ===' AS info;
SELECT 'Admin: admin@cuts.ae / password123' AS credentials;
SELECT 'Owner: owner@cuts.ae / password123' AS credentials;
SELECT 'Customers: customer1@cuts.ae through customer50@cuts.ae / password123' AS credentials;
