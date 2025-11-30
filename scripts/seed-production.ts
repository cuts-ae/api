import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables - try production first, then local
const envPath = process.env.NODE_ENV === 'production'
  ? path.join(__dirname, '../../.env.production')
  : path.join(__dirname, '../../.env');

dotenv.config({ path: envPath });

// Allow override via command line args
const DB_HOST = process.argv[2] || process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.argv[3] || process.env.DB_PORT || '5432');
const DB_NAME = process.argv[4] || process.env.DB_NAME || 'cuts';
const DB_USER = process.argv[5] || process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.argv[6] || process.env.DB_PASSWORD || 'postgres';

async function seedProduction() {
  console.log('Connecting to database...');
  console.log(`Host: ${DB_HOST}, Port: ${DB_PORT}, Database: ${DB_NAME}, User: ${DB_USER}`);

  const client = new Client({
    host: DB_HOST,
    port: DB_PORT,
    database: DB_NAME,
    user: DB_USER,
    password: DB_PASSWORD,
    ssl: DB_HOST !== 'localhost' ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();
    console.log('Connected to database!');

    // Read the SQL file
    const sqlPath = path.join(__dirname, '../database/seed-massive.sql');
    console.log(`Reading SQL from: ${sqlPath}`);

    const sql = fs.readFileSync(sqlPath, 'utf-8');
    console.log(`SQL file loaded (${sql.length} bytes)`);

    // Execute the SQL
    console.log('Executing seed script...');
    await client.query(sql);

    console.log('Seed completed successfully!');

    // Show counts
    const counts = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM users) as users,
        (SELECT COUNT(*) FROM restaurants) as restaurants,
        (SELECT COUNT(*) FROM menu_items) as menu_items,
        (SELECT COUNT(*) FROM orders) as orders,
        (SELECT COUNT(*) FROM invoices) as invoices
    `);

    console.log('Data counts:', counts.rows[0]);

  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  } finally {
    await client.end();
    console.log('Database connection closed.');
  }
}

seedProduction()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });
