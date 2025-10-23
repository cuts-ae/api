# api

Node.js + Express API with Supabase backend.

## Features

- Multi-Restaurant Support: One owner can manage multiple restaurants
- Complete Nutrition Tracking: Every menu item includes detailed nutritional information
- Health-Focused: Personalized meal recommendations based on user fitness goals
- JWT Authentication: Secure authentication with Supabase
- Role-Based Access Control: Customer, Restaurant Owner, Driver, Admin, Support roles
- Order Management: Complete order lifecycle from creation to delivery
- Input Validation: Comprehensive validation using Zod
- Error Handling: Centralized error handling middleware
- TypeScript: Fully typed codebase

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL via Supabase
- **Authentication**: JWT with Supabase Auth
- **Validation**: Zod
- **Password Hashing**: bcrypt

## Prerequisites

- Node.js 18+ installed
- Supabase account and project
- npm or yarn package manager

## Installation

1. **Clone the repository**:
   ```bash
   cd /Users/sour/Projects/cuts.ae/api
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:

   Create a `.env` file in the root directory:
   ```
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_KEY=your_supabase_service_role_key
   JWT_SECRET=your_random_secret_key_here
   PORT=45000
   NODE_ENV=development
   FRONTEND_URL=http://localhost:45001
   ```

4. **Set up the database**:

   a. Open your Supabase dashboard

   b. Navigate to SQL Editor

   c. Run the schema file:
      - Copy the contents of `database/schema.sql`
      - Paste into SQL Editor
      - Click "Run"

   d. Run the seed file (optional, for demo data):
      - Copy the contents of `database/seed.sql`
      - Paste into SQL Editor
      - Click "Run"

5. **Start the development server**:
   ```bash
   npm run dev
   ```

The API will be running at `http://localhost:3000`

## API Endpoints

### Base URL
```
http://localhost:3000/api/v1
```

### Authentication

#### Register a new user
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+971501234567",
  "role": "restaurant_owner"
}
```

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

#### Get current user
```http
GET /auth/me
Authorization: Bearer YOUR_JWT_TOKEN
```

### Restaurants

#### Get all restaurants
```http
GET /restaurants
```

#### Get my restaurants (owner only)
```http
GET /restaurants/my/restaurants
Authorization: Bearer YOUR_JWT_TOKEN
```

#### Create a restaurant
```http
POST /restaurants
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "name": "My Healthy Restaurant",
  "description": "Fresh, healthy meals",
  "cuisine_type": ["Healthy", "Mediterranean"],
  "address": {
    "street": "123 Main St",
    "city": "Abu Dhabi",
    "state": "Abu Dhabi",
    "postal_code": "12345",
    "country": "UAE"
  },
  "phone": "+971501234567",
  "email": "contact@restaurant.com",
  "operating_hours": {
    "monday": {"open": "08:00", "close": "22:00"},
    "tuesday": {"open": "08:00", "close": "22:00"}
  }
}
```

#### Update a restaurant
```http
PUT /restaurants/:id
Authorization: Bearer YOUR_JWT_TOKEN
```

#### Get restaurant analytics
```http
GET /restaurants/:id/analytics
Authorization: Bearer YOUR_JWT_TOKEN
```

### Menu Items

#### Get menu items for a restaurant
```http
GET /restaurants/:restaurantId/menu-items
```

#### Create a menu item
```http
POST /restaurants/:restaurantId/menu-items
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "name": "Grilled Chicken Salad",
  "description": "Fresh salad with grilled chicken",
  "base_price": 45.00,
  "category": "lunch",
  "is_available": true,
  "prep_time": 15
}
```

#### Update a menu item
```http
PUT /menu-items/:id
Authorization: Bearer YOUR_JWT_TOKEN
```

#### Delete a menu item
```http
DELETE /menu-items/:id
Authorization: Bearer YOUR_JWT_TOKEN
```

#### Toggle menu item availability
```http
PATCH /menu-items/:id/availability
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "is_available": false
}
```

#### Add/Update nutritional information
```http
POST /menu-items/:id/nutrition
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "serving_size": "1 plate (350g)",
  "calories": 450,
  "protein": 42,
  "carbohydrates": 28,
  "fat": 18,
  "fiber": 6,
  "sugar": 4,
  "sodium": 680,
  "allergens": ["dairy", "gluten"]
}
```

### Orders

#### Create an order
```http
POST /orders
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "items": [
    {
      "menu_item_id": "uuid",
      "restaurant_id": "uuid",
      "quantity": 2,
      "special_instructions": "No onions please"
    }
  ],
  "delivery_address": {
    "street": "123 Main St",
    "city": "Abu Dhabi",
    "state": "Abu Dhabi",
    "postal_code": "12345",
    "country": "UAE"
  },
  "delivery_instructions": "Call upon arrival"
}
```

#### Get all orders (filtered by role)
```http
GET /orders
Authorization: Bearer YOUR_JWT_TOKEN
```

#### Get order by ID
```http
GET /orders/:id
Authorization: Bearer YOUR_JWT_TOKEN
```

#### Update order status
```http
PATCH /orders/:id/status
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "status": "preparing"
}
```

#### Cancel an order
```http
POST /orders/:id/cancel
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "reason": "Customer requested cancellation"
}
```

## User Roles

- **customer**: Can browse, order, and track deliveries
- **restaurant_owner**: Can manage restaurants, menus, and orders
- **driver**: Can accept and complete deliveries (to be implemented)
- **admin**: Full platform access
- **support**: Customer support access (to be implemented)

## Demo Credentials (if seed data is loaded)

```
Restaurant Owner:
Email: owner1@example.com
Password: password123

Customer:
Email: customer1@example.com
Password: password123

Admin:
Email: admin@example.com
Password: password123
```

## Nutrition Calculation

The API includes comprehensive nutrition calculation utilities:

- **BMR Calculation**: Mifflin-St Jeor Equation
- **TDEE Calculation**: Based on activity level
- **Goal Adjustments**: Weight loss, maintenance, bulking, muscle gain
- **Macro Distribution**: Customized protein, carbs, and fat targets
- **Meal Recommendations**: Classify meals as RECOMMENDED, CLOSE_MATCH, or NOT_RECOMMENDED

## Project Structure

```
api/
├── src/
│   ├── config/          # Database and configuration
│   ├── controllers/     # Request handlers
│   ├── middleware/      # Authentication, validation, error handling
│   ├── routes/          # API route definitions
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Utility functions (nutrition, etc.)
│   ├── validators/      # Zod validation schemas
│   └── index.ts         # Express app entry point
├── database/
│   ├── schema.sql       # Database schema
│   └── seed.sql         # Seed data
├── package.json
├── tsconfig.json
└── .env
```

## Development

```bash
# Run in development mode with auto-reload
npm run dev

# Build for production
npm run build

# Run production build
npm start
```

## Error Handling

The API uses centralized error handling with custom `AppError` class:

```typescript
throw new AppError('Resource not found', 404);
```

All validation errors are automatically caught and formatted.

## Security Features

- JWT-based authentication
- Password hashing with bcrypt (10 rounds)
- Role-based access control (RBAC)
- Input validation on all endpoints
- Supabase Row Level Security (RLS)

## Next Steps

- Database schema created
- Authentication system implemented
- Restaurant management endpoints
- Menu management with nutrition
- Order management system
- Payment integration (Stripe) - pending
- Driver management system - pending
- Real-time notifications (WebSocket) - pending
- Analytics and reporting - pending
- Support ticket system - pending

## License

Proprietary - All rights reserved
