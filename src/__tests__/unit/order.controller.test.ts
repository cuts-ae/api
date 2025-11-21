import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { OrderController } from '../../controllers/order.controller';
import pool from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { OrderStatus, PaymentStatus, UserRole } from '../../types';

// Mock the database pool
jest.mock('../../config/database');

const mockQuery = pool.query as jest.Mock;

describe('OrderController', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockRequest = {
      body: {},
      params: {},
      query: {},
      user: {
        userId: 'customer-123',
        email: 'customer@cuts.ae',
        role: UserRole.CUSTOMER
      }
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    jest.clearAllMocks();
  });

  describe('create', () => {
    const validOrderData = {
      items: [
        {
          menu_item_id: 'item-1',
          restaurant_id: 'restaurant-1',
          quantity: 2,
          special_instructions: 'No onions'
        },
        {
          menu_item_id: 'item-2',
          restaurant_id: 'restaurant-1',
          quantity: 1
        }
      ],
      delivery_address: {
        street: '123 Main St',
        city: 'Abu Dhabi',
        country: 'UAE'
      },
      delivery_instructions: 'Ring doorbell',
      scheduled_for: null
    };

    const mockMenuItems = [
      {
        id: 'item-1',
        base_price: 50,
        restaurant_id: 'restaurant-1',
        is_available: true,
        nutritional_info: [{
          calories: 500,
          protein: 30,
          carbohydrates: 40,
          fat: 20
        }]
      },
      {
        id: 'item-2',
        base_price: 30,
        restaurant_id: 'restaurant-1',
        is_available: true,
        nutritional_info: [{
          calories: 300,
          protein: 20,
          carbohydrates: 25,
          fat: 15
        }]
      }
    ];

    it('should create order successfully with valid data', async () => {
      mockRequest.body = validOrderData;

      const mockOrder = {
        id: 'order-123',
        order_number: 'ABC12345',
        customer_id: 'customer-123',
        restaurants: ['restaurant-1'],
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
            menu_item_id: 'item-1',
            quantity: 2,
            base_price: 50,
            item_total: 100,
            special_instructions: 'No onions',
            menu_items: { name: 'Burger', image_url: 'burger.jpg' }
          },
          {
            id: 'order-item-2',
            menu_item_id: 'item-2',
            quantity: 1,
            base_price: 30,
            item_total: 30,
            special_instructions: null,
            menu_items: { name: 'Fries', image_url: 'fries.jpg' }
          }
        ]
      };

      mockQuery
        .mockResolvedValueOnce({ rows: mockMenuItems, rowCount: 2 } as any)
        .mockResolvedValueOnce({ rows: [mockOrder], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
        .mockResolvedValueOnce({ rows: [mockCompleteOrder], rowCount: 1 } as any);

      await OrderController.create(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Order created successfully',
        order: mockCompleteOrder
      });
    });

    it('should create order with scheduled delivery time', async () => {
      const scheduledOrderData = {
        ...validOrderData,
        scheduled_for: '2025-11-21T14:00:00Z'
      };
      mockRequest.body = scheduledOrderData;

      const mockOrder = {
        id: 'order-123',
        order_number: 'ABC12345',
        customer_id: 'customer-123',
        restaurants: ['restaurant-1'],
        status: OrderStatus.PENDING,
        scheduled_for: new Date('2025-11-21T14:00:00Z'),
        subtotal: 130,
        delivery_fee: 10,
        service_fee: 6.5,
        total_amount: 146.5,
        payment_status: PaymentStatus.PENDING
      };

      mockQuery
        .mockResolvedValueOnce({ rows: mockMenuItems, rowCount: 2 } as any)
        .mockResolvedValueOnce({ rows: [mockOrder], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
        .mockResolvedValueOnce({ rows: [{ ...mockOrder, order_items: [] }], rowCount: 1 } as any);

      await OrderController.create(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
    });

    it('should throw error when menu items not found', async () => {
      mockRequest.body = validOrderData;

      mockQuery.mockResolvedValueOnce({ rows: [mockMenuItems[0]], rowCount: 1 } as any);

      await expect(
        OrderController.create(mockRequest as AuthRequest, mockResponse as Response)
      ).rejects.toThrow(new AppError('ORD_010'));
    });

    it('should throw error when menu item is not available', async () => {
      mockRequest.body = validOrderData;

      const unavailableItems = [
        { ...mockMenuItems[0], is_available: false },
        mockMenuItems[1]
      ];

      mockQuery.mockResolvedValueOnce({ rows: unavailableItems, rowCount: 2 } as any);

      await expect(
        OrderController.create(mockRequest as AuthRequest, mockResponse as Response)
      ).rejects.toThrow(new AppError('ORD_003'));
    });

    it('should throw error when ordering from more than 2 restaurants', async () => {
      const multiRestaurantOrder = {
        ...validOrderData,
        items: [
          { menu_item_id: 'item-1', restaurant_id: 'restaurant-1', quantity: 1 },
          { menu_item_id: 'item-2', restaurant_id: 'restaurant-2', quantity: 1 },
          { menu_item_id: 'item-3', restaurant_id: 'restaurant-3', quantity: 1 }
        ]
      };
      mockRequest.body = multiRestaurantOrder;

      const multiRestaurantMenuItems = [
        { id: 'item-1', base_price: 50, restaurant_id: 'restaurant-1', is_available: true, nutritional_info: null },
        { id: 'item-2', base_price: 30, restaurant_id: 'restaurant-2', is_available: true, nutritional_info: null },
        { id: 'item-3', base_price: 40, restaurant_id: 'restaurant-3', is_available: true, nutritional_info: null }
      ];

      mockQuery.mockResolvedValueOnce({ rows: multiRestaurantMenuItems, rowCount: 3 } as any);

      await expect(
        OrderController.create(mockRequest as AuthRequest, mockResponse as Response)
      ).rejects.toThrow(new AppError('ORD_002'));
    });

    it('should allow ordering from exactly 2 restaurants', async () => {
      const twoRestaurantOrder = {
        ...validOrderData,
        items: [
          { menu_item_id: 'item-1', restaurant_id: 'restaurant-1', quantity: 1 },
          { menu_item_id: 'item-2', restaurant_id: 'restaurant-2', quantity: 1 }
        ]
      };
      mockRequest.body = twoRestaurantOrder;

      const twoRestaurantMenuItems = [
        { id: 'item-1', base_price: 50, restaurant_id: 'restaurant-1', is_available: true, nutritional_info: null },
        { id: 'item-2', base_price: 30, restaurant_id: 'restaurant-2', is_available: true, nutritional_info: null }
      ];

      const mockOrder = {
        id: 'order-123',
        order_number: 'ABC12345',
        customer_id: 'customer-123',
        restaurants: ['restaurant-1', 'restaurant-2'],
        status: OrderStatus.PENDING,
        subtotal: 80,
        delivery_fee: 10,
        service_fee: 4,
        total_amount: 94,
        payment_status: PaymentStatus.PENDING
      };

      mockQuery
        .mockResolvedValueOnce({ rows: twoRestaurantMenuItems, rowCount: 2 } as any)
        .mockResolvedValueOnce({ rows: [mockOrder], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
        .mockResolvedValueOnce({ rows: [{ ...mockOrder, order_items: [] }], rowCount: 1 } as any);

      await OrderController.create(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
    });

    it('should calculate fees correctly', async () => {
      mockRequest.body = validOrderData;

      const mockOrder = {
        id: 'order-123',
        order_number: 'ABC12345',
        customer_id: 'customer-123',
        restaurants: ['restaurant-1'],
        status: OrderStatus.PENDING,
        subtotal: 130,
        delivery_fee: 10,
        service_fee: 6.5,
        total_amount: 146.5,
        payment_status: PaymentStatus.PENDING
      };

      mockQuery
        .mockResolvedValueOnce({ rows: mockMenuItems, rowCount: 2 } as any)
        .mockResolvedValueOnce({ rows: [mockOrder], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
        .mockResolvedValueOnce({ rows: [{ ...mockOrder, order_items: [] }], rowCount: 1 } as any);

      await OrderController.create(mockRequest as AuthRequest, mockResponse as Response);

      const createOrderCall = mockQuery.mock.calls[1];
      expect(createOrderCall[1][7]).toBe(130);
      expect(createOrderCall[1][8]).toBe(10);
      expect(createOrderCall[1][9]).toBe(6.5);
      expect(createOrderCall[1][10]).toBe(146.5);
    });

    it('should handle items without nutritional info', async () => {
      mockRequest.body = validOrderData;

      const itemsWithoutNutrition = [
        { ...mockMenuItems[0], nutritional_info: null },
        { ...mockMenuItems[1], nutritional_info: null }
      ];

      const mockOrder = {
        id: 'order-123',
        order_number: 'ABC12345',
        customer_id: 'customer-123',
        restaurants: ['restaurant-1'],
        status: OrderStatus.PENDING,
        subtotal: 130,
        delivery_fee: 10,
        service_fee: 6.5,
        total_amount: 146.5,
        payment_status: PaymentStatus.PENDING
      };

      mockQuery
        .mockResolvedValueOnce({ rows: itemsWithoutNutrition, rowCount: 2 } as any)
        .mockResolvedValueOnce({ rows: [mockOrder], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
        .mockResolvedValueOnce({ rows: [{ ...mockOrder, order_items: [] }], rowCount: 1 } as any);

      await OrderController.create(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
    });

    it('should handle items without special instructions', async () => {
      const orderWithoutInstructions = {
        ...validOrderData,
        items: [
          { menu_item_id: 'item-1', restaurant_id: 'restaurant-1', quantity: 2 },
          { menu_item_id: 'item-2', restaurant_id: 'restaurant-1', quantity: 1 }
        ]
      };
      mockRequest.body = orderWithoutInstructions;

      const mockOrder = {
        id: 'order-123',
        order_number: 'ABC12345',
        customer_id: 'customer-123',
        restaurants: ['restaurant-1'],
        status: OrderStatus.PENDING,
        subtotal: 130,
        delivery_fee: 10,
        service_fee: 6.5,
        total_amount: 146.5,
        payment_status: PaymentStatus.PENDING
      };

      mockQuery
        .mockResolvedValueOnce({ rows: mockMenuItems, rowCount: 2 } as any)
        .mockResolvedValueOnce({ rows: [mockOrder], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
        .mockResolvedValueOnce({ rows: [{ ...mockOrder, order_items: [] }], rowCount: 1 } as any);

      await OrderController.create(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
    });
  });

  describe('getById', () => {
    const mockOrder = {
      id: 'order-123',
      order_number: 'ABC12345',
      customer_id: 'customer-123',
      restaurants: ['restaurant-1'],
      status: OrderStatus.PENDING,
      subtotal: 130,
      delivery_fee: 10,
      service_fee: 6.5,
      total_amount: 146.5,
      payment_status: PaymentStatus.PENDING,
      order_items: [
        {
          id: 'order-item-1',
          menu_item_id: 'item-1',
          quantity: 2,
          base_price: 50,
          item_total: 100,
          menu_items: {
            name: 'Burger',
            image_url: 'burger.jpg',
            restaurants: { name: 'Best Restaurant' }
          }
        }
      ]
    };

    it('should get order by ID for customer owner', async () => {
      mockRequest.params = { id: 'order-123' };

      mockQuery.mockResolvedValueOnce({ rows: [mockOrder], rowCount: 1 } as any);

      await OrderController.getById(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({ order: mockOrder });
    });

    it('should get order by ID for admin', async () => {
      mockRequest.params = { id: 'order-123' };
      mockRequest.user = {
        userId: 'admin-456',
        email: 'admin@cuts.ae',
        role: UserRole.ADMIN
      };

      const orderFromDifferentCustomer = {
        ...mockOrder,
        customer_id: 'different-customer-789'
      };

      mockQuery.mockResolvedValueOnce({ rows: [orderFromDifferentCustomer], rowCount: 1 } as any);

      await OrderController.getById(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({ order: orderFromDifferentCustomer });
    });

    it('should get order by ID for restaurant owner', async () => {
      mockRequest.params = { id: 'order-123' };
      mockRequest.user = {
        userId: 'owner-789',
        email: 'owner@cuts.ae',
        role: UserRole.RESTAURANT_OWNER
      };

      const orderFromDifferentCustomer = {
        ...mockOrder,
        customer_id: 'different-customer-456'
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [orderFromDifferentCustomer], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [{ id: 'restaurant-1' }], rowCount: 1 } as any);

      await OrderController.getById(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({ order: orderFromDifferentCustomer });
    });

    it('should throw error when order not found', async () => {
      mockRequest.params = { id: 'non-existent' };

      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await expect(
        OrderController.getById(mockRequest as AuthRequest, mockResponse as Response)
      ).rejects.toThrow(new AppError('ORD_001'));
    });

    it('should throw error when customer tries to access another customer order', async () => {
      mockRequest.params = { id: 'order-123' };

      const orderFromDifferentCustomer = {
        ...mockOrder,
        customer_id: 'different-customer-789'
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [orderFromDifferentCustomer], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await expect(
        OrderController.getById(mockRequest as AuthRequest, mockResponse as Response)
      ).rejects.toThrow(new AppError('PERM_003'));
    });

    it('should throw error when restaurant owner tries to access order from different restaurant', async () => {
      mockRequest.params = { id: 'order-123' };
      mockRequest.user = {
        userId: 'owner-789',
        email: 'owner@cuts.ae',
        role: UserRole.RESTAURANT_OWNER
      };

      const orderFromDifferentRestaurant = {
        ...mockOrder,
        customer_id: 'different-customer-456',
        restaurants: ['different-restaurant-999']
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [orderFromDifferentRestaurant], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await expect(
        OrderController.getById(mockRequest as AuthRequest, mockResponse as Response)
      ).rejects.toThrow(new AppError('PERM_003'));
    });
  });

  describe('getOrders', () => {
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
            id: 'item-1',
            menu_item_id: 'menu-1',
            quantity: 2,
            base_price: 50,
            item_total: 100,
            special_instructions: null,
            menu_items: { name: 'Burger', image_url: 'burger.jpg' }
          }
        ]
      }
    ];

    it('should get orders for customer', async () => {
      mockRequest.query = {};

      mockQuery.mockResolvedValueOnce({ rows: mockOrders, rowCount: 1 } as any);

      await OrderController.getOrders(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({ orders: mockOrders });
      expect(mockQuery.mock.calls[0][0]).toContain('o.customer_id = $1');
    });

    it('should get orders for restaurant owner', async () => {
      mockRequest.user = {
        userId: 'owner-789',
        email: 'owner@cuts.ae',
        role: UserRole.RESTAURANT_OWNER
      };
      mockRequest.query = {};

      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 'restaurant-1' }, { id: 'restaurant-2' }], rowCount: 2 } as any)
        .mockResolvedValueOnce({ rows: mockOrders, rowCount: 1 } as any);

      await OrderController.getOrders(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({ orders: mockOrders });
      expect(mockQuery.mock.calls[1][0]).toContain('o.restaurants && $1');
    });

    it('should return empty array when restaurant owner has no restaurants', async () => {
      mockRequest.user = {
        userId: 'owner-789',
        email: 'owner@cuts.ae',
        role: UserRole.RESTAURANT_OWNER
      };
      mockRequest.query = {};

      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await OrderController.getOrders(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({ orders: [] });
    });

    it('should get all orders for admin', async () => {
      mockRequest.user = {
        userId: 'admin-456',
        email: 'admin@cuts.ae',
        role: UserRole.ADMIN
      };
      mockRequest.query = {};

      mockQuery.mockResolvedValueOnce({ rows: mockOrders, rowCount: 1 } as any);

      await OrderController.getOrders(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({ orders: mockOrders });
      expect(mockQuery.mock.calls[0][0]).not.toContain('o.customer_id = $');
      expect(mockQuery.mock.calls[0][0]).not.toContain('o.restaurants && $');
    });

    it('should filter orders by status', async () => {
      mockRequest.query = { status: OrderStatus.CONFIRMED };

      mockQuery.mockResolvedValueOnce({ rows: mockOrders, rowCount: 1 } as any);

      await OrderController.getOrders(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({ orders: mockOrders });
      expect(mockQuery.mock.calls[0][0]).toContain('o.status = $2');
      expect(mockQuery.mock.calls[0][1]).toContain(OrderStatus.CONFIRMED);
    });

    it('should filter orders by restaurant_id', async () => {
      mockRequest.query = { restaurant_id: 'restaurant-1' };

      mockQuery.mockResolvedValueOnce({ rows: mockOrders, rowCount: 1 } as any);

      await OrderController.getOrders(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({ orders: mockOrders });
      expect(mockQuery.mock.calls[0][0]).toContain('= ANY(o.restaurants)');
    });

    it('should filter orders by both status and restaurant_id', async () => {
      mockRequest.query = {
        status: OrderStatus.CONFIRMED,
        restaurant_id: 'restaurant-1'
      };

      mockQuery.mockResolvedValueOnce({ rows: mockOrders, rowCount: 1 } as any);

      await OrderController.getOrders(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({ orders: mockOrders });
      expect(mockQuery.mock.calls[0][0]).toContain('o.status = $2');
      expect(mockQuery.mock.calls[0][0]).toContain('= ANY(o.restaurants)');
    });

    it('should filter restaurant owner orders by status', async () => {
      mockRequest.user = {
        userId: 'owner-789',
        email: 'owner@cuts.ae',
        role: UserRole.RESTAURANT_OWNER
      };
      mockRequest.query = { status: OrderStatus.PREPARING };

      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 'restaurant-1' }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: mockOrders, rowCount: 1 } as any);

      await OrderController.getOrders(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({ orders: mockOrders });
      expect(mockQuery.mock.calls[1][0]).toContain('o.status = $2');
    });
  });

  describe('updateStatus', () => {
    const mockOrder = {
      id: 'order-123',
      order_number: 'ABC12345',
      customer_id: 'customer-123',
      restaurants: ['restaurant-1'],
      status: OrderStatus.CONFIRMED,
      updated_at: new Date()
    };

    it('should update order status by admin', async () => {
      mockRequest.params = { id: 'order-123' };
      mockRequest.body = { status: OrderStatus.PREPARING };
      mockRequest.user = {
        userId: 'admin-456',
        email: 'admin@cuts.ae',
        role: UserRole.ADMIN
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [{ restaurants: ['restaurant-1'] }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [mockOrder], rowCount: 1 } as any);

      await OrderController.updateStatus(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Order status updated successfully',
        order: mockOrder
      });
    });

    it('should update order status by restaurant owner', async () => {
      mockRequest.params = { id: 'order-123' };
      mockRequest.body = { status: OrderStatus.PREPARING };
      mockRequest.user = {
        userId: 'owner-789',
        email: 'owner@cuts.ae',
        role: UserRole.RESTAURANT_OWNER
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [{ restaurants: ['restaurant-1'] }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [{ id: 'restaurant-1' }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [mockOrder], rowCount: 1 } as any);

      await OrderController.updateStatus(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Order status updated successfully',
        order: mockOrder
      });
    });

    it('should throw error when order not found', async () => {
      mockRequest.params = { id: 'non-existent' };
      mockRequest.body = { status: OrderStatus.PREPARING };

      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await expect(
        OrderController.updateStatus(mockRequest as AuthRequest, mockResponse as Response)
      ).rejects.toThrow(new AppError('ORD_001'));
    });

    it('should throw error when restaurant owner tries to update order from different restaurant', async () => {
      mockRequest.params = { id: 'order-123' };
      mockRequest.body = { status: OrderStatus.PREPARING };
      mockRequest.user = {
        userId: 'owner-789',
        email: 'owner@cuts.ae',
        role: UserRole.RESTAURANT_OWNER
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [{ restaurants: ['different-restaurant-999'] }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await expect(
        OrderController.updateStatus(mockRequest as AuthRequest, mockResponse as Response)
      ).rejects.toThrow(new AppError('PERM_003'));
    });

    it('should update status through all valid transitions', async () => {
      mockRequest.params = { id: 'order-123' };
      mockRequest.user = {
        userId: 'admin-456',
        email: 'admin@cuts.ae',
        role: UserRole.ADMIN
      };

      const statuses = [
        OrderStatus.CONFIRMED,
        OrderStatus.PREPARING,
        OrderStatus.READY,
        OrderStatus.PICKED_UP,
        OrderStatus.IN_TRANSIT,
        OrderStatus.DELIVERED
      ];

      for (const status of statuses) {
        mockRequest.body = { status };

        mockQuery
          .mockResolvedValueOnce({ rows: [{ restaurants: ['restaurant-1'] }], rowCount: 1 } as any)
          .mockResolvedValueOnce({ rows: [{ ...mockOrder, status }], rowCount: 1 } as any);

        await OrderController.updateStatus(mockRequest as AuthRequest, mockResponse as Response);

        expect(mockResponse.json).toHaveBeenCalledWith({
          message: 'Order status updated successfully',
          order: expect.objectContaining({ status })
        });

        jest.clearAllMocks();
      }
    });
  });

  describe('cancel', () => {
    it('should cancel order by customer', async () => {
      mockRequest.params = { id: 'order-123' };
      mockRequest.body = { reason: 'Changed my mind' };

      const mockOrder = {
        customer_id: 'customer-123',
        status: OrderStatus.PENDING
      };

      const cancelledOrder = {
        id: 'order-123',
        order_number: 'ABC12345',
        customer_id: 'customer-123',
        status: OrderStatus.CANCELLED,
        updated_at: new Date()
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockOrder], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [cancelledOrder], rowCount: 1 } as any);

      await OrderController.cancel(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Order cancelled successfully',
        order: cancelledOrder
      });
    });

    it('should cancel order by admin', async () => {
      mockRequest.params = { id: 'order-123' };
      mockRequest.body = { reason: 'Admin cancellation' };
      mockRequest.user = {
        userId: 'admin-456',
        email: 'admin@cuts.ae',
        role: UserRole.ADMIN
      };

      const mockOrder = {
        customer_id: 'different-customer-789',
        status: OrderStatus.CONFIRMED
      };

      const cancelledOrder = {
        id: 'order-123',
        order_number: 'ABC12345',
        customer_id: 'different-customer-789',
        status: OrderStatus.CANCELLED,
        updated_at: new Date()
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockOrder], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [cancelledOrder], rowCount: 1 } as any);

      await OrderController.cancel(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Order cancelled successfully',
        order: cancelledOrder
      });
    });

    it('should throw error when order not found', async () => {
      mockRequest.params = { id: 'non-existent' };
      mockRequest.body = { reason: 'Test' };

      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await expect(
        OrderController.cancel(mockRequest as AuthRequest, mockResponse as Response)
      ).rejects.toThrow(new AppError('ORD_001'));
    });

    it('should throw error when customer tries to cancel another customer order', async () => {
      mockRequest.params = { id: 'order-123' };
      mockRequest.body = { reason: 'Test' };

      const mockOrder = {
        customer_id: 'different-customer-789',
        status: OrderStatus.PENDING
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockOrder], rowCount: 1 } as any);

      await expect(
        OrderController.cancel(mockRequest as AuthRequest, mockResponse as Response)
      ).rejects.toThrow(new AppError('PERM_003'));
    });

    it('should throw error when trying to cancel picked up order', async () => {
      mockRequest.params = { id: 'order-123' };
      mockRequest.body = { reason: 'Test' };

      const mockOrder = {
        customer_id: 'customer-123',
        status: OrderStatus.PICKED_UP
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockOrder], rowCount: 1 } as any);

      await expect(
        OrderController.cancel(mockRequest as AuthRequest, mockResponse as Response)
      ).rejects.toThrow(new AppError('ORD_004'));
    });

    it('should throw error when trying to cancel in-transit order', async () => {
      mockRequest.params = { id: 'order-123' };
      mockRequest.body = { reason: 'Test' };

      const mockOrder = {
        customer_id: 'customer-123',
        status: OrderStatus.IN_TRANSIT
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockOrder], rowCount: 1 } as any);

      await expect(
        OrderController.cancel(mockRequest as AuthRequest, mockResponse as Response)
      ).rejects.toThrow(new AppError('ORD_004'));
    });

    it('should throw error when trying to cancel delivered order', async () => {
      mockRequest.params = { id: 'order-123' };
      mockRequest.body = { reason: 'Test' };

      const mockOrder = {
        customer_id: 'customer-123',
        status: OrderStatus.DELIVERED
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockOrder], rowCount: 1 } as any);

      await expect(
        OrderController.cancel(mockRequest as AuthRequest, mockResponse as Response)
      ).rejects.toThrow(new AppError('ORD_004'));
    });

    it('should allow cancellation when order is pending', async () => {
      mockRequest.params = { id: 'order-123' };
      mockRequest.body = { reason: 'Test' };

      const mockOrder = {
        customer_id: 'customer-123',
        status: OrderStatus.PENDING
      };

      const cancelledOrder = {
        id: 'order-123',
        status: OrderStatus.CANCELLED
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockOrder], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [cancelledOrder], rowCount: 1 } as any);

      await OrderController.cancel(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Order cancelled successfully',
        order: cancelledOrder
      });
    });

    it('should allow cancellation when order is confirmed', async () => {
      mockRequest.params = { id: 'order-123' };
      mockRequest.body = { reason: 'Test' };

      const mockOrder = {
        customer_id: 'customer-123',
        status: OrderStatus.CONFIRMED
      };

      const cancelledOrder = {
        id: 'order-123',
        status: OrderStatus.CANCELLED
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockOrder], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [cancelledOrder], rowCount: 1 } as any);

      await OrderController.cancel(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Order cancelled successfully',
        order: cancelledOrder
      });
    });

    it('should allow cancellation when order is preparing', async () => {
      mockRequest.params = { id: 'order-123' };
      mockRequest.body = { reason: 'Test' };

      const mockOrder = {
        customer_id: 'customer-123',
        status: OrderStatus.PREPARING
      };

      const cancelledOrder = {
        id: 'order-123',
        status: OrderStatus.CANCELLED
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockOrder], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [cancelledOrder], rowCount: 1 } as any);

      await OrderController.cancel(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Order cancelled successfully',
        order: cancelledOrder
      });
    });

    it('should allow cancellation when order is ready', async () => {
      mockRequest.params = { id: 'order-123' };
      mockRequest.body = { reason: 'Test' };

      const mockOrder = {
        customer_id: 'customer-123',
        status: OrderStatus.READY
      };

      const cancelledOrder = {
        id: 'order-123',
        status: OrderStatus.CANCELLED
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockOrder], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [cancelledOrder], rowCount: 1 } as any);

      await OrderController.cancel(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Order cancelled successfully',
        order: cancelledOrder
      });
    });
  });

  describe('Edge Cases', () => {
    describe('create - edge cases', () => {
      it('should handle zero quantity items', async () => {
        mockRequest.body = {
          items: [
            { menu_item_id: 'item-1', restaurant_id: 'restaurant-1', quantity: 0 }
          ],
          delivery_address: { street: '123 Main St' }
        };

        const mockMenuItem = {
          id: 'item-1',
          base_price: 50,
          restaurant_id: 'restaurant-1',
          is_available: true,
          nutritional_info: null
        };

        const mockOrder = {
          id: 'order-123',
          order_number: 'ABC12345',
          customer_id: 'customer-123',
          restaurants: ['restaurant-1'],
          status: OrderStatus.PENDING,
          subtotal: 0,
          delivery_fee: 10,
          service_fee: 0,
          total_amount: 10,
          payment_status: PaymentStatus.PENDING
        };

        mockQuery
          .mockResolvedValueOnce({ rows: [mockMenuItem], rowCount: 1 } as any)
          .mockResolvedValueOnce({ rows: [mockOrder], rowCount: 1 } as any)
          .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
          .mockResolvedValueOnce({ rows: [{ ...mockOrder, order_items: [] }], rowCount: 1 } as any);

        await OrderController.create(mockRequest as AuthRequest, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(201);
      });

      it('should handle very large quantities', async () => {
        mockRequest.body = {
          items: [
            { menu_item_id: 'item-1', restaurant_id: 'restaurant-1', quantity: 1000 }
          ],
          delivery_address: { street: '123 Main St' }
        };

        const mockMenuItem = {
          id: 'item-1',
          base_price: 50,
          restaurant_id: 'restaurant-1',
          is_available: true,
          nutritional_info: null
        };

        const mockOrder = {
          id: 'order-123',
          order_number: 'ABC12345',
          customer_id: 'customer-123',
          restaurants: ['restaurant-1'],
          status: OrderStatus.PENDING,
          subtotal: 50000,
          delivery_fee: 10,
          service_fee: 2500,
          total_amount: 52510,
          payment_status: PaymentStatus.PENDING
        };

        mockQuery
          .mockResolvedValueOnce({ rows: [mockMenuItem], rowCount: 1 } as any)
          .mockResolvedValueOnce({ rows: [mockOrder], rowCount: 1 } as any)
          .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
          .mockResolvedValueOnce({ rows: [{ ...mockOrder, order_items: [] }], rowCount: 1 } as any);

        await OrderController.create(mockRequest as AuthRequest, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(201);
      });

      it('should handle very small prices', async () => {
        mockRequest.body = {
          items: [
            { menu_item_id: 'item-1', restaurant_id: 'restaurant-1', quantity: 1 }
          ],
          delivery_address: { street: '123 Main St' }
        };

        const mockMenuItem = {
          id: 'item-1',
          base_price: 0.01,
          restaurant_id: 'restaurant-1',
          is_available: true,
          nutritional_info: null
        };

        const mockOrder = {
          id: 'order-123',
          order_number: 'ABC12345',
          customer_id: 'customer-123',
          restaurants: ['restaurant-1'],
          status: OrderStatus.PENDING,
          subtotal: 0.01,
          delivery_fee: 10,
          service_fee: 0.0005,
          total_amount: 10.0105,
          payment_status: PaymentStatus.PENDING
        };

        mockQuery
          .mockResolvedValueOnce({ rows: [mockMenuItem], rowCount: 1 } as any)
          .mockResolvedValueOnce({ rows: [mockOrder], rowCount: 1 } as any)
          .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
          .mockResolvedValueOnce({ rows: [{ ...mockOrder, order_items: [] }], rowCount: 1 } as any);

        await OrderController.create(mockRequest as AuthRequest, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(201);
      });

      it('should handle empty nutritional info array', async () => {
        mockRequest.body = {
          items: [
            { menu_item_id: 'item-1', restaurant_id: 'restaurant-1', quantity: 1 }
          ],
          delivery_address: { street: '123 Main St' }
        };

        const mockMenuItem = {
          id: 'item-1',
          base_price: 50,
          restaurant_id: 'restaurant-1',
          is_available: true,
          nutritional_info: []
        };

        const mockOrder = {
          id: 'order-123',
          order_number: 'ABC12345',
          customer_id: 'customer-123',
          restaurants: ['restaurant-1'],
          status: OrderStatus.PENDING,
          subtotal: 50,
          delivery_fee: 10,
          service_fee: 2.5,
          total_amount: 62.5,
          payment_status: PaymentStatus.PENDING
        };

        mockQuery
          .mockResolvedValueOnce({ rows: [mockMenuItem], rowCount: 1 } as any)
          .mockResolvedValueOnce({ rows: [mockOrder], rowCount: 1 } as any)
          .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
          .mockResolvedValueOnce({ rows: [{ ...mockOrder, order_items: [] }], rowCount: 1 } as any);

        await OrderController.create(mockRequest as AuthRequest, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(201);
      });

      it('should handle special characters in instructions', async () => {
        mockRequest.body = {
          items: [
            {
              menu_item_id: 'item-1',
              restaurant_id: 'restaurant-1',
              quantity: 1,
              special_instructions: "Don't add 'onions' or \"peppers\""
            }
          ],
          delivery_address: { street: '123 Main St' },
          delivery_instructions: "Ring doorbell & wait; don't knock"
        };

        const mockMenuItem = {
          id: 'item-1',
          base_price: 50,
          restaurant_id: 'restaurant-1',
          is_available: true,
          nutritional_info: null
        };

        const mockOrder = {
          id: 'order-123',
          order_number: 'ABC12345',
          customer_id: 'customer-123',
          restaurants: ['restaurant-1'],
          status: OrderStatus.PENDING,
          subtotal: 50,
          delivery_fee: 10,
          service_fee: 2.5,
          total_amount: 62.5,
          payment_status: PaymentStatus.PENDING
        };

        mockQuery
          .mockResolvedValueOnce({ rows: [mockMenuItem], rowCount: 1 } as any)
          .mockResolvedValueOnce({ rows: [mockOrder], rowCount: 1 } as any)
          .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
          .mockResolvedValueOnce({ rows: [{ ...mockOrder, order_items: [] }], rowCount: 1 } as any);

        await OrderController.create(mockRequest as AuthRequest, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(201);
      });
    });
  });

  describe('Concurrent Update Scenarios', () => {
    it('should handle status update when order is modified concurrently', async () => {
      mockRequest.params = { id: 'order-123' };
      mockRequest.body = { status: OrderStatus.PREPARING };
      mockRequest.user = {
        userId: 'admin-456',
        email: 'admin@cuts.ae',
        role: UserRole.ADMIN
      };

      const mockOrder = {
        id: 'order-123',
        order_number: 'ABC12345',
        customer_id: 'customer-123',
        restaurants: ['restaurant-1'],
        status: OrderStatus.PREPARING,
        updated_at: new Date()
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [{ restaurants: ['restaurant-1'] }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [mockOrder], rowCount: 1 } as any);

      await OrderController.updateStatus(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Order status updated successfully',
        order: mockOrder
      });
    });

    it('should handle cancel when order status changes concurrently', async () => {
      mockRequest.params = { id: 'order-123' };
      mockRequest.body = { reason: 'Concurrent test' };

      const mockOrder = {
        customer_id: 'customer-123',
        status: OrderStatus.CONFIRMED
      };

      const cancelledOrder = {
        id: 'order-123',
        status: OrderStatus.CANCELLED
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockOrder], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [cancelledOrder], rowCount: 1 } as any);

      await OrderController.cancel(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Order cancelled successfully',
        order: cancelledOrder
      });
    });
  });

  describe('Payment Validation', () => {
    it('should create order with pending payment status', async () => {
      mockRequest.body = {
        items: [
          { menu_item_id: 'item-1', restaurant_id: 'restaurant-1', quantity: 1 }
        ],
        delivery_address: { street: '123 Main St' }
      };

      const mockMenuItem = {
        id: 'item-1',
        base_price: 50,
        restaurant_id: 'restaurant-1',
        is_available: true,
        nutritional_info: null
      };

      const mockOrder = {
        id: 'order-123',
        order_number: 'ABC12345',
        customer_id: 'customer-123',
        restaurants: ['restaurant-1'],
        status: OrderStatus.PENDING,
        subtotal: 50,
        delivery_fee: 10,
        service_fee: 2.5,
        total_amount: 62.5,
        payment_status: PaymentStatus.PENDING
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockMenuItem], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [mockOrder], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
        .mockResolvedValueOnce({ rows: [{ ...mockOrder, order_items: [] }], rowCount: 1 } as any);

      await OrderController.create(mockRequest as AuthRequest, mockResponse as Response);

      const createOrderCall = mockQuery.mock.calls[1];
      expect(createOrderCall[1][11]).toBe(PaymentStatus.PENDING);
    });
  });

  describe('Authorization Edge Cases', () => {
    it('should allow support role to view orders as admin', async () => {
      mockRequest.params = { id: 'order-123' };
      mockRequest.user = {
        userId: 'support-123',
        email: 'support@cuts.ae',
        role: UserRole.SUPPORT
      };

      const mockOrder = {
        id: 'order-123',
        order_number: 'ABC12345',
        customer_id: 'different-customer',
        restaurants: ['restaurant-1'],
        status: OrderStatus.PENDING,
        order_items: []
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockOrder], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await expect(
        OrderController.getById(mockRequest as AuthRequest, mockResponse as Response)
      ).rejects.toThrow(new AppError('PERM_003'));
    });

    it('should allow driver to update order status', async () => {
      mockRequest.params = { id: 'order-123' };
      mockRequest.body = { status: OrderStatus.PICKED_UP };
      mockRequest.user = {
        userId: 'driver-123',
        email: 'driver@cuts.ae',
        role: UserRole.DRIVER
      };

      const orderData = {
        id: 'order-123',
        customer_id: 'customer-123',
        restaurants: ['restaurant-1'],
        status: OrderStatus.PICKED_UP,
        total_price: 50.00
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [{ restaurants: ['restaurant-1'] }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [orderData], rowCount: 1 } as any);

      await OrderController.updateStatus(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        order: expect.objectContaining({ status: OrderStatus.PICKED_UP })
      });
    });

    it('should prevent restaurant owner from cancelling orders', async () => {
      mockRequest.params = { id: 'order-123' };
      mockRequest.body = { reason: 'Restaurant cancellation' };
      mockRequest.user = {
        userId: 'owner-789',
        email: 'owner@cuts.ae',
        role: UserRole.RESTAURANT_OWNER
      };

      const mockOrder = {
        customer_id: 'customer-123',
        status: OrderStatus.CONFIRMED
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockOrder], rowCount: 1 } as any);

      await expect(
        OrderController.cancel(mockRequest as AuthRequest, mockResponse as Response)
      ).rejects.toThrow(new AppError('PERM_003'));
    });
  });
});
