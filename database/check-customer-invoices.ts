import pool from '../src/config/database';

async function checkCustomerInvoices() {
  try {
    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'customer_invoices'
      );
    `);

    console.log('customer_invoices table exists:', tableCheck.rows[0].exists);

    if (tableCheck.rows[0].exists) {
      // Count rows
      const count = await pool.query('SELECT COUNT(*) FROM customer_invoices');
      console.log(`Total customer_invoices: ${count.rows[0].count}`);

      // Show sample data
      const sample = await pool.query('SELECT * FROM customer_invoices LIMIT 5');
      console.log('\nSample customer_invoices:', JSON.stringify(sample.rows, null, 2));
    }

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
    process.exit(1);
  }
}

checkCustomerInvoices();
