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

async function optimizeDatabase() {
  const client = await pool.connect();

  try {
    console.log("Starting database optimization...\n");

    // 1. Add indexes for orders table
    console.log("Adding indexes for orders table...");

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_orders_customer_id
      ON orders(customer_id);
    `);
    console.log("✓ Added index on orders.customer_id");

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_orders_status
      ON orders(status);
    `);
    console.log("✓ Added index on orders.status");

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_orders_created_at
      ON orders(created_at DESC);
    `);
    console.log("✓ Added index on orders.created_at");

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_orders_restaurants
      ON orders USING GIN(restaurants);
    `);
    console.log("✓ Added GIN index on orders.restaurants");

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_orders_status_created
      ON orders(status, created_at DESC);
    `);
    console.log("✓ Added composite index on orders(status, created_at)");

    // 2. Add indexes for order_items table
    console.log("\nAdding indexes for order_items table...");

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_order_items_order_id
      ON order_items(order_id);
    `);
    console.log("✓ Added index on order_items.order_id");

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_order_items_menu_item_id
      ON order_items(menu_item_id);
    `);
    console.log("✓ Added index on order_items.menu_item_id");

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_order_items_restaurant_id
      ON order_items(restaurant_id);
    `);
    console.log("✓ Added index on order_items.restaurant_id");

    // 3. Add indexes for menu_items table
    console.log("\nAdding indexes for menu_items table...");

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant_id
      ON menu_items(restaurant_id);
    `);
    console.log("✓ Added index on menu_items.restaurant_id");

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_menu_items_category
      ON menu_items(category);
    `);
    console.log("✓ Added index on menu_items.category");

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_menu_items_available
      ON menu_items(is_available) WHERE is_available = true;
    `);
    console.log("✓ Added partial index on menu_items.is_available");

    // 4. Add indexes for restaurants table
    console.log("\nAdding indexes for restaurants table...");

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_restaurants_owner_id
      ON restaurants(owner_id);
    `);
    console.log("✓ Added index on restaurants.owner_id");

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_restaurants_slug
      ON restaurants(slug);
    `);
    console.log("✓ Added index on restaurants.slug");

    // 5. Add indexes for chat sessions
    console.log("\nAdding indexes for chat sessions...");

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_chat_sessions_restaurant_id
      ON chat_sessions(restaurant_id);
    `);
    console.log("✓ Added index on chat_sessions.restaurant_id");

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_chat_sessions_customer_id
      ON chat_sessions(customer_id);
    `);
    console.log("✓ Added index on chat_sessions.customer_id");

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_chat_sessions_status
      ON chat_sessions(status);
    `);
    console.log("✓ Added index on chat_sessions.status");

    // 6. Add indexes for chat messages
    console.log("\nAdding indexes for chat messages...");

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id
      ON chat_messages(session_id);
    `);
    console.log("✓ Added index on chat_messages.session_id");

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at
      ON chat_messages(created_at DESC);
    `);
    console.log("✓ Added index on chat_messages.created_at");

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_chat_messages_session_created
      ON chat_messages(session_id, created_at DESC);
    `);
    console.log("✓ Added composite index on chat_messages(session_id, created_at)");

    // 7. Analyze tables to update statistics
    console.log("\nAnalyzing tables to update query planner statistics...");

    await client.query("ANALYZE orders");
    console.log("✓ Analyzed orders table");

    await client.query("ANALYZE order_items");
    console.log("✓ Analyzed order_items table");

    await client.query("ANALYZE menu_items");
    console.log("✓ Analyzed menu_items table");

    await client.query("ANALYZE restaurants");
    console.log("✓ Analyzed restaurants table");

    await client.query("ANALYZE chat_sessions");
    console.log("✓ Analyzed chat_sessions table");

    await client.query("ANALYZE chat_messages");
    console.log("✓ Analyzed chat_messages table");

    // 8. Show current indexes
    console.log("\n\nCurrent indexes on orders table:");
    const indexesResult = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'orders'
      ORDER BY indexname;
    `);

    indexesResult.rows.forEach((row) => {
      console.log(`  - ${row.indexname}`);
    });

    console.log("\n✅ Database optimization completed successfully!");
  } catch (error) {
    console.error("❌ Error optimizing database:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

optimizeDatabase().catch(console.error);
