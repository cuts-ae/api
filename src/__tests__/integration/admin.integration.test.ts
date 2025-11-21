import request from 'supertest';
import express from 'express';
import adminRoutes from '../../routes/admin.routes';
import pool from '../../config/database';
import jwt from 'jsonwebtoken';
import { UserRole } from '../../types';
import { rbacMiddleware } from '../../middleware/rbac';
import { authenticate } from '../../middleware/auth';
import { errorHandler } from '../../middleware/errorHandler';

jest.mock('../../config/database', () => ({
  query: jest.fn(),
}));

const createTestApp = () => {
  const app = express();
  app.use(express.json());

  app.use((req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authenticate(req as any, res, next);
    }
    next();
  });

  app.use(rbacMiddleware);
  app.use('/api/v1/admin', adminRoutes);

  // Add error handler middleware (must be last)
  app.use(errorHandler);

  return app;
};

describe('Admin Integration Tests', () => {
  let app: express.Application;
  let adminToken: string;
  let customerToken: string;
  let restaurantOwnerToken: string;
  let driverToken: string;
  let mockQuery: jest.Mock;

  beforeAll(() => {
    app = createTestApp();
    const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

    adminToken = jwt.sign(
      { userId: 'admin-1', email: 'admin@cuts.ae', role: UserRole.ADMIN },
      JWT_SECRET
    );

    customerToken = jwt.sign(
      { userId: 'customer-1', email: 'customer@cuts.ae', role: UserRole.CUSTOMER },
      JWT_SECRET
    );

    restaurantOwnerToken = jwt.sign(
      { userId: 'owner-1', email: 'owner@cuts.ae', role: UserRole.RESTAURANT_OWNER },
      JWT_SECRET
    );

    driverToken = jwt.sign(
      { userId: 'driver-1', email: 'driver@cuts.ae', role: UserRole.DRIVER },
      JWT_SECRET
    );

    mockQuery = pool.query as jest.Mock;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockClear();
  });

  describe('GET /api/v1/admin/analytics', () => {
    const mockAnalyticsData = () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '5250.75' }] })
        .mockResolvedValueOnce({ rows: [{ count: '12' }] })
        .mockResolvedValueOnce({ rows: [{ count: '156' }] })
        .mockResolvedValueOnce({ rows: [{ count: '23' }] })
        .mockResolvedValueOnce({
          rows: [
            { id: '1', total_amount: '89.99', status: 'delivered', restaurant: 'Burger Palace' },
            { id: '2', total_amount: '125.50', status: 'pending', restaurant: 'Pizza House' },
          ]
        })
        .mockResolvedValueOnce({
          rows: [
            { id: '1', name: 'Burger Palace', orders: '45', revenue: '2100.00' },
            { id: '2', name: 'Pizza House', orders: '38', revenue: '1890.50' },
          ]
        });
    };

    it('should return platform analytics for admin user', async () => {
      mockAnalyticsData();

      const response = await request(app)
        .get('/api/v1/admin/analytics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalRevenue');
      expect(response.body.data).toHaveProperty('activeOrders');
      expect(response.body.data).toHaveProperty('totalUsers');
      expect(response.body.data).toHaveProperty('activeRestaurants');
      expect(response.body.data).toHaveProperty('recentOrders');
      expect(response.body.data).toHaveProperty('topRestaurants');
      expect(response.body.data.totalRevenue).toBe('$5250.75');
      expect(response.body.data.activeOrders).toBe('12');
    });

    it('should deny access for customer user', async () => {
      const response = await request(app)
        .get('/api/v1/admin/analytics')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('PERM_001');
      expect(response.body.message).toBeDefined();
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should deny access for restaurant owner', async () => {
      const response = await request(app)
        .get('/api/v1/admin/analytics')
        .set('Authorization', `Bearer ${restaurantOwnerToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('PERM_001');
      expect(response.body.message).toBeDefined();
    });

    it('should deny access for driver', async () => {
      const response = await request(app)
        .get('/api/v1/admin/analytics')
        .set('Authorization', `Bearer ${driverToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('PERM_001');
      expect(response.body.message).toBeDefined();
    });

    it('should deny access without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/admin/analytics')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('AUTH_007');
      expect(response.body.message).toBeDefined();
    });
  });

  describe('GET /api/v1/admin/restaurants', () => {
    const mockRestaurantData = [
      {
        id: '1',
        name: 'Burger Palace',
        email: 'owner1@example.com',
        phone: '+971501234567',
        is_active: true,
        created_at: '2024-01-01',
      },
      {
        id: '2',
        name: 'Pizza House',
        email: 'owner2@example.com',
        phone: '+971501234568',
        is_active: false,
        created_at: '2024-01-02',
      },
    ];

    it('should return all restaurants for admin user', async () => {
      mockQuery.mockResolvedValueOnce({ rows: mockRestaurantData });

      const response = await request(app)
        .get('/api/v1/admin/restaurants')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].name).toBe('Burger Palace');
      expect(response.body.data[1].is_active).toBe(false);
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    it('should deny access for non-admin users', async () => {
      const response = await request(app)
        .get('/api/v1/admin/restaurants')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should return empty array when no restaurants exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/v1/admin/restaurants')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });
  });

  describe('POST /api/v1/admin/restaurants/:id/approve', () => {
    it('should approve restaurant successfully for admin', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: '123',
            name: 'Burger Palace',
            is_active: true,
          },
        ],
      });

      const response = await request(app)
        .post('/api/v1/admin/restaurants/123/approve')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.is_active).toBe(true);
      expect(response.body.message).toBe('Restaurant approved successfully');
      expect(mockQuery).toHaveBeenCalledWith(
        'UPDATE restaurants SET is_active = true WHERE id = $1 RETURNING *',
        ['123']
      );
    });

    it('should return 404 when restaurant not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/v1/admin/restaurants/999/approve')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Restaurant not found');
    });

    it('should deny access for customer', async () => {
      const response = await request(app)
        .post('/api/v1/admin/restaurants/123/approve')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should deny access for restaurant owner', async () => {
      const response = await request(app)
        .post('/api/v1/admin/restaurants/123/approve')
        .set('Authorization', `Bearer ${restaurantOwnerToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/admin/users', () => {
    const mockUserData = [
      {
        id: '1',
        name: 'John Doe',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        phone: '+971501234567',
        role: 'customer',
        status: 'active',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      },
      {
        id: '2',
        name: 'Jane Smith',
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane@example.com',
        phone: '+971501234568',
        role: 'driver',
        status: 'pending',
        created_at: '2024-01-02',
        updated_at: '2024-01-02',
      },
    ];

    it('should return all users for admin', async () => {
      mockQuery.mockResolvedValueOnce({ rows: mockUserData });

      const response = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].name).toBe('John Doe');
      expect(response.body.data[1].role).toBe('driver');
    });

    it('should deny access for non-admin users', async () => {
      const response = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should return empty array when no users exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });
  });

  describe('GET /api/v1/admin/orders', () => {
    const mockOrderData = [
      {
        id: '1',
        order_number: 'ORD-001',
        total_amount: '150.00',
        status: 'delivered',
        restaurant_name: 'Burger Palace',
        customer_name: 'John Doe',
        customer_email: 'john@example.com',
        created_at: '2024-01-01',
      },
      {
        id: '2',
        order_number: 'ORD-002',
        total_amount: '75.50',
        status: 'pending',
        restaurant_name: 'Multiple',
        customer_name: 'Jane Smith',
        customer_email: 'jane@example.com',
        created_at: '2024-01-02',
      },
    ];

    it('should return all orders for admin', async () => {
      mockQuery.mockResolvedValueOnce({ rows: mockOrderData });

      const response = await request(app)
        .get('/api/v1/admin/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].order_number).toBe('ORD-001');
      expect(response.body.data[1].restaurant_name).toBe('Multiple');
    });

    it('should deny access for customer', async () => {
      const response = await request(app)
        .get('/api/v1/admin/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should handle empty order list', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/v1/admin/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });
  });

  describe('GET /api/v1/admin/orders/:id', () => {
    const mockOrderDetails = {
      id: '123',
      order_number: 'ORD-001',
      total_amount: '150.00',
      status: 'delivered',
      payment_status: 'paid',
      delivery_address: '123 Main St',
      restaurant_name: 'Burger Palace',
      customer_name: 'John Doe',
      customer_email: 'john@example.com',
      customer_phone: '+971501234567',
      created_at: '2024-01-01',
    };

    it('should deny access due to missing permissions definition (fail-secure)', async () => {
      const response = await request(app)
        .get('/api/v1/admin/orders/123')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('PERM_002');
      expect(response.body.message).toContain('No permissions defined');
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should deny access for customer', async () => {
      const response = await request(app)
        .get('/api/v1/admin/orders/123')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(mockQuery).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/admin/invoices', () => {
    const mockInvoiceData = [
      {
        id: '1',
        order_id: '101',
        invoice_number: '1',
        invoice_type: 'standard',
        amount: '150.00',
        status: 'paid',
        created_at: '2024-01-01',
        order_number: 'ORD-001',
        restaurant_name: 'Burger Palace',
        customer_name: 'John Doe',
        customer_email: 'john@example.com',
      },
      {
        id: '2',
        order_id: '102',
        invoice_number: '1',
        invoice_type: 'refund',
        amount: '50.00',
        status: 'pending',
        created_at: '2024-01-02',
        order_number: 'ORD-002',
        restaurant_name: 'Pizza House',
        customer_name: 'Jane Smith',
        customer_email: 'jane@example.com',
      },
    ];

    it('should return all invoices for admin', async () => {
      mockQuery.mockResolvedValueOnce({ rows: mockInvoiceData });

      const response = await request(app)
        .get('/api/v1/admin/invoices')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].invoice_type).toBe('standard');
      expect(response.body.data[1].invoice_type).toBe('refund');
    });

    it('should deny access for non-admin', async () => {
      const response = await request(app)
        .get('/api/v1/admin/invoices')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should handle empty invoice list', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/v1/admin/invoices')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });
  });

  describe('GET /api/v1/admin/invoices/:id', () => {
    const mockInvoiceDetails = {
      id: '123',
      order_id: '456',
      invoice_number: '1',
      invoice_type: 'standard',
      amount: '150.00',
      status: 'paid',
      notes: 'Test invoice',
      created_at: '2024-01-01',
      order_number: 'ORD-001',
      total_amount: '150.00',
      payment_status: 'paid',
      restaurant_name: 'Burger Palace',
      customer_name: 'John Doe',
      customer_email: 'john@example.com',
      customer_phone: '+971501234567',
    };

    const mockOrderItems = [
      {
        id: '1',
        quantity: 2,
        base_price: '25.00',
        item_total: '50.00',
        special_instructions: 'No onions',
        item_name: 'Burger',
        item_description: 'Delicious burger',
      },
      {
        id: '2',
        quantity: 1,
        base_price: '100.00',
        item_total: '100.00',
        special_instructions: null,
        item_name: 'Pizza',
        item_description: 'Large pizza',
      },
    ];

    it('should return invoice details with order items for admin', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [mockInvoiceDetails] })
        .mockResolvedValueOnce({ rows: mockOrderItems });

      const response = await request(app)
        .get('/api/v1/admin/invoices/123')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.invoice_number).toBe('1');
      expect(response.body.data.items).toHaveLength(2);
      expect(response.body.data.items[0].item_name).toBe('Burger');
      expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    it('should return 404 when invoice not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/v1/admin/invoices/999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invoice not found');
    });

    it('should deny access for customer', async () => {
      const response = await request(app)
        .get('/api/v1/admin/invoices/123')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(mockQuery).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/admin/invoices/generate', () => {
    it('should generate invoice with all parameters for admin', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ max_invoice_number: 0 }] })
        .mockResolvedValueOnce({
          rows: [{ total_amount: '150.00', payment_status: 'pending' }],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: '1',
              order_id: '123',
              invoice_number: 1,
              invoice_type: 'standard',
              amount: '100.00',
              status: 'pending',
              notes: 'Test invoice',
            },
          ],
        });

      const response = await request(app)
        .post('/api/v1/admin/invoices/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          order_id: '123',
          invoice_type: 'standard',
          amount: '100.00',
          notes: 'Test invoice',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.invoice_number).toBe(1);
      expect(response.body.message).toBe('Invoice generated successfully');
    });

    it('should generate invoice with default values', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ max_invoice_number: 0 }] })
        .mockResolvedValueOnce({
          rows: [{ total_amount: '150.00', payment_status: 'paid' }],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: '1',
              order_id: '123',
              invoice_number: 1,
              invoice_type: 'standard',
              amount: '150.00',
              status: 'paid',
              notes: null,
            },
          ],
        });

      const response = await request(app)
        .post('/api/v1/admin/invoices/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ order_id: '123' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.amount).toBe('150.00');
    });

    it('should return 400 when order_id is missing', async () => {
      const response = await request(app)
        .post('/api/v1/admin/invoices/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('order_id is required');
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should return 404 when order not found', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ max_invoice_number: 0 }] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/v1/admin/invoices/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ order_id: '999' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Order not found');
    });

    it('should deny access for customer', async () => {
      const response = await request(app)
        .post('/api/v1/admin/invoices/generate')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ order_id: '123' })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should increment invoice number for subsequent invoices', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ max_invoice_number: 5 }] })
        .mockResolvedValueOnce({
          rows: [{ total_amount: '150.00', payment_status: 'paid' }],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: '1',
              order_id: '123',
              invoice_number: 6,
              invoice_type: 'standard',
              amount: '150.00',
              status: 'paid',
              notes: null,
            },
          ],
        });

      const response = await request(app)
        .post('/api/v1/admin/invoices/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ order_id: '123' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.invoice_number).toBe(6);
    });
  });

  describe('GET /api/v1/admin/drivers', () => {
    const mockDriverData = [
      {
        id: '1',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        phone: '+971501234567',
        role: 'driver',
        status: 'active',
        created_at: '2024-01-01',
      },
      {
        id: '2',
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane@example.com',
        phone: '+971501234568',
        role: 'driver',
        status: 'pending',
        created_at: '2024-01-02',
      },
    ];

    it('should return all drivers for admin', async () => {
      mockQuery.mockResolvedValueOnce({ rows: mockDriverData });

      const response = await request(app)
        .get('/api/v1/admin/drivers')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].role).toBe('driver');
      expect(response.body.data[1].status).toBe('pending');
    });

    it('should deny access for customer', async () => {
      const response = await request(app)
        .get('/api/v1/admin/drivers')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should return empty array when no drivers exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/v1/admin/drivers')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });
  });

  describe('POST /api/v1/admin/drivers/:id/approve', () => {
    it('should approve driver successfully for admin', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: '123',
            first_name: 'John',
            last_name: 'Doe',
            role: 'driver',
            status: 'active',
          },
        ],
      });

      const response = await request(app)
        .post('/api/v1/admin/drivers/123/approve')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('active');
      expect(response.body.message).toBe('Driver approved successfully');
      expect(mockQuery).toHaveBeenCalledWith(
        "UPDATE users SET status = 'active' WHERE id = $1 AND role = 'driver' RETURNING *",
        ['123']
      );
    });

    it('should return 404 when driver not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/v1/admin/drivers/999/approve')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Driver not found');
    });

    it('should deny access for customer', async () => {
      const response = await request(app)
        .post('/api/v1/admin/drivers/123/approve')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should deny access for driver', async () => {
      const response = await request(app)
        .post('/api/v1/admin/drivers/123/approve')
        .set('Authorization', `Bearer ${driverToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('RBAC Enforcement', () => {
    const adminEndpoints = [
      { method: 'get', path: '/api/v1/admin/analytics' },
      { method: 'get', path: '/api/v1/admin/restaurants' },
      { method: 'post', path: '/api/v1/admin/restaurants/123/approve' },
      { method: 'get', path: '/api/v1/admin/users' },
      { method: 'get', path: '/api/v1/admin/orders' },
      { method: 'get', path: '/api/v1/admin/invoices' },
      { method: 'get', path: '/api/v1/admin/invoices/123' },
      { method: 'post', path: '/api/v1/admin/invoices/generate' },
      { method: 'get', path: '/api/v1/admin/drivers' },
      { method: 'post', path: '/api/v1/admin/drivers/123/approve' },
    ];

    beforeEach(() => {
      mockQuery.mockResolvedValue({ rows: [] });
    });

    it('should deny all admin endpoints for unauthenticated users', async () => {
      for (const endpoint of adminEndpoints) {
        const req = request(app)[endpoint.method as 'get' | 'post'](endpoint.path);

        if (endpoint.method === 'post') {
          req.send({});
        }

        const response = await req;

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.code).toBe('AUTH_007');
      }
    });

    it('should deny all admin endpoints for customer role', async () => {
      for (const endpoint of adminEndpoints) {
        const req = request(app)
          [endpoint.method as 'get' | 'post'](endpoint.path)
          .set('Authorization', `Bearer ${customerToken}`);

        if (endpoint.method === 'post') {
          req.send({});
        }

        const response = await req;

        expect(response.status).toBe(403);
        expect(response.body.success).toBe(false);
        expect(response.body.code).toBe('PERM_001');
      }
    });

    it('should deny all admin endpoints for restaurant owner role', async () => {
      for (const endpoint of adminEndpoints) {
        const req = request(app)
          [endpoint.method as 'get' | 'post'](endpoint.path)
          .set('Authorization', `Bearer ${restaurantOwnerToken}`);

        if (endpoint.method === 'post') {
          req.send({});
        }

        const response = await req;

        expect(response.status).toBe(403);
        expect(response.body.success).toBe(false);
        expect(response.body.code).toBe('PERM_001');
      }
    });

    it('should deny all admin endpoints for driver role', async () => {
      for (const endpoint of adminEndpoints) {
        const req = request(app)
          [endpoint.method as 'get' | 'post'](endpoint.path)
          .set('Authorization', `Bearer ${driverToken}`);

        if (endpoint.method === 'post') {
          req.send({});
        }

        const response = await req;

        expect(response.status).toBe(403);
        expect(response.body.success).toBe(false);
        expect(response.body.code).toBe('PERM_001');
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully in analytics', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/v1/admin/analytics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Failed to fetch analytics');
    });

    it('should handle database errors in restaurants endpoint', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .get('/api/v1/admin/restaurants')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Failed to fetch restaurants');
    });

    it('should handle database errors in invoice generation', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .post('/api/v1/admin/invoices/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ order_id: '123' })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Failed to generate invoice');
    });
  });
});
