# Supabase to Google Cloud PostgreSQL Migration Guide

## What Changed

All Supabase references have been removed. The API now uses direct PostgreSQL connections.

## Files Updated

1. `src/config/database.ts` - Now uses pg Pool instead of Supabase client
2. `src/controllers/auth.controller.ts` - Raw SQL queries
3. `src/controllers/restaurant.controller.ts` - Raw SQL queries
4. `src/controllers/menu.controller.ts` - Raw SQL queries
5. `src/controllers/order.controller.ts` - Raw SQL queries with performance optimizations
6. `package.json` - Removed @supabase/supabase-js, added pg
7. `.env.example` - New PostgreSQL environment variables

## Setup Google Cloud PostgreSQL

### 1. Create PostgreSQL Instance

```bash
gcloud sql instances create cuts-ae-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1
```

### 2. Set Root Password

```bash
gcloud sql users set-password postgres \
  --instance=cuts-ae-db \
  --password=YOUR_SECURE_PASSWORD
```

### 3. Create Database

```bash
gcloud sql databases create cuts_ae --instance=cuts-ae-db
```

### 4. Allow VM Access

```bash
# Get your VM's external IP
VM_IP=$(gcloud compute instances describe your-vm-name --zone=us-central1-a --format='get(networkInterfaces[0].accessConfigs[0].natIP)')

# Add authorized network
gcloud sql instances patch cuts-ae-db \
  --authorized-networks=$VM_IP
```

### 5. Get Connection Info

```bash
gcloud sql instances describe cuts-ae-db --format="value(ipAddresses[0].ipAddress)"
```

### 6. Run Schema

Connect to your database and run:
```bash
psql -h YOUR_DB_IP -U postgres -d cuts_ae < database/schema.sql
psql -h YOUR_DB_IP -U postgres -d cuts_ae < database/seed.sql
```

Or use Cloud SQL Proxy:
```bash
# Download proxy
curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.linux.amd64
chmod +x cloud-sql-proxy

# Start proxy
./cloud-sql-proxy --port 5432 YOUR_PROJECT:us-central1:cuts-ae-db

# In another terminal
psql -h 127.0.0.1 -U postgres -d cuts_ae < database/schema.sql
psql -h 127.0.0.1 -U postgres -d cuts_ae < database/seed.sql
```

## Update Environment Variables

Edit your `.env` file:

```bash
DB_HOST=YOUR_CLOUD_SQL_IP
DB_PORT=5432
DB_NAME=cuts_ae
DB_USER=postgres
DB_PASSWORD=YOUR_SECURE_PASSWORD
JWT_SECRET=baqir-osaed-ayush-arryan
PORT=45000
NODE_ENV=production
FRONTEND_URL=https://yourdomain.com
```

## Deploy

```bash
cd ~/cuts-api
git pull
cd api
npm install
npm run build
pm2 restart cuts-api
```

## Pricing Estimate

- Cloud SQL db-f1-micro: ~$15/month
- Compute Engine e2-small: ~$13/month
- Total: ~$28/month

## Alternative: Local PostgreSQL on VM

To save money, run PostgreSQL on the same VM:

```bash
sudo apt-get install postgresql postgresql-contrib
sudo -u postgres psql
CREATE DATABASE cuts_ae;
CREATE USER cuts_user WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE cuts_ae TO cuts_user;
\q

# Update .env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cuts_ae
DB_USER=cuts_user
DB_PASSWORD=your_password
```

Then run schema:
```bash
sudo -u postgres psql cuts_ae < database/schema.sql
sudo -u postgres psql cuts_ae < database/seed.sql
```

Cost: $0 (just VM costs)
