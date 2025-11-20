import { readFileSync } from 'fs';
import { join } from 'path';
import pool from '../src/config/database';

async function runMigration(filename: string) {
  try {
    const sql = readFileSync(join(__dirname, 'migrations', filename), 'utf8');
    await pool.query(sql);
    console.log(`✓ Migration ${filename} completed successfully`);
  } catch (error) {
    console.error(`✗ Migration ${filename} failed:`, error);
    throw error;
  }
}

async function main() {
  const migrationFile = process.argv[2];

  if (!migrationFile) {
    console.error('Usage: ts-node database/run-migration.ts <migration-file>');
    process.exit(1);
  }

  try {
    await runMigration(migrationFile);
    await pool.end();
    process.exit(0);
  } catch (error) {
    await pool.end();
    process.exit(1);
  }
}

main();
