const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cuts_ae',
  user: 'sour',
  password: ''
});

async function checkUsers() {
  try {
    const result = await pool.query('SELECT email, role, first_name, last_name, password_hash FROM users ORDER BY role, email');

    console.log('\n=== USERS IN DATABASE ===\n');
    result.rows.forEach(user => {
      console.log(`Email: ${user.email}`);
      console.log(`Role: ${user.role}`);
      console.log(`Name: ${user.first_name} ${user.last_name}`);
      console.log(`Hash: ${user.password_hash}`);
      console.log('---');
    });

    console.log(`\nTotal users: ${result.rows.length}\n`);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

checkUsers();
