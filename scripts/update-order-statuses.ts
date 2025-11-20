import { Pool } from "pg";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function updateOrderStatuses() {
  const client = await pool.connect();

  try {
    console.log("Updating order statuses...");

    // Map old statuses to new statuses
    // Old: pending, confirmed, preparing, ready, picked_up, in_transit, delivered, cancelled
    // New: pending, confirmed, preparing, ready, delivered, cancelled

    // Update picked_up and in_transit to delivered (since they're already completed)
    await client.query(`
      UPDATE orders
      SET status = 'delivered'
      WHERE status IN ('picked_up', 'in_transit')
    `);

    console.log("Updated picked_up and in_transit orders to delivered");

    // Check if there's a constraint on status
    const constraintCheck = await client.query(`
      SELECT conname, pg_get_constraintdef(oid) as definition
      FROM pg_constraint
      WHERE conrelid = 'orders'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%status%'
    `);

    console.log("Status constraints:", constraintCheck.rows);

    // If there's a CHECK constraint, we need to drop and recreate it
    if (constraintCheck.rows.length > 0) {
      for (const constraint of constraintCheck.rows) {
        console.log(`Dropping constraint: ${constraint.conname}`);
        await client.query(`ALTER TABLE orders DROP CONSTRAINT ${constraint.conname}`);
      }

      // Add new constraint with updated statuses
      await client.query(`
        ALTER TABLE orders
        ADD CONSTRAINT orders_status_check
        CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'))
      `);

      console.log("Added new status constraint");
    }

    // Count orders by status
    const statusCounts = await client.query(`
      SELECT status, COUNT(*) as count
      FROM orders
      GROUP BY status
      ORDER BY status
    `);

    console.log("\nOrder status distribution:");
    statusCounts.rows.forEach((row) => {
      console.log(`  ${row.status}: ${row.count}`);
    });

    console.log("\nOrder statuses updated successfully!");
  } catch (error) {
    console.error("Error updating order statuses:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

updateOrderStatuses().catch(console.error);
