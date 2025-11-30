import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { randomUUID } from 'crypto';

// Load environment variables from root .env
dotenv.config({ path: path.join(__dirname, '../../.env') });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// UAE/Arabic names for realistic order generation
const firstNames = [
  'Ahmed', 'Mohammed', 'Omar', 'Khalid', 'Hassan', 'Ali', 'Saeed', 'Rashid', 'Faisal', 'Hamad',
  'Fatima', 'Mariam', 'Aisha', 'Sara', 'Layla', 'Noor', 'Hessa', 'Maha', 'Dana', 'Reem',
  'Sultan', 'Mansour', 'Abdullah', 'Youssef', 'Ibrahim', 'Zayed', 'Majid', 'Tariq', 'Nawaf', 'Badr',
  'Salma', 'Amina', 'Khadija', 'Latifa', 'Shamma', 'Maitha', 'Alia', 'Noura', 'Hind', 'Mouza'
];

const lastNames = [
  'Al Maktoum', 'Al Nahyan', 'Al Qasimi', 'Al Nuaimi', 'Al Sharqi', 'Al Mualla',
  'Al Mansouri', 'Al Suwaidi', 'Al Ketbi', 'Al Mazrouei', 'Al Shamsi', 'Al Mheiri',
  'Al Hashimi', 'Al Dhaheri', 'Al Falasi', 'Al Kaabi', 'Al Zaabi', 'Al Ameri',
  'Al Balushi', 'Al Marri', 'Al Romaithi', 'Al Hammadi', 'Al Qubaisi', 'Al Tayer',
  'Hassan', 'Ahmed', 'Ibrahim', 'Mohammed', 'Abdullah', 'Saleh'
];

const abuDhabiAreas = [
  'Corniche Road', 'Al Reem Island', 'Saadiyat Island', 'Yas Island', 'Al Khalidiyah',
  'Tourist Club Area', 'Al Mushrif', 'Al Nahyan', 'Al Bateen', 'Al Maryah Island',
  'Al Marina', 'Hamdan Street', 'Electra Street', 'Al Wahda', 'Khalifa City',
  'Al Reef', 'Al Raha Beach', 'Al Shamkha', 'Mohammed Bin Zayed City', 'Masdar City'
];

const deliveryInstructions = [
  'Please call on arrival',
  'Leave at the door',
  'Ring doorbell twice',
  'Gate code: 1234',
  'Contact security at reception',
  'Building entrance on the left side',
  'Apartment number on the mailbox',
  null, null, null, null, null // Higher chance of no instructions
];

const orderStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'in_transit', 'delivered'];

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateOrderTime(baseDate: Date): Date {
  // Orders typically between 7am and 11pm, with peaks at lunch and dinner
  const hour = Math.random() < 0.4
    ? randomInt(11, 14) // Lunch peak
    : Math.random() < 0.6
      ? randomInt(18, 22) // Dinner peak
      : randomInt(7, 23); // Other times

  const minute = randomInt(0, 59);
  const second = randomInt(0, 59);

  const orderTime = new Date(baseDate);
  orderTime.setHours(hour, minute, second, 0);
  return orderTime;
}

function generateAddress(): object {
  const area = randomElement(abuDhabiAreas);
  const buildingNum = randomInt(1, 500);
  const apartmentNum = randomInt(101, 3099);

  return {
    street: `${area}, Building ${buildingNum}`,
    apartment: `Apt ${apartmentNum}`,
    city: 'Abu Dhabi',
    state: 'Abu Dhabi',
    postal_code: String(randomInt(10000, 99999)),
    country: 'UAE',
    latitude: 24.4539 + (Math.random() * 0.1 - 0.05),
    longitude: 54.3773 + (Math.random() * 0.1 - 0.05)
  };
}

