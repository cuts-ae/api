import { Request, Response } from 'express';
import * as adminController from '../../controllers/admin.controller';
import pool from '../../config/database';

// Mock the database pool
jest.mock('../../config/database', () => ({
  query: jest.fn(),
}));

describe('Admin Controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    mockRequest = {
      params: {},
      body: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockQuery = pool.query as jest.Mock;
    mockQuery.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAnalytics', () => {
    it('should return platform analytics with all metrics', async () => {
      // Mock database responses
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '1250.50' }] }) // Total revenue
        .mockResolvedValueOnce({ rows: [{ count: '15' }] }) // Active orders
        .mockResolvedValueOnce({ rows: [{ count: '250' }] }) // Total users
        .mockResolvedValueOnce({ rows: [{ count: '42' }] }) // Active restaurants
        .mockResolvedValueOnce({ // Recent orders
          rows: [
            { id: '1', total_amount: '45.99', status: 'pending', restaurant: 'Burger Palace' },
            { id: '2', total_amount: '32.50', status: 'delivered', restaurant: 'Pizza House' },
            { id: '3', total_amount: '78.00', status: 'preparing', restaurant: 'Multiple' },
          ]
        })
        .mockResolvedValueOnce({ // Top restaurants
          rows: [
            { id: '1', name: 'Burger Palace', orders: '120', revenue: '5400.00' },
            { id: '2', name: 'Pizza House', orders: '98', revenue: '4320.50' },
            { id: '3', name: 'Sushi World', orders: '75', revenue: '3890.25' },
          ]
        });

      await adminController.getAnalytics(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          totalRevenue: '$1250.50',
          activeOrders: '15',
          totalUsers: '250',
          activeRestaurants: '42',
          recentOrders: [
            { id: '1', total: '45.99', status: 'pending', restaurant: 'Burger Palace' },
            { id: '2', total: '32.50', status: 'delivered', restaurant: 'Pizza House' },
            { id: '3', total: '78.00', status: 'preparing', restaurant: 'Multiple' },
          ],
          topRestaurants: [
            { id: '1', name: 'Burger Palace', orders: '120', revenue: '5400.00' },
            { id: '2', name: 'Pizza House', orders: '98', revenue: '4320.50' },
            { id: '3', name: 'Sushi World', orders: '75', revenue: '3890.25' },
          ],
        },
      });

      expect(mockQuery).toHaveBeenCalledTimes(6);
    });

    it('should handle zero revenue correctly', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '0' }] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      await adminController.getAnalytics(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          totalRevenue: '$0.00',
          activeOrders: '0',
          totalUsers: '0',
          activeRestaurants: '0',
          recentOrders: [],
          topRestaurants: [],
        },
      });
    });

    it('should handle null revenue (COALESCE returns 0)', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: null }] })
        .mockResolvedValueOnce({ rows: [{ count: '5' }] })
        .mockResolvedValueOnce({ rows: [{ count: '10' }] })
        .mockResolvedValueOnce({ rows: [{ count: '3' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      await adminController.getAnalytics(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            totalRevenue: expect.any(String),
          }),
        })
      );
    });

    it('should format decimal values correctly', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '1234.5' }] })
        .mockResolvedValueOnce({ rows: [{ count: '10' }] })
        .mockResolvedValueOnce({ rows: [{ count: '20' }] })
        .mockResolvedValueOnce({ rows: [{ count: '5' }] })
        .mockResolvedValueOnce({
          rows: [
            { id: '1', total_amount: '45.9', status: 'pending', restaurant: 'Test' },
          ]
        })
        .mockResolvedValueOnce({
          rows: [
            { id: '1', name: 'Test', orders: '10', revenue: '500.5' },
          ]
        });

      await adminController.getAnalytics(mockRequest as Request, mockResponse as Response);

      const response = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(response.data.totalRevenue).toBe('$1234.50');
      expect(response.data.recentOrders[0].total).toBe('45.90');
      expect(response.data.topRestaurants[0].revenue).toBe('500.50');
    });

    it('should handle database error', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      mockQuery.mockRejectedValueOnce(new Error('Database connection failed'));

      await adminController.getAnalytics(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to fetch analytics',
      });
      expect(consoleError).toHaveBeenCalledWith('Error fetching analytics:', expect.any(Error));

      consoleError.mockRestore();
    });

    it('should query for delivered orders only in revenue calculation', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '1000' }] })
        .mockResolvedValueOnce({ rows: [{ count: '5' }] })
        .mockResolvedValueOnce({ rows: [{ count: '10' }] })
        .mockResolvedValueOnce({ rows: [{ count: '3' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      await adminController.getAnalytics(mockRequest as Request, mockResponse as Response);

      expect(mockQuery.mock.calls[0][0]).toContain("status = 'delivered'");
    });

    it('should query for active orders with correct statuses', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '1000' }] })
        .mockResolvedValueOnce({ rows: [{ count: '5' }] })
        .mockResolvedValueOnce({ rows: [{ count: '10' }] })
        .mockResolvedValueOnce({ rows: [{ count: '3' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      await adminController.getAnalytics(mockRequest as Request, mockResponse as Response);

      expect(mockQuery.mock.calls[1][0]).toContain("'pending', 'preparing', 'ready', 'in_transit'");
    });

    it('should limit recent orders to 5', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '1000' }] })
        .mockResolvedValueOnce({ rows: [{ count: '5' }] })
        .mockResolvedValueOnce({ rows: [{ count: '10' }] })
        .mockResolvedValueOnce({ rows: [{ count: '3' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      await adminController.getAnalytics(mockRequest as Request, mockResponse as Response);

      expect(mockQuery.mock.calls[4][0]).toContain('LIMIT 5');
    });

    it('should limit top restaurants to 5', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '1000' }] })
        .mockResolvedValueOnce({ rows: [{ count: '5' }] })
        .mockResolvedValueOnce({ rows: [{ count: '10' }] })
        .mockResolvedValueOnce({ rows: [{ count: '3' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      await adminController.getAnalytics(mockRequest as Request, mockResponse as Response);

      expect(mockQuery.mock.calls[5][0]).toContain('LIMIT 5');
    });
  });

  describe('getRestaurants', () => {
    it('should return all restaurants with owner information', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
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
        ]
      });

      await adminController.getRestaurants(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: [
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
        ],
      });
    });

    it('should return empty array when no restaurants exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await adminController.getRestaurants(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: [],
      });
    });

    it('should join with users table to get owner info', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await adminController.getRestaurants(mockRequest as Request, mockResponse as Response);

      expect(mockQuery.mock.calls[0][0]).toContain('JOIN users u ON r.owner_id = u.id');
    });

    it('should order restaurants by creation date descending', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await adminController.getRestaurants(mockRequest as Request, mockResponse as Response);

      expect(mockQuery.mock.calls[0][0]).toContain('ORDER BY r.created_at DESC');
    });

    it('should handle database error', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      await adminController.getRestaurants(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to fetch restaurants',
      });
      expect(consoleError).toHaveBeenCalledWith('Error fetching restaurants:', expect.any(Error));

      consoleError.mockRestore();
    });
  });

  describe('approveRestaurant', () => {
    it('should approve restaurant successfully', async () => {
      mockRequest.params = { id: '123' };
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: '123',
            name: 'Burger Palace',
            is_active: true,
          },
        ]
      });

      await adminController.approveRestaurant(mockRequest as Request, mockResponse as Response);

      expect(mockQuery).toHaveBeenCalledWith(
        'UPDATE restaurants SET is_active = true WHERE id = $1 RETURNING *',
        ['123']
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          id: '123',
          name: 'Burger Palace',
          is_active: true,
        },
        message: 'Restaurant approved successfully',
      });
    });

    it('should return 404 when restaurant not found', async () => {
      mockRequest.params = { id: '999' };
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await adminController.approveRestaurant(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Restaurant not found',
      });
    });

    it('should handle database error', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      mockRequest.params = { id: '123' };
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      await adminController.approveRestaurant(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to approve restaurant',
      });
      expect(consoleError).toHaveBeenCalledWith('Error approving restaurant:', expect.any(Error));

      consoleError.mockRestore();
    });

    it('should set is_active to true', async () => {
      mockRequest.params = { id: '123' };
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: '123', is_active: true }]
      });

      await adminController.approveRestaurant(mockRequest as Request, mockResponse as Response);

      expect(mockQuery.mock.calls[0][0]).toContain('SET is_active = true');
    });
  });

  describe('getDrivers', () => {
    it('should return all drivers', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
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
        ]
      });

      await adminController.getDrivers(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: [
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
        ],
      });
    });

    it('should return empty array when no drivers exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await adminController.getDrivers(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: [],
      });
    });

    it('should filter by driver role', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await adminController.getDrivers(mockRequest as Request, mockResponse as Response);

      expect(mockQuery.mock.calls[0][0]).toContain("WHERE role = 'driver'");
    });

    it('should order drivers by creation date descending', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await adminController.getDrivers(mockRequest as Request, mockResponse as Response);

      expect(mockQuery.mock.calls[0][0]).toContain('ORDER BY created_at DESC');
    });

    it('should handle database error', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      await adminController.getDrivers(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to fetch drivers',
      });
      expect(consoleError).toHaveBeenCalledWith('Error fetching drivers:', expect.any(Error));

      consoleError.mockRestore();
    });
  });

  describe('approveDriver', () => {
    it('should approve driver successfully', async () => {
      mockRequest.params = { id: '123' };
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: '123',
            first_name: 'John',
            last_name: 'Doe',
            role: 'driver',
            status: 'active',
          },
        ]
      });

      await adminController.approveDriver(mockRequest as Request, mockResponse as Response);

      expect(mockQuery).toHaveBeenCalledWith(
        "UPDATE users SET status = 'active' WHERE id = $1 AND role = 'driver' RETURNING *",
        ['123']
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          id: '123',
          first_name: 'John',
          last_name: 'Doe',
          role: 'driver',
          status: 'active',
        },
        message: 'Driver approved successfully',
      });
    });

    it('should return 404 when driver not found', async () => {
      mockRequest.params = { id: '999' };
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await adminController.approveDriver(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Driver not found',
      });
    });

    it('should return 404 when user exists but is not a driver', async () => {
      mockRequest.params = { id: '123' };
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await adminController.approveDriver(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Driver not found',
      });
    });

    it('should handle database error', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      mockRequest.params = { id: '123' };
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      await adminController.approveDriver(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to approve driver',
      });
      expect(consoleError).toHaveBeenCalledWith('Error approving driver:', expect.any(Error));

      consoleError.mockRestore();
    });

    it('should only update users with driver role', async () => {
      mockRequest.params = { id: '123' };
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: '123', role: 'driver', status: 'active' }]
      });

      await adminController.approveDriver(mockRequest as Request, mockResponse as Response);

      expect(mockQuery.mock.calls[0][0]).toContain("role = 'driver'");
    });
  });

  describe('getInvoiceDetails', () => {
    it('should return invoice details with order items', async () => {
      mockRequest.params = { id: '123' };
      mockQuery
        .mockResolvedValueOnce({
          rows: [
            {
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
            },
          ]
        })
        .mockResolvedValueOnce({
          rows: [
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
          ]
        });

      await adminController.getInvoiceDetails(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
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
          items: [
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
          ],
        },
      });
    });

    it('should return 404 when invoice not found', async () => {
      mockRequest.params = { id: '999' };
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await adminController.getInvoiceDetails(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invoice not found',
      });
    });

    it('should handle invoice with no items', async () => {
      mockRequest.params = { id: '123' };
      mockQuery
        .mockResolvedValueOnce({
          rows: [
            {
              id: '123',
              order_id: '456',
              invoice_number: '1',
              invoice_type: 'standard',
              amount: '0.00',
              status: 'pending',
              notes: null,
              created_at: '2024-01-01',
              order_number: 'ORD-001',
              total_amount: '0.00',
              payment_status: 'pending',
              restaurant_name: 'Test Restaurant',
              customer_name: 'John Doe',
              customer_email: 'john@example.com',
              customer_phone: '+971501234567',
            },
          ]
        })
        .mockResolvedValueOnce({ rows: [] });

      await adminController.getInvoiceDetails(mockRequest as Request, mockResponse as Response);

      const response = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.data.items).toEqual([]);
    });

    it('should handle Multiple restaurant name', async () => {
      mockRequest.params = { id: '123' };
      mockQuery
        .mockResolvedValueOnce({
          rows: [
            {
              id: '123',
              order_id: '456',
              restaurant_name: 'Multiple',
              customer_name: 'John Doe',
              customer_email: 'john@example.com',
              customer_phone: '+971501234567',
            },
          ]
        })
        .mockResolvedValueOnce({ rows: [] });

      await adminController.getInvoiceDetails(mockRequest as Request, mockResponse as Response);

      const response = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(response.data.restaurant_name).toBe('Multiple');
    });

    it('should handle database error', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      mockRequest.params = { id: '123' };
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      await adminController.getInvoiceDetails(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to fetch invoice details',
      });
      expect(consoleError).toHaveBeenCalledWith('Error fetching invoice details:', expect.any(Error));

      consoleError.mockRestore();
    });

    it('should query order items with correct order_id', async () => {
      mockRequest.params = { id: '123' };
      mockQuery
        .mockResolvedValueOnce({
          rows: [
            {
              id: '123',
              order_id: '456',
              restaurant_name: 'Test',
              customer_name: 'John Doe',
              customer_email: 'john@example.com',
              customer_phone: '+971501234567',
            },
          ]
        })
        .mockResolvedValueOnce({ rows: [] });

      await adminController.getInvoiceDetails(mockRequest as Request, mockResponse as Response);

      expect(mockQuery.mock.calls[1][1]).toEqual(['456']);
    });
  });

  describe('getInvoices', () => {
    it('should return all invoices', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
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
        ]
      });

      await adminController.getInvoices(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: [
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
        ],
      });
    });

    it('should return empty array when no invoices exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await adminController.getInvoices(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: [],
      });
    });

    it('should order invoices by creation date descending', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await adminController.getInvoices(mockRequest as Request, mockResponse as Response);

      expect(mockQuery.mock.calls[0][0]).toContain('ORDER BY i.created_at DESC');
    });

    it('should join with orders and users tables', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await adminController.getInvoices(mockRequest as Request, mockResponse as Response);

      expect(mockQuery.mock.calls[0][0]).toContain('JOIN orders o ON i.order_id = o.id');
      expect(mockQuery.mock.calls[0][0]).toContain('JOIN users u ON o.customer_id = u.id');
    });

    it('should handle database error', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      await adminController.getInvoices(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to fetch invoices',
      });
      expect(consoleError).toHaveBeenCalledWith('Error fetching invoices:', expect.any(Error));

      consoleError.mockRestore();
    });
  });

  describe('generateInvoice', () => {
    it('should generate invoice with all parameters', async () => {
      mockRequest.body = {
        order_id: '123',
        invoice_type: 'standard',
        amount: '100.00',
        notes: 'Test invoice',
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [{ max_invoice_number: 0 }] })
        .mockResolvedValueOnce({
          rows: [{ total_amount: '150.00', payment_status: 'pending' }]
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
          ]
        });

      await adminController.generateInvoice(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          id: '1',
          order_id: '123',
          invoice_number: 1,
          invoice_type: 'standard',
          amount: '100.00',
          status: 'pending',
          notes: 'Test invoice',
        },
        message: 'Invoice generated successfully',
      });
    });

    it('should generate invoice with default invoice type', async () => {
      mockRequest.body = {
        order_id: '123',
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [{ max_invoice_number: 0 }] })
        .mockResolvedValueOnce({
          rows: [{ total_amount: '150.00', payment_status: 'paid' }]
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
          ]
        });

      await adminController.generateInvoice(mockRequest as Request, mockResponse as Response);

      const response = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(response.data.invoice_type).toBe('standard');
    });

    it('should use order total_amount when amount not provided', async () => {
      mockRequest.body = {
        order_id: '123',
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [{ max_invoice_number: 0 }] })
        .mockResolvedValueOnce({
          rows: [{ total_amount: '150.00', payment_status: 'paid' }]
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
          ]
        });

      await adminController.generateInvoice(mockRequest as Request, mockResponse as Response);

      expect(mockQuery.mock.calls[2][1]).toContain('150.00');
    });

    it('should use order payment_status as invoice status', async () => {
      mockRequest.body = {
        order_id: '123',
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [{ max_invoice_number: 0 }] })
        .mockResolvedValueOnce({
          rows: [{ total_amount: '150.00', payment_status: 'paid' }]
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
          ]
        });

      await adminController.generateInvoice(mockRequest as Request, mockResponse as Response);

      expect(mockQuery.mock.calls[2][1]).toContain('paid');
    });

    it('should default to pending status when order payment_status is null', async () => {
      mockRequest.body = {
        order_id: '123',
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [{ max_invoice_number: 0 }] })
        .mockResolvedValueOnce({
          rows: [{ total_amount: '150.00', payment_status: null }]
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: '1',
              order_id: '123',
              invoice_number: 1,
              invoice_type: 'standard',
              amount: '150.00',
              status: 'pending',
              notes: null,
            },
          ]
        });

      await adminController.generateInvoice(mockRequest as Request, mockResponse as Response);

      expect(mockQuery.mock.calls[2][1]).toContain('pending');
    });

    it('should increment invoice number for subsequent invoices', async () => {
      mockRequest.body = {
        order_id: '123',
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [{ max_invoice_number: 3 }] })
        .mockResolvedValueOnce({
          rows: [{ total_amount: '150.00', payment_status: 'paid' }]
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: '1',
              order_id: '123',
              invoice_number: 4,
              invoice_type: 'standard',
              amount: '150.00',
              status: 'paid',
              notes: null,
            },
          ]
        });

      await adminController.generateInvoice(mockRequest as Request, mockResponse as Response);

      expect(mockQuery.mock.calls[2][1]).toContain(4);
    });

    it('should return 400 when order_id is missing', async () => {
      mockRequest.body = {};

      await adminController.generateInvoice(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'order_id is required',
      });
    });

    it('should return 404 when order not found', async () => {
      mockRequest.body = {
        order_id: '999',
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [{ max_invoice_number: 0 }] })
        .mockResolvedValueOnce({ rows: [] });

      await adminController.generateInvoice(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Order not found',
      });
    });

    it('should handle database error', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      mockRequest.body = {
        order_id: '123',
      };
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      await adminController.generateInvoice(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to generate invoice',
      });
      expect(consoleError).toHaveBeenCalledWith('Error generating invoice:', expect.any(Error));

      consoleError.mockRestore();
    });

    it('should handle null notes', async () => {
      mockRequest.body = {
        order_id: '123',
        notes: null,
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [{ max_invoice_number: 0 }] })
        .mockResolvedValueOnce({
          rows: [{ total_amount: '150.00', payment_status: 'paid' }]
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
          ]
        });

      await adminController.generateInvoice(mockRequest as Request, mockResponse as Response);

      expect(mockQuery.mock.calls[2][1][5]).toBeNull();
    });

    it('should handle undefined notes', async () => {
      mockRequest.body = {
        order_id: '123',
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [{ max_invoice_number: 0 }] })
        .mockResolvedValueOnce({
          rows: [{ total_amount: '150.00', payment_status: 'paid' }]
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
          ]
        });

      await adminController.generateInvoice(mockRequest as Request, mockResponse as Response);

      expect(mockQuery.mock.calls[2][1][5]).toBeNull();
    });

    it('should handle COALESCE returning 0 for first invoice', async () => {
      mockRequest.body = {
        order_id: '123',
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [{ max_invoice_number: null }] })
        .mockResolvedValueOnce({
          rows: [{ total_amount: '150.00', payment_status: 'paid' }]
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
          ]
        });

      await adminController.generateInvoice(mockRequest as Request, mockResponse as Response);

      const response = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(response.success).toBe(true);
    });
  });

  describe('getUsers', () => {
    it('should return all users with concatenated name', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
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
        ]
      });

      await adminController.getUsers(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: [
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
        ],
      });
    });

    it('should return empty array when no users exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await adminController.getUsers(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: [],
      });
    });

    it('should concatenate first_name and last_name', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await adminController.getUsers(mockRequest as Request, mockResponse as Response);

      expect(mockQuery.mock.calls[0][0]).toContain("first_name || ' ' || last_name as name");
    });

    it('should order users by creation date descending', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await adminController.getUsers(mockRequest as Request, mockResponse as Response);

      expect(mockQuery.mock.calls[0][0]).toContain('ORDER BY created_at DESC');
    });

    it('should handle database error', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      await adminController.getUsers(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to fetch users',
      });
      expect(consoleError).toHaveBeenCalledWith('Error fetching users:', expect.any(Error));

      consoleError.mockRestore();
    });
  });

  describe('getOrders', () => {
    it('should return all orders with restaurant and customer info', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
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
        ]
      });

      await adminController.getOrders(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: [
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
        ],
      });
    });

    it('should return empty array when no orders exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await adminController.getOrders(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: [],
      });
    });

    it('should join with users table', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await adminController.getOrders(mockRequest as Request, mockResponse as Response);

      expect(mockQuery.mock.calls[0][0]).toContain('JOIN users u ON o.customer_id = u.id');
    });

    it('should order orders by creation date descending', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await adminController.getOrders(mockRequest as Request, mockResponse as Response);

      expect(mockQuery.mock.calls[0][0]).toContain('ORDER BY o.created_at DESC');
    });

    it('should handle Multiple restaurant name for multi-restaurant orders', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: '1',
            restaurant_name: 'Multiple',
            customer_name: 'John Doe',
            customer_email: 'john@example.com',
          },
        ]
      });

      await adminController.getOrders(mockRequest as Request, mockResponse as Response);

      const response = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(response.data[0].restaurant_name).toBe('Multiple');
    });

    it('should handle database error', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      await adminController.getOrders(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to fetch orders',
      });
      expect(consoleError).toHaveBeenCalledWith('Error fetching orders:', expect.any(Error));

      consoleError.mockRestore();
    });
  });

  describe('getOrderDetails', () => {
    it('should return order details with restaurant and customer info', async () => {
      mockRequest.params = { id: '123' };
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
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
          },
        ]
      });

      await adminController.getOrderDetails(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
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
        },
      });
    });

    it('should return 404 when order not found', async () => {
      mockRequest.params = { id: '999' };
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await adminController.getOrderDetails(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Order not found',
      });
    });

    it('should query with correct order id', async () => {
      mockRequest.params = { id: '123' };
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await adminController.getOrderDetails(mockRequest as Request, mockResponse as Response);

      expect(mockQuery.mock.calls[0][1]).toEqual(['123']);
    });

    it('should join with users table', async () => {
      mockRequest.params = { id: '123' };
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await adminController.getOrderDetails(mockRequest as Request, mockResponse as Response);

      expect(mockQuery.mock.calls[0][0]).toContain('JOIN users u ON o.customer_id = u.id');
    });

    it('should handle Multiple restaurant name', async () => {
      mockRequest.params = { id: '123' };
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: '123',
            restaurant_name: 'Multiple',
            customer_name: 'John Doe',
            customer_email: 'john@example.com',
            customer_phone: '+971501234567',
          },
        ]
      });

      await adminController.getOrderDetails(mockRequest as Request, mockResponse as Response);

      const response = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(response.data.restaurant_name).toBe('Multiple');
    });

    it('should handle database error', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      mockRequest.params = { id: '123' };
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      await adminController.getOrderDetails(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to fetch order details',
      });
      expect(consoleError).toHaveBeenCalledWith('Error fetching order details:', expect.any(Error));

      consoleError.mockRestore();
    });
  });
});
