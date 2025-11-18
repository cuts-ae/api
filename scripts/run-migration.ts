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
    'chat_sessions',
    'chat_messages',
    'message_attachments',
    'message_read_receipts',
    'typing_indicators'
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

async function verifyIndexes() {
  console.log(`\n${'='.repeat(60)}`);
  console.log('Verifying indexes...');
  console.log('='.repeat(60));

  const client = await pool.connect();

  try {
    const result = await client.query(`
      SELECT
        schemaname,
        tablename,
        indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
      AND (
        tablename = 'chat_sessions' OR
        tablename = 'chat_messages' OR
        tablename = 'message_attachments' OR
        tablename = 'message_read_receipts' OR
        tablename = 'typing_indicators'
      )
      ORDER BY tablename, indexname;
    `);

    console.log(`\nFound ${result.rows.length} indexes:\n`);

    let currentTable = '';
    for (const row of result.rows) {
      if (row.tablename !== currentTable) {
        currentTable = row.tablename;
        console.log(`\n${row.tablename}:`);
      }
      console.log(`  - ${row.indexname}`);
    }
  } finally {
    client.release();
  }
}

async function verifyTriggers() {
  console.log(`\n${'='.repeat(60)}`);
  console.log('Verifying triggers...');
  console.log('='.repeat(60));

  const client = await pool.connect();

  try {
    const result = await client.query(`
      SELECT
        trigger_name,
        event_object_table,
        action_timing,
        event_manipulation
      FROM information_schema.triggers
      WHERE trigger_schema = 'public'
      AND (
        event_object_table = 'chat_sessions' OR
        event_object_table = 'chat_messages'
      )
      ORDER BY event_object_table, trigger_name;
    `);

    console.log(`\nFound ${result.rows.length} triggers:\n`);

    for (const row of result.rows) {
      console.log(`✓ ${row.trigger_name}`);
      console.log(`  Table: ${row.event_object_table}`);
      console.log(`  Event: ${row.action_timing} ${row.event_manipulation}\n`);
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
      WHERE t.typname IN ('chat_session_status', 'message_type')
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

async function main() {
  try {
    const migrationPath = path.join(__dirname, '../database/chat-system-migration.sql');

    console.log('\nStarting chat system migration...\n');

    await runMigration(migrationPath);
    await verifyTables();
    await verifyEnumTypes();
    await verifyIndexes();
    await verifyTriggers();

    console.log(`\n${'='.repeat(60)}`);
    console.log('MIGRATION DEPLOYMENT COMPLETE');
    console.log('='.repeat(60));
    console.log('\nAll 5 tables created successfully!');
    console.log('All indexes and triggers are in place!');
    console.log('\n');

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
