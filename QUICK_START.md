# Quick Start Guide - UAE Catering Platform API

## 🚀 Get Started in 5 Minutes

### Step 1: Database Setup (2 minutes)

1. Open your Supabase dashboard: https://supabase.com/dashboard/project/rqrzcxwcgcyzewnkxfgd

2. Go to **SQL Editor** (left sidebar)

3. **Run the schema**:
   - Open `database/schema.sql`
   - Copy all contents
   - Paste into SQL Editor
   - Click **Run** or press `Ctrl/Cmd + Enter`

4. **Load demo data** (optional but recommended):
   - Open `database/seed.sql`
   - Copy all contents
   - Paste into SQL Editor
   - Click **Run**

✅ Your database is now ready!

### Step 2: Start the API Server (1 minute)

```bash
# Make sure you're in the api directory
cd /Users/sour/Projects/cuts.ae/api

# Start the development server (already running!)
npm run dev
```

Server should start on: **http://localhost:3000**

### Step 3: Test It Works (2 minutes)

#### Test Health Endpoint
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{"status":"healthy","timestamp":"2025-10-22T..."}
```

#### Test Login with Demo Account
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "owner1@example.com",
    "password": "password123"
  }'
```

Expected response:
```json
{
  "message": "Login successful",
  "user": {
    "id": "...",
    "email": "owner1@example.com",
    "first_name": "Ahmed",
    "last_name": "Al Maktoum",
    "role": "restaurant_owner"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Copy the token** - you'll need it for authenticated requests!

#### Test Getting Restaurants
```bash
curl http://localhost:3000/api/v1/restaurants
```

Should return 3 demo restaurants!

## 🎯 Demo Accounts

```
Restaurant Owner:
Email: owner1@example.com
Password: password123
Has: 2 restaurants

Customer:
Email: customer1@example.com
Password: password123
Has: Health profile setup

Admin:
Email: admin@example.com
Password: password123
Has: Full platform access
```

## 📚 Next Steps

### Test Restaurant Owner Flow

1. **Login as restaurant owner**:
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner1@example.com","password":"password123"}'
```

2. **Get your restaurants** (use token from step 1):
```bash
curl http://localhost:3000/api/v1/restaurants/my/restaurants \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

3. **Get menu items for a restaurant**:
```bash
curl http://localhost:3000/api/v1/restaurants/RESTAURANT_ID/menu-items
```

4. **Add a new menu item**:
```bash
curl -X POST http://localhost:3000/api/v1/restaurants/RESTAURANT_ID/menu-items \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Grilled Chicken Salad",
    "description": "Fresh salad with grilled chicken breast",
    "base_price": 45.00,
    "category": "lunch",
    "is_available": true,
    "prep_time": 15
  }'
```

5. **Add nutrition info** (REQUIRED!):
```bash
curl -X POST http://localhost:3000/api/v1/menu-items/MENU_ITEM_ID/nutrition \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "serving_size": "1 bowl (350g)",
    "calories": 450,
    "protein": 42,
    "carbohydrates": 28,
    "fat": 18,
    "fiber": 6,
    "sugar": 4,
    "sodium": 680,
    "allergens": ["dairy", "gluten"]
  }'
```

### Test Customer Flow

1. **Login as customer**:
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"customer1@example.com","password":"password123"}'
```

2. **Browse restaurants**:
```bash
curl http://localhost:3000/api/v1/restaurants
```

3. **View restaurant menu**:
```bash
curl http://localhost:3000/api/v1/restaurants/RESTAURANT_ID/menu-items
```

4. **Create an order**:
```bash
curl -X POST http://localhost:3000/api/v1/orders \
  -H "Authorization: Bearer YOUR_CUSTOMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "menu_item_id": "MENU_ITEM_ID",
        "restaurant_id": "RESTAURANT_ID",
        "quantity": 2,
        "special_instructions": "Extra dressing on the side"
      }
    ],
    "delivery_address": {
      "street": "123 Corniche Road",
      "city": "Abu Dhabi",
      "state": "Abu Dhabi",
      "postal_code": "12345",
      "country": "UAE"
    },
    "delivery_instructions": "Call upon arrival"
  }'
```

5. **View your orders**:
```bash
curl http://localhost:3000/api/v1/orders \
  -H "Authorization: Bearer YOUR_CUSTOMER_TOKEN"
```

## 🔧 Common Issues

### Port Already in Use
If port 3000 is taken, change it in `.env`:
```env
PORT=3001
```

### Database Connection Error
Check your Supabase credentials in `.env`:
- SUPABASE_URL
- SUPABASE_SERVICE_KEY

### "Unauthorized" Error
Make sure you're including the token in headers:
```
Authorization: Bearer YOUR_TOKEN_HERE
```

### TypeScript Compilation Errors
If you see compilation errors, try:
```bash
npm run build
```

## 📖 Full Documentation

- **README.md** - Complete API documentation
- **PROJECT_SUMMARY.md** - Implementation overview
- **database/schema.sql** - Database structure
- **PDF Document** - Original technical plan

## 🎨 Using with Postman

1. Import the API as a collection
2. Set base URL: `http://localhost:3000/api/v1`
3. Create an environment variable for `token`
4. Login → Copy token → Set in environment
5. Use `{{token}}` in Authorization headers

## ✨ Key Features to Test

1. **Multi-Restaurant Orders**: Order from 2 different restaurants in one order
2. **Nutrition Tracking**: Every menu item has complete nutrition info
3. **Role-Based Access**: Different users see different data
4. **Order Status Flow**: Update orders through the lifecycle
5. **Analytics**: Restaurant owners can see today's stats

## 🚨 Important Notes

1. **Always add nutrition info** to menu items - it's required!
2. **Use proper UUIDs** - copy them from API responses
3. **Include JWT tokens** for authenticated endpoints
4. **Check the role** - make sure you're using the right demo account

---

## 🎉 You're Ready!

The API is fully functional and ready for frontend integration.

**Have fun building!** 🚀

If you need help:
- Check the README.md for detailed endpoint docs
- Look at seed.sql for data structure examples
- Review the technical PDF for business logic

**Happy coding!** 👨‍💻👩‍💻
