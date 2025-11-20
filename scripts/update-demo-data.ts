import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as bcrypt from 'bcrypt';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function updateDemoData() {
  const client = await pool.connect();

  try {
    console.log('Updating demo data with realistic Arabic names...');

    // Update the owner's name and email
    const newEmail = 'salim.almansouri@cuts.ae';
    const firstName = 'Salim';
    const lastName = 'Al Mansouri';

    await client.query(`
      UPDATE users
      SET email = $1, first_name = $2, last_name = $3
      WHERE id = '11111111-1111-1111-1111-111111111111'
    `, [newEmail, firstName, lastName]);

    console.log(`✅ Updated owner: ${firstName} ${lastName} (${newEmail})`);

    // Update restaurant names to be more specific with branches
    await client.query(`
      UPDATE restaurants
      SET name = 'Fit & Fresh - Downtown Abu Dhabi',
          slug = 'fit-fresh-downtown-abu-dhabi',
          description = 'Premium healthy meals in the heart of downtown Abu Dhabi'
      WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    `);

    await client.query(`
      UPDATE restaurants
      SET name = 'Fit & Fresh - Khalifa City',
          slug = 'fit-fresh-khalifa-city',
          description = 'Your neighborhood healthy food destination in Khalifa City'
      WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
    `);

    await client.query(`
      UPDATE restaurants
      SET name = 'Green Bowl - Sharjah City Center',
          slug = 'green-bowl-sharjah',
          description = 'Fresh organic bowls and salads in Sharjah'
      WHERE id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
    `);

    console.log('✅ Updated restaurant names with specific branches');

    // Update ownership - make all restaurants owned by the same owner
    await client.query(`
      UPDATE restaurants
      SET owner_id = '11111111-1111-1111-1111-111111111111'
      WHERE id IN (
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        'cccccccc-cccc-cccc-cccc-cccccccccccc'
      )
    `);

    console.log('✅ All restaurants now owned by Salim Al Mansouri');

    // Get summary
    const restaurants = await client.query(`
      SELECT id, name FROM restaurants
      WHERE owner_id = '11111111-1111-1111-1111-111111111111'
    `);

    console.log('\n📊 Restaurant Summary:');
    restaurants.rows.forEach(r => {
      console.log(`  - ${r.name}`);
    });

    const orderCounts = await client.query(`
      SELECT
        r.name,
        COUNT(DISTINCT o.id) as order_count,
        SUM(o.total_amount) as revenue
      FROM restaurants r
      LEFT JOIN order_items oi ON r.id = oi.restaurant_id
      LEFT JOIN orders o ON oi.order_id = o.id
      WHERE r.owner_id = '11111111-1111-1111-1111-111111111111'
      GROUP BY r.id, r.name
      ORDER BY r.name
    `);

    console.log('\n📈 Order Statistics:');
    orderCounts.rows.forEach(row => {
      console.log(`  ${row.name}: ${row.order_count || 0} orders, AED ${parseFloat(row.revenue || 0).toFixed(2)}`);
    });

  } catch (error) {
    console.error('Error updating demo data:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

updateDemoData()
  .then(() => {
    console.log('\n✅ Demo data updated successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Update failed:', error);
    process.exit(1);
  });
