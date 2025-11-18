import request from 'supertest';
import express, { Application } from 'express';
import authRoutes from '../../routes/auth.routes';
import restaurantRoutes from '../../routes/restaurant.routes';
import menuRoutes from '../../routes/menu.routes';
import orderRoutes from '../../routes/order.routes';
import { errorHandler } from '../../middleware/errorHandler';
import pool from "../../config/database";
import { UserRole, OrderStatus, PaymentStatus } from '../../types';

// Create test app
const createTestApp = (): Application => {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/restaurants', restaurantRoutes);
  app.use('/api/v1/menu', menuRoutes);
  app.use('/api/v1/orders', orderRoutes);
  app.use(errorHandler);
  return app;
};

describe('Order Endpoints', () => {
  let app: Application;
  let ownerToken: string;
  let ownerId: string;
  let customerToken: string;
  let customerId: string;
  let restaurantId: string;
  let menuItem1Id: string;
  let menuItem2Id: string;
  let orderId: string;

  beforeAll(async () => {
    app = createTestApp();

    // Create restaurant owner
    const ownerResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `order-owner-${Date.now()}@cuts.ae`,
        password: 'OwnerPassword123!',
        first_name: 'Order',
        last_name: 'Owner',
        phone: '+971505555555',
        role: UserRole.RESTAURANT_OWNER
      });

    ownerToken = ownerResponse.body.token;
    ownerId = ownerResponse.body.user.id;

    // Create customer
    const customerResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `order-customer-${Date.now()}@cuts.ae`,
        password: 'CustomerPassword123!',
        first_name: 'Order',
        last_name: 'Customer',
        phone: '+971506666666',
        role: UserRole.CUSTOMER
      });

    customerToken = customerResponse.body.token;
    customerId = customerResponse.body.user.id;

    // Create restaurant
    const restaurantResponse = await request(app)
      .post('/api/v1/restaurants')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Order Test Restaurant',
        description: 'For testing order endpoints',
        cuisine_type: ['Healthy'],
        address: {
          street: '789 Order Street',
          city: 'Abu Dhabi',
          state: 'Abu Dhabi',
          postal_code: '99999',
          country: 'UAE'
        },
        phone: '+971507777777',
        email: 'orders@restaurant.com',
        operating_hours: {
          monday: { open: '09:00', close: '22:00' },
          tuesday: { open: '09:00', close: '22:00' },
          wednesday: { open: '09:00', close: '22:00' },
          thursday: { open: '09:00', close: '22:00' },
          friday: { open: '09:00', close: '22:00' },
          saturday: { open: '10:00', close: '23:00' },
          sunday: { open: '10:00', close: '23:00' }
        },
        average_prep_time: 30
      });

    restaurantId = restaurantResponse.body.restaurant.id;

    // Create menu items
    const menuItem1 = await request(app)
      .post('/api/v1/menu')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        restaurant_id: restaurantId,
        name: 'Grilled Salmon',
        description: 'Fresh grilled salmon with vegetables',
        base_price: 55.00,
        category: 'lunch',
        is_available: true,
        prep_time: 25
      });

    menuItem1Id = menuItem1.body.menu_item.id;

    const menuItem2 = await request(app)
      .post('/api/v1/menu')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        restaurant_id: restaurantId,
        name: 'Quinoa Salad',
        description: 'Healthy quinoa salad',
        base_price: 35.00,
        category: 'lunch',
        is_available: true,
        prep_time: 10
      });

    menuItem2Id = menuItem2.body.menu_item.id;
  });

  afterAll(async () => {
    // Cleanup: Delete test data
    if (orderId) {
      await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);
    }
    if (menuItem1Id) {
      await supabase
        .from('menu_items')
        .delete()
        .eq('id', menuItem1Id);
    }
    if (menuItem2Id) {
      await supabase
        .from('menu_items')
        .delete()
        .eq('id', menuItem2Id);
    }
    if (restaurantId) {
      await supabase
        .from('restaurants')
        .delete()
        .eq('id', restaurantId);
    }
    if (ownerId) {
      await supabase
        .from('users')
        .delete()
        .eq('id', ownerId);
    }
    if (customerId) {
      await supabase
        .from('users')
        .delete()
        .eq('id', customerId);
    }
  });

  describe('POST /api/v1/orders', () => {
    it('should create order as customer', async () => {
      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          delivery_address: {
            street: '123 Customer Street',
            city: 'Abu Dhabi',
            state: 'Abu Dhabi',
            postal_code: '12345',
            country: 'UAE'
          },
          delivery_instructions: 'Ring doorbell twice',
          payment_method: 'card',
          items: [
            {
              menu_item_id: menuItem1Id,
              quantity: 2,
              special_instructions: 'No onions please'
            },
            {
              menu_item_id: menuItem2Id,
              quantity: 1
            }
          ]
        })
        .expect(201);

      expect(response.body).toHaveProperty('order');
      expect(response.body.order.customer_id).toBe(customerId);
      expect(response.body.order.status).toBe(OrderStatus.PENDING);
      expect(response.body.order.payment_status).toBe(PaymentStatus.PENDING);
      expect(response.body.order.total_amount).toBe(145.00); // (55 * 2) + 35
      expect(response.body.order.items).toHaveLength(2);

      orderId = response.body.order.id;
    });

    it('should fail to create order without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/orders')
        .send({
          delivery_address: {
            street: '456 Test Street',
            city: 'Dubai',
            state: 'Dubai',
            postal_code: '54321',
            country: 'UAE'
          },
          payment_method: 'card',
          items: [
            {
              menu_item_id: menuItem1Id,
              quantity: 1
            }
          ]
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should fail with empty items array', async () => {
      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          delivery_address: {
            street: '789 Test Street',
            city: 'Abu Dhabi',
            state: 'Abu Dhabi',
            postal_code: '99999',
            country: 'UAE'
          },
          payment_method: 'card',
          items: []
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should fail with invalid quantity', async () => {
      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          delivery_address: {
            street: '111 Test Street',
            city: 'Abu Dhabi',
            state: 'Abu Dhabi',
            postal_code: '11111',
            country: 'UAE'
          },
          payment_method: 'card',
          items: [
            {
              menu_item_id: menuItem1Id,
              quantity: 0 // Invalid
            }
          ]
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should fail with missing delivery address', async () => {
      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          payment_method: 'card',
          items: [
            {
              menu_item_id: menuItem1Id,
              quantity: 1
            }
          ]
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should fail with invalid payment method', async () => {
      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          delivery_address: {
            street: '222 Test Street',
            city: 'Abu Dhabi',
            state: 'Abu Dhabi',
            postal_code: '22222',
            country: 'UAE'
          },
          payment_method: 'invalid_method',
          items: [
            {
              menu_item_id: menuItem1Id,
              quantity: 1
            }
          ]
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/orders', () => {
    it('should list customer orders as customer', async () => {
      const response = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('orders');
      expect(Array.isArray(response.body.orders)).toBe(true);
      expect(response.body.orders.length).toBeGreaterThan(0);

      // All orders should belong to this customer
      response.body.orders.forEach((order: any) => {
        expect(order.customer_id).toBe(customerId);
      });
    });

    it('should list restaurant orders as restaurant owner', async () => {
      const response = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('orders');
      expect(Array.isArray(response.body.orders)).toBe(true);
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/orders')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should filter orders by status', async () => {
      const response = await request(app)
        .get(`/api/v1/orders?status=${OrderStatus.PENDING}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('orders');
      expect(Array.isArray(response.body.orders)).toBe(true);

      // All orders should have pending status
      response.body.orders.forEach((order: any) => {
        expect(order.status).toBe(OrderStatus.PENDING);
      });
    });

    it('should paginate results', async () => {
      const response = await request(app)
        .get('/api/v1/orders?limit=5&offset=0')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('orders');
      expect(Array.isArray(response.body.orders)).toBe(true);
      expect(response.body.orders.length).toBeLessThanOrEqual(5);
    });
  });

  describe('GET /api/v1/orders/:id', () => {
    it('should get order details as customer', async () => {
      const response = await request(app)
        .get(`/api/v1/orders/${orderId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('order');
      expect(response.body.order.id).toBe(orderId);
      expect(response.body.order.customer_id).toBe(customerId);
      expect(response.body.order.items).toHaveLength(2);
    });

    it('should get order details as restaurant owner', async () => {
      const response = await request(app)
        .get(`/api/v1/orders/${orderId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('order');
      expect(response.body.order.id).toBe(orderId);
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get(`/api/v1/orders/${orderId}`)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should fail with invalid order id', async () => {
      const response = await request(app)
        .get('/api/v1/orders/invalid-uuid')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('should fail with non-existent order id', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/v1/orders/${fakeId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/v1/orders/:id/status', () => {
    it('should update order status as restaurant owner', async () => {
      const response = await request(app)
        .put(`/api/v1/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          status: OrderStatus.CONFIRMED
        })
        .expect(200);

      expect(response.body).toHaveProperty('order');
      expect(response.body.order.status).toBe(OrderStatus.CONFIRMED);
    });

    it('should update to preparing status', async () => {
      const response = await request(app)
        .put(`/api/v1/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          status: OrderStatus.PREPARING
        })
        .expect(200);

      expect(response.body.order.status).toBe(OrderStatus.PREPARING);
    });

    it('should update to ready status', async () => {
      const response = await request(app)
        .put(`/api/v1/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          status: OrderStatus.READY
        })
        .expect(200);

      expect(response.body.order.status).toBe(OrderStatus.READY);
    });

    it('should fail to update status as customer', async () => {
      const response = await request(app)
        .put(`/api/v1/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          status: OrderStatus.DELIVERED
        })
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .put(`/api/v1/orders/${orderId}/status`)
        .send({
          status: OrderStatus.DELIVERED
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should fail with invalid status', async () => {
      const response = await request(app)
        .put(`/api/v1/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          status: 'INVALID_STATUS'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/v1/orders/:id/cancel', () => {
    let cancelOrderId: string;

    beforeAll(async () => {
      // Create order to cancel
      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          delivery_address: {
            street: '999 Cancel Street',
            city: 'Abu Dhabi',
            state: 'Abu Dhabi',
            postal_code: '99999',
            country: 'UAE'
          },
          payment_method: 'cash',
          items: [
            {
              menu_item_id: menuItem1Id,
              quantity: 1
            }
          ]
        });

      cancelOrderId = response.body.order.id;
    });

    it('should cancel order as customer', async () => {
      const response = await request(app)
        .post(`/api/v1/orders/${cancelOrderId}/cancel`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          cancellation_reason: 'Changed my mind'
        })
        .expect(200);

      expect(response.body).toHaveProperty('order');
      expect(response.body.order.status).toBe(OrderStatus.CANCELLED);
      expect(response.body.order.cancellation_reason).toBe('Changed my mind');
    });

    it('should fail to cancel already cancelled order', async () => {
      const response = await request(app)
        .post(`/api/v1/orders/${cancelOrderId}/cancel`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          cancellation_reason: 'Try to cancel again'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .post(`/api/v1/orders/${orderId}/cancel`)
        .send({
          cancellation_reason: 'Unauthenticated'
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should fail to cancel order as non-owner', async () => {
      // Create another customer
      const otherCustomer = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: `other-customer-${Date.now()}@cuts.ae`,
          password: 'OtherPassword123!',
          first_name: 'Other',
          last_name: 'Customer',
          phone: '+971508888888',
          role: UserRole.CUSTOMER
        });

      const response = await request(app)
        .post(`/api/v1/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${otherCustomer.body.token}`)
        .send({
          cancellation_reason: 'Not my order'
        })
        .expect(403);

      expect(response.body).toHaveProperty('error');

      // Cleanup
      await supabase
        .from('users')
        .delete()
        .eq('id', otherCustomer.body.user.id);
    });
  });

  describe('Order calculations', () => {
    it('should calculate correct total amount', async () => {
      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          delivery_address: {
            street: '333 Calculation Street',
            city: 'Abu Dhabi',
            state: 'Abu Dhabi',
            postal_code: '33333',
            country: 'UAE'
          },
          payment_method: 'card',
          items: [
            {
              menu_item_id: menuItem1Id,
              quantity: 3 // 55 * 3 = 165
            },
            {
              menu_item_id: menuItem2Id,
              quantity: 2 // 35 * 2 = 70
            }
          ]
        })
        .expect(201);

      expect(response.body.order.total_amount).toBe(235.00); // 165 + 70

      // Cleanup
      await supabase
        .from('orders')
        .delete()
        .eq('id', response.body.order.id);
    });

    it('should store item prices at time of order', async () => {
      const response = await request(app)
        .get(`/api/v1/orders/${orderId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      // Item prices should be stored
      response.body.order.items.forEach((item: any) => {
        expect(item).toHaveProperty('unit_price');
        expect(item.unit_price).toBeGreaterThan(0);
      });
    });
  });
});
