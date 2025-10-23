import request from 'supertest';
import app from '../../src/index';
import { TestHelpers } from '../helpers/testHelpers';
import { testUsers, testRestaurant, testMenuItem, testNutrition, testOrder } from '../helpers/testData';
import { OrderStatus, PaymentStatus, UserRole } from '../../src/types';

describe('Order API', () => {
  let customerToken: string;
  let customerId: string;
  let ownerToken: string;
  let ownerId: string;
  let restaurantId: string;
  let menuItemId: string;

  beforeAll(async () => {
    await TestHelpers.cleanup();

    // Setup customer
    const customer = await TestHelpers.registerUser(testUsers.customer);
    customerToken = customer.token;
    customerId = customer.userId;

    // Setup restaurant owner
    const owner = await TestHelpers.registerUser(testUsers.restaurantOwner);
    ownerToken = owner.token;
    ownerId = owner.userId;

    // Create restaurant
    restaurantId = await TestHelpers.createRestaurant(ownerId, testRestaurant);

    // Create menu item
    menuItemId = await TestHelpers.createMenuItem(restaurantId, testMenuItem);

    // Add nutrition info
    await TestHelpers.addNutrition(menuItemId, testNutrition);
  });

  afterAll(async () => {
    await TestHelpers.cleanup();
  });

  describe('POST /api/v1/orders', () => {
    it('should create an order successfully', async () => {
      const orderData = {
        ...testOrder,
        items: [
          {
            menu_item_id: menuItemId,
            restaurant_id: restaurantId,
            quantity: 2,
            selected_variants: [],
            special_instructions: 'No onions'
          }
        ]
      };

      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(orderData)
        .expect(201);

      expect(response.body).toHaveProperty('message', 'Order created successfully');
      expect(response.body.order).toMatchObject({
        customer_id: customerId,
        status: OrderStatus.PENDING,
        payment_status: PaymentStatus.PENDING
      });
      expect(response.body.order).toHaveProperty('order_number');
      expect(response.body.order).toHaveProperty('id');
      expect(response.body.order.restaurants).toContain(restaurantId);
      expect(response.body.order.total_amount).toBeGreaterThan(0);
    });

    it('should calculate order totals correctly', async () => {
      const quantity = 2;
      const expectedSubtotal = testMenuItem.base_price * quantity;
      const expectedDeliveryFee = 10;
      const expectedServiceFee = expectedSubtotal * 0.05;
      const expectedTotal = expectedSubtotal + expectedDeliveryFee + expectedServiceFee;

      const orderData = {
        ...testOrder,
        items: [
          {
            menu_item_id: menuItemId,
            restaurant_id: restaurantId,
            quantity: quantity,
            selected_variants: []
          }
        ]
      };

      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(orderData)
        .expect(201);

      expect(response.body.order.subtotal).toBe(expectedSubtotal);
      expect(response.body.order.delivery_fee).toBe(expectedDeliveryFee);
      expect(response.body.order.service_fee).toBe(expectedServiceFee);
      expect(response.body.order.total_amount).toBe(expectedTotal);
    });

    it('should include nutritional summary in order items', async () => {
      const orderData = {
        ...testOrder,
        items: [
          {
            menu_item_id: menuItemId,
            restaurant_id: restaurantId,
            quantity: 2,
            selected_variants: []
          }
        ]
      };

      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(orderData)
        .expect(201);

      const orderItems = response.body.order.order_items;
      expect(orderItems).toHaveLength(1);
      expect(orderItems[0].nutritional_summary).toMatchObject({
        calories: testNutrition.calories * 2,
        protein: testNutrition.protein * 2,
        carbohydrates: testNutrition.carbohydrates * 2,
        fat: testNutrition.fat * 2
      });
    });

    it('should generate unique order numbers', async () => {
      const orderData = {
        ...testOrder,
        items: [
          {
            menu_item_id: menuItemId,
            restaurant_id: restaurantId,
            quantity: 1,
            selected_variants: []
          }
        ]
      };

      const response1 = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(orderData)
        .expect(201);

      const response2 = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(orderData)
        .expect(201);

      expect(response1.body.order.order_number).not.toBe(response2.body.order.order_number);
      expect(response1.body.order.order_number).toMatch(/^ORD-\d{8}-[A-Z0-9]{6}$/);
    });

    it('should reject order with more than 2 restaurants', async () => {
      const restaurant2Id = await TestHelpers.createRestaurant(ownerId, {
        ...testRestaurant,
        name: 'Second Restaurant',
        slug: 'second-restaurant'
      });

      const restaurant3Id = await TestHelpers.createRestaurant(ownerId, {
        ...testRestaurant,
        name: 'Third Restaurant',
        slug: 'third-restaurant'
      });

      const menuItem2 = await TestHelpers.createMenuItem(restaurant2Id, testMenuItem);
      const menuItem3 = await TestHelpers.createMenuItem(restaurant3Id, testMenuItem);

      const orderData = {
        ...testOrder,
        items: [
          { menu_item_id: menuItemId, restaurant_id: restaurantId, quantity: 1 },
          { menu_item_id: menuItem2, restaurant_id: restaurant2Id, quantity: 1 },
          { menu_item_id: menuItem3, restaurant_id: restaurant3Id, quantity: 1 }
        ]
      };

      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(orderData)
        .expect(400);

      expect(response.body.error).toContain('Cannot order from more than 2 restaurants');
    });

    it('should reject order with unavailable menu item', async () => {
      const unavailableItemId = await TestHelpers.createMenuItem(restaurantId, {
        ...testMenuItem,
        name: 'Unavailable Item',
        is_available: false
      });

      const orderData = {
        ...testOrder,
        items: [
          {
            menu_item_id: unavailableItemId,
            restaurant_id: restaurantId,
            quantity: 1
          }
        ]
      };

      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(orderData)
        .expect(400);

      expect(response.body.error).toContain('not available');
    });

    it('should require authentication', async () => {
      const orderData = {
        ...testOrder,
        items: [
          {
            menu_item_id: menuItemId,
            restaurant_id: restaurantId,
            quantity: 1
          }
        ]
      };

      await request(app)
        .post('/api/v1/orders')
        .send(orderData)
        .expect(401);
    });

    it('should handle scheduled orders', async () => {
      const scheduledTime = new Date(Date.now() + 3600000).toISOString(); // 1 hour from now

      const orderData = {
        ...testOrder,
        scheduled_for: scheduledTime,
        items: [
          {
            menu_item_id: menuItemId,
            restaurant_id: restaurantId,
            quantity: 1
          }
        ]
      };

      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(orderData)
        .expect(201);

      expect(response.body.order.scheduled_for).toBeTruthy();
    });
  });

  describe('GET /api/v1/orders/:id', () => {
    let orderId: string;

    beforeAll(async () => {
      const orderData = {
        ...testOrder,
        items: [
          {
            menu_item_id: menuItemId,
            restaurant_id: restaurantId,
            quantity: 1
          }
        ]
      };

      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(orderData);

      orderId = response.body.order.id;
    });

    it('should get order by ID as customer', async () => {
      const response = await request(app)
        .get(`/api/v1/orders/${orderId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body.order).toMatchObject({
        id: orderId,
        customer_id: customerId
      });
      expect(response.body.order.order_items).toBeDefined();
    });

    it('should get order by ID as restaurant owner', async () => {
      const response = await request(app)
        .get(`/api/v1/orders/${orderId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body.order.id).toBe(orderId);
    });

    it('should return 404 for non-existent order', async () => {
      await request(app)
        .get('/api/v1/orders/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(404);
    });

    it('should require authentication', async () => {
      await request(app)
        .get(`/api/v1/orders/${orderId}`)
        .expect(401);
    });

    it('should prevent unauthorized access', async () => {
      const otherCustomer = await TestHelpers.registerUser({
        ...testUsers.customer,
        email: 'other@test.com'
      });

      await request(app)
        .get(`/api/v1/orders/${orderId}`)
        .set('Authorization', `Bearer ${otherCustomer.token}`)
        .expect(403);
    });
  });

  describe('GET /api/v1/orders', () => {
    it('should get orders for customer', async () => {
      const response = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body.orders).toBeDefined();
      expect(Array.isArray(response.body.orders)).toBe(true);
      response.body.orders.forEach((order: any) => {
        expect(order.customer_id).toBe(customerId);
      });
    });

    it('should get orders for restaurant owner', async () => {
      const response = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body.orders).toBeDefined();
      expect(Array.isArray(response.body.orders)).toBe(true);
    });

    it('should filter orders by status', async () => {
      const response = await request(app)
        .get('/api/v1/orders?status=pending')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      response.body.orders.forEach((order: any) => {
        expect(order.status).toBe(OrderStatus.PENDING);
      });
    });

    it('should return orders sorted by creation date', async () => {
      const response = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      const orders = response.body.orders;
      if (orders.length > 1) {
        for (let i = 0; i < orders.length - 1; i++) {
          const date1 = new Date(orders[i].created_at);
          const date2 = new Date(orders[i + 1].created_at);
          expect(date1.getTime()).toBeGreaterThanOrEqual(date2.getTime());
        }
      }
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/v1/orders')
        .expect(401);
    });
  });

  describe('PATCH /api/v1/orders/:id/status', () => {
    let orderId: string;

    beforeEach(async () => {
      const orderData = {
        ...testOrder,
        items: [
          {
            menu_item_id: menuItemId,
            restaurant_id: restaurantId,
            quantity: 1
          }
        ]
      };

      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(orderData);

      orderId = response.body.order.id;
    });

    it('should update order status as restaurant owner', async () => {
      const response = await request(app)
        .patch(`/api/v1/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ status: OrderStatus.CONFIRMED })
        .expect(200);

      expect(response.body.message).toContain('updated successfully');
      expect(response.body.order.status).toBe(OrderStatus.CONFIRMED);
    });

    it('should prevent customer from updating order status', async () => {
      await request(app)
        .patch(`/api/v1/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ status: OrderStatus.CONFIRMED })
        .expect(403);
    });

    it('should require authentication', async () => {
      await request(app)
        .patch(`/api/v1/orders/${orderId}/status`)
        .send({ status: OrderStatus.CONFIRMED })
        .expect(401);
    });
  });

  describe('POST /api/v1/orders/:id/cancel', () => {
    let orderId: string;

    beforeEach(async () => {
      const orderData = {
        ...testOrder,
        items: [
          {
            menu_item_id: menuItemId,
            restaurant_id: restaurantId,
            quantity: 1
          }
        ]
      };

      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(orderData);

      orderId = response.body.order.id;
    });

    it('should cancel order as customer', async () => {
      const response = await request(app)
        .post(`/api/v1/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ reason: 'Changed mind' })
        .expect(200);

      expect(response.body.message).toContain('cancelled successfully');
      expect(response.body.order.status).toBe(OrderStatus.CANCELLED);
    });

    it('should prevent cancellation if already picked up', async () => {
      // Update order status to picked up
      await request(app)
        .patch(`/api/v1/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ status: OrderStatus.PICKED_UP });

      const response = await request(app)
        .post(`/api/v1/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ reason: 'Changed mind' })
        .expect(400);

      expect(response.body.error).toContain('Cannot cancel order at this stage');
    });

    it('should require authentication', async () => {
      await request(app)
        .post(`/api/v1/orders/${orderId}/cancel`)
        .send({ reason: 'Test' })
        .expect(401);
    });

    it('should prevent unauthorized cancellation', async () => {
      const otherCustomer = await TestHelpers.registerUser({
        ...testUsers.customer,
        email: 'another@test.com'
      });

      await request(app)
        .post(`/api/v1/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${otherCustomer.token}`)
        .send({ reason: 'Test' })
        .expect(403);
    });
  });
});
