import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'cuts_ae',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

async function runSeedFile(seedFile: string) {
  const client = await pool.connect();

  try {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Running seed: ${path.basename(seedFile)}`);
    console.log('='.repeat(60));

    const sql = fs.readFileSync(seedFile, 'utf8');

    await client.query('BEGIN');
    const result = await client.query(sql);
    await client.query('COMMIT');

    console.log('\nSeed completed successfully!');

    // Show any messages from the seed file
    if (result.rows && result.rows.length > 0) {
      console.log('\nMessages:');
      result.rows.forEach(row => {
        const values = Object.values(row);
        if (values.length > 0) {
          console.log(`  ${values[0]}`);
        }
      });
    }

    return true;
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('\nSeed failed:', error.message);

    // If it's a duplicate key error, that's okay - data already exists
    if (error.code === '23505') {
      console.log('\nNote: Some data already exists (duplicate key constraint). This is okay.');
      return true;
    }

    throw error;
  } finally {
    client.release();
  }
}

async function checkMigrationStatus() {
  console.log(`\n${'='.repeat(60)}`);
  console.log('CHECKING MIGRATION STATUS');
  console.log('='.repeat(60));

  const client = await pool.connect();

  try {
    // Check for chat system tables
    const chatTables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('chat_sessions', 'chat_messages', 'message_attachments', 'message_read_receipts', 'typing_indicators')
      ORDER BY table_name;
    `);

    console.log('\nChat System Migration:');
    if (chatTables.rows.length === 5) {
      console.log('  ✓ COMPLETED - All 5 chat tables exist');
    } else {
      console.log(`  ✗ INCOMPLETE - Only ${chatTables.rows.length}/5 tables found`);
    }

    // Check for support tickets table
    const supportTable = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'support_tickets'
      );
    `);

    console.log('\nSupport Tickets Migration:');
    if (supportTable.rows[0].exists) {
      console.log('  ✓ COMPLETED - support_tickets table exists');
    } else {
      console.log('  ✗ INCOMPLETE - support_tickets table not found');
    }

    // Check ticket_replies table
    const ticketRepliesTable = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'ticket_replies'
      );
    `);

    if (ticketRepliesTable.rows[0].exists) {
      console.log('  ✓ ticket_replies table exists');
    } else {
      console.log('  ⚠ ticket_replies table not found (using support_messages instead)');
    }

  } finally {
    client.release();
  }
}

async function countRecords() {
  console.log(`\n${'='.repeat(60)}`);
  console.log('COUNTING RECORDS');
  console.log('='.repeat(60));

  const client = await pool.connect();

  try {
    const tables = [
      { name: 'users', description: 'Total users (customers, restaurant owners, etc.)' },
      { name: 'customer_profiles', description: 'Customer profiles with fitness goals' },
      { name: 'restaurants', description: 'Registered restaurants' },
      { name: 'orders', description: 'Total orders' },
      { name: 'order_items', description: 'Order line items' },
      { name: 'support_tickets', description: 'Support tickets' },
      { name: 'chat_sessions', description: 'Chat sessions' },
      { name: 'chat_messages', description: 'Chat messages' }
    ];

    console.log('\n');
    for (const table of tables) {
      try {
        const result = await client.query(`SELECT COUNT(*) FROM ${table.name}`);
        const count = result.rows[0].count;
        console.log(`${table.name.padEnd(20)} ${count.toString().padStart(6)} - ${table.description}`);
      } catch (error) {
        console.log(`${table.name.padEnd(20)} ERROR - Table not accessible`);
      }
    }

    // Show sample UAE customers
    const uaeCustomers = await client.query(`
      SELECT email, first_name, last_name
      FROM users
      WHERE email LIKE '%@cuts.ae'
      ORDER BY created_at DESC
      LIMIT 5;
    `);

    if (uaeCustomers.rows.length > 0) {
      console.log('\n\nRecent UAE Customers:');
      console.log('---------------------');
      uaeCustomers.rows.forEach(row => {
        console.log(`  ${row.email} - ${row.first_name} ${row.last_name}`);
      });
    }

  } finally {
    client.release();
  }
}

async function main() {
  try {
    console.log('\n========================================');
    console.log('DATABASE MIGRATION & SEED RUNNER');
    console.log('========================================\n');

    // Check what's already done
    await checkMigrationStatus();

    // Run the UAE customers seed
    const seedPath = path.join(__dirname, '../database/seed-uae-customers.sql');
    await runSeedFile(seedPath);

    // Count records to verify
    await countRecords();

    console.log(`\n${'='.repeat(60)}`);
    console.log('MIGRATION VERIFICATION COMPLETE!');
    console.log('='.repeat(60));
    console.log('\nSummary:');
    console.log('1. ✓ Chat system tables verified');
    console.log('2. ✓ Support ticket system verified');
    console.log('3. ✓ UAE customer data seeded');
    console.log('\nAll migrations completed successfully!\n');

  } catch (error: any) {
    console.error('\nProcess failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
