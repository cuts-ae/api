import request from 'supertest';
import jwt from 'jsonwebtoken';
import express from 'express';
import pool from '../../config/database';
import { UserRole, OrderStatus, PaymentStatus } from '../../types';
import orderRoutes from '../../routes/order.routes';
import { errorHandler } from '../../middleware/errorHandler';
import { rbacMiddleware } from '../../middleware/rbac';
import { authenticate } from '../../middleware/auth';

jest.mock('../../config/database');

const mockQuery = pool.query as jest.Mock;

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-testing-only-do-not-use-in-production';

// Create a test app without starting the server
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply authentication middleware
app.use((req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authenticate(req as any, res, next);
  }
  next();
});

// Apply RBAC middleware
app.use(rbacMiddleware);

// Mount order routes
app.use('/api/v1/orders', orderRoutes);

// Error handler
app.use(errorHandler);

describe('Order Routes Integration Tests', () => {
  let customerToken: string;
  let restaurantOwnerToken: string;
  let driverToken: string;
  let adminToken: string;
  let supportToken: string;

  const customerId = 'ff338594-01f4-449d-bea2-8bed6fd7f2fe';
  const restaurantOwnerId = 'aeee4fe6-14a8-4348-ba3f-77ee1c7ec6d2';
  const driverId = '204bc1c9-46e7-4ef8-9f9a-558d67d6165a';
  const adminId = '0ed3f901-b754-4be9-af64-0790de73c153';
  const supportId = 'b4d4cb4c-1637-4d97-9f98-46dbe60a7d67';
  const restaurantId = 'f481185d-129f-4847-bdf6-d57ca0ff13f6';
  const restaurant2Id = 'dff247f8-d2d9-4327-9ddc-9da8347ea578';
  const restaurant3Id = '07ed9f60-3f64-4c6f-bcbf-6a216d220ddf';

  beforeAll(() => {
    customerToken = jwt.sign(
      { userId: customerId, email: 'customer@cuts.ae', role: UserRole.CUSTOMER },
      JWT_SECRET
    );
    restaurantOwnerToken = jwt.sign(
      { userId: restaurantOwnerId, email: 'owner@cuts.ae', role: UserRole.RESTAURANT_OWNER },
      JWT_SECRET
    );
    driverToken = jwt.sign(
      { userId: driverId, email: 'driver@cuts.ae', role: UserRole.DRIVER },
      JWT_SECRET
    );
    adminToken = jwt.sign(
      { userId: adminId, email: 'admin@cuts.ae', role: UserRole.ADMIN },
      JWT_SECRET
    );
    supportToken = jwt.sign(
      { userId: supportId, email: 'support@cuts.ae', role: UserRole.SUPPORT },
      JWT_SECRET
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const validAddress = {
    street: '123 Sheikh Zayed Road',
    city: 'Dubai',
    state: 'Dubai',
    postal_code: '12345',
    country: 'UAE'
  };

  describe('POST /api/v1/orders - Create Order', () => {
    const validOrderData = {
      items: [
        {
          menu_item_id: '46cc47d7-25b0-4a01-84b0-85a1b899b234',
          restaurant_id: restaurantId,
          quantity: 2,
          special_instructions: 'No onions please'
        },
        {
          menu_item_id: '4be24b46-6e24-48eb-8c96-6d3cacccc6bb',
          restaurant_id: restaurantId,
          quantity: 1
        }
      ],
      delivery_address: validAddress,
      delivery_instructions: 'Ring the doorbell twice'
    };

    const mockMenuItems = [
      {
        id: '46cc47d7-25b0-4a01-84b0-85a1b899b234',
        base_price: 50,
        restaurant_id: restaurantId,
        is_available: true,
        nutritional_info: [{
          calories: 500,
          protein: 30,
          carbohydrates: 40,
          fat: 20
        }]
      },
      {
        id: '4be24b46-6e24-48eb-8c96-6d3cacccc6bb',
        base_price: 30,
        restaurant_id: restaurantId,
        is_available: true,
        nutritional_info: [{
          calories: 300,
          protein: 20,
          carbohydrates: 25,
          fat: 15
        }]
      }
    ];

    it('should create order successfully with single restaurant', async () => {
      const mockOrder = {
        id: 'order-123',
        order_number: 'ABC12345',
        customer_id: customerId,
        restaurants: [restaurantId],
        status: OrderStatus.PENDING,
        subtotal: 130,
        delivery_fee: 10,
        service_fee: 6.5,
        total_amount: 146.5,
        payment_status: PaymentStatus.PENDING
      };

      const mockCompleteOrder = {
        ...mockOrder,
        order_items: [
          {
            id: 'order-item-1',
            menu_item_id: '46cc47d7-25b0-4a01-84b0-85a1b899b234',
            quantity: 2,
            base_price: 50,
            item_total: 100,
            special_instructions: 'No onions please',
            menu_items: { name: 'Grilled Chicken', image_url: 'chicken.jpg' }
          },
          {
            id: 'order-item-2',
            menu_item_id: '4be24b46-6e24-48eb-8c96-6d3cacccc6bb',
            quantity: 1,
            base_price: 30,
            item_total: 30,
            special_instructions: null,
            menu_items: { name: 'Caesar Salad', image_url: 'salad.jpg' }
          }
        ]
      };

      mockQuery
        .mockResolvedValueOnce({ rows: mockMenuItems, rowCount: 2 })
        .mockResolvedValueOnce({ rows: [mockOrder], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [mockCompleteOrder], rowCount: 1 });

      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(validOrderData);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Order created successfully');
      expect(response.body.order).toBeDefined();
      expect(response.body.order.order_number).toBe('ABC12345');
      expect(response.body.order.customer_id).toBe(customerId);
      expect(response.body.order.subtotal).toBe(130);
      expect(response.body.order.delivery_fee).toBe(10);
      expect(response.body.order.service_fee).toBe(6.5);
      expect(response.body.order.total_amount).toBe(146.5);
      expect(response.body.order.status).toBe(OrderStatus.PENDING);
    });

    it('should create order with multiple restaurants (2 restaurants)', async () => {
      const twoRestaurantOrder = {
        ...validOrderData,
        items: [
          { menu_item_id: '46cc47d7-25b0-4a01-84b0-85a1b899b234', restaurant_id: restaurantId, quantity: 2 },
          { menu_item_id: '4be24b46-6e24-48eb-8c96-6d3cacccc6bb', restaurant_id: restaurant2Id, quantity: 1 }
        ]
      };

      const twoRestaurantMenuItems = [
        { ...mockMenuItems[0], restaurant_id: restaurantId },
        { ...mockMenuItems[1], restaurant_id: restaurant2Id }
      ];

      const mockOrder = {
        id: 'order-124',
        order_number: 'DEF67890',
        customer_id: customerId,
        restaurants: [restaurantId, restaurant2Id],
        status: OrderStatus.PENDING,
        subtotal: 130,
        delivery_fee: 10,
        service_fee: 6.5,
        total_amount: 146.5,
        payment_status: PaymentStatus.PENDING
      };

      mockQuery
        .mockResolvedValueOnce({ rows: twoRestaurantMenuItems, rowCount: 2 })
        .mockResolvedValueOnce({ rows: [mockOrder], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [{ ...mockOrder, order_items: [] }], rowCount: 1 });

      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(twoRestaurantOrder);

      expect(response.status).toBe(201);
      expect(response.body.order.restaurants).toHaveLength(2);
    });

    it('should create order with special instructions', async () => {
      const orderWithInstructions = {
        ...validOrderData,
        items: [
          {
            menu_item_id: '46cc47d7-25b0-4a01-84b0-85a1b899b234',
            restaurant_id: restaurantId,
            quantity: 1,
            special_instructions: 'Extra spicy, no cilantro, well done'
          }
        ]
      };

      const mockOrder = {
        id: 'order-125',
        order_number: 'GHI11223',
        customer_id: customerId,
        restaurants: [restaurantId],
        status: OrderStatus.PENDING,
        subtotal: 50,
        delivery_fee: 10,
        service_fee: 2.5,
        total_amount: 62.5,
        payment_status: PaymentStatus.PENDING
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockMenuItems[0]], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [mockOrder], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [{ ...mockOrder, order_items: [] }], rowCount: 1 });

      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(orderWithInstructions);

      expect(response.status).toBe(201);
    });

    it('should reject order with more than 2 restaurants', async () => {
      const threeRestaurantOrder = {
        ...validOrderData,
        items: [
          { menu_item_id: '46cc47d7-25b0-4a01-84b0-85a1b899b234', restaurant_id: restaurantId, quantity: 1 },
          { menu_item_id: '4be24b46-6e24-48eb-8c96-6d3cacccc6bb', restaurant_id: restaurant2Id, quantity: 1 },
          { menu_item_id: '7f128d44-199e-4f9c-80ba-9f95d80d015f', restaurant_id: restaurant3Id, quantity: 1 }
        ]
      };

      const threeRestaurantMenuItems = [
        { id: '46cc47d7-25b0-4a01-84b0-85a1b899b234', base_price: 50, restaurant_id: restaurantId, is_available: true, nutritional_info: null },
        { id: '4be24b46-6e24-48eb-8c96-6d3cacccc6bb', base_price: 30, restaurant_id: restaurant2Id, is_available: true, nutritional_info: null },
        { id: '7f128d44-199e-4f9c-80ba-9f95d80d015f', base_price: 40, restaurant_id: restaurant3Id, is_available: true, nutritional_info: null }
      ];

      mockQuery.mockResolvedValueOnce({ rows: threeRestaurantMenuItems, rowCount: 3 });

      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(threeRestaurantOrder);

      expect(response.status).toBe(400);
      expect(response.body.message || response.body.error).toContain('Cannot order from more than 2 restaurants');
    });

    it('should reject order when menu item not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockMenuItems[0]], rowCount: 1 });

      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(validOrderData);

      expect(response.status).toBe(400);
      expect(response.body.message || response.body.error).toContain('One or more menu items not found');
    });

    it('should reject order when menu item is unavailable', async () => {
      const unavailableItems = [
        { ...mockMenuItems[0], is_available: false },
        mockMenuItems[1]
      ];

      mockQuery.mockResolvedValueOnce({ rows: unavailableItems, rowCount: 2 });

      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(validOrderData);

      expect(response.status).toBe(400);
      expect(response.body.message || response.body.error).toContain('not available');
    });

    it('should calculate delivery fee correctly', async () => {
      const mockOrder = {
        id: 'order-126',
        order_number: 'JKL44556',
        customer_id: customerId,
        restaurants: [restaurantId],
        status: OrderStatus.PENDING,
        subtotal: 130,
        delivery_fee: 10,
        service_fee: 6.5,
        total_amount: 146.5,
        payment_status: PaymentStatus.PENDING
      };

      mockQuery
        .mockResolvedValueOnce({ rows: mockMenuItems, rowCount: 2 })
        .mockResolvedValueOnce({ rows: [mockOrder], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [{ ...mockOrder, order_items: [] }], rowCount: 1 });

      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(validOrderData);

      expect(response.status).toBe(201);
      expect(response.body.order.delivery_fee).toBe(10);
    });

    it('should calculate platform fee correctly (5% of subtotal)', async () => {
      const mockOrder = {
        id: 'order-127',
        order_number: 'MNO77889',
        customer_id: customerId,
        restaurants: [restaurantId],
        status: OrderStatus.PENDING,
        subtotal: 130,
        delivery_fee: 10,
        service_fee: 6.5,
        total_amount: 146.5,
        payment_status: PaymentStatus.PENDING
      };

      mockQuery
        .mockResolvedValueOnce({ rows: mockMenuItems, rowCount: 2 })
        .mockResolvedValueOnce({ rows: [mockOrder], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [{ ...mockOrder, order_items: [] }], rowCount: 1 });

      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(validOrderData);

      expect(response.status).toBe(201);
      expect(response.body.order.service_fee).toBe(6.5);
    });

    it('should calculate total correctly', async () => {
      const mockOrder = {
        id: 'order-128',
        order_number: 'PQR00112',
        customer_id: customerId,
        restaurants: [restaurantId],
        status: OrderStatus.PENDING,
        subtotal: 130,
        delivery_fee: 10,
        service_fee: 6.5,
        total_amount: 146.5,
        payment_status: PaymentStatus.PENDING
      };

      mockQuery
        .mockResolvedValueOnce({ rows: mockMenuItems, rowCount: 2 })
        .mockResolvedValueOnce({ rows: [mockOrder], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [{ ...mockOrder, order_items: [] }], rowCount: 1 });

      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(validOrderData);

      expect(response.status).toBe(201);
      expect(response.body.order.total_amount).toBe(146.5);
      expect(response.body.order.total_amount).toBe(
        response.body.order.subtotal +
        response.body.order.delivery_fee +
        response.body.order.service_fee
      );
    });

    it('should reject order without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/orders')
        .send(validOrderData);

      expect(response.status).toBe(401);
    });

    it('should reject order with invalid validation', async () => {
      const invalidOrder = {
        items: [],
        delivery_address: {}
      };

      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(invalidOrder);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/v1/orders/:id - Get Order by ID', () => {
    const mockOrder = {
      id: 'order-123',
      order_number: 'ABC12345',
      customer_id: customerId,
      restaurants: [restaurantId],
      status: OrderStatus.PENDING,
      subtotal: 130,
      delivery_fee: 10,
      service_fee: 6.5,
      total_amount: 146.5,
      payment_status: PaymentStatus.PENDING,
      order_items: [
        {
          id: 'order-item-1',
          menu_item_id: '46cc47d7-25b0-4a01-84b0-85a1b899b234',
          quantity: 2,
          base_price: 50,
          item_total: 100,
          menu_items: {
            name: 'Grilled Chicken',
            image_url: 'chicken.jpg',
            restaurants: { name: 'Healthy Bites' }
          }
        }
      ]
    };

    it('should get order by ID for customer owner', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockOrder], rowCount: 1 });

      const response = await request(app)
        .get('/api/v1/orders/order-123')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.order).toBeDefined();
      expect(response.body.order.id).toBe('order-123');
      expect(response.body.order.customer_id).toBe(customerId);
    });

    it('should get order by ID for admin', async () => {
      const differentCustomerOrder = {
        ...mockOrder,
        customer_id: 'different-customer-999'
      };

      mockQuery.mockResolvedValueOnce({ rows: [differentCustomerOrder], rowCount: 1 });

      const response = await request(app)
        .get('/api/v1/orders/order-123')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.order).toBeDefined();
    });

    it('should get order by ID for restaurant owner', async () => {
      const differentCustomerOrder = {
        ...mockOrder,
        customer_id: 'different-customer-999'
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [differentCustomerOrder], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ id: restaurantId }], rowCount: 1 });

      const response = await request(app)
        .get('/api/v1/orders/order-123')
        .set('Authorization', `Bearer ${restaurantOwnerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.order).toBeDefined();
    });

    it('should return 404 when order not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const response = await request(app)
        .get('/api/v1/orders/non-existent')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(404);
      const errorMessage = response.body.message || response.body.error;
      expect(errorMessage).toContain('Order not found');
    });

    it('should return 403 when customer tries to access another customer order', async () => {
      const differentCustomerOrder = {
        ...mockOrder,
        customer_id: 'different-customer-999',
        restaurants: [restaurantId]
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [differentCustomerOrder], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const response = await request(app)
        .get('/api/v1/orders/order-123')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(403);
      const errorMessage = response.body.message || response.body.error;
      expect(errorMessage).toContain('Forbidden');
    });

    it('should return 403 when restaurant owner tries to access order from different restaurant', async () => {
      const differentRestaurantOrder = {
        ...mockOrder,
        customer_id: 'different-customer-999',
        restaurants: ['different-restaurant-999']
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [differentRestaurantOrder], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const response = await request(app)
        .get('/api/v1/orders/order-123')
        .set('Authorization', `Bearer ${restaurantOwnerToken}`);

      expect(response.status).toBe(403);
      const errorMessage = response.body.message || response.body.error;
      expect(errorMessage).toContain('Forbidden');
    });

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/orders/order-123');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/orders - List Orders', () => {
    const mockOrders = [
      {
        id: 'order-1',
        order_number: 'ABC12345',
        status: OrderStatus.PENDING,
        total_amount: 146.5,
        delivery_fee: 10,
        service_fee: 6.5,
        created_at: new Date('2025-11-20T10:00:00Z'),
        updated_at: new Date('2025-11-20T10:00:00Z'),
        delivery_address: { street: '123 Main St' },
        users: {
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
          phone: '+971501234567'
        },
        order_items: [
          {
            id: '46cc47d7-25b0-4a01-84b0-85a1b899b234',
            menu_item_id: 'menu-1',
            quantity: 2,
            base_price: 50,
            item_total: 100,
            special_instructions: null,
            menu_items: { name: 'Grilled Chicken', image_url: 'chicken.jpg' }
          }
        ]
      },
      {
        id: 'order-2',
        order_number: 'DEF67890',
        status: OrderStatus.CONFIRMED,
        total_amount: 89.25,
        delivery_fee: 10,
        service_fee: 3.75,
        created_at: new Date('2025-11-20T11:00:00Z'),
        updated_at: new Date('2025-11-20T11:00:00Z'),
        delivery_address: { street: '456 Palm St' },
        users: {
          first_name: 'Jane',
          last_name: 'Smith',
          email: 'jane@example.com',
          phone: '+971509876543'
        },
        order_items: []
      }
    ];

    it('should get orders for customer', async () => {
      mockQuery.mockResolvedValueOnce({ rows: mockOrders, rowCount: 2 });

      const response = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.orders).toBeDefined();
      expect(response.body.orders).toHaveLength(2);
    });

    it('should get orders for restaurant owner', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: restaurantId }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: mockOrders, rowCount: 2 });

      const response = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${restaurantOwnerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.orders).toBeDefined();
      expect(response.body.orders).toHaveLength(2);
    });

    it('should return empty array when restaurant owner has no restaurants', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const response = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${restaurantOwnerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.orders).toEqual([]);
    });

    it('should get all orders for admin', async () => {
      mockQuery.mockResolvedValueOnce({ rows: mockOrders, rowCount: 2 });

      const response = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.orders).toBeDefined();
      expect(response.body.orders).toHaveLength(2);
    });

    it('should filter orders by status', async () => {
      const confirmedOrders = [mockOrders[1]];
      mockQuery.mockResolvedValueOnce({ rows: confirmedOrders, rowCount: 1 });

      const response = await request(app)
        .get('/api/v1/orders?status=confirmed')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.orders).toHaveLength(1);
      expect(response.body.orders[0].status).toBe(OrderStatus.CONFIRMED);
    });

    it('should filter orders by restaurant_id', async () => {
      mockQuery.mockResolvedValueOnce({ rows: mockOrders, rowCount: 2 });

      const response = await request(app)
        .get(`/api/v1/orders?restaurant_id=${restaurantId}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.orders).toBeDefined();
    });

    it('should filter orders by both status and restaurant_id', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockOrders[1]], rowCount: 1 });

      const response = await request(app)
        .get(`/api/v1/orders?status=confirmed&restaurant_id=${restaurantId}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.orders).toBeDefined();
    });

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/orders');

      expect(response.status).toBe(401);
    });
  });

  describe('PATCH /api/v1/orders/:id/status - Update Order Status', () => {
    it('should update order status by admin', async () => {
      const updatedOrder = {
        id: 'order-123',
        order_number: 'ABC12345',
        status: OrderStatus.PREPARING,
        updated_at: new Date()
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [{ restaurants: [restaurantId] }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [updatedOrder], rowCount: 1 });

      const response = await request(app)
        .patch('/api/v1/orders/order-123/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: OrderStatus.PREPARING });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Order status updated successfully');
      expect(response.body.order.status).toBe(OrderStatus.PREPARING);
    });

    it('should update order status by restaurant owner', async () => {
      const updatedOrder = {
        id: 'order-123',
        order_number: 'ABC12345',
        status: OrderStatus.PREPARING,
        updated_at: new Date()
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [{ restaurants: [restaurantId] }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ id: restaurantId }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [updatedOrder], rowCount: 1 });

      const response = await request(app)
        .patch('/api/v1/orders/order-123/status')
        .set('Authorization', `Bearer ${restaurantOwnerToken}`)
        .send({ status: OrderStatus.PREPARING });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Order status updated successfully');
    });

    it('should support all valid status transitions', async () => {
      const statuses = [
        OrderStatus.CONFIRMED,
        OrderStatus.PREPARING,
        OrderStatus.READY,
        OrderStatus.PICKED_UP,
        OrderStatus.IN_TRANSIT,
        OrderStatus.DELIVERED
      ];

      for (const status of statuses) {
        mockQuery
          .mockResolvedValueOnce({ rows: [{ restaurants: [restaurantId] }], rowCount: 1 })
          .mockResolvedValueOnce({ rows: [{ id: 'order-123', status }], rowCount: 1 });

        const response = await request(app)
          .patch('/api/v1/orders/order-123/status')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ status });

        expect(response.status).toBe(200);
        expect(response.body.order.status).toBe(status);

        jest.clearAllMocks();
      }
    });

    it('should return 404 when order not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const response = await request(app)
        .patch('/api/v1/orders/non-existent/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: OrderStatus.PREPARING });

      expect(response.status).toBe(404);
      const errorMessage = response.body.message || response.body.error;
      expect(errorMessage).toContain('Order not found');
    });

    it('should return 403 when restaurant owner tries to update order from different restaurant', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ restaurants: ['different-restaurant-999'] }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const response = await request(app)
        .patch('/api/v1/orders/order-123/status')
        .set('Authorization', `Bearer ${restaurantOwnerToken}`)
        .send({ status: OrderStatus.PREPARING });

      expect(response.status).toBe(403);
      const errorMessage = response.body.message || response.body.error;
      expect(errorMessage).toContain('Forbidden');
    });

    it('should return 403 when customer tries to update order status', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ restaurants: [restaurantId] }], rowCount: 1 });

      const response = await request(app)
        .patch('/api/v1/orders/order-123/status')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ status: OrderStatus.PREPARING });

      expect(response.status).toBe(403);
    });

    it('should allow driver to update order status', async () => {
      const updatedOrder = {
        id: 'order-123',
        order_number: 'ABC12345',
        status: OrderStatus.PICKED_UP,
        updated_at: new Date()
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [{ restaurants: [restaurantId] }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [updatedOrder], rowCount: 1 });

      const response = await request(app)
        .patch('/api/v1/orders/order-123/status')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ status: OrderStatus.PICKED_UP });

      expect(response.status).toBe(200);
      expect(response.body.order.status).toBe(OrderStatus.PICKED_UP);
    });

    it('should reject request with invalid status', async () => {
      const response = await request(app)
        .patch('/api/v1/orders/order-123/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'invalid_status' });

      expect(response.status).toBe(400);
    });

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .patch('/api/v1/orders/order-123/status')
        .send({ status: OrderStatus.PREPARING });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/v1/orders/:id/cancel - Cancel Order', () => {
    it('should cancel order by customer', async () => {
      const mockOrder = {
        customer_id: customerId,
        status: OrderStatus.PENDING
      };

      const cancelledOrder = {
        id: 'order-123',
        order_number: 'ABC12345',
        customer_id: customerId,
        status: OrderStatus.CANCELLED,
        updated_at: new Date()
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockOrder], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [cancelledOrder], rowCount: 1 });

      const response = await request(app)
        .post('/api/v1/orders/order-123/cancel')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ reason: 'Changed my mind about the order' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Order cancelled successfully');
      expect(response.body.order.status).toBe(OrderStatus.CANCELLED);
    });

    it('should cancel order by admin', async () => {
      const mockOrder = {
        customer_id: 'different-customer-999',
        status: OrderStatus.CONFIRMED
      };

      const cancelledOrder = {
        id: 'order-123',
        order_number: 'ABC12345',
        customer_id: 'different-customer-999',
        status: OrderStatus.CANCELLED,
        updated_at: new Date()
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockOrder], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [cancelledOrder], rowCount: 1 });

      const response = await request(app)
        .post('/api/v1/orders/order-123/cancel')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Administrative cancellation due to policy violation' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Order cancelled successfully');
    });

    it('should allow cancellation when order is pending', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ customer_id: customerId, status: OrderStatus.PENDING }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ id: 'order-123', status: OrderStatus.CANCELLED }], rowCount: 1 });

      const response = await request(app)
        .post('/api/v1/orders/order-123/cancel')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ reason: 'Testing cancellation on pending order' });

      expect(response.status).toBe(200);
    });

    it('should allow cancellation when order is confirmed', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ customer_id: customerId, status: OrderStatus.CONFIRMED }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ id: 'order-123', status: OrderStatus.CANCELLED }], rowCount: 1 });

      const response = await request(app)
        .post('/api/v1/orders/order-123/cancel')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ reason: 'Testing cancellation on confirmed order' });

      expect(response.status).toBe(200);
    });

    it('should allow cancellation when order is preparing', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ customer_id: customerId, status: OrderStatus.PREPARING }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ id: 'order-123', status: OrderStatus.CANCELLED }], rowCount: 1 });

      const response = await request(app)
        .post('/api/v1/orders/order-123/cancel')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ reason: 'Testing cancellation on preparing order' });

      expect(response.status).toBe(200);
    });

    it('should allow cancellation when order is ready', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ customer_id: customerId, status: OrderStatus.READY }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ id: 'order-123', status: OrderStatus.CANCELLED }], rowCount: 1 });

      const response = await request(app)
        .post('/api/v1/orders/order-123/cancel')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ reason: 'Testing cancellation on ready order' });

      expect(response.status).toBe(200);
    });

    it('should reject cancellation when order is picked up', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ customer_id: customerId, status: OrderStatus.PICKED_UP }],
        rowCount: 1
      });

      const response = await request(app)
        .post('/api/v1/orders/order-123/cancel')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ reason: 'Attempting to cancel picked up order' });

      expect(response.status).toBe(400);
      const errorMessage = response.body.message || response.body.error;
      expect(errorMessage).toContain('Cannot cancel order at this stage');
    });

    it('should reject cancellation when order is in transit', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ customer_id: customerId, status: OrderStatus.IN_TRANSIT }],
        rowCount: 1
      });

      const response = await request(app)
        .post('/api/v1/orders/order-123/cancel')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ reason: 'Attempting to cancel in-transit order' });

      expect(response.status).toBe(400);
      const errorMessage = response.body.message || response.body.error;
      expect(errorMessage).toContain('Cannot cancel order at this stage');
    });

    it('should reject cancellation when order is delivered', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ customer_id: customerId, status: OrderStatus.DELIVERED }],
        rowCount: 1
      });

      const response = await request(app)
        .post('/api/v1/orders/order-123/cancel')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ reason: 'Attempting to cancel delivered order' });

      expect(response.status).toBe(400);
      const errorMessage = response.body.message || response.body.error;
      expect(errorMessage).toContain('Cannot cancel order at this stage');
    });

    it('should return 404 when order not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const response = await request(app)
        .post('/api/v1/orders/non-existent/cancel')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ reason: 'Attempting to cancel non-existent order' });

      expect(response.status).toBe(404);
      const errorMessage = response.body.message || response.body.error;
      expect(errorMessage).toContain('Order not found');
    });

    it('should return 403 when customer tries to cancel another customer order', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ customer_id: 'different-customer-999', status: OrderStatus.PENDING }],
        rowCount: 1
      });

      const response = await request(app)
        .post('/api/v1/orders/order-123/cancel')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ reason: 'Attempting to cancel someone else order' });

      expect(response.status).toBe(403);
      const errorMessage = response.body.message || response.body.error;
      expect(errorMessage).toContain('Forbidden');
    });

    it('should return 403 when restaurant owner tries to cancel order', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ customer_id: customerId, status: OrderStatus.CONFIRMED }],
        rowCount: 1
      });

      const response = await request(app)
        .post('/api/v1/orders/order-123/cancel')
        .set('Authorization', `Bearer ${restaurantOwnerToken}`)
        .send({ reason: 'Restaurant owner attempting cancellation' });

      expect(response.status).toBe(403);
      const errorMessage = response.body.message || response.body.error;
      expect(errorMessage).toBeDefined();
    });

    it('should return 403 when driver tries to cancel order', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ customer_id: customerId, status: OrderStatus.IN_TRANSIT }],
        rowCount: 1
      });

      const response = await request(app)
        .post('/api/v1/orders/order-123/cancel')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ reason: 'Driver attempting cancellation' });

      expect(response.status).toBe(403);
    });

    it('should reject request with short reason (less than 10 characters)', async () => {
      const response = await request(app)
        .post('/api/v1/orders/order-123/cancel')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ reason: 'Short' });

      expect(response.status).toBe(400);
    });

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/orders/order-123/cancel')
        .send({ reason: 'Unauthenticated cancellation attempt' });

      expect(response.status).toBe(401);
    });
  });

  describe('Role-Based Access Control Tests', () => {
    it('should allow customer to create orders', async () => {
      const mockOrder = {
        id: 'order-999',
        order_number: 'CUS99999',
        customer_id: customerId,
        restaurants: [restaurantId],
        status: OrderStatus.PENDING,
        subtotal: 50,
        delivery_fee: 10,
        service_fee: 2.5,
        total_amount: 62.5,
        payment_status: PaymentStatus.PENDING
      };

      const mockMenuItem = {
        id: '46cc47d7-25b0-4a01-84b0-85a1b899b234',
        base_price: 50,
        restaurant_id: restaurantId,
        is_available: true,
        nutritional_info: null
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockMenuItem], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [mockOrder], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [{ ...mockOrder, order_items: [] }], rowCount: 1 });

      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          items: [{ menu_item_id: '46cc47d7-25b0-4a01-84b0-85a1b899b234', restaurant_id: restaurantId, quantity: 1 }],
          delivery_address: {
            street: '123 Main St',
            city: 'Dubai',
            state: 'Dubai',
            postal_code: '12345',
            country: 'UAE'
          }
        });

      expect(response.status).toBe(201);
    });

    it('should allow customer to view own orders', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const response = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(200);
    });

    it('should not allow customer to update order status', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ restaurants: [restaurantId] }], rowCount: 1 });

      const response = await request(app)
        .patch('/api/v1/orders/order-123/status')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ status: OrderStatus.CONFIRMED });

      expect(response.status).toBe(403);
    });

    it('should allow restaurant owner to view orders for their restaurants', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: restaurantId }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const response = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${restaurantOwnerToken}`);

      expect(response.status).toBe(200);
    });

    it('should allow restaurant owner to update order status', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ restaurants: [restaurantId] }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ id: restaurantId }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ id: 'order-123', status: OrderStatus.PREPARING }], rowCount: 1 });

      const response = await request(app)
        .patch('/api/v1/orders/order-123/status')
        .set('Authorization', `Bearer ${restaurantOwnerToken}`)
        .send({ status: OrderStatus.PREPARING });

      expect(response.status).toBe(200);
    });

    it('should not allow restaurant owner to cancel orders', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ customer_id: customerId, status: OrderStatus.CONFIRMED }],
        rowCount: 1
      });

      const response = await request(app)
        .post('/api/v1/orders/order-123/cancel')
        .set('Authorization', `Bearer ${restaurantOwnerToken}`)
        .send({ reason: 'Restaurant owner cancellation attempt' });

      expect(response.status).toBe(403);
    });

    it('should allow admin to view all orders', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const response = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });

    it('should allow admin to update any order status', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ restaurants: [restaurantId] }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ id: 'order-123', status: OrderStatus.DELIVERED }], rowCount: 1 });

      const response = await request(app)
        .patch('/api/v1/orders/order-123/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: OrderStatus.DELIVERED });

      expect(response.status).toBe(200);
    });

    it('should allow admin to cancel any order', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ customer_id: 'any-customer', status: OrderStatus.CONFIRMED }],
          rowCount: 1
        })
        .mockResolvedValueOnce({ rows: [{ id: 'order-123', status: OrderStatus.CANCELLED }], rowCount: 1 });

      const response = await request(app)
        .post('/api/v1/orders/order-123/cancel')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Admin cancellation for testing purposes' });

      expect(response.status).toBe(200);
    });

    it('should not allow driver to create orders', async () => {
      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          items: [{ menu_item_id: '46cc47d7-25b0-4a01-84b0-85a1b899b234', restaurant_id: restaurantId, quantity: 1 }],
          delivery_address: {
            street: '123 Main St',
            city: 'Dubai',
            state: 'Dubai',
            postal_code: '12345',
            country: 'UAE'
          }
        });

      expect(response.status).toBe(403);
    });

    it('should allow driver to update order status', async () => {
      const updatedOrder = {
        id: 'order-123',
        order_number: 'ABC12345',
        status: OrderStatus.IN_TRANSIT,
        updated_at: new Date()
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [{ restaurants: [restaurantId] }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [updatedOrder], rowCount: 1 });

      const response = await request(app)
        .patch('/api/v1/orders/order-123/status')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ status: OrderStatus.IN_TRANSIT });

      expect(response.status).toBe(200);
      expect(response.body.order.status).toBe(OrderStatus.IN_TRANSIT);
    });

    it('should not allow support to cancel orders', async () => {
      const response = await request(app)
        .post('/api/v1/orders/order-123/cancel')
        .set('Authorization', `Bearer ${supportToken}`)
        .send({ reason: 'Support cancellation attempt' });

      expect(response.status).toBe(403);
    });
  });

  describe('Business Logic Tests', () => {
    it('should calculate fees correctly for different subtotals', async () => {
      const testCases = [
        { subtotal: 100, expected_service_fee: 5, expected_total: 115 },
        { subtotal: 200, expected_service_fee: 10, expected_total: 220 },
        { subtotal: 50, expected_service_fee: 2.5, expected_total: 62.5 }
      ];

      for (const testCase of testCases) {
        const mockMenuItem = {
          id: 'item-test',
          base_price: testCase.subtotal,
          restaurant_id: restaurantId,
          is_available: true,
          nutritional_info: null
        };

        const mockOrder = {
          id: 'order-test',
          order_number: 'TEST12345',
          customer_id: customerId,
          restaurants: [restaurantId],
          status: OrderStatus.PENDING,
          subtotal: testCase.subtotal,
          delivery_fee: 10,
          service_fee: testCase.expected_service_fee,
          total_amount: testCase.expected_total,
          payment_status: PaymentStatus.PENDING
        };

        mockQuery
          .mockResolvedValueOnce({ rows: [mockMenuItem], rowCount: 1 })
          .mockResolvedValueOnce({ rows: [mockOrder], rowCount: 1 })
          .mockResolvedValueOnce({ rows: [], rowCount: 0 })
          .mockResolvedValueOnce({ rows: [{ ...mockOrder, order_items: [] }], rowCount: 1 });

        const response = await request(app)
          .post('/api/v1/orders')
          .set('Authorization', `Bearer ${customerToken}`)
          .send({
            items: [{ menu_item_id: 'item-test', restaurant_id: restaurantId, quantity: 1 }],
            delivery_address: {
              street: '123 Main St',
              city: 'Dubai',
              state: 'Dubai',
              postal_code: '12345',
              country: 'UAE'
            }
          });

        expect(response.status).toBe(201);
        expect(response.body.order.service_fee).toBe(testCase.expected_service_fee);
        expect(response.body.order.total_amount).toBe(testCase.expected_total);

        jest.clearAllMocks();
      }
    });

    it('should maintain order status workflow integrity', async () => {
      const validTransitions = [
        { from: OrderStatus.PENDING, to: OrderStatus.CONFIRMED },
        { from: OrderStatus.CONFIRMED, to: OrderStatus.PREPARING },
        { from: OrderStatus.PREPARING, to: OrderStatus.READY },
        { from: OrderStatus.READY, to: OrderStatus.PICKED_UP },
        { from: OrderStatus.PICKED_UP, to: OrderStatus.IN_TRANSIT },
        { from: OrderStatus.IN_TRANSIT, to: OrderStatus.DELIVERED }
      ];

      for (const transition of validTransitions) {
        mockQuery
          .mockResolvedValueOnce({ rows: [{ restaurants: [restaurantId] }], rowCount: 1 })
          .mockResolvedValueOnce({ rows: [{ id: 'order-123', status: transition.to }], rowCount: 1 });

        const response = await request(app)
          .patch('/api/v1/orders/order-123/status')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ status: transition.to });

        expect(response.status).toBe(200);
        expect(response.body.order.status).toBe(transition.to);

        jest.clearAllMocks();
      }
    });
  });
});
