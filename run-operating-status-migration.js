const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function runMigration() {
  try {
    console.log('Running operating_status migration...');

    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'database/migrations/add_operating_status.sql'),
      'utf8'
    );

    await pool.query(migrationSQL);
    console.log('Migration completed successfully!');

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

runMigration();
