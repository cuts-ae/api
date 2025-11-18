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

async function checkDatabaseState() {
  const client = await pool.connect();

  try {
    console.log('\n========================================');
    console.log('DATABASE STATE CHECK');
    console.log('========================================\n');

    // Check existing tables
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    console.log('Existing tables:');
    console.log('----------------');
    tablesResult.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    console.log(`\nTotal: ${tablesResult.rows.length} tables\n`);

    // Check if support_tickets exists and its structure
    const supportTicketsCheck = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'support_tickets'
      ORDER BY ordinal_position;
    `);

    if (supportTicketsCheck.rows.length > 0) {
      console.log('support_tickets table structure:');
      console.log('---------------------------------');
      supportTicketsCheck.rows.forEach(row => {
        console.log(`  ${row.column_name}: ${row.data_type}`);
      });
      console.log();
    } else {
      console.log('support_tickets table: NOT FOUND\n');
    }

    // Check ENUM types
    const enumsResult = await client.query(`
      SELECT DISTINCT typname
      FROM pg_type t
      WHERE EXISTS (
        SELECT 1 FROM pg_enum e WHERE e.enumtypid = t.oid
      )
      ORDER BY typname;
    `);

    console.log('Existing ENUM types:');
    console.log('--------------------');
    enumsResult.rows.forEach(row => {
      console.log(`  - ${row.typname}`);
    });
    console.log();

  } finally {
    client.release();
    await pool.end();
  }
}

checkDatabaseState().catch(console.error);
