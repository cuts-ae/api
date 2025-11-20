import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function addGreenBowlOrders() {
  const client = await pool.connect();

  try {
    console.log('Adding orders for Green Bowl - Sharjah...');

    const restaurantId = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
    const customerIds = [
      '33333333-3333-3333-3333-333333333333',
      '44444444-4444-4444-4444-444444444444',
    ];

    // Get menu items for Green Bowl
    const menuItemsResult = await client.query(`
      SELECT id, base_price FROM menu_items
      WHERE restaurant_id = $1
      LIMIT 10
    `, [restaurantId]);

    if (menuItemsResult.rows.length === 0) {
      console.log('No menu items found for Green Bowl. Creating some...');
      // Create some menu items for Green Bowl
      const items = [
        { name: 'Acai Power Bowl', price: 45, category: 'breakfast' },
        { name: 'Green Detox Smoothie', price: 32, category: 'beverages' },
        { name: 'Buddha Bowl', price: 52, category: 'lunch' },
        { name: 'Quinoa Salad', price: 42, category: 'lunch' },
        { name: 'Vegan Wrap', price: 38, category: 'lunch' },
        { name: 'Sweet Potato Bowl', price: 48, category: 'dinner' },
        { name: 'Falafel Plate', price: 40, category: 'dinner' },
        { name: 'Green Juice', price: 28, category: 'beverages' },
      ];

      for (const item of items) {
        await client.query(`
          INSERT INTO menu_items (restaurant_id, name, base_price, category, is_available, prep_time)
          VALUES ($1, $2, $3, $4, true, 20)
        `, [restaurantId, item.name, item.price, item.category]);
      }

      // Re-fetch menu items
      const newMenuItems = await client.query(`
        SELECT id, base_price FROM menu_items
        WHERE restaurant_id = $1
      `, [restaurantId]);
      menuItemsResult.rows = newMenuItems.rows;
      console.log(`✅ Created ${items.length} menu items for Green Bowl`);
    }

    const menuItems = menuItemsResult.rows;

    // Get max order number
    const maxOrderResult = await client.query(`
      SELECT order_number FROM orders
      WHERE order_number LIKE 'ORD-%'
      ORDER BY order_number DESC
      LIMIT 1
    `);

    let orderCounter = 20000;
    if (maxOrderResult.rows.length > 0) {
      const lastOrderNum = maxOrderResult.rows[0].order_number;
      const match = lastOrderNum.match(/ORD-\d{8}-(\d{6})/);
      if (match) {
        orderCounter = Math.max(parseInt(match[1]) + 1, 20000);
      }
    }

    const statuses = ['pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'in_transit', 'delivered'];

    // Add 60 orders spread across last 7 days
    for (let dayOffset = 0; dayOffset <= 6; dayOffset++) {
      const ordersPerDay = 8 + Math.floor(Math.random() * 3);

      for (let i = 0; i < ordersPerDay; i++) {
        orderCounter++;

        const now = new Date();
        const orderDate = new Date(now.getTime() - (dayOffset * 24 * 60 * 60 * 1000));
        const hour = 8 + Math.floor(Math.random() * 14);
        const minute = Math.floor(Math.random() * 60);
        orderDate.setHours(hour, minute, 0, 0);

        const customerId = customerIds[orderCounter % 2];

        let orderStatus: string;
        let paymentStatus: string;

        if (dayOffset === 0) {
          orderStatus = statuses[Math.floor(Math.random() * statuses.length)];
        } else if (dayOffset <= 2) {
          orderStatus = Math.random() < 0.2 ? 'in_transit' : 'delivered';
        } else {
          orderStatus = 'delivered';
        }

        paymentStatus = orderStatus === 'pending' || orderStatus === 'confirmed' ? 'pending' : 'paid';

        const subtotal = Math.round((35 + Math.random() * 85) * 100) / 100;
        const deliveryFee = 10.00;
        const serviceFee = Math.round(subtotal * 0.05 * 100) / 100;
        const totalAmount = Math.round((subtotal + deliveryFee + serviceFee) * 100) / 100;

        const orderNumber = `ORD-${orderDate.toISOString().slice(0, 10).replace(/-/g, '')}-${String(orderCounter).padStart(6, '0')}`;

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
            street: `Al Qasimia ${orderCounter}`,
            city: 'Sharjah',
            state: 'Sharjah',
            postal_code: '51000',
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

        // Add 1-3 order items
        const itemCount = 1 + Math.floor(Math.random() * 3);

        for (let j = 0; j < itemCount; j++) {
          const menuItem = menuItems[Math.floor(Math.random() * menuItems.length)];
          const quantity = 1 + Math.floor(Math.random() * 2);
          const itemTotal = Math.round(parseFloat(menuItem.base_price) * quantity * 100) / 100;

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
            menuItem.base_price,
            itemTotal,
            orderDate
          ]);
        }
      }
      console.log(`✅ Added ${ordersPerDay} orders for day ${dayOffset}`);
    }

    // Get final stats
    const stats = await client.query(`
      SELECT
        COUNT(DISTINCT o.id) as order_count,
        SUM(o.total_amount) as revenue
      FROM restaurants r
      LEFT JOIN order_items oi ON r.id = oi.restaurant_id
      LEFT JOIN orders o ON oi.order_id = o.id
      WHERE r.id = $1
    `, [restaurantId]);

    console.log('\n📈 Green Bowl Final Statistics:');
    console.log(`  Orders: ${stats.rows[0].order_count}`);
    console.log(`  Revenue: AED ${parseFloat(stats.rows[0].revenue || 0).toFixed(2)}`);

  } catch (error) {
    console.error('Error adding orders:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addGreenBowlOrders()
  .then(() => {
    console.log('\n✅ Green Bowl orders added successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Failed:', error);
    process.exit(1);
  });
