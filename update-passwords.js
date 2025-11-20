require('dotenv').config({ path: '../.env' });
const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cuts_ae',
  user: 'sour',
  password: '',
});

const newPassword = 'TabsTriggerIsnt2026*$';

async function updatePasswords() {
  try {
    console.log('Hashing new password...');
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    console.log('New password hash:', hashedPassword);

    console.log('\nUpdating all user passwords in database...');
    
    const result = await pool.query(
      'UPDATE users SET password = $1 RETURNING email',
      [hashedPassword]
    );

    console.log(`\n✅ Successfully updated ${result.rowCount} user passwords!`);
    console.log('Updated users:', result.rows.map(r => r.email));
    
    console.log('\n✅ All passwords are now: TabsTriggerIsnt2026*$');
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating passwords:', error.message);
    process.exit(1);
  }
}

updatePasswords();
