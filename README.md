# Cuts.ae API

Node.js + Express API with PostgreSQL backend for multi-restaurant food delivery platform.

## Tech Stack

- Node.js 20 + TypeScript
- Express.js
- PostgreSQL
- JWT Authentication
- PM2 (Process Manager)
- Nginx (Reverse Proxy)

## Quick Start

### Local Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up PostgreSQL** and create `.env`:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=cuts_ae
   DB_USER=postgres
   DB_PASSWORD=your_password
   JWT_SECRET=your_secret_key
   PORT=45000
   NODE_ENV=development
   FRONTEND_URL=http://localhost:45001
   ```

3. **Run database migrations**:
   ```bash
   psql -h localhost -U postgres -d cuts_ae < database/schema.sql
   psql -h localhost -U postgres -d cuts_ae < database/seed.sql
   ```

4. **Start dev server**:
   ```bash
   npm run dev
   ```

API runs at `http://localhost:45000`

## Production Deployment (Google Cloud)

### Deployed at: `http://34.130.93.201`

### Manual Deploy
```bash
ssh sour@34.130.93.201
cd ~/cuts-api
git pull
npm install
npm run build
pm2 restart cuts-api
```

### GitHub Actions CI/CD

Auto-deploys on push to main.

## Demo Credentials

```
Restaurant Owner: owner1@example.com / password123
Customer: customer1@example.com / password123
Admin: admin@example.com / password123
```

## API Endpoints

Base URL: `http://34.130.93.201/api/v1`

- `POST /auth/login` - Login
- `POST /auth/register` - Register
- `GET /restaurants` - List restaurants
- `GET /restaurants/:id/menu-items` - Get menu
- `POST /orders` - Create order
- `GET /orders` - List orders

Full API docs: See `MIGRATION_GUIDE.md` for setup details.
