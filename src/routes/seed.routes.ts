import { Router, Request, Response } from 'express';
import pool from '../config/database';

const router = Router();

// Secret key for seed access - should match JWT_SECRET
const SEED_SECRET = 'baqir-osaed-ayush-arryan';

router.post('/massive', async (req: Request, res: Response) => {
  const { secret } = req.body;

  if (secret !== SEED_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('Starting massive seed...');

    // Clear existing data
    await pool.query(`
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
    `);
    console.log('Cleared existing data');

    // Insert users
    await pool.query(`
      INSERT INTO users (id, email, phone, password_hash, first_name, last_name, role, created_at, updated_at) VALUES
      ('99999999-9999-9999-9999-999999999999', 'admin@cuts.ae', '+971501234599', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Admin', 'User', 'admin', NOW() - INTERVAL '6 months', NOW()),
      ('11111111-1111-1111-1111-111111111111', 'owner@cuts.ae', '+971501234567', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', 'Ahmed', 'Al Maktoum', 'restaurant_owner', NOW() - INTERVAL '6 months', NOW())
    `);

    // Insert 50 customers
    const customerInserts = [];
    const customerNames = [
      ['Omar', 'Hassan'], ['Fatima', 'Al Nahyan'], ['Khalid', 'Ibrahim'], ['Sara', 'Ahmed'], ['Mohammed', 'Al Suwaidi'],
      ['Layla', 'Rashid'], ['Ali', 'Mansoor'], ['Noura', 'Al Falasi'], ['Hamad', 'Al Ketbi'], ['Aisha', 'Mohammed'],
      ['Sultan', 'Al Mazrouei'], ['Mariam', 'Al Shamsi'], ['Rashid', 'Al Nuaimi'], ['Hessa', 'Al Qassimi'], ['Saeed', 'Al Muhairi'],
      ['Moza', 'Al Dhaheri'], ['Abdullah', 'Al Remeithi'], ['Shamma', 'Al Zaabi'], ['Mansoor', 'Al Mehairi'], ['Latifa', 'Al Qubaisi'],
      ['Majid', 'Al Hosani'], ['Amna', 'Al Mansoori'], ['Zayed', 'Al Bloushi'], ['Shamsa', 'Al Khaili'], ['Ahmed', 'Al Romaithi'],
      ['Meera', 'Al Jaberi'], ['Thani', 'Al Suwaidi'], ['Mouza', 'Al Neyadi'], ['Obaid', 'Al Kaabi'], ['Reem', 'Al Hashemi'],
      ['Khaled', 'Al Mulla'], ['Dana', 'Al Sayed'], ['Nasser', 'Al Khouri'], ['Salama', 'Al Mazrui'], ['Jassim', 'Al Balooshi'],
      ['Wadha', 'Al Dhahiri'], ['Faisal', 'Al Shamlan'], ['Jawaher', 'Al Sharqi'], ['Salem', 'Al Ketbi'], ['Afra', 'Al Ghaith'],
      ['Humaid', 'Al Tayer'], ['Sheikha', 'Al Nahyan'], ['Saif', 'Al Ameri'], ['Alia', 'Al Rostamani'], ['Tariq', 'Al Fardan'],
      ['Hind', 'Al Otaiba'], ['Waleed', 'Al Khoory'], ['Lubna', 'Al Falah'], ['Hamdan', 'Al Sayegh'], ['Asma', 'Al Badi']
    ];

    for (let i = 1; i <= 50; i++) {
      const padded = String(i).padStart(2, '0');
      const [firstName, lastName] = customerNames[i - 1];
      customerInserts.push(`('c00000${padded}-0000-0000-0000-0000000000${padded}', 'customer${i}@cuts.ae', '+9715010000${padded}', '$2b$10$wZQ/Jo1u0PxUxmhtpJNCf.0f57x.c.QI3.KLo9pLvCUs9E6qrm7ty', '${firstName}', '${lastName}', 'customer', NOW() - INTERVAL '${Math.floor(i / 10) + 1} months', NOW())`);
    }
    await pool.query(`INSERT INTO users (id, email, phone, password_hash, first_name, last_name, role, created_at, updated_at) VALUES ${customerInserts.join(',')}`);
    console.log('Inserted 52 users');

    // Insert restaurants
    await pool.query(`
      INSERT INTO restaurants (id, owner_id, name, slug, description, cuisine_type, address, phone, email, commission_rate, is_active, operating_hours, average_prep_time) VALUES
      ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'The Fit Kitchen', 'the-fit-kitchen', 'Premium healthy meals crafted for fitness enthusiasts.', ARRAY['Healthy', 'Mediterranean', 'Fitness'], '{"street": "Al Raha Beach, Building 5", "city": "Abu Dhabi", "emirate": "Abu Dhabi", "country": "UAE"}'::jsonb, '+971501111001', 'hello@thefitkitchen.ae', 0.15, true, '{"monday": {"open": "06:00", "close": "22:00"}, "tuesday": {"open": "06:00", "close": "22:00"}, "wednesday": {"open": "06:00", "close": "22:00"}, "thursday": {"open": "06:00", "close": "22:00"}, "friday": {"open": "06:00", "close": "23:00"}, "saturday": {"open": "07:00", "close": "23:00"}, "sunday": {"open": "07:00", "close": "22:00"}}'::jsonb, 25),
      ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'Lean & Green Dubai', 'lean-green-dubai', 'Plant-forward cuisine for the health-conscious.', ARRAY['Vegan', 'Organic', 'Salads'], '{"street": "Dubai Marina Walk, Tower 3", "city": "Dubai", "emirate": "Dubai", "country": "UAE"}'::jsonb, '+971501111002', 'info@leangreen.ae', 0.15, true, '{"monday": {"open": "07:00", "close": "22:00"}, "tuesday": {"open": "07:00", "close": "22:00"}, "wednesday": {"open": "07:00", "close": "22:00"}, "thursday": {"open": "07:00", "close": "22:00"}, "friday": {"open": "07:00", "close": "23:00"}, "saturday": {"open": "08:00", "close": "23:00"}, "sunday": {"open": "08:00", "close": "22:00"}}'::jsonb, 30),
      ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'Protein Palace', 'protein-palace', 'The ultimate destination for muscle builders.', ARRAY['High Protein', 'Bodybuilding', 'Sports Nutrition'], '{"street": "Business Bay, Executive Tower", "city": "Dubai", "emirate": "Dubai", "country": "UAE"}'::jsonb, '+971501111003', 'gains@proteinpalace.ae', 0.15, true, '{"monday": {"open": "05:00", "close": "23:00"}, "tuesday": {"open": "05:00", "close": "23:00"}, "wednesday": {"open": "05:00", "close": "23:00"}, "thursday": {"open": "05:00", "close": "23:00"}, "friday": {"open": "05:00", "close": "23:00"}, "saturday": {"open": "06:00", "close": "23:00"}, "sunday": {"open": "06:00", "close": "22:00"}}'::jsonb, 20),
      ('dddddddd-dddd-dddd-dddd-dddddddddddd', '11111111-1111-1111-1111-111111111111', 'Keto Kingdom', 'keto-kingdom', 'Low carb, high fat perfection.', ARRAY['Keto', 'Low Carb', 'Healthy Fats'], '{"street": "Al Wasl Road, Jumeirah 1", "city": "Dubai", "emirate": "Dubai", "country": "UAE"}'::jsonb, '+971501111004', 'keto@ketokingdom.ae', 0.15, true, '{"monday": {"open": "08:00", "close": "21:00"}, "tuesday": {"open": "08:00", "close": "21:00"}, "wednesday": {"open": "08:00", "close": "21:00"}, "thursday": {"open": "08:00", "close": "21:00"}, "friday": {"open": "08:00", "close": "22:00"}, "saturday": {"open": "09:00", "close": "22:00"}, "sunday": {"open": "09:00", "close": "21:00"}}'::jsonb, 35),
      ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '11111111-1111-1111-1111-111111111111', 'Clean Eats Abu Dhabi', 'clean-eats-abu-dhabi', 'Simple, clean, wholesome food.', ARRAY['Clean Eating', 'Whole Foods', 'Meal Prep'], '{"street": "Corniche Road, Nation Towers", "city": "Abu Dhabi", "emirate": "Abu Dhabi", "country": "UAE"}'::jsonb, '+971501111005', 'eat@cleaneats.ae', 0.15, true, '{"monday": {"open": "06:00", "close": "22:00"}, "tuesday": {"open": "06:00", "close": "22:00"}, "wednesday": {"open": "06:00", "close": "22:00"}, "thursday": {"open": "06:00", "close": "22:00"}, "friday": {"open": "06:00", "close": "23:00"}, "saturday": {"open": "07:00", "close": "23:00"}, "sunday": {"open": "07:00", "close": "22:00"}}'::jsonb, 25)
    `);
    console.log('Inserted 5 restaurants');

    // Insert menu items (simplified - 20 items per restaurant = 100 total)
    const menuItems = [
      // Restaurant A
      { id: 'a0000001-0000-0000-0000-000000000001', rid: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name: 'Grilled Chicken Quinoa Bowl', desc: 'Herb-marinated chicken breast with tri-color quinoa', price: 48, cat: 'lunch' },
      { id: 'a0000002-0000-0000-0000-000000000002', rid: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name: 'Salmon Teriyaki Rice Bowl', desc: 'Norwegian salmon with brown rice and edamame', price: 62, cat: 'lunch' },
      { id: 'a0000003-0000-0000-0000-000000000003', rid: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name: 'Protein Power Breakfast', desc: 'Scrambled eggs, turkey bacon, avocado, sweet potato hash', price: 42, cat: 'breakfast' },
      { id: 'a0000004-0000-0000-0000-000000000004', rid: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name: 'Greek Yogurt Parfait', desc: 'Greek yogurt with granola, berries, and honey', price: 28, cat: 'breakfast' },
      { id: 'a0000005-0000-0000-0000-000000000005', rid: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name: 'Mediterranean Grilled Steak', desc: 'Grass-fed beef with roasted vegetables', price: 85, cat: 'dinner' },
      { id: 'a0000006-0000-0000-0000-000000000006', rid: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name: 'Avocado Toast Deluxe', desc: 'Smashed avocado on sourdough with poached eggs', price: 38, cat: 'breakfast' },
      { id: 'a0000007-0000-0000-0000-000000000007', rid: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name: 'Turkey Meatball Zoodles', desc: 'Lean turkey meatballs with zucchini noodles', price: 52, cat: 'dinner' },
      { id: 'a0000008-0000-0000-0000-000000000008', rid: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name: 'Protein Pancakes Stack', desc: 'Fluffy protein pancakes with berries', price: 36, cat: 'breakfast' },
      { id: 'a0000009-0000-0000-0000-000000000009', rid: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name: 'Grilled Chicken Caesar Salad', desc: 'Romaine lettuce with grilled chicken', price: 45, cat: 'lunch' },
      { id: 'a0000010-0000-0000-0000-000000000010', rid: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name: 'Green Detox Smoothie', desc: 'Spinach, kale, banana, almond milk', price: 25, cat: 'beverages' },
      // Restaurant B
      { id: 'b0000001-0000-0000-0000-000000000001', rid: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', name: 'Buddha Bowl', desc: 'Quinoa, chickpeas, roasted sweet potato, kale', price: 46, cat: 'lunch' },
      { id: 'b0000002-0000-0000-0000-000000000002', rid: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', name: 'Vegan Pad Thai', desc: 'Rice noodles, tofu, vegetables, peanuts', price: 44, cat: 'dinner' },
      { id: 'b0000003-0000-0000-0000-000000000003', rid: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', name: 'Acai Superfood Bowl', desc: 'Blended acai with banana and granola', price: 38, cat: 'breakfast' },
      { id: 'b0000004-0000-0000-0000-000000000004', rid: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', name: 'Falafel Wrap', desc: 'Crispy falafel with hummus and tahini', price: 35, cat: 'lunch' },
      { id: 'b0000005-0000-0000-0000-000000000005', rid: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', name: 'Mushroom Risotto', desc: 'Creamy arborio rice with mixed mushrooms', price: 52, cat: 'dinner' },
      { id: 'b0000006-0000-0000-0000-000000000006', rid: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', name: 'Green Goddess Salad', desc: 'Mixed greens with avocado and cucumber', price: 42, cat: 'lunch' },
      { id: 'b0000007-0000-0000-0000-000000000007', rid: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', name: 'Overnight Oats', desc: 'Steel cut oats with almond milk and berries', price: 28, cat: 'breakfast' },
      { id: 'b0000008-0000-0000-0000-000000000008', rid: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', name: 'Cold Pressed Green Juice', desc: 'Kale, cucumber, celery, apple, ginger', price: 24, cat: 'beverages' },
      { id: 'b0000009-0000-0000-0000-000000000009', rid: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', name: 'Cauliflower Steak', desc: 'Roasted cauliflower with chimichurri', price: 48, cat: 'dinner' },
      { id: 'b0000010-0000-0000-0000-000000000010', rid: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', name: 'Lentil Soup', desc: 'Hearty red lentil soup with cumin', price: 26, cat: 'lunch' },
      // Restaurant C
      { id: 'c0000001-0000-0000-0000-000000000001', rid: 'cccccccc-cccc-cccc-cccc-cccccccccccc', name: 'Double Chicken Breast Meal', desc: '400g grilled chicken with brown rice', price: 58, cat: 'lunch' },
      { id: 'c0000002-0000-0000-0000-000000000002', rid: 'cccccccc-cccc-cccc-cccc-cccccccccccc', name: 'Steak and Eggs', desc: '250g sirloin steak with 4 eggs', price: 72, cat: 'breakfast' },
      { id: 'c0000003-0000-0000-0000-000000000003', rid: 'cccccccc-cccc-cccc-cccc-cccccccccccc', name: 'Mass Gainer Shake', desc: 'Whey protein, oats, banana, peanut butter', price: 35, cat: 'beverages' },
      { id: 'c0000004-0000-0000-0000-000000000004', rid: 'cccccccc-cccc-cccc-cccc-cccccccccccc', name: 'Bodybuilder Breakfast', desc: '6 egg whites, turkey sausage, oatmeal', price: 48, cat: 'breakfast' },
      { id: 'c0000005-0000-0000-0000-000000000005', rid: 'cccccccc-cccc-cccc-cccc-cccccccccccc', name: 'Grilled Tilapia Plate', desc: 'Grilled tilapia with jasmine rice', price: 52, cat: 'dinner' },
      { id: 'c0000006-0000-0000-0000-000000000006', rid: 'cccccccc-cccc-cccc-cccc-cccccccccccc', name: 'Beef and Rice Bowl', desc: 'Lean ground beef with white rice', price: 46, cat: 'lunch' },
      { id: 'c0000007-0000-0000-0000-000000000007', rid: 'cccccccc-cccc-cccc-cccc-cccccccccccc', name: 'Turkey Burger Stack', desc: 'Double turkey patty with egg', price: 52, cat: 'lunch' },
      { id: 'c0000008-0000-0000-0000-000000000008', rid: 'cccccccc-cccc-cccc-cccc-cccccccccccc', name: 'Salmon Power Bowl', desc: 'Grilled salmon with quinoa', price: 65, cat: 'dinner' },
      { id: 'c0000009-0000-0000-0000-000000000009', rid: 'cccccccc-cccc-cccc-cccc-cccccccccccc', name: 'Post-Workout Shake', desc: 'Whey isolate with creatine', price: 28, cat: 'beverages' },
      { id: 'c0000010-0000-0000-0000-000000000010', rid: 'cccccccc-cccc-cccc-cccc-cccccccccccc', name: 'Bison Burger', desc: 'Lean bison patty with sweet potato fries', price: 68, cat: 'lunch' },
      // Restaurant D
      { id: 'd0000001-0000-0000-0000-000000000001', rid: 'dddddddd-dddd-dddd-dddd-dddddddddddd', name: 'Keto Bacon Cheeseburger', desc: 'Beef patty wrapped in lettuce with bacon', price: 55, cat: 'lunch' },
      { id: 'd0000002-0000-0000-0000-000000000002', rid: 'dddddddd-dddd-dddd-dddd-dddddddddddd', name: 'Cauliflower Crust Pizza', desc: 'Low-carb pizza with mozzarella', price: 52, cat: 'dinner' },
      { id: 'd0000003-0000-0000-0000-000000000003', rid: 'dddddddd-dddd-dddd-dddd-dddddddddddd', name: 'Bulletproof Coffee', desc: 'Coffee with MCT oil and butter', price: 24, cat: 'beverages' },
      { id: 'd0000004-0000-0000-0000-000000000004', rid: 'dddddddd-dddd-dddd-dddd-dddddddddddd', name: 'Keto Eggs Benedict', desc: 'Poached eggs on portobello with hollandaise', price: 42, cat: 'breakfast' },
      { id: 'd0000005-0000-0000-0000-000000000005', rid: 'dddddddd-dddd-dddd-dddd-dddddddddddd', name: 'Ribeye Steak', desc: '300g ribeye with garlic butter', price: 95, cat: 'dinner' },
      { id: 'd0000006-0000-0000-0000-000000000006', rid: 'dddddddd-dddd-dddd-dddd-dddddddddddd', name: 'Salmon with Avocado Salsa', desc: 'Grilled salmon with fresh avocado', price: 68, cat: 'dinner' },
      { id: 'd0000007-0000-0000-0000-000000000007', rid: 'dddddddd-dddd-dddd-dddd-dddddddddddd', name: 'Bacon and Eggs', desc: '4 strips of bacon with 3 fried eggs', price: 38, cat: 'breakfast' },
      { id: 'd0000008-0000-0000-0000-000000000008', rid: 'dddddddd-dddd-dddd-dddd-dddddddddddd', name: 'Keto Caesar Salad', desc: 'Romaine with parmesan and bacon bits', price: 42, cat: 'lunch' },
      { id: 'd0000009-0000-0000-0000-000000000009', rid: 'dddddddd-dddd-dddd-dddd-dddddddddddd', name: 'Fat Bomb Plate', desc: 'Chocolate and peanut butter fat bombs', price: 28, cat: 'snacks' },
      { id: 'd0000010-0000-0000-0000-000000000010', rid: 'dddddddd-dddd-dddd-dddd-dddddddddddd', name: 'Keto Cheesecake', desc: 'Creamy cheesecake with almond crust', price: 32, cat: 'snacks' },
      // Restaurant E
      { id: 'e0000001-0000-0000-0000-000000000001', rid: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', name: 'Grilled Chicken Meal Prep', desc: '200g chicken with brown rice', price: 45, cat: 'lunch' },
      { id: 'e0000002-0000-0000-0000-000000000002', rid: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', name: 'Salmon and Quinoa Box', desc: 'Baked salmon with quinoa', price: 58, cat: 'dinner' },
      { id: 'e0000003-0000-0000-0000-000000000003', rid: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', name: 'Overnight Oats Jar', desc: 'Steel-cut oats with almond milk', price: 24, cat: 'breakfast' },
      { id: 'e0000004-0000-0000-0000-000000000004', rid: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', name: 'Turkey and Sweet Potato', desc: 'Lean ground turkey with sweet potato', price: 42, cat: 'lunch' },
      { id: 'e0000005-0000-0000-0000-000000000005', rid: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', name: 'Egg Muffins (6 pack)', desc: 'Baked egg muffins with vegetables', price: 28, cat: 'breakfast' },
      { id: 'e0000006-0000-0000-0000-000000000006', rid: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', name: 'Beef Stir Fry', desc: 'Lean beef strips with vegetables', price: 52, cat: 'dinner' },
      { id: 'e0000007-0000-0000-0000-000000000007', rid: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', name: 'Tuna Nicoise Salad', desc: 'Seared tuna with eggs and olives', price: 55, cat: 'lunch' },
      { id: 'e0000008-0000-0000-0000-000000000008', rid: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', name: 'Fresh Pressed Juice', desc: 'Carrot, apple, ginger juice', price: 22, cat: 'beverages' },
      { id: 'e0000009-0000-0000-0000-000000000009', rid: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', name: 'Greek Salad', desc: 'Tomatoes, cucumbers, olives, feta', price: 32, cat: 'lunch' },
      { id: 'e0000010-0000-0000-0000-000000000010', rid: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', name: 'Shakshuka', desc: 'Eggs poached in spiced tomato sauce', price: 36, cat: 'breakfast' }
    ];

    const menuInserts = menuItems.map(m =>
      `('${m.id}', '${m.rid}', '${m.name.replace(/'/g, "''")}', '${m.desc.replace(/'/g, "''")}', ${m.price}, '${m.cat}', true, 15)`
    );
    await pool.query(`INSERT INTO menu_items (id, restaurant_id, name, description, base_price, category, is_available, prep_time) VALUES ${menuInserts.join(',')}`);
    console.log('Inserted 50 menu items');

    // Insert nutritional info for each menu item
    const nutritionInserts = menuItems.map(m => {
      const cal = 300 + Math.floor(Math.random() * 400);
      const pro = 15 + Math.floor(Math.random() * 40);
      const carb = 20 + Math.floor(Math.random() * 50);
      const fat = 8 + Math.floor(Math.random() * 25);
      return `('${m.id}', '350g', ${cal}, ${pro}, ${carb}, ${fat}, ${Math.floor(Math.random() * 10)}, ${Math.floor(Math.random() * 15)}, ${300 + Math.floor(Math.random() * 500)}, ARRAY['gluten']::text[])`;
    });
    await pool.query(`INSERT INTO nutritional_info (menu_item_id, serving_size, calories, protein, carbohydrates, fat, fiber, sugar, sodium, allergens) VALUES ${nutritionInserts.join(',')}`);
    console.log('Inserted 50 nutritional info records');

    // Generate 500 orders
    const customerIds = Array.from({ length: 50 }, (_, i) => {
      const padded = String(i + 1).padStart(2, '0');
      return `c00000${padded}-0000-0000-0000-0000000000${padded}`;
    });
    const restaurantIds = ['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'];
    const statuses = ['pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'delivered', 'delivered', 'delivered', 'delivered', 'delivered', 'cancelled'];
    const paymentStatuses = ['paid', 'paid', 'paid', 'paid', 'paid', 'paid', 'paid', 'paid', 'pending', 'failed', 'refunded'];
    const addresses = [
      '{"street": "Marina Pinnacle Tower 1", "city": "Dubai", "emirate": "Dubai", "country": "UAE"}',
      '{"street": "Al Raha Beach Villa 15", "city": "Abu Dhabi", "emirate": "Abu Dhabi", "country": "UAE"}',
      '{"street": "JBR The Walk", "city": "Dubai", "emirate": "Dubai", "country": "UAE"}',
      '{"street": "Corniche Road Tower 3", "city": "Abu Dhabi", "emirate": "Abu Dhabi", "country": "UAE"}',
      '{"street": "Business Bay Executive Tower", "city": "Dubai", "emirate": "Dubai", "country": "UAE"}'
    ];

    const orderInserts = [];
    for (let i = 1; i <= 500; i++) {
      const padded = String(i).padStart(5, '0');
      const customerId = customerIds[Math.floor(Math.random() * 50)];
      const restaurantId = restaurantIds[Math.floor(Math.random() * 5)];
      const status = statuses[Math.floor(Math.random() * 11)];
      let paymentStatus = paymentStatuses[Math.floor(Math.random() * 11)];
      if (status === 'cancelled') paymentStatus = Math.random() > 0.5 ? 'refunded' : 'failed';
      const address = addresses[Math.floor(Math.random() * 5)];
      const daysAgo = Math.floor(Math.random() * 90);
      const subtotal = 50 + Math.floor(Math.random() * 150);
      const deliveryFee = subtotal > 100 ? 0 : 10;
      const serviceFee = Math.round(subtotal * 0.05 * 100) / 100;
      const total = subtotal + deliveryFee + serviceFee;

      // UUID format: 8-4-4-4-12 (32 hex chars + 4 dashes = 36 chars)
      const orderUUID = `d${String(i).padStart(7, '0')}-0000-0000-0000-${String(i).padStart(12, '0')}`;
      orderInserts.push(`('${orderUUID}', 'ORD-${new Date(Date.now() - daysAgo * 86400000).toISOString().slice(0, 10).replace(/-/g, '')}-${padded}', '${customerId}', ARRAY['${restaurantId}']::uuid[], '${status}', '${address}'::jsonb, ${subtotal}, ${deliveryFee}, ${serviceFee}, ${total}, '${paymentStatus}', NOW() - INTERVAL '${daysAgo} days', NOW() - INTERVAL '${daysAgo} days')`);
    }
    await pool.query(`INSERT INTO orders (id, order_number, customer_id, restaurants, status, delivery_address, subtotal, delivery_fee, service_fee, total_amount, payment_status, created_at, updated_at) VALUES ${orderInserts.join(',')}`);
    console.log('Inserted 500 orders');

    // Insert order items (1-3 per order)
    const orderItemInserts: string[] = [];
    for (let i = 1; i <= 500; i++) {
      const orderUUID = `d${String(i).padStart(7, '0')}-0000-0000-0000-${String(i).padStart(12, '0')}`;
      const itemCount = 1 + Math.floor(Math.random() * 3);
      const restaurantIdx = Math.floor(Math.random() * 5);
      const restaurantId = restaurantIds[restaurantIdx];
      const restaurantMenuItems = menuItems.filter(m => m.rid === restaurantId);

      for (let j = 0; j < itemCount; j++) {
        const menuItem = restaurantMenuItems[Math.floor(Math.random() * restaurantMenuItems.length)];
        const quantity = 1 + Math.floor(Math.random() * 2);
        orderItemInserts.push(`('${orderUUID}', '${menuItem.id}', '${restaurantId}', ${quantity}, ${menuItem.price}, ${menuItem.price * quantity}, '{"calories": 450, "protein": 35, "carbohydrates": 45, "fat": 18}'::jsonb)`);
      }
    }
    // Insert in batches
    const batchSize = 200;
    for (let i = 0; i < orderItemInserts.length; i += batchSize) {
      const batch = orderItemInserts.slice(i, i + batchSize);
      await pool.query(`INSERT INTO order_items (order_id, menu_item_id, restaurant_id, quantity, base_price, item_total, nutritional_summary) VALUES ${batch.join(',')}`);
    }
    console.log(`Inserted ${orderItemInserts.length} order items`);

    // Insert invoices
    const invoiceInserts = [];
    for (let i = 1; i <= 200; i++) {
      const padded = String(i).padStart(4, '0');
      const invoiceUUID = `f${String(i).padStart(7, '0')}-0000-0000-0000-${String(i).padStart(12, '0')}`;
      const restaurantId = restaurantIds[Math.floor(Math.random() * 5)];
      const monthsAgo = Math.floor(Math.random() * 12);
      const grossAmount = 5000 + Math.floor(Math.random() * 25000);
      const commissionAmount = Math.round(grossAmount * 0.15 * 100) / 100;
      const netAmount = grossAmount - commissionAmount;
      const status = ['pending', 'paid', 'paid', 'paid', 'paid'][Math.floor(Math.random() * 5)];

      invoiceInserts.push(`('${invoiceUUID}', 'INV-${new Date(Date.now() - monthsAgo * 30 * 86400000).toISOString().slice(0, 7).replace('-', '')}-${padded}', 'restaurant_payout', '${restaurantId}', (NOW() - INTERVAL '${monthsAgo} months')::date, (NOW() - INTERVAL '${monthsAgo - 1} months')::date, ${50 + Math.floor(Math.random() * 200)}, ${grossAmount}, ${commissionAmount}, ${netAmount}, '${status}', NOW() - INTERVAL '${monthsAgo} months')`);
    }
    await pool.query(`INSERT INTO invoices (id, invoice_number, type, entity_id, period_start, period_end, total_orders, gross_amount, commission_amount, net_amount, status, created_at) VALUES ${invoiceInserts.join(',')}`);
    console.log('Inserted 200 invoices');

    // Get final counts
    const counts = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM users) as users,
        (SELECT COUNT(*) FROM restaurants) as restaurants,
        (SELECT COUNT(*) FROM menu_items) as menu_items,
        (SELECT COUNT(*) FROM nutritional_info) as nutritional_info,
        (SELECT COUNT(*) FROM orders) as orders,
        (SELECT COUNT(*) FROM order_items) as order_items,
        (SELECT COUNT(*) FROM invoices) as invoices
    `);

    console.log('Seed completed!', counts.rows[0]);

    res.json({
      success: true,
      message: 'Database seeded successfully!',
      counts: counts.rows[0],
      credentials: {
        admin: 'admin@cuts.ae / password123',
        owner: 'owner@cuts.ae / password123',
        customers: 'customer1@cuts.ae through customer50@cuts.ae / password123'
      }
    });
  } catch (error) {
    console.error('Seed error:', error);
    res.status(500).json({ error: 'Seed failed', details: String(error) });
  }
});

// Restore endpoint - accepts SQL dump and executes it
router.post('/restore', async (req: Request, res: Response) => {
  const { secret, sql } = req.body;

  if (secret !== SEED_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!sql || typeof sql !== 'string') {
    return res.status(400).json({ error: 'SQL dump required' });
  }

  const client = await pool.connect();
  try {
    console.log(`Executing SQL restore (${sql.length} bytes)...`);

    // Split SQL into statements and execute each
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('SELECT pg_catalog'));

    // Run truncates first without transaction
    const truncates = statements.filter(s => s.toUpperCase().startsWith('TRUNCATE'));
    const inserts = statements.filter(s => !s.toUpperCase().startsWith('TRUNCATE') && !s.toUpperCase().startsWith('SET'));

    // Execute truncates
    for (const stmt of truncates) {
      try {
        await client.query(stmt);
      } catch (e: any) {
        console.log(`Truncate warning: ${e.message}`);
      }
    }

    // Execute inserts in batches
    await client.query('BEGIN');
    let executed = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const stmt of inserts) {
      try {
        await client.query(stmt);
        executed++;
      } catch (stmtError: any) {
        failed++;
        if (errors.length < 5) {
          errors.push(`${stmt.substring(0, 80)}: ${stmtError.message}`);
        }
        // Rollback and restart transaction on error
        await client.query('ROLLBACK');
        await client.query('BEGIN');
      }
    }

    await client.query('COMMIT');

    // Get counts
    const counts = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM users) as users,
        (SELECT COUNT(*) FROM restaurants) as restaurants,
        (SELECT COUNT(*) FROM menu_items) as menu_items,
        (SELECT COUNT(*) FROM orders) as orders,
        (SELECT COUNT(*) FROM invoices) as invoices
    `);

    console.log(`Restore completed: ${executed} succeeded, ${failed} failed`);
    res.json({
      success: true,
      message: 'Database restored successfully!',
      executed,
      failed,
      total: inserts.length,
      counts: counts.rows[0],
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Restore error:', error);
    res.status(500).json({ error: 'Restore failed', details: String(error) });
  } finally {
    client.release();
  }
});

export default router;
