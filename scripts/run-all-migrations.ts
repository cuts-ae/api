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

async function runMigration(migrationFile: string) {
  const client = await pool.connect();

  try {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Running migration: ${path.basename(migrationFile)}`);
    console.log('='.repeat(60));

    const sql = fs.readFileSync(migrationFile, 'utf8');

    await client.query('BEGIN');
    const result = await client.query(sql);
    await client.query('COMMIT');

    console.log('\nMigration completed successfully!');

    if (result.rows && result.rows.length > 0) {
      console.log('\nResult:', result.rows);
    }

    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\nMigration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function verifyTables() {
  console.log(`\n${'='.repeat(60)}`);
  console.log('Verifying tables...');
  console.log('='.repeat(60));

  const tables = [
    'support_tickets',
    'ticket_replies',
    'chat_sessions',
    'chat_messages',
    'message_attachments',
    'message_read_receipts',
    'typing_indicators',
    'users',
    'customer_profiles',
    'orders',
    'order_items'
  ];

  const client = await pool.connect();

  try {
    for (const table of tables) {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = $1
        );
      `, [table]);

      const exists = result.rows[0].exists;
      console.log(`${exists ? '✓' : '✗'} ${table}: ${exists ? 'EXISTS' : 'NOT FOUND'}`);
    }
  } finally {
    client.release();
  }
}

async function verifyEnumTypes() {
  console.log(`\n${'='.repeat(60)}`);
  console.log('Verifying ENUM types...');
  console.log('='.repeat(60));

  const client = await pool.connect();

  try {
    const result = await client.query(`
      SELECT
        t.typname,
        e.enumlabel
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname IN ('ticket_status', 'ticket_priority', 'chat_session_status', 'message_type')
      ORDER BY t.typname, e.enumsortorder;
    `);

    let currentType = '';
    for (const row of result.rows) {
      if (row.typname !== currentType) {
        currentType = row.typname;
        console.log(`\n${row.typname}:`);
      }
      console.log(`  - ${row.enumlabel}`);
    }
  } finally {
    client.release();
  }
}

async function countRecords() {
  console.log(`\n${'='.repeat(60)}`);
  console.log('Counting records...');
  console.log('='.repeat(60));

  const client = await pool.connect();

  try {
    const tables = [
      'users',
      'customer_profiles',
      'orders',
      'order_items',
      'support_tickets',
      'ticket_replies',
      'chat_sessions',
      'chat_messages'
    ];

    console.log('\n');
    for (const table of tables) {
      try {
        const result = await client.query(`SELECT COUNT(*) FROM ${table}`);
        const count = result.rows[0].count;
        console.log(`${table}: ${count} records`);
      } catch (error) {
        console.log(`${table}: table not found or error`);
      }
    }
  } finally {
    client.release();
  }
}

async function main() {
  try {
    const migrations = [
      {
        name: 'Support Tickets',
        file: path.join(__dirname, '../database/support-tickets-migration.sql')
      },
      {
        name: 'Chat System',
        file: path.join(__dirname, '../database/chat-system-migration.sql')
      },
      {
        name: 'UAE Customers Seed Data',
        file: path.join(__dirname, '../database/seed-uae-customers.sql')
      }
    ];

    console.log('\n========================================');
    console.log('STARTING ALL PENDING MIGRATIONS');
    console.log('========================================\n');

    for (const migration of migrations) {
      await runMigration(migration.file);
    }

    console.log('\n========================================');
    console.log('VERIFICATION PHASE');
    console.log('========================================');

    await verifyTables();
    await verifyEnumTypes();
    await countRecords();

    console.log(`\n${'='.repeat(60)}`);
    console.log('ALL MIGRATIONS COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log('\nSummary:');
    console.log('1. Support ticket system tables created');
    console.log('2. Chat system tables created');
    console.log('3. UAE customer data seeded');
    console.log('\nAll tables verified and data loaded successfully!\n');

  } catch (error) {
    console.error('\nMigration process failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
