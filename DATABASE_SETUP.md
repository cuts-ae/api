# Database Setup Instructions

## 🎯 What You Need To Do

You have **TWO SQL files** that need to be run in your Supabase dashboard:

1. `database/schema.sql` - Creates all tables, indexes, and structure
2. `database/seed.sql` - Loads demo data for testing

## 📋 Step-by-Step Instructions

### Step 1: Open Supabase SQL Editor

1. Go to: https://supabase.com/dashboard/project/rqrzcxwcgcyzewnkxfgd
2. Click on **SQL Editor** in the left sidebar
3. You should see a blank SQL editor

### Step 2: Run the Schema File

1. Open the file: `/Users/sour/Projects/cuts.ae/api/database/schema.sql`
2. **Select all** text (Cmd+A or Ctrl+A)
3. **Copy** (Cmd+C or Ctrl+C)
4. Go back to Supabase SQL Editor
5. **Paste** into the editor
6. Click **RUN** (bottom right) or press Cmd/Ctrl + Enter

**Wait for it to complete** - you should see:
```
Database schema created successfully!
```

### Step 3: Run the Seed File (Demo Data)

1. **Clear** the SQL editor (delete all text)
2. Open the file: `/Users/sour/Projects/cuts.ae/api/database/seed.sql`
3. **Select all** text
4. **Copy**
5. **Paste** into Supabase SQL Editor
6. Click **RUN**

**Wait for completion** - you should see:
```
Seed data inserted successfully!
Login credentials for testing:
Restaurant Owner: owner1@example.com / password123
Customer: customer1@example.com / password123
Admin: admin@example.com / password123
```

### Step 4: Verify It Worked

1. In Supabase, click **Table Editor** (left sidebar)
2. You should see 15+ tables:
   - users
   - restaurants
   - menu_items
   - nutritional_info
   - orders
   - order_items
   - customer_profiles
   - drivers
   - support_tickets
   - support_messages
   - invoices
   - item_variants

3. Click on `users` table
4. You should see **5 users** (if you ran seed.sql)

5. Click on `restaurants` table
6. You should see **3 restaurants**

7. Click on `menu_items` table
8. You should see **15+ menu items**

## ✅ Success!

Your database is now fully set up and ready to use with the API!

## 🎯 What Was Created

### Tables (15+)
- `users` - All user accounts (customers, owners, drivers, admin)
- `customer_profiles` - Health & fitness data for customers
- `restaurants` - Restaurant information
- `menu_items` - Food items with prices
- `nutritional_info` - Complete nutrition data for each item
- `item_variants` - Size/addon options
- `orders` - Customer orders
- `order_items` - Items in each order
- `drivers` - Delivery driver info
- `support_tickets` - Customer support tickets
- `support_messages` - Support chat messages
- `invoices` - Payment/payout tracking

### Demo Data (if you ran seed.sql)
- **5 Users**:
  - 2 Restaurant Owners (can manage restaurants)
  - 2 Customers (can place orders)
  - 1 Admin (full access)

- **3 Restaurants**:
  - Healthy Bites Abu Dhabi
  - Protein Palace
  - Green Garden Cafe

- **15+ Menu Items** with complete nutrition info
- **2 Sample Orders** in different statuses

## 🚨 Important Notes

1. **Run schema.sql FIRST**, then seed.sql
2. If you get errors, make sure you copied the **entire** file
3. The schema file is ~300 lines, seed file is ~200 lines
4. If a table already exists, the schema will DROP and recreate it
5. All passwords in demo data are hashed as: `password123`

## 🔧 Troubleshooting

### "Table already exists" Error
This is OK! The schema file drops tables before creating them.

### "Permission denied" Error
Make sure you're using the **Service Role Key** in your connection.

### "Syntax error"
Make sure you copied the ENTIRE file, including the final line.

### Nothing happens after clicking RUN
Check the bottom of the SQL Editor for error messages.

## 🎉 Next Steps

After your database is set up:

1. Start the API server:
   ```bash
   cd /Users/sour/Projects/cuts.ae/api
   npm run dev
   ```

2. Test with demo account:
   ```bash
   curl -X POST http://localhost:3000/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"owner1@example.com","password":"password123"}'
   ```

3. See `QUICK_START.md` for more examples!

---

**Questions?** Check README.md for full documentation.

**Happy building!** 🚀
