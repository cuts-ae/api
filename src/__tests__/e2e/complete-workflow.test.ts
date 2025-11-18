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

describe('End-to-End Workflow Tests', () => {
  let app: Application;

  beforeAll(() => {
    app = createTestApp();
  });

  describe('Complete Customer Journey', () => {
    let customerToken: string;
    let customerId: string;
    let restaurantId: string;
    let menuItemId: string;
    let orderId: string;

    it('should complete full customer journey from registration to order delivery', async () => {
      // Step 1: Customer registers
      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: `e2e-customer-${Date.now()}@cuts.ae`,
          password: 'CustomerPassword123!',
          first_name: 'E2E',
          last_name: 'Customer',
          phone: '+971509999999',
          role: UserRole.CUSTOMER
        })
        .expect(201);

      expect(registerResponse.body).toHaveProperty('token');
      expect(registerResponse.body.user.role).toBe(UserRole.CUSTOMER);
      customerToken = registerResponse.body.token;
      customerId = registerResponse.body.user.id;

      // Step 2: Customer logs in
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: registerResponse.body.user.email,
          password: 'CustomerPassword123!'
        })
        .expect(200);

      expect(loginResponse.body).toHaveProperty('token');
      customerToken = loginResponse.body.token;

      // Step 3: Customer views their profile
      const meResponse = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(meResponse.body.user.id).toBe(customerId);

      // Step 4: Customer browses restaurants (use existing restaurant)
      const restaurantsResponse = await request(app)
        .get('/api/v1/restaurants')
        .expect(200);

      expect(restaurantsResponse.body.restaurants.length).toBeGreaterThan(0);
      restaurantId = restaurantsResponse.body.restaurants[0].id;

      // Step 5: Customer views restaurant details
      const restaurantResponse = await request(app)
        .get(`/api/v1/restaurants/${restaurantId}`)
        .expect(200);

      expect(restaurantResponse.body.restaurant.id).toBe(restaurantId);

      // Step 6: Customer views restaurant menu
      const menuResponse = await request(app)
        .get(`/api/v1/restaurants/${restaurantId}/menu?is_available=true`)
        .expect(200);

      expect(menuResponse.body.menu_items.length).toBeGreaterThan(0);
      menuItemId = menuResponse.body.menu_items[0].id;

      // Step 7: Customer views menu item details with nutrition
      const menuItemResponse = await request(app)
        .get(`/api/v1/menu/${menuItemId}`)
        .expect(200);

      expect(menuItemResponse.body.menu_item.id).toBe(menuItemId);

      // Step 8: Customer places an order
      const orderResponse = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          delivery_address: {
            street: '123 E2E Street',
            city: 'Abu Dhabi',
            state: 'Abu Dhabi',
            postal_code: '12345',
            country: 'UAE'
          },
          delivery_instructions: 'Call when you arrive',
          payment_method: 'card',
          items: [
            {
              menu_item_id: menuItemId,
              quantity: 2,
              special_instructions: 'Extra sauce please'
            }
          ]
        })
        .expect(201);

      expect(orderResponse.body.order.customer_id).toBe(customerId);
      expect(orderResponse.body.order.status).toBe(OrderStatus.PENDING);
      expect(orderResponse.body.order.payment_status).toBe(PaymentStatus.PENDING);
      orderId = orderResponse.body.order.id;

      // Step 9: Customer views their orders
      const ordersResponse = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(ordersResponse.body.orders.length).toBeGreaterThan(0);
      expect(ordersResponse.body.orders.some((o: any) => o.id === orderId)).toBe(true);

      // Step 10: Customer views specific order details
      const orderDetailsResponse = await request(app)
        .get(`/api/v1/orders/${orderId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(orderDetailsResponse.body.order.id).toBe(orderId);
      expect(orderDetailsResponse.body.order.items.length).toBe(1);

      // Cleanup
      await supabase.from('orders').delete().eq('id', orderId);
      await supabase.from('users').delete().eq('id', customerId);
    });
  });

  describe('Complete Restaurant Owner Journey', () => {
    let ownerToken: string;
    let ownerId: string;
    let restaurantId: string;
    let menuItemId: string;

    it('should complete full restaurant owner journey from registration to analytics', async () => {
      // Step 1: Owner registers
      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: `e2e-owner-${Date.now()}@cuts.ae`,
          password: 'OwnerPassword123!',
          first_name: 'E2E',
          last_name: 'Owner',
          phone: '+971508888888',
          role: UserRole.RESTAURANT_OWNER
        })
        .expect(201);

      expect(registerResponse.body.user.role).toBe(UserRole.RESTAURANT_OWNER);
      ownerToken = registerResponse.body.token;
      ownerId = registerResponse.body.user.id;

      // Step 2: Owner creates a restaurant
      const restaurantResponse = await request(app)
        .post('/api/v1/restaurants')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'E2E Test Restaurant',
          description: 'End-to-end test restaurant',
          cuisine_type: ['Healthy', 'Mediterranean'],
          address: {
            street: '456 Owner Street',
            city: 'Dubai',
            state: 'Dubai',
            postal_code: '54321',
            country: 'UAE'
          },
          phone: '+971507777777',
          email: 'e2e@restaurant.com',
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
        })
        .expect(201);

      expect(restaurantResponse.body.restaurant.owner_id).toBe(ownerId);
      restaurantId = restaurantResponse.body.restaurant.id;

      // Step 3: Owner adds menu items
      const menuItemResponse = await request(app)
        .post('/api/v1/menu')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          restaurant_id: restaurantId,
          name: 'Mediterranean Bowl',
          description: 'Healthy Mediterranean bowl with quinoa',
          base_price: 48.00,
          category: 'lunch',
          is_available: true,
          prep_time: 20
        })
        .expect(201);

      menuItemId = menuItemResponse.body.menu_item.id;

      // Step 4: Owner adds nutrition info (REQUIRED)
      const nutritionResponse = await request(app)
        .post(`/api/v1/menu/${menuItemId}/nutrition`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          serving_size: '1 bowl (450g)',
          calories: 520,
          protein: 28,
          carbohydrates: 58,
          fat: 18,
          fiber: 12,
          sugar: 6,
          sodium: 680,
          allergens: ['gluten', 'dairy']
        })
        .expect(201);

      expect(nutritionResponse.body.nutrition.calories).toBe(520);

      // Step 5: Owner adds menu item variants
      const variantResponse = await request(app)
        .post(`/api/v1/menu/${menuItemId}/variants`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Large Size',
          price_adjustment: 12.00,
          is_available: true
        })
        .expect(201);

      expect(variantResponse.body.variant.price_adjustment).toBe(12.00);

      // Step 6: Owner views their restaurant menu
      const menuResponse = await request(app)
        .get(`/api/v1/restaurants/${restaurantId}/menu`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(menuResponse.body.menu_items.length).toBeGreaterThan(0);

      // Step 7: Owner updates menu item
      const updateMenuResponse = await request(app)
        .put(`/api/v1/menu/${menuItemId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          base_price: 50.00,
          description: 'Updated description with fresh ingredients'
        })
        .expect(200);

      expect(updateMenuResponse.body.menu_item.base_price).toBe(50.00);

      // Step 8: Owner updates restaurant details
      const updateRestaurantResponse = await request(app)
        .put(`/api/v1/restaurants/${restaurantId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          description: 'Updated restaurant description',
          average_prep_time: 35
        })
        .expect(200);

      expect(updateRestaurantResponse.body.restaurant.average_prep_time).toBe(35);

      // Step 9: Owner views restaurant analytics
      const analyticsResponse = await request(app)
        .get(`/api/v1/restaurants/${restaurantId}/analytics`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(analyticsResponse.body.analytics).toHaveProperty('total_orders');
      expect(analyticsResponse.body.analytics).toHaveProperty('total_revenue');

      // Step 10: Owner views orders for their restaurant
      const ordersResponse = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(ordersResponse.body).toHaveProperty('orders');

      // Cleanup
      await supabase.from('menu_items').delete().eq('id', menuItemId);
      await supabase.from('restaurants').delete().eq('id', restaurantId);
      await supabase.from('users').delete().eq('id', ownerId);
    });
  });

  describe('Multi-User Order Workflow', () => {
    let ownerToken: string;
    let ownerId: string;
    let customerToken: string;
    let customerId: string;
    let restaurantId: string;
    let menuItemId: string;
    let orderId: string;

    it('should handle complete order lifecycle from customer order to restaurant fulfillment', async () => {
      // Setup: Create owner and restaurant
      const ownerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: `workflow-owner-${Date.now()}@cuts.ae`,
          password: 'OwnerPassword123!',
          first_name: 'Workflow',
          last_name: 'Owner',
          phone: '+971507777777',
          role: UserRole.RESTAURANT_OWNER
        });

      ownerToken = ownerResponse.body.token;
      ownerId = ownerResponse.body.user.id;

      const restaurantResponse = await request(app)
        .post('/api/v1/restaurants')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Workflow Restaurant',
          description: 'For workflow testing',
          cuisine_type: ['Healthy'],
          address: {
            street: '999 Workflow Street',
            city: 'Abu Dhabi',
            state: 'Abu Dhabi',
            postal_code: '99999',
            country: 'UAE'
          },
          phone: '+971509999999',
          email: 'workflow@restaurant.com',
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

      const menuResponse = await request(app)
        .post('/api/v1/menu')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          restaurant_id: restaurantId,
          name: 'Workflow Meal',
          description: 'Test meal',
          base_price: 40.00,
          category: 'lunch',
          is_available: true,
          prep_time: 15
        });

      menuItemId = menuResponse.body.menu_item.id;

      // Setup: Create customer
      const customerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: `workflow-customer-${Date.now()}@cuts.ae`,
          password: 'CustomerPassword123!',
          first_name: 'Workflow',
          last_name: 'Customer',
          phone: '+971508888888',
          role: UserRole.CUSTOMER
        });

      customerToken = customerResponse.body.token;
      customerId = customerResponse.body.user.id;

      // Step 1: Customer places order
      const orderResponse = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          delivery_address: {
            street: '111 Customer Street',
            city: 'Abu Dhabi',
            state: 'Abu Dhabi',
            postal_code: '11111',
            country: 'UAE'
          },
          payment_method: 'card',
          items: [
            {
              menu_item_id: menuItemId,
              quantity: 2
            }
          ]
        })
        .expect(201);

      orderId = orderResponse.body.order.id;
      expect(orderResponse.body.order.status).toBe(OrderStatus.PENDING);

      // Step 2: Restaurant owner sees new order
      const ownerOrdersResponse = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const ownerOrder = ownerOrdersResponse.body.orders.find((o: any) => o.id === orderId);
      expect(ownerOrder).toBeDefined();

      // Step 3: Restaurant confirms order
      const confirmResponse = await request(app)
        .put(`/api/v1/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          status: OrderStatus.CONFIRMED
        })
        .expect(200);

      expect(confirmResponse.body.order.status).toBe(OrderStatus.CONFIRMED);

      // Step 4: Restaurant starts preparing order
      const preparingResponse = await request(app)
        .put(`/api/v1/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          status: OrderStatus.PREPARING
        })
        .expect(200);

      expect(preparingResponse.body.order.status).toBe(OrderStatus.PREPARING);

      // Step 5: Customer checks order status
      const customerOrderResponse = await request(app)
        .get(`/api/v1/orders/${orderId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(customerOrderResponse.body.order.status).toBe(OrderStatus.PREPARING);

      // Step 6: Order is ready
      const readyResponse = await request(app)
        .put(`/api/v1/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          status: OrderStatus.READY
        })
        .expect(200);

      expect(readyResponse.body.order.status).toBe(OrderStatus.READY);

      // Step 7: Order is out for delivery
      const deliveringResponse = await request(app)
        .put(`/api/v1/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          status: OrderStatus.IN_TRANSIT
        })
        .expect(200);

      expect(deliveringResponse.body.order.status).toBe(OrderStatus.IN_TRANSIT);

      // Step 8: Order is delivered
      const deliveredResponse = await request(app)
        .put(`/api/v1/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          status: OrderStatus.DELIVERED
        })
        .expect(200);

      expect(deliveredResponse.body.order.status).toBe(OrderStatus.DELIVERED);

      // Step 9: Customer verifies delivered order
      const finalOrderResponse = await request(app)
        .get(`/api/v1/orders/${orderId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(finalOrderResponse.body.order.status).toBe(OrderStatus.DELIVERED);

      // Cleanup
      await supabase.from('orders').delete().eq('id', orderId);
      await supabase.from('menu_items').delete().eq('id', menuItemId);
      await supabase.from('restaurants').delete().eq('id', restaurantId);
      await supabase.from('users').delete().eq('id', ownerId);
      await supabase.from('users').delete().eq('id', customerId);
    });
  });

  describe('Order Cancellation Workflow', () => {
    let customerToken: string;
    let customerId: string;
    let restaurantId: string;
    let menuItemId: string;
    let orderId: string;

    it('should handle order cancellation by customer', async () => {
      // Setup: Create customer
      const customerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: `cancel-customer-${Date.now()}@cuts.ae`,
          password: 'CustomerPassword123!',
          first_name: 'Cancel',
          last_name: 'Customer',
          phone: '+971506666666',
          role: UserRole.CUSTOMER
        });

      customerToken = customerResponse.body.token;
      customerId = customerResponse.body.user.id;

      // Get existing restaurant and menu item
      const restaurantsResponse = await request(app)
        .get('/api/v1/restaurants')
        .expect(200);

      restaurantId = restaurantsResponse.body.restaurants[0].id;

      const menuResponse = await request(app)
        .get(`/api/v1/restaurants/${restaurantId}/menu?is_available=true`)
        .expect(200);

      menuItemId = menuResponse.body.menu_items[0].id;

      // Step 1: Customer places order
      const orderResponse = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          delivery_address: {
            street: '222 Cancel Street',
            city: 'Abu Dhabi',
            state: 'Abu Dhabi',
            postal_code: '22222',
            country: 'UAE'
          },
          payment_method: 'card',
          items: [
            {
              menu_item_id: menuItemId,
              quantity: 1
            }
          ]
        })
        .expect(201);

      orderId = orderResponse.body.order.id;

      // Step 2: Customer cancels order
      const cancelResponse = await request(app)
        .post(`/api/v1/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          cancellation_reason: 'Changed my mind'
        })
        .expect(200);

      expect(cancelResponse.body.order.status).toBe(OrderStatus.CANCELLED);
      expect(cancelResponse.body.order.cancellation_reason).toBe('Changed my mind');

      // Step 3: Verify order is cancelled
      const orderCheckResponse = await request(app)
        .get(`/api/v1/orders/${orderId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(orderCheckResponse.body.order.status).toBe(OrderStatus.CANCELLED);

      // Cleanup
      await supabase.from('orders').delete().eq('id', orderId);
      await supabase.from('users').delete().eq('id', customerId);
    });
  });
});