async function generateDailyOrders(orderCount?: number) {
  const client = await pool.connect();

  try {
    console.log('Generating daily orders...\n');

    // Get restaurants with menu items
    const restaurantsResult = await client.query(`
      SELECT r.id, r.name,
             json_agg(json_build_object('id', m.id, 'name', m.name, 'price', m.base_price)) as menu_items
      FROM restaurants r
      JOIN menu_items m ON m.restaurant_id = r.id
      WHERE m.is_available = true
      GROUP BY r.id, r.name
    `);

    if (restaurantsResult.rows.length === 0) {
      throw new Error('No restaurants with menu items found');
    }

    const restaurants = restaurantsResult.rows;
    console.log(`Found ${restaurants.length} restaurants with menu items`);

    // Get existing customers
    const customersResult = await client.query(`
      SELECT id FROM users WHERE role = 'customer'
    `);
    const existingCustomerIds = customersResult.rows.map(r => r.id);

    // Get the max order number
    const maxOrderResult = await client.query(`
      SELECT order_number FROM orders
      WHERE order_number LIKE 'ORD-%'
      ORDER BY created_at DESC
      LIMIT 1
    `);

    let orderCounter = 10000;
    if (maxOrderResult.rows.length > 0) {
      const lastOrderNum = maxOrderResult.rows[0].order_number;
      const match = lastOrderNum.match(/ORD-\d{8}-(\d{6})/);
      if (match) {
        orderCounter = parseInt(match[1]) + 1;
      }
    }

    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

    // Generate between 15-30 orders unless specified
    const numOrders = orderCount || randomInt(15, 30);
    console.log(`Generating ${numOrders} orders for today (${today.toISOString().slice(0, 10)})...\n`);

    let totalRevenue = 0;
    const ordersByRestaurant: Record<string, number> = {};

    for (let i = 0; i < numOrders; i++) {
      orderCounter++;

      // Select restaurant
      const restaurant = randomElement(restaurants);
      const restaurantId = restaurant.id;
      const menuItems = restaurant.menu_items;

      ordersByRestaurant[restaurant.name] = (ordersByRestaurant[restaurant.name] || 0) + 1;

      // Generate customer name
      const firstName = randomElement(firstNames);
      const lastName = randomElement(lastNames);
      const customerName = `${firstName} ${lastName}`;

      // Use existing customer or null (guest order)
      const customerId = Math.random() < 0.7 ? randomElement(existingCustomerIds) : null;

      // Generate order time
      const orderTime = generateOrderTime(today);

      // Distribute statuses evenly for better testing visibility
      // Use weighted random to get a good mix across all status tabs
      let status: string;
      let paymentStatus: string;

      const statusRoll = Math.random();
      if (statusRoll < 0.15) {
        status = 'pending';
      } else if (statusRoll < 0.30) {
        status = 'confirmed';
      } else if (statusRoll < 0.45) {
        status = 'preparing';
      } else if (statusRoll < 0.60) {
        status = 'ready';
      } else if (statusRoll < 0.98) {
        status = 'delivered';
      } else {
        status = 'cancelled';
      }

      if (status === 'pending') {
        paymentStatus = 'pending';
      } else if (status === 'cancelled') {
        paymentStatus = 'refunded';
      } else {
        paymentStatus = 'paid';
      }

      // Generate order items (1-4 items)
      const itemCount = randomInt(1, 4);
      const selectedItems: Array<{id: string, name: string, price: number, quantity: number}> = [];

      for (let j = 0; j < itemCount; j++) {
        const item = randomElement(menuItems) as {id: string, name: string, price: string};
        const quantity = randomInt(1, 3);
        selectedItems.push({
          id: item.id,
          name: item.name,
          price: parseFloat(item.price),
          quantity
        });
      }

      // Calculate totals
      const subtotal = selectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const deliveryFee = 10.00;
      const serviceFee = Math.round(subtotal * 0.05 * 100) / 100;
      const totalAmount = Math.round((subtotal + deliveryFee + serviceFee) * 100) / 100;

      totalRevenue += totalAmount;

      const orderNumber = `ORD-${dateStr}-${String(orderCounter).padStart(6, '0')}`;
      const address = generateAddress();
      const instructions = randomElement(deliveryInstructions);

      // Insert order
      const orderResult = await client.query(`
        INSERT INTO orders (
          order_number, customer_id, restaurants, status,
          delivery_address, delivery_instructions, subtotal, delivery_fee, service_fee,
          total_amount, payment_status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id
      `, [
        orderNumber,
        customerId,
        [restaurantId],
        status,
        JSON.stringify(address),
        instructions,
        subtotal,
        deliveryFee,
        serviceFee,
        totalAmount,
        paymentStatus,
        orderTime,
        orderTime
      ]);

      const orderId = orderResult.rows[0].id;

      // Insert order items
      for (const item of selectedItems) {
        const itemTotal = Math.round(item.price * item.quantity * 100) / 100;

        await client.query(`
          INSERT INTO order_items (
            order_id, menu_item_id, restaurant_id, quantity,
            base_price, item_total, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          orderId,
          item.id,
          restaurantId,
          item.quantity,
          item.price,
          itemTotal,
          orderTime
        ]);
      }

      console.log(`  ${orderNumber} - ${customerName} - ${restaurant.name} - AED ${totalAmount.toFixed(2)} [${status}]`);
    }

    console.log('\n--- Summary ---');
    console.log(`Total orders: ${numOrders}`);
    console.log(`Total revenue: AED ${totalRevenue.toFixed(2)}`);
    console.log('\nOrders by restaurant:');
    for (const [name, count] of Object.entries(ordersByRestaurant)) {
      console.log(`  ${name}: ${count} orders`);
    }

  } catch (error) {
    console.error('Error generating orders:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const orderCount = args[0] ? parseInt(args[0]) : undefined;

generateDailyOrders(orderCount)
  .then(() => {
    console.log('\nDaily orders generated successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nFailed to generate orders:', error);
    process.exit(1);
  });
