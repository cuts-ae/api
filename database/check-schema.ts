import pool from '../src/config/database';

async function checkSchema() {
  try {
    // Check if invoices table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'invoices'
      );
    `);

    console.log('Invoices table exists:', tableCheck.rows[0].exists);

    if (tableCheck.rows[0].exists) {
      // Get column names
      const columns = await pool.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'invoices'
        ORDER BY ordinal_position;
      `);

      console.log('\nInvoices table columns:');
      columns.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type}`);
      });

      // Count rows
      const count = await pool.query('SELECT COUNT(*) FROM invoices');
      console.log(`\nTotal invoices: ${count.rows[0].count}`);
    }

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
    process.exit(1);
  }
}

checkSchema();
