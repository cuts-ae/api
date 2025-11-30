import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function seedComplete() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'cuts_ae',
    user: process.env.DB_USER || 'sour',
    password: process.env.DB_PASSWORD || '',
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Read the SQL file
    const sql = fs.readFileSync(
      path.join(__dirname, '../database/seed-complete.sql'),
      'utf-8'
    );

    // Execute the SQL
    await client.query(sql);
    console.log('✅ Complete seed data inserted successfully!');
    console.log('\nTest accounts created:');
    console.log('- Admin: admin@cuts.ae (password: password123)');
    console.log('- Restaurant Owner 1: owner1@cuts.ae (password: password123)');
    console.log('- Restaurant Owner 2: owner2@cuts.ae (password: password123)');
    console.log('- Customer: customer1@cuts.ae (password: password123)');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await client.end();
  }
}

seedComplete()
  .then(() => {
    console.log('\n🎉 Seeding completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  });
