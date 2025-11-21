import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { RestaurantController } from '../../controllers/restaurant.controller';
import { AppError } from '../../middleware/errorHandler';
import { UserRole } from '../../types';
import pool from '../../config/database';

jest.mock('../../config/database');
jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    http: jest.fn(),
    debug: jest.fn(),
    child: jest.fn(() => ({
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      http: jest.fn(),
      debug: jest.fn(),
    })),
  },
}));

describe('RestaurantController', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    mockRequest = {
      user: {
        userId: 'user-123',
        email: 'owner@cuts.ae',
        role: UserRole.RESTAURANT_OWNER
      },
      query: {},
      params: {},
      body: {}
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    mockQuery = jest.fn();
    (pool.query as jest.Mock) = mockQuery;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAll', () => {
    it('should get all restaurants without filters', async () => {
      const mockRestaurants = [
        { id: '1', name: 'Restaurant 1', is_active: true },
        { id: '2', name: 'Restaurant 2', is_active: false }
      ];

      mockQuery.mockResolvedValue({ rows: mockRestaurants });

      await RestaurantController.getAll(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM restaurants WHERE 1=1 ORDER BY created_at DESC',
        []
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        restaurants: mockRestaurants
      });
    });

    it('should filter restaurants by is_active=true', async () => {
      mockRequest.query = { is_active: 'true' };
      const mockRestaurants = [
        { id: '1', name: 'Restaurant 1', is_active: true }
      ];

      mockQuery.mockResolvedValue({ rows: mockRestaurants });

      await RestaurantController.getAll(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM restaurants WHERE 1=1 AND is_active = $1 ORDER BY created_at DESC',
        [true]
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        restaurants: mockRestaurants
      });
    });

    it('should filter restaurants by is_active=false', async () => {
      mockRequest.query = { is_active: 'false' };
      const mockRestaurants = [
        { id: '2', name: 'Restaurant 2', is_active: false }
      ];

      mockQuery.mockResolvedValue({ rows: mockRestaurants });

      await RestaurantController.getAll(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM restaurants WHERE 1=1 AND is_active = $1 ORDER BY created_at DESC',
        [false]
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        restaurants: mockRestaurants
      });
    });

    it('should filter restaurants by cuisine_type', async () => {
      mockRequest.query = { cuisine_type: 'italian' };
      const mockRestaurants = [
        { id: '1', name: 'Italian Restaurant', cuisine_type: ['italian'] }
      ];

      mockQuery.mockResolvedValue({ rows: mockRestaurants });

      await RestaurantController.getAll(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM restaurants WHERE 1=1 AND $1 = ANY(cuisine_type) ORDER BY created_at DESC',
        ['italian']
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        restaurants: mockRestaurants
      });
    });

    it('should filter restaurants by both is_active and cuisine_type', async () => {
      mockRequest.query = { is_active: 'true', cuisine_type: 'chinese' };
      const mockRestaurants = [
        { id: '3', name: 'Chinese Restaurant', is_active: true, cuisine_type: ['chinese'] }
      ];

      mockQuery.mockResolvedValue({ rows: mockRestaurants });

      await RestaurantController.getAll(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM restaurants WHERE 1=1 AND is_active = $1 AND $2 = ANY(cuisine_type) ORDER BY created_at DESC',
        [true, 'chinese']
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        restaurants: mockRestaurants
      });
    });

    it('should return empty array when no restaurants found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await RestaurantController.getAll(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        restaurants: []
      });
    });

    it('should handle database errors', async () => {
      mockQuery.mockRejectedValue(new Error('Database connection failed'));

      await expect(
        RestaurantController.getAll(mockRequest as AuthRequest, mockResponse as Response)
      ).rejects.toThrow('Database connection failed');
    });
  });

  describe('getMyRestaurants', () => {
    it('should get restaurants owned by the logged-in user with stats', async () => {
      const mockRestaurants = [
        { id: 'rest-1', name: 'My Restaurant 1', owner_id: 'user-123' },
        { id: 'rest-2', name: 'My Restaurant 2', owner_id: 'user-123' }
      ];

      const mockStats1 = { orders_today: '5', revenue_today: '150.50' };
      const mockStats2 = { orders_today: '3', revenue_today: '89.99' };

      mockQuery
        .mockResolvedValueOnce({ rows: mockRestaurants })
        .mockResolvedValueOnce({ rows: [mockStats1] })
        .mockResolvedValueOnce({ rows: [mockStats2] });

      await RestaurantController.getMyRestaurants(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockQuery).toHaveBeenNthCalledWith(
        1,
        'SELECT * FROM restaurants WHERE owner_id = $1 ORDER BY created_at DESC',
        ['user-123']
      );

      expect(mockQuery).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('SELECT'),
        ['rest-1']
      );

      expect(mockQuery).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining('SELECT'),
        ['rest-2']
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        restaurants: [
          {
            ...mockRestaurants[0],
            ordersToday: 5,
            revenue: 'AED 150.50'
          },
          {
            ...mockRestaurants[1],
            ordersToday: 3,
            revenue: 'AED 89.99'
          }
        ]
      });
    });

    it('should handle restaurants with zero revenue', async () => {
      const mockRestaurants = [
        { id: 'rest-1', name: 'New Restaurant', owner_id: 'user-123' }
      ];

      const mockStats = { orders_today: '0', revenue_today: '0' };

      mockQuery
        .mockResolvedValueOnce({ rows: mockRestaurants })
        .mockResolvedValueOnce({ rows: [mockStats] });

      await RestaurantController.getMyRestaurants(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        restaurants: [
          {
            ...mockRestaurants[0],
            ordersToday: 0,
            revenue: 'AED 0.00'
          }
        ]
      });
    });

    it('should return empty array when user has no restaurants', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await RestaurantController.getMyRestaurants(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        restaurants: []
      });
    });

    it('should handle database errors in main query', async () => {
      mockQuery.mockRejectedValue(new Error('Database error'));

      await expect(
        RestaurantController.getMyRestaurants(mockRequest as AuthRequest, mockResponse as Response)
      ).rejects.toThrow('Database error');
    });

    it('should handle database errors in stats query', async () => {
      const mockRestaurants = [
        { id: 'rest-1', name: 'My Restaurant', owner_id: 'user-123' }
      ];

      mockQuery
        .mockResolvedValueOnce({ rows: mockRestaurants })
        .mockRejectedValueOnce(new Error('Stats query failed'));

      await expect(
        RestaurantController.getMyRestaurants(mockRequest as AuthRequest, mockResponse as Response)
      ).rejects.toThrow('Stats query failed');
    });
  });

  describe('getById', () => {
    it('should get restaurant by UUID', async () => {
      const mockRestaurant = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test Restaurant'
      };

      mockRequest.params = { id: '550e8400-e29b-41d4-a716-446655440000' };
      mockQuery.mockResolvedValue({ rows: [mockRestaurant] });

      await RestaurantController.getById(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM restaurants WHERE id = $1',
        ['550e8400-e29b-41d4-a716-446655440000']
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        restaurant: mockRestaurant
      });
    });

    it('should get restaurant by slug', async () => {
      const mockRestaurant = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        slug: 'test-restaurant',
        name: 'Test Restaurant'
      };

      mockRequest.params = { id: 'test-restaurant' };
      mockQuery.mockResolvedValue({ rows: [mockRestaurant] });

      await RestaurantController.getById(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM restaurants WHERE slug = $1',
        ['test-restaurant']
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        restaurant: mockRestaurant
      });
    });

    it('should get restaurant by slug with @ prefix', async () => {
      const mockRestaurant = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        slug: 'test-restaurant',
        name: 'Test Restaurant'
      };

      mockRequest.params = { id: '@test-restaurant' };
      mockQuery.mockResolvedValue({ rows: [mockRestaurant] });

      await RestaurantController.getById(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM restaurants WHERE slug = $1',
        ['test-restaurant']
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        restaurant: mockRestaurant
      });
    });

    it('should throw 404 error when restaurant not found', async () => {
      mockRequest.params = { id: 'non-existent-slug' };
      mockQuery.mockResolvedValue({ rows: [] });

      await expect(
        RestaurantController.getById(mockRequest as AuthRequest, mockResponse as Response)
      ).rejects.toThrow(new AppError('REST_001'));
    });

    it('should handle database errors', async () => {
      mockRequest.params = { id: 'test-restaurant' };
      mockQuery.mockRejectedValue(new Error('Database error'));

      await expect(
        RestaurantController.getById(mockRequest as AuthRequest, mockResponse as Response)
      ).rejects.toThrow('Database error');
    });
  });

  describe('create', () => {
    it('should create a new restaurant successfully', async () => {
      const restaurantData = {
        name: 'New Restaurant',
        description: 'A great place to eat',
        cuisine_type: ['italian', 'pizza'],
        address: { street: '123 Main St', city: 'Dubai' },
        phone: '+971501234567',
        email: 'restaurant@example.com',
        operating_hours: { monday: '9:00-22:00' },
        average_prep_time: 30
      };

      const mockCreatedRestaurant = {
        id: 'new-rest-id',
        owner_id: 'user-123',
        slug: 'new-restaurant',
        ...restaurantData
      };

      mockRequest.body = restaurantData;

      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [mockCreatedRestaurant] });

      await RestaurantController.create(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockQuery).toHaveBeenNthCalledWith(
        1,
        'SELECT id FROM restaurants WHERE slug = $1',
        ['new-restaurant']
      );

      expect(mockQuery).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('INSERT INTO restaurants'),
        [
          'user-123',
          'New Restaurant',
          'new-restaurant',
          'A great place to eat',
          ['italian', 'pizza'],
          '{"street":"123 Main St","city":"Dubai"}',
          '+971501234567',
          'restaurant@example.com',
          '{"monday":"9:00-22:00"}',
          30
        ]
      );

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Restaurant created successfully',
        restaurant: mockCreatedRestaurant
      });
    });

    it('should create restaurant with default average_prep_time when not provided', async () => {
      const restaurantData = {
        name: 'Quick Bites',
        description: 'Fast food',
        cuisine_type: ['fast-food'],
        address: { street: '456 Quick St', city: 'Abu Dhabi' },
        phone: '+971501234568',
        email: 'quick@example.com',
        operating_hours: { monday: '10:00-23:00' }
      };

      const mockCreatedRestaurant = {
        id: 'new-rest-id',
        owner_id: 'user-123',
        slug: 'quick-bites',
        average_prep_time: 30,
        ...restaurantData
      };

      mockRequest.body = restaurantData;

      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [mockCreatedRestaurant] });

      await RestaurantController.create(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockQuery).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('INSERT INTO restaurants'),
        expect.arrayContaining([30])
      );
    });

    it('should generate slug from restaurant name', async () => {
      const restaurantData = {
        name: 'The Best Pizza & Pasta!',
        description: 'Italian cuisine',
        cuisine_type: ['italian'],
        address: { street: '789 Food St', city: 'Dubai' },
        phone: '+971501234569',
        email: 'pizza@example.com',
        operating_hours: { monday: '11:00-23:00' },
        average_prep_time: 25
      };

      mockRequest.body = restaurantData;

      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 'new-id' }] });

      await RestaurantController.create(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockQuery).toHaveBeenNthCalledWith(
        1,
        'SELECT id FROM restaurants WHERE slug = $1',
        ['the-best-pizza-pasta-']
      );
    });

    it('should throw error when restaurant with same slug already exists', async () => {
      const restaurantData = {
        name: 'Existing Restaurant',
        description: 'Already exists',
        cuisine_type: ['italian'],
        address: { street: '123 Main St', city: 'Dubai' },
        phone: '+971501234567',
        email: 'existing@example.com',
        operating_hours: { monday: '9:00-22:00' },
        average_prep_time: 30
      };

      mockRequest.body = restaurantData;
      mockQuery.mockResolvedValue({ rows: [{ id: 'existing-id' }] });

      await expect(
        RestaurantController.create(mockRequest as AuthRequest, mockResponse as Response)
      ).rejects.toThrow(new AppError('REST_002'));
    });

    it('should handle database errors during slug check', async () => {
      mockRequest.body = {
        name: 'Test Restaurant',
        cuisine_type: ['italian'],
        address: {},
        phone: '+971501234567',
        email: 'test@example.com',
        operating_hours: {}
      };

      mockQuery.mockRejectedValue(new Error('Database error'));

      await expect(
        RestaurantController.create(mockRequest as AuthRequest, mockResponse as Response)
      ).rejects.toThrow('Database error');
    });

    it('should handle database errors during insert', async () => {
      mockRequest.body = {
        name: 'Test Restaurant',
        cuisine_type: ['italian'],
        address: {},
        phone: '+971501234567',
        email: 'test@example.com',
        operating_hours: {}
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockRejectedValueOnce(new Error('Insert failed'));

      await expect(
        RestaurantController.create(mockRequest as AuthRequest, mockResponse as Response)
      ).rejects.toThrow('Insert failed');
    });
  });

  describe('update', () => {
    it('should update restaurant successfully as owner', async () => {
      const updateData = {
        name: 'Updated Restaurant Name',
        description: 'Updated description'
      };

      const mockUpdatedRestaurant = {
        id: 'rest-123',
        owner_id: 'user-123',
        ...updateData
      };

      mockRequest.params = { id: 'rest-123' };
      mockRequest.body = updateData;

      mockQuery
        .mockResolvedValueOnce({ rows: [{ owner_id: 'user-123' }] })
        .mockResolvedValueOnce({ rows: [mockUpdatedRestaurant] });

      await RestaurantController.update(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockQuery).toHaveBeenNthCalledWith(
        1,
        'SELECT owner_id FROM restaurants WHERE id = $1',
        ['rest-123']
      );

      expect(mockQuery).toHaveBeenNthCalledWith(
        2,
        'UPDATE restaurants SET name = $2, description = $3, updated_at = NOW() WHERE id = $1 RETURNING *',
        ['rest-123', 'Updated Restaurant Name', 'Updated description']
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Restaurant updated successfully',
        restaurant: mockUpdatedRestaurant
      });
    });

    it('should update restaurant successfully as admin', async () => {
      const updateData = {
        commission_rate: 0.20
      };

      mockRequest.params = { id: 'rest-123' };
      mockRequest.body = updateData;
      mockRequest.user!.role = UserRole.ADMIN;
      mockRequest.user!.userId = 'admin-456';

      mockQuery
        .mockResolvedValueOnce({ rows: [{ owner_id: 'different-owner' }] })
        .mockResolvedValueOnce({ rows: [{ id: 'rest-123', ...updateData }] });

      await RestaurantController.update(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Restaurant updated successfully',
        restaurant: expect.objectContaining({ commission_rate: 0.20 })
      });
    });

    it('should throw 404 when restaurant not found', async () => {
      mockRequest.params = { id: 'non-existent' };
      mockRequest.body = { name: 'Updated Name' };

      mockQuery.mockResolvedValue({ rows: [] });

      await expect(
        RestaurantController.update(mockRequest as AuthRequest, mockResponse as Response)
      ).rejects.toThrow(new AppError('REST_001'));
    });

    it('should throw 403 when user is not owner and not admin', async () => {
      mockRequest.params = { id: 'rest-123' };
      mockRequest.body = { name: 'Updated Name' };
      mockRequest.user!.userId = 'different-user';

      mockQuery.mockResolvedValue({ rows: [{ owner_id: 'original-owner' }] });

      await expect(
        RestaurantController.update(mockRequest as AuthRequest, mockResponse as Response)
      ).rejects.toThrow(new AppError('REST_006'));
    });

    it('should update single field', async () => {
      const updateData = { phone: '+971501111111' };

      mockRequest.params = { id: 'rest-123' };
      mockRequest.body = updateData;

      mockQuery
        .mockResolvedValueOnce({ rows: [{ owner_id: 'user-123' }] })
        .mockResolvedValueOnce({ rows: [{ id: 'rest-123', ...updateData }] });

      await RestaurantController.update(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockQuery).toHaveBeenNthCalledWith(
        2,
        'UPDATE restaurants SET phone = $2, updated_at = NOW() WHERE id = $1 RETURNING *',
        ['rest-123', '+971501111111']
      );
    });

    it('should update multiple fields', async () => {
      const updateData = {
        name: 'New Name',
        phone: '+971502222222',
        email: 'new@example.com',
        is_active: false
      };

      mockRequest.params = { id: 'rest-123' };
      mockRequest.body = updateData;

      mockQuery
        .mockResolvedValueOnce({ rows: [{ owner_id: 'user-123' }] })
        .mockResolvedValueOnce({ rows: [{ id: 'rest-123', ...updateData }] });

      await RestaurantController.update(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockQuery).toHaveBeenNthCalledWith(
        2,
        'UPDATE restaurants SET name = $2, phone = $3, email = $4, is_active = $5, updated_at = NOW() WHERE id = $1 RETURNING *',
        ['rest-123', 'New Name', '+971502222222', 'new@example.com', false]
      );
    });

    it('should handle database errors during ownership check', async () => {
      mockRequest.params = { id: 'rest-123' };
      mockRequest.body = { name: 'Updated Name' };

      mockQuery.mockRejectedValue(new Error('Database error'));

      await expect(
        RestaurantController.update(mockRequest as AuthRequest, mockResponse as Response)
      ).rejects.toThrow('Database error');
    });

    it('should handle database errors during update', async () => {
      mockRequest.params = { id: 'rest-123' };
      mockRequest.body = { name: 'Updated Name' };

      mockQuery
        .mockResolvedValueOnce({ rows: [{ owner_id: 'user-123' }] })
        .mockRejectedValueOnce(new Error('Update failed'));

      await expect(
        RestaurantController.update(mockRequest as AuthRequest, mockResponse as Response)
      ).rejects.toThrow('Update failed');
    });
  });

  describe('updateOperatingStatus', () => {
    it('should update operating status to open', async () => {
      const mockUpdatedRestaurant = {
        id: 'rest-123',
        owner_id: 'user-123',
        operating_status: 'open'
      };

      mockRequest.params = { id: 'rest-123' };
      mockRequest.body = { operating_status: 'open' };

      mockQuery
        .mockResolvedValueOnce({ rows: [{ owner_id: 'user-123' }] })
        .mockResolvedValueOnce({ rows: [mockUpdatedRestaurant] });

      await RestaurantController.updateOperatingStatus(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockQuery).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('UPDATE restaurants'),
        ['open', 'rest-123']
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Operating status updated successfully',
        restaurant: mockUpdatedRestaurant
      });
    });

    it('should update operating status to not_accepting_orders', async () => {
      const mockUpdatedRestaurant = {
        id: 'rest-123',
        owner_id: 'user-123',
        operating_status: 'not_accepting_orders'
      };

      mockRequest.params = { id: 'rest-123' };
      mockRequest.body = { operating_status: 'not_accepting_orders' };

      mockQuery
        .mockResolvedValueOnce({ rows: [{ owner_id: 'user-123' }] })
        .mockResolvedValueOnce({ rows: [mockUpdatedRestaurant] });

      await RestaurantController.updateOperatingStatus(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Operating status updated successfully',
        restaurant: mockUpdatedRestaurant
      });
    });

    it('should update operating status to closed', async () => {
      const mockUpdatedRestaurant = {
        id: 'rest-123',
        owner_id: 'user-123',
        operating_status: 'closed'
      };

      mockRequest.params = { id: 'rest-123' };
      mockRequest.body = { operating_status: 'closed' };

      mockQuery
        .mockResolvedValueOnce({ rows: [{ owner_id: 'user-123' }] })
        .mockResolvedValueOnce({ rows: [mockUpdatedRestaurant] });

      await RestaurantController.updateOperatingStatus(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Operating status updated successfully',
        restaurant: mockUpdatedRestaurant
      });
    });

    it('should throw error for invalid operating status', async () => {
      mockRequest.params = { id: 'rest-123' };
      mockRequest.body = { operating_status: 'invalid_status' };

      await expect(
        RestaurantController.updateOperatingStatus(mockRequest as AuthRequest, mockResponse as Response)
      ).rejects.toThrow(new AppError('REST_003'));

      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should throw 404 when restaurant not found', async () => {
      mockRequest.params = { id: 'non-existent' };
      mockRequest.body = { operating_status: 'open' };

      mockQuery.mockResolvedValue({ rows: [] });

      await expect(
        RestaurantController.updateOperatingStatus(mockRequest as AuthRequest, mockResponse as Response)
      ).rejects.toThrow(new AppError('REST_001'));
    });

    it('should throw 403 when user is not owner and not admin', async () => {
      mockRequest.params = { id: 'rest-123' };
      mockRequest.body = { operating_status: 'open' };
      mockRequest.user!.userId = 'different-user';

      mockQuery.mockResolvedValue({ rows: [{ owner_id: 'original-owner' }] });

      await expect(
        RestaurantController.updateOperatingStatus(mockRequest as AuthRequest, mockResponse as Response)
      ).rejects.toThrow(new AppError('REST_006'));
    });

    it('should allow admin to update operating status', async () => {
      const mockUpdatedRestaurant = {
        id: 'rest-123',
        owner_id: 'other-owner',
        operating_status: 'closed'
      };

      mockRequest.params = { id: 'rest-123' };
      mockRequest.body = { operating_status: 'closed' };
      mockRequest.user!.role = UserRole.ADMIN;
      mockRequest.user!.userId = 'admin-456';

      mockQuery
        .mockResolvedValueOnce({ rows: [{ owner_id: 'other-owner' }] })
        .mockResolvedValueOnce({ rows: [mockUpdatedRestaurant] });

      await RestaurantController.updateOperatingStatus(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Operating status updated successfully',
        restaurant: mockUpdatedRestaurant
      });
    });

    it('should handle database errors during ownership check', async () => {
      mockRequest.params = { id: 'rest-123' };
      mockRequest.body = { operating_status: 'open' };

      mockQuery.mockRejectedValue(new Error('Database error'));

      await expect(
        RestaurantController.updateOperatingStatus(mockRequest as AuthRequest, mockResponse as Response)
      ).rejects.toThrow('Database error');
    });

    it('should handle database errors during update', async () => {
      mockRequest.params = { id: 'rest-123' };
      mockRequest.body = { operating_status: 'open' };

      mockQuery
        .mockResolvedValueOnce({ rows: [{ owner_id: 'user-123' }] })
        .mockRejectedValueOnce(new Error('Update failed'));

      await expect(
        RestaurantController.updateOperatingStatus(mockRequest as AuthRequest, mockResponse as Response)
      ).rejects.toThrow('Update failed');
    });
  });

  describe('getAnalytics', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-01-15T14:30:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should get analytics for restaurant owner', async () => {
      mockRequest.params = { id: 'rest-123' };

      const mockOrdersResult = [
        { quantity: 2, item_total: '25.50', created_at: new Date(), status: 'delivered' },
        { quantity: 1, item_total: '15.00', created_at: new Date(), status: 'preparing' }
      ];

      const mockTopItems = [
        { menu_item_id: 'item-1', name: 'Burger', count: '10' },
        { menu_item_id: 'item-2', name: 'Pizza', count: '8' }
      ];

      const mockRevenueByDay = [
        { date: '2025-01-14', orders: '5', revenue: '125.50' },
        { date: '2025-01-15', orders: '3', revenue: '75.00' }
      ];

      const mockOrdersByStatus = [
        { status: 'delivered', count: '10' },
        { status: 'preparing', count: '5' }
      ];

      const mockPeakHours = [
        { hour: '12', orders: '15' },
        { hour: '18', orders: '20' }
      ];

      mockQuery
        .mockResolvedValueOnce({ rows: [{ owner_id: 'user-123' }] })
        .mockResolvedValueOnce({ rows: mockOrdersResult })
        .mockResolvedValueOnce({ rows: mockTopItems })
        .mockResolvedValueOnce({ rows: mockRevenueByDay })
        .mockResolvedValueOnce({ rows: mockOrdersByStatus })
        .mockResolvedValueOnce({ rows: mockPeakHours });

      await RestaurantController.getAnalytics(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        analytics: {
          today: {
            orders: 2,
            revenue: 40.5
          },
          topItems: mockTopItems,
          revenueByDay: [
            { date: '2025-01-14', orders: 5, revenue: 125.5 },
            { date: '2025-01-15', orders: 3, revenue: 75 }
          ],
          ordersByStatus: [
            { status: 'delivered', count: 10 },
            { status: 'preparing', count: 5 }
          ],
          peakHours: [
            { hour: 12, orders: 15 },
            { hour: 18, orders: 20 }
          ]
        }
      });
    });

    it('should get analytics for admin', async () => {
      mockRequest.params = { id: 'rest-123' };
      mockRequest.user!.role = UserRole.ADMIN;
      mockRequest.user!.userId = 'admin-456';

      mockQuery
        .mockResolvedValueOnce({ rows: [{ owner_id: 'other-owner' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      await RestaurantController.getAnalytics(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
    });

    it('should return zero analytics when no data available', async () => {
      mockRequest.params = { id: 'rest-123' };

      mockQuery
        .mockResolvedValueOnce({ rows: [{ owner_id: 'user-123' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      await RestaurantController.getAnalytics(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        analytics: {
          today: {
            orders: 0,
            revenue: 0
          },
          topItems: [],
          revenueByDay: [],
          ordersByStatus: [],
          peakHours: []
        }
      });
    });

    it('should throw 404 when restaurant not found', async () => {
      mockRequest.params = { id: 'non-existent' };

      mockQuery.mockResolvedValue({ rows: [] });

      await expect(
        RestaurantController.getAnalytics(mockRequest as AuthRequest, mockResponse as Response)
      ).rejects.toThrow(new AppError('REST_001'));
    });

    it('should throw 403 when user is not owner and not admin', async () => {
      mockRequest.params = { id: 'rest-123' };
      mockRequest.user!.userId = 'different-user';

      mockQuery.mockResolvedValue({ rows: [{ owner_id: 'original-owner' }] });

      await expect(
        RestaurantController.getAnalytics(mockRequest as AuthRequest, mockResponse as Response)
      ).rejects.toThrow(new AppError('REST_006'));
    });

    it('should calculate revenue correctly with decimal values', async () => {
      mockRequest.params = { id: 'rest-123' };

      const mockOrdersResult = [
        { quantity: 1, item_total: '12.99', created_at: new Date(), status: 'delivered' },
        { quantity: 2, item_total: '24.50', created_at: new Date(), status: 'delivered' },
        { quantity: 1, item_total: '8.75', created_at: new Date(), status: 'preparing' }
      ];

      mockQuery
        .mockResolvedValueOnce({ rows: [{ owner_id: 'user-123' }] })
        .mockResolvedValueOnce({ rows: mockOrdersResult })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      await RestaurantController.getAnalytics(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          analytics: expect.objectContaining({
            today: {
              orders: 3,
              revenue: 46.24
            }
          })
        })
      );
    });

    it('should handle database errors during ownership check', async () => {
      mockRequest.params = { id: 'rest-123' };

      mockQuery.mockRejectedValue(new Error('Database error'));

      await expect(
        RestaurantController.getAnalytics(mockRequest as AuthRequest, mockResponse as Response)
      ).rejects.toThrow('Database error');
    });

    it('should handle database errors during orders query', async () => {
      mockRequest.params = { id: 'rest-123' };

      mockQuery
        .mockResolvedValueOnce({ rows: [{ owner_id: 'user-123' }] })
        .mockRejectedValueOnce(new Error('Orders query failed'));

      await expect(
        RestaurantController.getAnalytics(mockRequest as AuthRequest, mockResponse as Response)
      ).rejects.toThrow('Orders query failed');
    });

    it('should handle database errors during top items query', async () => {
      mockRequest.params = { id: 'rest-123' };

      mockQuery
        .mockResolvedValueOnce({ rows: [{ owner_id: 'user-123' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockRejectedValueOnce(new Error('Top items query failed'));

      await expect(
        RestaurantController.getAnalytics(mockRequest as AuthRequest, mockResponse as Response)
      ).rejects.toThrow('Top items query failed');
    });

    it('should handle database errors during revenue by day query', async () => {
      mockRequest.params = { id: 'rest-123' };

      mockQuery
        .mockResolvedValueOnce({ rows: [{ owner_id: 'user-123' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockRejectedValueOnce(new Error('Revenue by day query failed'));

      await expect(
        RestaurantController.getAnalytics(mockRequest as AuthRequest, mockResponse as Response)
      ).rejects.toThrow('Revenue by day query failed');
    });

    it('should handle database errors during orders by status query', async () => {
      mockRequest.params = { id: 'rest-123' };

      mockQuery
        .mockResolvedValueOnce({ rows: [{ owner_id: 'user-123' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockRejectedValueOnce(new Error('Orders by status query failed'));

      await expect(
        RestaurantController.getAnalytics(mockRequest as AuthRequest, mockResponse as Response)
      ).rejects.toThrow('Orders by status query failed');
    });

    it('should handle database errors during peak hours query', async () => {
      mockRequest.params = { id: 'rest-123' };

      mockQuery
        .mockResolvedValueOnce({ rows: [{ owner_id: 'user-123' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockRejectedValueOnce(new Error('Peak hours query failed'));

      await expect(
        RestaurantController.getAnalytics(mockRequest as AuthRequest, mockResponse as Response)
      ).rejects.toThrow('Peak hours query failed');
    });

    it('should query with correct date range for today', async () => {
      mockRequest.params = { id: 'rest-123' };

      mockQuery
        .mockResolvedValueOnce({ rows: [{ owner_id: 'user-123' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      await RestaurantController.getAnalytics(mockRequest as AuthRequest, mockResponse as Response);

      const ordersCall = mockQuery.mock.calls[1];
      expect(ordersCall[0]).toContain('o.created_at >= $2');
      expect(ordersCall[0]).toContain('o.created_at < $3');
    });

    it('should query with correct date range for last 7 days', async () => {
      mockRequest.params = { id: 'rest-123' };

      mockQuery
        .mockResolvedValueOnce({ rows: [{ owner_id: 'user-123' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      await RestaurantController.getAnalytics(mockRequest as AuthRequest, mockResponse as Response);

      const topItemsCall = mockQuery.mock.calls[2];
      expect(topItemsCall[0]).toContain('oi.created_at >= $2');

      const revenueByDayCall = mockQuery.mock.calls[3];
      expect(revenueByDayCall[0]).toContain('o.created_at >= $2');
    });
  });
});
