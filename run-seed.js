const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cuts_ae',
  user: 'sour',
  password: ''
});

async function runSeed() {
  const client = await pool.connect();

  try {
    console.log('Reading seed file...');
    const seedSQL = fs.readFileSync(
      path.join(__dirname, 'database', 'seed-complete.sql'),
      'utf8'
    );

    console.log('Executing seed script...\n');
    const result = await client.query(seedSQL);

    console.log('Seed completed successfully!\n');

    // Verify the users
    const usersResult = await client.query('SELECT email, role, first_name, last_name FROM users ORDER BY role, email');
    console.log('=== USERS IN DATABASE ===\n');
    usersResult.rows.forEach(user => {
      console.log(`${user.role.padEnd(20)} | ${user.email.padEnd(25)} | ${user.first_name} ${user.last_name}`);
    });
    console.log(`\nTotal users: ${usersResult.rows.length}\n`);

  } catch (err) {
    console.error('Error running seed:', err.message);
    console.error(err.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

runSeed();
