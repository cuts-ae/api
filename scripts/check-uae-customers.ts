import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'cuts_ae',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

async function checkUAECustomers() {
  const client = await pool.connect();

  try {
    const result = await client.query(`
      SELECT COUNT(*) as count
      FROM users
      WHERE email LIKE '%@cuts.ae'
    `);

    const count = parseInt(result.rows[0].count);

    console.log(`\nUAE Customers (@cuts.ae emails): ${count}`);

    if (count > 0) {
      const samples = await client.query(`
        SELECT email, first_name, last_name, created_at
        FROM users
        WHERE email LIKE '%@cuts.ae'
        ORDER BY created_at DESC
        LIMIT 5
      `);

      console.log('\nSample UAE Customers:');
      console.log('---------------------');
      samples.rows.forEach(row => {
        console.log(`${row.email} - ${row.first_name} ${row.last_name}`);
      });
    } else {
      console.log('No UAE customers found. Seed data needs to be loaded.\n');
    }

  } finally {
    client.release();
    await pool.end();
  }
}

checkUAECustomers().catch(console.error);
