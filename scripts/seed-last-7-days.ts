import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from root .env
dotenv.config({ path: path.join(__dirname, '../../.env') });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function seedLastSevenDays() {
  const client = await pool.connect();

  try {
    console.log('Starting to seed data for the last 7 days...');

    // Get the max order number from the database to avoid duplicates
    const maxOrderResult = await client.query(`
      SELECT order_number FROM orders
      WHERE order_number LIKE 'ORD-%'
      ORDER BY created_at DESC
      LIMIT 1
    `);

    let orderCounter = 5000; // Start with a high number
    if (maxOrderResult.rows.length > 0) {
      const lastOrderNum = maxOrderResult.rows[0].order_number;
      const match = lastOrderNum.match(/ORD-\d{8}-(\d{6})/);
      if (match) {
        orderCounter = Math.max(parseInt(match[1]) + 1, 5000);
      }
    }
    const restaurantIds = [
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', // Healthy Bites Abu Dhabi
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', // Protein Palace
    ];

    const customerIds = [
      '33333333-3333-3333-3333-333333333333',
      '44444444-4444-4444-4444-444444444444',
    ];

    const healthyBitesItems = [
      { id: 'a1111111-1111-1111-1111-111111111111', price: 62.00 },
      { id: 'a1111111-1111-1111-1111-111111111112', price: 32.00 },
      { id: 'a1111111-1111-1111-1111-111111111113', price: 28.00 },
      { id: 'a1111111-1111-1111-1111-111111111114', price: 48.00 },
      { id: 'a1111111-1111-1111-1111-111111111115', price: 72.00 },
      { id: 'a1111111-1111-1111-1111-111111111116', price: 52.00 },
      { id: 'a1111111-1111-1111-1111-111111111117', price: 55.00 },
      { id: 'a1111111-1111-1111-1111-111111111118', price: 38.00 },
      { id: 'a1111111-1111-1111-1111-111111111119', price: 42.00 },
    ];

    const proteinPalaceItems = [
      { id: 'b2222222-2222-2222-2222-222222222221', price: 65.00 },
      { id: 'b2222222-2222-2222-2222-222222222222', price: 58.00 },
      { id: 'b2222222-2222-2222-2222-222222222223', price: 85.00 },
      { id: 'b2222222-2222-2222-2222-222222222224', price: 35.00 },
      { id: 'b2222222-2222-2222-2222-222222222225', price: 58.00 },
    ];

    const statuses = ['pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'in_transit', 'delivered', 'cancelled'];

    // Loop through last 7 days
    for (let dayOffset = 0; dayOffset <= 6; dayOffset++) {
      const ordersPerDay = 15 + (dayOffset * 2);
      console.log(`Creating ${ordersPerDay} orders for day ${dayOffset}...`);

      for (let i = 0; i < ordersPerDay; i++) {
        orderCounter++;

        // Calculate order time
        const now = new Date();
        const orderDate = new Date(now.getTime() - (dayOffset * 24 * 60 * 60 * 1000));
        const hour = 7 + Math.floor(Math.random() * 15);
        const minute = Math.floor(Math.random() * 60);
        orderDate.setHours(hour, minute, 0, 0);

        // Select restaurant
        const restaurantId = restaurantIds[orderCounter % 2];
        const customerId = customerIds[orderCounter % 2];

        // Determine status
        let orderStatus: string;
        let paymentStatus: string;

        if (dayOffset === 0) {
          // Today: mix of all statuses
          orderStatus = statuses[Math.floor(Math.random() * statuses.length)];
        } else if (dayOffset <= 2) {
          // Last 2 days: mostly delivered, some in transit
          orderStatus = Math.random() < 0.2 ? 'in_transit' : 'delivered';
        } else {
          // Older orders: all delivered
          orderStatus = 'delivered';
        }

        if (orderStatus === 'cancelled') {
          paymentStatus = 'failed';
        } else if (orderStatus === 'pending' || orderStatus === 'confirmed') {
          paymentStatus = 'pending';
        } else {
          paymentStatus = 'paid';
        }

        // Random subtotal
        const subtotal = Math.round((40 + Math.random() * 160) * 100) / 100;
        const deliveryFee = 10.00;
        const serviceFee = Math.round(subtotal * 0.05 * 100) / 100;
        const totalAmount = Math.round((subtotal + deliveryFee + serviceFee) * 100) / 100;

        const orderNumber = `ORD-${orderDate.toISOString().slice(0, 10).replace(/-/g, '')}-${String(orderCounter).padStart(6, '0')}`;

        // Insert order
        const orderResult = await client.query(`
          INSERT INTO orders (
            order_number, customer_id, restaurants, status,
            delivery_address, subtotal, delivery_fee, service_fee,
            total_amount, payment_status, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          RETURNING id
        `, [
          orderNumber,
          customerId,
          [restaurantId],
          orderStatus,
          JSON.stringify({
            street: `Corniche Road ${orderCounter}`,
            city: 'Abu Dhabi',
            state: 'Abu Dhabi',
            postal_code: '12348',
            country: 'UAE'
          }),
          subtotal,
          deliveryFee,
          serviceFee,
          totalAmount,
          paymentStatus,
          orderDate,
          orderDate
        ]);

        const orderId = orderResult.rows[0].id;

        // Insert 1-4 order items
        const itemCount = 1 + Math.floor(Math.random() * 4);
        const menuItems = restaurantId === restaurantIds[0] ? healthyBitesItems : proteinPalaceItems;

        for (let j = 0; j < itemCount; j++) {
          const menuItem = menuItems[Math.floor(Math.random() * menuItems.length)];
          const quantity = 1 + Math.floor(Math.random() * 3);
          const itemTotal = Math.round(menuItem.price * quantity * 100) / 100;

          await client.query(`
            INSERT INTO order_items (
              order_id, menu_item_id, restaurant_id, quantity,
              base_price, item_total, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          `, [
            orderId,
            menuItem.id,
            restaurantId,
            quantity,
            menuItem.price,
            itemTotal,
            orderDate
          ]);
        }
      }
    }

    // Get summary statistics
    const stats = await client.query(`
      SELECT
        COUNT(*) AS total_orders,
        SUM(total_amount) AS total_revenue,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) AS delivered_orders,
        COUNT(CASE WHEN created_at::DATE = CURRENT_DATE THEN 1 END) AS orders_today
      FROM orders
      WHERE created_at >= NOW() - INTERVAL '7 days'
    `);

    console.log('\n✅ Data seeding complete!');
    console.log('Summary:');
    console.log(`  Total orders (last 7 days): ${stats.rows[0].total_orders}`);
    console.log(`  Total revenue: AED ${parseFloat(stats.rows[0].total_revenue).toFixed(2)}`);
    console.log(`  Delivered orders: ${stats.rows[0].delivered_orders}`);
    console.log(`  Orders today: ${stats.rows[0].orders_today}`);

  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seedLastSevenDays()
  .then(() => {
    console.log('\n✅ Seeding completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  });
