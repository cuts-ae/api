import pool from '../src/config/database';

async function seedInvoices() {
  try {
    console.log('Generating invoices for existing orders...');

    // Generate invoice #1 for each order that doesn't have one yet
    const result = await pool.query(`
      INSERT INTO invoices (order_id, invoice_number, amount, status)
      SELECT
        id as order_id,
        1 as invoice_number,
        total_amount as amount,
        CASE
          WHEN payment_status = 'paid' THEN 'paid'
          WHEN payment_status = 'pending' THEN 'pending'
          ELSE 'pending'
        END as status
      FROM orders
      WHERE id NOT IN (SELECT order_id FROM invoices)
      RETURNING id
    `);

    console.log(`✓ Created ${result.rowCount} invoices for existing orders`);

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Error seeding invoices:', error);
    await pool.end();
    process.exit(1);
  }
}

seedInvoices();
