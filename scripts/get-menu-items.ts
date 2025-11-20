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

async function getMenuItems() {
  const client = await pool.connect();

  try {
    const items = await client.query(`
      SELECT id, restaurant_id, name, base_price
      FROM menu_items
      WHERE restaurant_id IN ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')
      ORDER BY restaurant_id, name
    `);

    console.log('\nMenu Items:');
    items.rows.forEach(item => {
      console.log(`{ id: '${item.id}', price: ${item.base_price} }, // ${item.name}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

getMenuItems();
