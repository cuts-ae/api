import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function checkDatabase() {
  const client = await pool.connect();

  try {
    const restaurants = await client.query('SELECT id, name FROM restaurants LIMIT 5');
    console.log('\nRestaurants:');
    console.log(restaurants.rows);

    const menuItems = await client.query('SELECT id, restaurant_id, name FROM menu_items LIMIT 10');
    console.log('\nMenu Items:');
    console.log(menuItems.rows);

    const users = await client.query('SELECT id, email, role FROM users LIMIT 5');
    console.log('\nUsers:');
    console.log(users.rows);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkDatabase();
