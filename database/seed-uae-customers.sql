-- UAE Customer Seed Data with Arabic and Indian Names
-- This file adds realistic customer data for demo purposes
-- Password for all demo accounts: "password123"

-- Arabic UAE Customers
INSERT INTO users (id, email, phone, password_hash, first_name, last_name, role, created_at, updated_at) VALUES
-- Arabic Names
('c1000000-0000-0000-0000-000000000001', 'ahmed.almansoori@cuts.ae', '+971501234101', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Ahmed', 'Al-Mansoori', 'customer', NOW(), NOW()),
('c1000000-0000-0000-0000-000000000002', 'fatima.alzaabi@cuts.ae', '+971501234102', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Fatima', 'Al-Zaabi', 'customer', NOW(), NOW()),
('c1000000-0000-0000-0000-000000000003', 'mohammed.alshamsi@cuts.ae', '+971501234103', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Mohammed', 'Al-Shamsi', 'customer', NOW(), NOW()),
('c1000000-0000-0000-0000-000000000004', 'noura.almazrouei@cuts.ae', '+971501234104', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Noura', 'Al-Mazrouei', 'customer', NOW(), NOW()),
('c1000000-0000-0000-0000-000000000005', 'khalid.alsuwaidi@cuts.ae', '+971501234105', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Khalid', 'Al-Suwaidi', 'customer', NOW(), NOW()),
('c1000000-0000-0000-0000-000000000006', 'mariam.alkaabi@cuts.ae', '+971501234106', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Mariam', 'Al-Kaabi', 'customer', NOW(), NOW()),
('c1000000-0000-0000-0000-000000000007', 'sultan.aldhaheri@cuts.ae', '+971501234107', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Sultan', 'Al-Dhaheri', 'customer', NOW(), NOW()),
('c1000000-0000-0000-0000-000000000008', 'hessa.alketbi@cuts.ae', '+971501234108', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Hessa', 'Al-Ketbi', 'customer', NOW(), NOW()),
('c1000000-0000-0000-0000-000000000009', 'rashid.alnuaimi@cuts.ae', '+971501234109', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Rashid', 'Al-Nuaimi', 'customer', NOW(), NOW()),
('c1000000-0000-0000-0000-000000000010', 'aisha.almheiri@cuts.ae', '+971501234110', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Aisha', 'Al-Mheiri', 'customer', NOW(), NOW()),
('c1000000-0000-0000-0000-000000000011', 'saeed.alfalasi@cuts.ae', '+971501234111', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Saeed', 'Al-Falasi', 'customer', NOW(), NOW()),
('c1000000-0000-0000-0000-000000000012', 'latifa.aldhaheri@cuts.ae', '+971501234112', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Latifa', 'Al-Dhaheri', 'customer', NOW(), NOW()),
('c1000000-0000-0000-0000-000000000013', 'hamdan.alqubaisi@cuts.ae', '+971501234113', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Hamdan', 'Al-Qubaisi', 'customer', NOW(), NOW()),
('c1000000-0000-0000-0000-000000000014', 'sheikha.alblooshi@cuts.ae', '+971501234114', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Sheikha', 'Al-Blooshi', 'customer', NOW(), NOW()),
('c1000000-0000-0000-0000-000000000015', 'majid.alhammadi@cuts.ae', '+971501234115', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Majid', 'Al-Hammadi', 'customer', NOW(), NOW()),
('c1000000-0000-0000-0000-000000000016', 'moza.alahbabi@cuts.ae', '+971501234116', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Moza', 'Al-Ahbabi', 'customer', NOW(), NOW()),
('c1000000-0000-0000-0000-000000000017', 'abdullah.almarri@cuts.ae', '+971501234117', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Abdullah', 'Al-Marri', 'customer', NOW(), NOW()),
('c1000000-0000-0000-0000-000000000018', 'amna.alkalbani@cuts.ae', '+971501234118', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Amna', 'Al-Kalbani', 'customer', NOW(), NOW()),
('c1000000-0000-0000-0000-000000000019', 'omar.alnaqbi@cuts.ae', '+971501234119', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Omar', 'Al-Naqbi', 'customer', NOW(), NOW()),
('c1000000-0000-0000-0000-000000000020', 'maha.alsharqi@cuts.ae', '+971501234120', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Maha', 'Al-Sharqi', 'customer', NOW(), NOW()),
('c1000000-0000-0000-0000-000000000021', 'nasser.alshehhi@cuts.ae', '+971501234121', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Nasser', 'Al-Shehhi', 'customer', NOW(), NOW()),
('c1000000-0000-0000-0000-000000000022', 'salama.alhosani@cuts.ae', '+971501234122', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Salama', 'Al-Hosani', 'customer', NOW(), NOW()),

-- Indian Names
('c2000000-0000-0000-0000-000000000001', 'raj.kumar@cuts.ae', '+971501234201', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Raj', 'Kumar', 'customer', NOW(), NOW()),
('c2000000-0000-0000-0000-000000000002', 'priya.sharma@cuts.ae', '+971501234202', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Priya', 'Sharma', 'customer', NOW(), NOW()),
('c2000000-0000-0000-0000-000000000003', 'arun.patel@cuts.ae', '+971501234203', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Arun', 'Patel', 'customer', NOW(), NOW()),
('c2000000-0000-0000-0000-000000000004', 'deepa.singh@cuts.ae', '+971501234204', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Deepa', 'Singh', 'customer', NOW(), NOW()),
('c2000000-0000-0000-0000-000000000005', 'sanjay.gupta@cuts.ae', '+971501234205', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Sanjay', 'Gupta', 'customer', NOW(), NOW()),
('c2000000-0000-0000-0000-000000000006', 'kavita.mehta@cuts.ae', '+971501234206', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Kavita', 'Mehta', 'customer', NOW(), NOW()),
('c2000000-0000-0000-0000-000000000007', 'vikram.reddy@cuts.ae', '+971501234207', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Vikram', 'Reddy', 'customer', NOW(), NOW()),
('c2000000-0000-0000-0000-000000000008', 'anjali.nair@cuts.ae', '+971501234208', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Anjali', 'Nair', 'customer', NOW(), NOW()),
('c2000000-0000-0000-0000-000000000009', 'rahul.verma@cuts.ae', '+971501234209', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Rahul', 'Verma', 'customer', NOW(), NOW()),
('c2000000-0000-0000-0000-000000000010', 'neha.iyer@cuts.ae', '+971501234210', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Neha', 'Iyer', 'customer', NOW(), NOW()),
('c2000000-0000-0000-0000-000000000011', 'amit.shah@cuts.ae', '+971501234211', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Amit', 'Shah', 'customer', NOW(), NOW()),
('c2000000-0000-0000-0000-000000000012', 'pooja.desai@cuts.ae', '+971501234212', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Pooja', 'Desai', 'customer', NOW(), NOW()),
('c2000000-0000-0000-0000-000000000013', 'arjun.krishnan@cuts.ae', '+971501234213', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Arjun', 'Krishnan', 'customer', NOW(), NOW()),
('c2000000-0000-0000-0000-000000000014', 'divya.rao@cuts.ae', '+971501234214', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Divya', 'Rao', 'customer', NOW(), NOW()),
('c2000000-0000-0000-0000-000000000015', 'karan.joshi@cuts.ae', '+971501234215', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Karan', 'Joshi', 'customer', NOW(), NOW()),
('c2000000-0000-0000-0000-000000000016', 'meera.pillai@cuts.ae', '+971501234216', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Meera', 'Pillai', 'customer', NOW(), NOW()),
('c2000000-0000-0000-0000-000000000017', 'rohit.malhotra@cuts.ae', '+971501234217', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Rohit', 'Malhotra', 'customer', NOW(), NOW()),
('c2000000-0000-0000-0000-000000000018', 'sneha.bhatt@cuts.ae', '+971501234218', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Sneha', 'Bhatt', 'customer', NOW(), NOW()),
('c2000000-0000-0000-0000-000000000019', 'varun.chopra@cuts.ae', '+971501234219', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Varun', 'Chopra', 'customer', NOW(), NOW()),
('c2000000-0000-0000-0000-000000000020', 'shreya.kapoor@cuts.ae', '+971501234220', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Shreya', 'Kapoor', 'customer', NOW(), NOW()),
('c2000000-0000-0000-0000-000000000021', 'manish.bhatia@cuts.ae', '+971501234221', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Manish', 'Bhatia', 'customer', NOW(), NOW()),
('c2000000-0000-0000-0000-000000000022', 'ritu.menon@cuts.ae', '+971501234222', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Ritu', 'Menon', 'customer', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Customer profiles for select customers (mix of goals and fitness levels)
INSERT INTO customer_profiles (user_id, height, weight, age, gender, activity_level, goal, daily_calorie_target, daily_protein_target, daily_carbs_target, daily_fat_target, dietary_restrictions) VALUES
-- Arabic customers
('c1000000-0000-0000-0000-000000000001', 178, 85, 32, 'male', 'moderate', 'weight_loss', 2100, 165, 158, 70, '[]'::jsonb),
('c1000000-0000-0000-0000-000000000002', 162, 58, 28, 'female', 'active', 'muscle_gain', 2200, 165, 247, 61, '[]'::jsonb),
('c1000000-0000-0000-0000-000000000003', 180, 92, 35, 'male', 'active', 'weight_loss', 2300, 180, 173, 77, '[]'::jsonb),
('c1000000-0000-0000-0000-000000000005', 175, 78, 29, 'male', 'very_active', 'muscle_gain', 2800, 210, 315, 78, '[]'::jsonb),
('c1000000-0000-0000-0000-000000000006', 168, 65, 26, 'female', 'moderate', 'maintenance', 1900, 143, 214, 53, '[]'::jsonb),
('c1000000-0000-0000-0000-000000000008', 165, 62, 24, 'female', 'active', 'weight_loss', 1800, 135, 162, 56, '["dairy"]'::jsonb),
('c1000000-0000-0000-0000-000000000010', 170, 70, 31, 'female', 'moderate', 'muscle_gain', 2100, 158, 236, 58, '[]'::jsonb),
('c1000000-0000-0000-0000-000000000013', 182, 88, 38, 'male', 'light', 'weight_loss', 2000, 150, 225, 67, '[]'::jsonb),
('c1000000-0000-0000-0000-000000000015', 177, 82, 33, 'male', 'active', 'bulking', 3000, 225, 338, 83, '[]'::jsonb),
('c1000000-0000-0000-0000-000000000019', 176, 80, 30, 'male', 'very_active', 'muscle_gain', 2700, 203, 304, 75, '[]'::jsonb),

-- Indian customers
('c2000000-0000-0000-0000-000000000001', 172, 75, 34, 'male', 'moderate', 'maintenance', 2200, 165, 248, 61, '[]'::jsonb),
('c2000000-0000-0000-0000-000000000002', 160, 55, 27, 'female', 'active', 'muscle_gain', 2000, 150, 225, 56, '["gluten"]'::jsonb),
('c2000000-0000-0000-0000-000000000003', 175, 82, 36, 'male', 'active', 'weight_loss', 2250, 169, 253, 63, '[]'::jsonb),
('c2000000-0000-0000-0000-000000000005', 170, 68, 31, 'male', 'very_active', 'bulking', 2900, 218, 326, 81, '[]'::jsonb),
('c2000000-0000-0000-0000-000000000006', 165, 60, 29, 'female', 'moderate', 'weight_loss', 1750, 131, 157, 58, '[]'::jsonb),
('c2000000-0000-0000-0000-000000000007', 178, 85, 33, 'male', 'active', 'muscle_gain', 2600, 195, 293, 72, '[]'::jsonb),
('c2000000-0000-0000-0000-000000000008', 163, 57, 25, 'female', 'active', 'maintenance', 1950, 146, 219, 54, '[]'::jsonb),
('c2000000-0000-0000-0000-000000000011', 174, 77, 32, 'male', 'moderate', 'weight_loss', 2100, 158, 236, 58, '[]'::jsonb),
('c2000000-0000-0000-0000-000000000014', 168, 63, 28, 'female', 'active', 'muscle_gain', 2100, 158, 236, 58, '["dairy"]'::jsonb),
('c2000000-0000-0000-0000-000000000017', 176, 79, 35, 'male', 'very_active', 'bulking', 3100, 233, 349, 86, '[]'::jsonb);

-- Realistic orders from UAE customers (varied dates, statuses, and restaurants)
-- Recent orders (last 7 days)
INSERT INTO orders (id, order_number, customer_id, restaurants, status, delivery_address, subtotal, delivery_fee, service_fee, total_amount, payment_status, created_at) VALUES
('o2000000-0000-0000-0000-000000000001', 'ORD-20251117-AE001', 'c1000000-0000-0000-0000-000000000001',
 ARRAY['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa']::uuid[], 'delivered',
 '{"street": "Al Reem Island", "building": "Marina Square", "apartment": "1204", "city": "Abu Dhabi", "postal_code": "12801", "country": "UAE"}'::jsonb,
 135.00, 10.00, 6.75, 151.75, 'paid', NOW() - INTERVAL '2 hours'),

('o2000000-0000-0000-0000-000000000002', 'ORD-20251117-AE002', 'c2000000-0000-0000-0000-000000000002',
 ARRAY['dddddddd-dddd-dddd-dddd-dddddddddddd']::uuid[], 'in_transit',
 '{"street": "Dubai Marina", "building": "Princess Tower", "apartment": "3201", "city": "Dubai", "postal_code": "25314", "country": "UAE"}'::jsonb,
 124.00, 12.00, 6.20, 142.20, 'paid', NOW() - INTERVAL '45 minutes'),

('o2000000-0000-0000-0000-000000000003', 'ORD-20251117-AE003', 'c1000000-0000-0000-0000-000000000003',
 ARRAY['bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb']::uuid[], 'preparing',
 '{"street": "Al Bateen", "building": "Villa 23", "city": "Abu Dhabi", "postal_code": "12456", "country": "UAE"}'::jsonb,
 186.00, 10.00, 9.30, 205.30, 'paid', NOW() - INTERVAL '20 minutes'),

('o2000000-0000-0000-0000-000000000004', 'ORD-20251117-AE004', 'c2000000-0000-0000-0000-000000000005',
 ARRAY['eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee']::uuid[], 'confirmed',
 '{"street": "Business Bay", "building": "Executive Towers", "apartment": "1507", "city": "Dubai", "postal_code": "24801", "country": "UAE"}'::jsonb,
 97.00, 10.00, 4.85, 111.85, 'paid', NOW() - INTERVAL '10 minutes'),

('o2000000-0000-0000-0000-000000000005', 'ORD-20251116-AE005', 'c1000000-0000-0000-0000-000000000005',
 ARRAY['ffffffff-ffff-ffff-ffff-ffffffffffff']::uuid[], 'delivered',
 '{"street": "Sheikh Zayed Road", "building": "Burj Khalifa Residence", "apartment": "4502", "city": "Dubai", "postal_code": "23901", "country": "UAE"}'::jsonb,
 295.00, 15.00, 14.75, 324.75, 'paid', NOW() - INTERVAL '1 day'),

('o2000000-0000-0000-0000-000000000006', 'ORD-20251116-AE006', 'c2000000-0000-0000-0000-000000000007',
 ARRAY['dddddddd-dddd-dddd-dddd-dddddddddddd']::uuid[], 'delivered',
 '{"street": "Jumeirah Beach Residence", "building": "Shams 4", "apartment": "2103", "city": "Dubai", "postal_code": "25801", "country": "UAE"}'::jsonb,
 164.00, 12.00, 8.20, 184.20, 'paid', NOW() - INTERVAL '1 day 3 hours'),

('o2000000-0000-0000-0000-000000000007', 'ORD-20251116-AE007', 'c1000000-0000-0000-0000-000000000006',
 ARRAY['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa']::uuid[], 'delivered',
 '{"street": "Saadiyat Island", "building": "Park View Residence", "apartment": "801", "city": "Abu Dhabi", "postal_code": "13201", "country": "UAE"}'::jsonb,
 118.00, 15.00, 5.90, 138.90, 'paid', NOW() - INTERVAL '1 day 8 hours'),

('o2000000-0000-0000-0000-000000000008', 'ORD-20251115-AE008', 'c2000000-0000-0000-0000-000000000008',
 ARRAY['bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb']::uuid[], 'delivered',
 '{"street": "Downtown Dubai", "building": "The Address", "apartment": "1901", "city": "Dubai", "postal_code": "24001", "country": "UAE"}'::jsonb,
 145.00, 10.00, 7.25, 162.25, 'paid', NOW() - INTERVAL '2 days'),

('o2000000-0000-0000-0000-000000000009', 'ORD-20251115-AE009', 'c1000000-0000-0000-0000-000000000008',
 ARRAY['eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee']::uuid[], 'delivered',
 '{"street": "Yas Island", "building": "Ansam 2", "apartment": "1402", "city": "Abu Dhabi", "postal_code": "13501", "country": "UAE"}'::jsonb,
 156.00, 15.00, 7.80, 178.80, 'paid', NOW() - INTERVAL '2 days 5 hours'),

('o2000000-0000-0000-0000-000000000010', 'ORD-20251115-AE010', 'c2000000-0000-0000-0000-000000000003',
 ARRAY['ffffffff-ffff-ffff-ffff-ffffffffffff']::uuid[], 'delivered',
 '{"street": "Palm Jumeirah", "building": "Golden Mile 8", "apartment": "702", "city": "Dubai", "postal_code": "26201", "country": "UAE"}'::jsonb,
 213.00, 15.00, 10.65, 238.65, 'paid', NOW() - INTERVAL '2 days 12 hours'),

('o2000000-0000-0000-0000-000000000011', 'ORD-20251114-AE011', 'c1000000-0000-0000-0000-000000000010',
 ARRAY['dddddddd-dddd-dddd-dddd-dddddddddddd']::uuid[], 'delivered',
 '{"street": "Al Khalidiya", "building": "Sky Tower", "apartment": "2801", "city": "Abu Dhabi", "postal_code": "12701", "country": "UAE"}'::jsonb,
 175.00, 10.00, 8.75, 193.75, 'paid', NOW() - INTERVAL '3 days'),

('o2000000-0000-0000-0000-000000000012', 'ORD-20251114-AE012', 'c2000000-0000-0000-0000-000000000011',
 ARRAY['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa']::uuid[], 'delivered',
 '{"street": "Dubai Hills Estate", "building": "Park Ridge", "apartment": "1203", "city": "Dubai", "postal_code": "27801", "country": "UAE"}'::jsonb,
 132.00, 12.00, 6.60, 150.60, 'paid', NOW() - INTERVAL '3 days 6 hours'),

('o2000000-0000-0000-0000-000000000013', 'ORD-20251113-AE013', 'c1000000-0000-0000-0000-000000000013',
 ARRAY['bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb']::uuid[], 'delivered',
 '{"street": "Corniche Road", "building": "Nation Towers", "apartment": "3305", "city": "Abu Dhabi", "postal_code": "12301", "country": "UAE"}'::jsonb,
 198.00, 10.00, 9.90, 217.90, 'paid', NOW() - INTERVAL '4 days'),

('o2000000-0000-0000-0000-000000000014', 'ORD-20251113-AE014', 'c2000000-0000-0000-0000-000000000014',
 ARRAY['eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee']::uuid[], 'delivered',
 '{"street": "City Walk", "building": "Building 12", "apartment": "905", "city": "Dubai", "postal_code": "24501", "country": "UAE"}'::jsonb,
 148.00, 10.00, 7.40, 165.40, 'paid', NOW() - INTERVAL '4 days 8 hours'),

('o2000000-0000-0000-0000-000000000015', 'ORD-20251112-AE015', 'c1000000-0000-0000-0000-000000000015',
 ARRAY['ffffffff-ffff-ffff-ffff-ffffffffffff']::uuid[], 'delivered',
 '{"street": "Al Maryah Island", "building": "Rosewood Residences", "apartment": "2201", "city": "Abu Dhabi", "postal_code": "13801", "country": "UAE"}'::jsonb,
 325.00, 10.00, 16.25, 351.25, 'paid', NOW() - INTERVAL '5 days'),

('o2000000-0000-0000-0000-000000000016', 'ORD-20251112-AE016', 'c2000000-0000-0000-0000-000000000017',
 ARRAY['dddddddd-dddd-dddd-dddd-dddddddddddd']::uuid[], 'delivered',
 '{"street": "Arabian Ranches", "building": "Villa 145", "city": "Dubai", "postal_code": "28301", "country": "UAE"}'::jsonb,
 189.00, 15.00, 9.45, 213.45, 'paid', NOW() - INTERVAL '5 days 4 hours'),

('o2000000-0000-0000-0000-000000000017', 'ORD-20251111-AE017', 'c1000000-0000-0000-0000-000000000019',
 ARRAY['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa']::uuid[], 'delivered',
 '{"street": "Al Reef", "building": "Contemporary 2", "apartment": "601", "city": "Abu Dhabi", "postal_code": "14201", "country": "UAE"}'::jsonb,
 142.00, 15.00, 7.10, 164.10, 'paid', NOW() - INTERVAL '6 days'),

('o2000000-0000-0000-0000-000000000018', 'ORD-20251111-AE018', 'c2000000-0000-0000-0000-000000000006',
 ARRAY['bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb']::uuid[], 'delivered',
 '{"street": "Motor City", "building": "Uptown Motor City 4", "apartment": "1107", "city": "Dubai", "postal_code": "28701", "country": "UAE"}'::jsonb,
 167.00, 15.00, 8.35, 190.35, 'paid', NOW() - INTERVAL '6 days 7 hours'),

-- Weekly meal prep orders
('o2000000-0000-0000-0000-000000000019', 'ORD-20251110-AE019', 'c1000000-0000-0000-0000-000000000001',
 ARRAY['ffffffff-ffff-ffff-ffff-ffffffffffff']::uuid[], 'delivered',
 '{"street": "Al Reem Island", "building": "Marina Square", "apartment": "1204", "city": "Abu Dhabi", "postal_code": "12801", "country": "UAE"}'::jsonb,
 295.00, 10.00, 14.75, 319.75, 'paid', NOW() - INTERVAL '7 days'),

('o2000000-0000-0000-0000-000000000020', 'ORD-20251110-AE020', 'c2000000-0000-0000-0000-000000000005',
 ARRAY['ffffffff-ffff-ffff-ffff-ffffffffffff']::uuid[], 'delivered',
 '{"street": "Business Bay", "building": "Executive Towers", "apartment": "1507", "city": "Dubai", "postal_code": "24801", "country": "UAE"}'::jsonb,
 325.00, 10.00, 16.25, 351.25, 'paid', NOW() - INTERVAL '7 days')
ON CONFLICT (id) DO NOTHING;

-- Order items for the new orders
INSERT INTO order_items (order_id, menu_item_id, restaurant_id, quantity, base_price, item_total, nutritional_summary) VALUES
-- Order 1: Ahmed Al-Mansoori - Healthy Bites
('o2000000-0000-0000-0000-000000000001', 'a1111111-1111-1111-1111-111111111117', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 1, 68.00, 68.00, '{"calories": 520, "protein": 45, "carbohydrates": 32, "fat": 22}'::jsonb),
('o2000000-0000-0000-0000-000000000001', 'a1111111-1111-1111-1111-111111111115', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 1, 42.00, 42.00, '{"calories": 520, "protein": 18, "carbohydrates": 68, "fat": 18}'::jsonb),
('o2000000-0000-0000-0000-000000000001', 'a1111111-1111-1111-1111-111111111112', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 1, 28.00, 28.00, '{"calories": 280, "protein": 15, "carbohydrates": 42, "fat": 6}'::jsonb),

-- Order 2: Priya Sharma - ABS Protein Kitchen
('o2000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000004', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 2, 62.00, 124.00, '{"calories": 1360, "protein": 164, "carbohydrates": 116, "fat": 24}'::jsonb),

-- Order 3: Mohammed Al-Shamsi - Protein Palace
('o2000000-0000-0000-0000-000000000003', 'b2222222-2222-2222-2222-222222222225', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 2, 78.00, 156.00, '{"calories": 1360, "protein": 116, "carbohydrates": 84, "fat": 56}'::jsonb),
('o2000000-0000-0000-0000-000000000003', 'b2222222-2222-2222-2222-222222222221', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 1, 42.00, 42.00, '{"calories": 520, "protein": 38, "carbohydrates": 42, "fat": 20}'::jsonb),

-- Order 4: Sanjay Gupta - Clean Eats Dubai
('o2000000-0000-0000-0000-000000000004', 'e1000000-0000-0000-0000-000000000004', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 1, 52.00, 52.00, '{"calories": 520, "protein": 18, "carbohydrates": 68, "fat": 18}'::jsonb),
('o2000000-0000-0000-0000-000000000004', 'e1000000-0000-0000-0000-000000000001', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 1, 45.00, 45.00, '{"calories": 380, "protein": 12, "carbohydrates": 65, "fat": 8}'::jsonb),

-- Order 5: Khalid Al-Suwaidi - Macro Meals (meal prep)
('o2000000-0000-0000-0000-000000000005', 'f1000000-0000-0000-0000-000000000010', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 1, 295.00, 295.00, '{"calories": 12000, "protein": 600, "carbohydrates": 800, "fat": 300}'::jsonb),

-- Order 6: Vikram Reddy - ABS Protein Kitchen
('o2000000-0000-0000-0000-000000000006', 'd1000000-0000-0000-0000-000000000008', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 2, 82.00, 164.00, '{"calories": 1240, "protein": 116, "carbohydrates": 56, "fat": 56}'::jsonb),

-- Order 7: Mariam Al-Kaabi - Healthy Bites
('o2000000-0000-0000-0000-000000000007', 'a1111111-1111-1111-1111-111111111114', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 1, 45.00, 45.00, '{"calories": 450, "protein": 42, "carbohydrates": 28, "fat": 18}'::jsonb),
('o2000000-0000-0000-0000-000000000007', 'a1111111-1111-1111-1111-111111111116', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 1, 38.00, 38.00, '{"calories": 420, "protein": 16, "carbohydrates": 52, "fat": 16}'::jsonb),
('o2000000-0000-0000-0000-000000000007', 'a1111111-1111-1111-1111-111111111112', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 1, 28.00, 28.00, '{"calories": 280, "protein": 15, "carbohydrates": 42, "fat": 6}'::jsonb),

-- Order 8: Anjali Nair - Protein Palace
('o2000000-0000-0000-0000-000000000008', 'b2222222-2222-2222-2222-222222222223', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 1, 58.00, 58.00, '{"calories": 680, "protein": 82, "carbohydrates": 58, "fat": 14}'::jsonb),
('o2000000-0000-0000-0000-000000000008', 'b2222222-2222-2222-2222-222222222226', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 1, 52.00, 52.00, '{"calories": 580, "protein": 52, "carbohydrates": 62, "fat": 14}'::jsonb),
('o2000000-0000-0000-0000-000000000008', 'b2222222-2222-2222-2222-222222222221', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 1, 42.00, 42.00, '{"calories": 520, "protein": 38, "carbohydrates": 42, "fat": 20}'::jsonb),

-- Order 9: Hessa Al-Ketbi - Clean Eats Dubai
('o2000000-0000-0000-0000-000000000009', 'e1000000-0000-0000-0000-000000000008', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 1, 88.00, 88.00, '{"calories": 480, "protein": 42, "carbohydrates": 18, "fat": 24}'::jsonb),
('o2000000-0000-0000-0000-000000000009', 'e1000000-0000-0000-0000-000000000004', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 1, 52.00, 52.00, '{"calories": 520, "protein": 18, "carbohydrates": 68, "fat": 18}'::jsonb),

-- Order 10: Arun Patel - Macro Meals UAE
('o2000000-0000-0000-0000-000000000010', 'f1000000-0000-0000-0000-000000000003', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 2, 58.00, 116.00, '{"calories": 1160, "protein": 96, "carbohydrates": 104, "fat": 32}'::jsonb),
('o2000000-0000-0000-0000-000000000010', 'f1000000-0000-0000-0000-000000000005', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 1, 78.00, 78.00, '{"calories": 620, "protein": 48, "carbohydrates": 42, "fat": 28}'::jsonb),

-- Order 11: Aisha Al-Mheiri - ABS Protein Kitchen
('o2000000-0000-0000-0000-000000000011', 'd1000000-0000-0000-0000-000000000009', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 2, 58.00, 116.00, '{"calories": 1160, "protein": 96, "carbohydrates": 104, "fat": 32}'::jsonb),
('o2000000-0000-0000-0000-000000000011', 'd1000000-0000-0000-0000-000000000002', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 1, 38.00, 38.00, '{"calories": 280, "protein": 38, "carbohydrates": 12, "fat": 8}'::jsonb),

-- Order 12: Amit Shah - Healthy Bites
('o2000000-0000-0000-0000-000000000012', 'a1111111-1111-1111-1111-111111111119', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 2, 48.00, 96.00, '{"calories": 1040, "protein": 104, "carbohydrates": 96, "fat": 24}'::jsonb),
('o2000000-0000-0000-0000-000000000012', 'a1111111-1111-1111-1111-111111111113', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 1, 32.00, 32.00, '{"calories": 380, "protein": 28, "carbohydrates": 45, "fat": 8}'::jsonb),

-- Order 13: Hamdan Al-Qubaisi - Protein Palace
('o2000000-0000-0000-0000-000000000013', 'b2222222-2222-2222-2222-222222222225', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 2, 78.00, 156.00, '{"calories": 1360, "protein": 116, "carbohydrates": 84, "fat": 56}'::jsonb),
('o2000000-0000-0000-0000-000000000013', 'b2222222-2222-2222-2222-222222222223', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 1, 58.00, 58.00, '{"calories": 680, "protein": 82, "carbohydrates": 58, "fat": 14}'::jsonb),

-- Order 14: Divya Rao - Clean Eats Dubai
('o2000000-0000-0000-0000-000000000014', 'e1000000-0000-0000-0000-000000000002', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 2, 42.00, 84.00, '{"calories": 760, "protein": 36, "carbohydrates": 76, "fat": 16}'::jsonb),
('o2000000-0000-0000-0000-000000000014', 'e1000000-0000-0000-0000-000000000009', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 1, 58.00, 58.00, '{"calories": 580, "protein": 52, "carbohydrates": 62, "fat": 14}'::jsonb),

-- Order 15: Majid Al-Hammadi - Macro Meals (meal prep)
('o2000000-0000-0000-0000-000000000015', 'f1000000-0000-0000-0000-000000000011', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 1, 325.00, 325.00, '{"calories": 13500, "protein": 675, "carbohydrates": 900, "fat": 338}'::jsonb),

-- Order 16: Rohit Malhotra - ABS Protein Kitchen
('o2000000-0000-0000-0000-000000000016', 'd1000000-0000-0000-0000-000000000006', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 1, 72.00, 72.00, '{"calories": 620, "protein": 48, "carbohydrates": 42, "fat": 28}'::jsonb),
('o2000000-0000-0000-0000-000000000016', 'd1000000-0000-0000-0000-000000000007', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 2, 58.00, 116.00, '{"calories": 1160, "protein": 104, "carbohydrates": 124, "fat": 28}'::jsonb),

-- Order 17: Omar Al-Naqbi - Healthy Bites
('o2000000-0000-0000-0000-000000000017', 'a1111111-1111-1111-1111-111111111118', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 2, 52.00, 104.00, '{"calories": 960, "protein": 96, "carbohydrates": 72, "fat": 32}'::jsonb),
('o2000000-0000-0000-0000-000000000017', 'a1111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 1, 35.00, 35.00, '{"calories": 420, "protein": 18, "carbohydrates": 38, "fat": 24}'::jsonb),

-- Order 18: Kavita Mehta - Protein Palace
('o2000000-0000-0000-0000-000000000018', 'b2222222-2222-2222-2222-222222222224', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 2, 55.00, 110.00, '{"calories": 1240, "protein": 96, "carbohydrates": 96, "fat": 48}'::jsonb),
('o2000000-0000-0000-0000-000000000018', 'b2222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 1, 38.00, 38.00, '{"calories": 420, "protein": 42, "carbohydrates": 38, "fat": 12}'::jsonb),

-- Order 19: Ahmed Al-Mansoori - Macro Meals (weekly meal prep)
('o2000000-0000-0000-0000-000000000019', 'f1000000-0000-0000-0000-000000000010', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 1, 295.00, 295.00, '{"calories": 12000, "protein": 600, "carbohydrates": 800, "fat": 300}'::jsonb),

-- Order 20: Sanjay Gupta - Macro Meals (weekly meal prep)
('o2000000-0000-0000-0000-000000000020', 'f1000000-0000-0000-0000-000000000011', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 1, 325.00, 325.00, '{"calories": 13500, "protein": 675, "carbohydrates": 900, "fat": 338}'::jsonb);

-- Success message
SELECT 'UAE Customer seed data inserted successfully!' AS message;
SELECT '44 customers added:' AS info;
SELECT '  - 22 Arabic UAE names (Al-Mansoori, Al-Zaabi, Al-Shamsi, etc.)' AS details;
SELECT '  - 22 Indian names (Kumar, Sharma, Patel, Singh, etc.)' AS details;
SELECT '20 realistic orders created with:' AS orders_info;
SELECT '  - Varied statuses (delivered, in_transit, preparing, confirmed)' AS order_details;
SELECT '  - Realistic Dubai/Abu Dhabi delivery addresses' AS order_details;
SELECT '  - UAE phone numbers (+971)' AS order_details;
SELECT '  - @cuts.ae email addresses' AS order_details;
SELECT '  - Mix of all restaurants' AS order_details;
SELECT '' AS blank;
SELECT 'Sample login credentials (all use password: password123):' AS login_info;
SELECT 'ahmed.almansoori@cuts.ae - Ahmed Al-Mansoori' AS credentials;
SELECT 'fatima.alzaabi@cuts.ae - Fatima Al-Zaabi' AS credentials;
SELECT 'raj.kumar@cuts.ae - Raj Kumar' AS credentials;
SELECT 'priya.sharma@cuts.ae - Priya Sharma' AS credentials;
