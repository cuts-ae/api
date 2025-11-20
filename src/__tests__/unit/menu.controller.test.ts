import { Response } from 'express';
import { MenuController } from '../../controllers/menu.controller';
import { AuthRequest } from '../../middleware/auth';
import pool from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { UserRole } from '../../types';

jest.mock('../../config/database');

describe('MenuController', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      params: {},
      query: {},
      body: {},
      user: {
        userId: 'owner-123',
        email: 'owner@cuts.ae',
        role: UserRole.RESTAURANT_OWNER
      }
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    mockQuery = jest.fn();
    (pool.query as jest.Mock) = mockQuery;
  });

  describe('getMenuItems', () => {
    it('should get all menu items for a restaurant', async () => {
      const restaurantId = 'rest-123';
      mockRequest.params = { restaurantId };

      const mockMenuItems = [
        {
          id: 'menu-1',
          restaurant_id: restaurantId,
          name: 'Grilled Chicken',
          description: 'Healthy grilled chicken',
          image_url: 'https://example.com/image.jpg',
          base_price: 25.99,
          category: 'lunch',
          is_available: true,
          prep_time: 20,
          nutritional_info: [
            {
              id: 'nutr-1',
              serving_size: '300g',
              calories: 350,
              protein: 45,
              carbohydrates: 10,
              fat: 12,
              fiber: 2,
              sugar: 1,
              sodium: 450,
              allergens: ['dairy']
            }
          ]
        },
        {
          id: 'menu-2',
          restaurant_id: restaurantId,
          name: 'Caesar Salad',
          description: 'Fresh caesar salad',
          image_url: 'https://example.com/salad.jpg',
          base_price: 18.50,
          category: 'lunch',
          is_available: true,
          prep_time: 10,
          nutritional_info: null
        }
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockMenuItems });

      await MenuController.getMenuItems(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT mi.*'),
        [restaurantId]
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        menuItems: mockMenuItems
      });
    });

    it('should filter menu items by category', async () => {
      const restaurantId = 'rest-123';
      mockRequest.params = { restaurantId };
      mockRequest.query = { category: 'breakfast' };

      const mockMenuItems = [
        {
          id: 'menu-3',
          restaurant_id: restaurantId,
          name: 'Pancakes',
          category: 'breakfast',
          base_price: 12.99,
          is_available: true,
          nutritional_info: null
        }
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockMenuItems });

      await MenuController.getMenuItems(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND mi.category = $2'),
        [restaurantId, 'breakfast']
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        menuItems: mockMenuItems
      });
    });

    it('should filter menu items by availability - true', async () => {
      const restaurantId = 'rest-123';
      mockRequest.params = { restaurantId };
      mockRequest.query = { is_available: 'true' };

      mockQuery.mockResolvedValueOnce({ rows: [] });

      await MenuController.getMenuItems(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND mi.is_available = $2'),
        [restaurantId, true]
      );
    });

    it('should filter menu items by availability - false', async () => {
      const restaurantId = 'rest-123';
      mockRequest.params = { restaurantId };
      mockRequest.query = { is_available: 'false' };

      mockQuery.mockResolvedValueOnce({ rows: [] });

      await MenuController.getMenuItems(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND mi.is_available = $2'),
        [restaurantId, false]
      );
    });

    it('should filter by both category and availability', async () => {
      const restaurantId = 'rest-123';
      mockRequest.params = { restaurantId };
      mockRequest.query = { category: 'dinner', is_available: 'true' };

      mockQuery.mockResolvedValueOnce({ rows: [] });

      await MenuController.getMenuItems(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND mi.category = $2'),
        [restaurantId, 'dinner', true]
      );
    });

    it('should return empty array when no menu items found', async () => {
      mockRequest.params = { restaurantId: 'rest-999' };
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await MenuController.getMenuItems(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        menuItems: []
      });
    });

    it('should handle database errors', async () => {
      mockRequest.params = { restaurantId: 'rest-123' };
      mockQuery.mockRejectedValueOnce(new Error('Database connection failed'));

      await expect(
        MenuController.getMenuItems(
          mockRequest as AuthRequest,
          mockResponse as Response
        )
      ).rejects.toThrow('Database connection failed');
    });

    it('should order results by created_at DESC', async () => {
      mockRequest.params = { restaurantId: 'rest-123' };
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await MenuController.getMenuItems(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY mi.created_at DESC'),
        expect.any(Array)
      );
    });
  });

  describe('createMenuItem', () => {
    beforeEach(() => {
      mockRequest.params = { restaurantId: 'rest-123' };
      mockRequest.body = {
        name: 'Grilled Salmon',
        description: 'Fresh Atlantic salmon',
        image_url: 'https://example.com/salmon.jpg',
        base_price: 35.99,
        category: 'dinner',
        is_available: true,
        prep_time: 25
      };
    });

    it('should create a new menu item as restaurant owner', async () => {
      const mockRestaurant = {
        owner_id: 'owner-123'
      };

      const mockMenuItem = {
        id: 'menu-new',
        restaurant_id: 'rest-123',
        ...mockRequest.body,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockRestaurant] })
        .mockResolvedValueOnce({ rows: [mockMenuItem] });

      await MenuController.createMenuItem(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT owner_id FROM restaurants WHERE id = $1',
        ['rest-123']
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO menu_items'),
        [
          'rest-123',
          'Grilled Salmon',
          'Fresh Atlantic salmon',
          'https://example.com/salmon.jpg',
          35.99,
          'dinner',
          true,
          25
        ]
      );
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Menu item created successfully',
        menuItem: mockMenuItem
      });
    });

    it('should create menu item as admin', async () => {
      mockRequest.user!.userId = 'admin-123';
      mockRequest.user!.role = UserRole.ADMIN;

      const mockRestaurant = {
        owner_id: 'different-owner'
      };

      const mockMenuItem = {
        id: 'menu-new',
        restaurant_id: 'rest-123',
        ...mockRequest.body
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockRestaurant] })
        .mockResolvedValueOnce({ rows: [mockMenuItem] });

      await MenuController.createMenuItem(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Menu item created successfully',
        menuItem: mockMenuItem
      });
    });

    it('should throw 404 when restaurant not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(
        MenuController.createMenuItem(
          mockRequest as AuthRequest,
          mockResponse as Response
        )
      ).rejects.toThrow(new AppError('Restaurant not found', 404));
    });

    it('should throw 403 when user is not the owner and not admin', async () => {
      mockRequest.user!.userId = 'different-user';
      mockRequest.user!.role = UserRole.CUSTOMER;

      const mockRestaurant = {
        owner_id: 'owner-123'
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockRestaurant] });

      await expect(
        MenuController.createMenuItem(
          mockRequest as AuthRequest,
          mockResponse as Response
        )
      ).rejects.toThrow(new AppError('Forbidden', 403));
    });

    it('should default is_available to true when not provided', async () => {
      delete mockRequest.body.is_available;

      const mockRestaurant = { owner_id: 'owner-123' };
      const mockMenuItem = { id: 'menu-new' };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockRestaurant] })
        .mockResolvedValueOnce({ rows: [mockMenuItem] });

      await MenuController.createMenuItem(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO menu_items'),
        expect.arrayContaining([true])
      );
    });

    it('should handle is_available as false', async () => {
      mockRequest.body.is_available = false;

      const mockRestaurant = { owner_id: 'owner-123' };
      const mockMenuItem = { id: 'menu-new' };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockRestaurant] })
        .mockResolvedValueOnce({ rows: [mockMenuItem] });

      await MenuController.createMenuItem(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO menu_items'),
        expect.arrayContaining([false])
      );
    });

    it('should handle zero price', async () => {
      mockRequest.body.base_price = 0;

      const mockRestaurant = { owner_id: 'owner-123' };
      const mockMenuItem = { id: 'menu-new', base_price: 0 };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockRestaurant] })
        .mockResolvedValueOnce({ rows: [mockMenuItem] });

      await MenuController.createMenuItem(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO menu_items'),
        expect.arrayContaining([0])
      );
    });

    it('should handle optional fields as undefined', async () => {
      mockRequest.body = {
        name: 'Simple Item',
        base_price: 10.00,
        category: 'snacks'
      };

      const mockRestaurant = { owner_id: 'owner-123' };
      const mockMenuItem = { id: 'menu-new' };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockRestaurant] })
        .mockResolvedValueOnce({ rows: [mockMenuItem] });

      await MenuController.createMenuItem(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO menu_items'),
        [
          'rest-123',
          'Simple Item',
          undefined,
          undefined,
          10.00,
          'snacks',
          true,
          undefined
        ]
      );
    });
  });

  describe('updateMenuItem', () => {
    beforeEach(() => {
      mockRequest.params = { id: 'menu-123' };
      mockRequest.body = {
        name: 'Updated Item',
        base_price: 29.99
      };
    });

    it('should update menu item as owner', async () => {
      const mockCheck = {
        restaurant_id: 'rest-123',
        owner_id: 'owner-123'
      };

      const mockUpdated = {
        id: 'menu-123',
        name: 'Updated Item',
        base_price: 29.99,
        updated_at: new Date()
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockCheck] })
        .mockResolvedValueOnce({ rows: [mockUpdated] });

      await MenuController.updateMenuItem(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT mi.restaurant_id, r.owner_id'),
        ['menu-123']
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE menu_items SET'),
        expect.arrayContaining(['menu-123', 'Updated Item', 29.99])
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Menu item updated successfully',
        menuItem: mockUpdated
      });
    });

    it('should update menu item as admin', async () => {
      mockRequest.user!.userId = 'admin-123';
      mockRequest.user!.role = UserRole.ADMIN;

      const mockCheck = {
        restaurant_id: 'rest-123',
        owner_id: 'different-owner'
      };

      const mockUpdated = { id: 'menu-123', name: 'Updated Item' };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockCheck] })
        .mockResolvedValueOnce({ rows: [mockUpdated] });

      await MenuController.updateMenuItem(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Menu item updated successfully',
        menuItem: mockUpdated
      });
    });

    it('should throw 404 when menu item not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(
        MenuController.updateMenuItem(
          mockRequest as AuthRequest,
          mockResponse as Response
        )
      ).rejects.toThrow(new AppError('Menu item not found', 404));
    });

    it('should throw 403 when user is not owner and not admin', async () => {
      mockRequest.user!.userId = 'different-user';
      mockRequest.user!.role = UserRole.CUSTOMER;

      const mockCheck = {
        restaurant_id: 'rest-123',
        owner_id: 'owner-123'
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockCheck] });

      await expect(
        MenuController.updateMenuItem(
          mockRequest as AuthRequest,
          mockResponse as Response
        )
      ).rejects.toThrow(new AppError('Forbidden', 403));
    });

    it('should update only whitelisted fields', async () => {
      mockRequest.body = {
        name: 'Updated Name',
        description: 'Updated Desc',
        image_url: 'new-url.jpg',
        base_price: 19.99,
        category: 'breakfast',
        prep_time: 15,
        is_available: false,
        invalid_field: 'should be ignored',
        restaurant_id: 'should-not-update'
      };

      const mockCheck = { owner_id: 'owner-123' };
      const mockUpdated = { id: 'menu-123' };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockCheck] })
        .mockResolvedValueOnce({ rows: [mockUpdated] });

      await MenuController.updateMenuItem(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      const updateQuery = mockQuery.mock.calls[1][0];
      expect(updateQuery).toContain('name = $2');
      expect(updateQuery).toContain('description = $3');
      expect(updateQuery).toContain('image_url = $4');
      expect(updateQuery).toContain('base_price = $5');
      expect(updateQuery).toContain('category = $6');
      expect(updateQuery).toContain('prep_time = $7');
      expect(updateQuery).toContain('is_available = $8');
      expect(updateQuery).not.toContain('invalid_field');
      expect(updateQuery).not.toContain('restaurant_id');
    });

    it('should throw 400 when no valid fields to update', async () => {
      mockRequest.body = {
        invalid_field: 'value',
        another_invalid: 123
      };

      const mockCheck = { owner_id: 'owner-123' };
      mockQuery.mockResolvedValueOnce({ rows: [mockCheck] });

      await expect(
        MenuController.updateMenuItem(
          mockRequest as AuthRequest,
          mockResponse as Response
        )
      ).rejects.toThrow(new AppError('No valid fields to update', 400));
    });

    it('should update single field', async () => {
      mockRequest.body = { name: 'New Name Only' };

      const mockCheck = { owner_id: 'owner-123' };
      const mockUpdated = { id: 'menu-123', name: 'New Name Only' };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockCheck] })
        .mockResolvedValueOnce({ rows: [mockUpdated] });

      await MenuController.updateMenuItem(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE menu_items SET name = $2'),
        ['menu-123', 'New Name Only']
      );
    });

    it('should update description field', async () => {
      mockRequest.body = { description: 'New description' };

      const mockCheck = { owner_id: 'owner-123' };
      const mockUpdated = { id: 'menu-123' };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockCheck] })
        .mockResolvedValueOnce({ rows: [mockUpdated] });

      await MenuController.updateMenuItem(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('description = $2'),
        ['menu-123', 'New description']
      );
    });

    it('should update image_url field', async () => {
      mockRequest.body = { image_url: 'https://new-image.jpg' };

      const mockCheck = { owner_id: 'owner-123' };
      const mockUpdated = { id: 'menu-123' };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockCheck] })
        .mockResolvedValueOnce({ rows: [mockUpdated] });

      await MenuController.updateMenuItem(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('image_url = $2'),
        ['menu-123', 'https://new-image.jpg']
      );
    });

    it('should update category field', async () => {
      mockRequest.body = { category: 'beverages' };

      const mockCheck = { owner_id: 'owner-123' };
      const mockUpdated = { id: 'menu-123' };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockCheck] })
        .mockResolvedValueOnce({ rows: [mockUpdated] });

      await MenuController.updateMenuItem(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('category = $2'),
        ['menu-123', 'beverages']
      );
    });

    it('should update prep_time field', async () => {
      mockRequest.body = { prep_time: 30 };

      const mockCheck = { owner_id: 'owner-123' };
      const mockUpdated = { id: 'menu-123' };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockCheck] })
        .mockResolvedValueOnce({ rows: [mockUpdated] });

      await MenuController.updateMenuItem(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('prep_time = $2'),
        ['menu-123', 30]
      );
    });

    it('should update is_available field', async () => {
      mockRequest.body = { is_available: false };

      const mockCheck = { owner_id: 'owner-123' };
      const mockUpdated = { id: 'menu-123' };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockCheck] })
        .mockResolvedValueOnce({ rows: [mockUpdated] });

      await MenuController.updateMenuItem(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('is_available = $2'),
        ['menu-123', false]
      );
    });

    it('should always update updated_at timestamp', async () => {
      mockRequest.body = { name: 'Test' };

      const mockCheck = { owner_id: 'owner-123' };
      const mockUpdated = { id: 'menu-123' };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockCheck] })
        .mockResolvedValueOnce({ rows: [mockUpdated] });

      await MenuController.updateMenuItem(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('updated_at = NOW()'),
        expect.any(Array)
      );
    });
  });

  describe('deleteMenuItem', () => {
    beforeEach(() => {
      mockRequest.params = { id: 'menu-123' };
    });

    it('should delete menu item as owner', async () => {
      const mockCheck = { owner_id: 'owner-123' };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockCheck] })
        .mockResolvedValueOnce({ rows: [] });

      await MenuController.deleteMenuItem(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT r.owner_id'),
        ['menu-123']
      );
      expect(mockQuery).toHaveBeenCalledWith(
        'DELETE FROM menu_items WHERE id = $1',
        ['menu-123']
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Menu item deleted successfully'
      });
    });

    it('should delete menu item as admin', async () => {
      mockRequest.user!.userId = 'admin-123';
      mockRequest.user!.role = UserRole.ADMIN;

      const mockCheck = { owner_id: 'different-owner' };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockCheck] })
        .mockResolvedValueOnce({ rows: [] });

      await MenuController.deleteMenuItem(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Menu item deleted successfully'
      });
    });

    it('should throw 404 when menu item not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(
        MenuController.deleteMenuItem(
          mockRequest as AuthRequest,
          mockResponse as Response
        )
      ).rejects.toThrow(new AppError('Menu item not found', 404));
    });

    it('should throw 403 when user is not owner and not admin', async () => {
      mockRequest.user!.userId = 'different-user';
      mockRequest.user!.role = UserRole.CUSTOMER;

      const mockCheck = { owner_id: 'owner-123' };
      mockQuery.mockResolvedValueOnce({ rows: [mockCheck] });

      await expect(
        MenuController.deleteMenuItem(
          mockRequest as AuthRequest,
          mockResponse as Response
        )
      ).rejects.toThrow(new AppError('Forbidden', 403));
    });

    it('should handle database error during deletion', async () => {
      const mockCheck = { owner_id: 'owner-123' };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockCheck] })
        .mockRejectedValueOnce(new Error('Delete failed'));

      await expect(
        MenuController.deleteMenuItem(
          mockRequest as AuthRequest,
          mockResponse as Response
        )
      ).rejects.toThrow('Delete failed');
    });
  });

  describe('toggleAvailability', () => {
    beforeEach(() => {
      mockRequest.params = { id: 'menu-123' };
      mockRequest.body = { is_available: false };
    });

    it('should toggle availability to false as owner', async () => {
      const mockCheck = { owner_id: 'owner-123' };
      const mockUpdated = {
        id: 'menu-123',
        is_available: false,
        updated_at: new Date()
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockCheck] })
        .mockResolvedValueOnce({ rows: [mockUpdated] });

      await MenuController.toggleAvailability(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE menu_items SET is_available = $1'),
        [false, 'menu-123']
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Availability updated successfully',
        menuItem: mockUpdated
      });
    });

    it('should toggle availability to true', async () => {
      mockRequest.body.is_available = true;

      const mockCheck = { owner_id: 'owner-123' };
      const mockUpdated = { id: 'menu-123', is_available: true };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockCheck] })
        .mockResolvedValueOnce({ rows: [mockUpdated] });

      await MenuController.toggleAvailability(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE menu_items SET is_available = $1'),
        [true, 'menu-123']
      );
    });

    it('should toggle availability as admin', async () => {
      mockRequest.user!.userId = 'admin-123';
      mockRequest.user!.role = UserRole.ADMIN;

      const mockCheck = { owner_id: 'different-owner' };
      const mockUpdated = { id: 'menu-123', is_available: false };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockCheck] })
        .mockResolvedValueOnce({ rows: [mockUpdated] });

      await MenuController.toggleAvailability(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Availability updated successfully',
        menuItem: mockUpdated
      });
    });

    it('should throw 404 when menu item not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(
        MenuController.toggleAvailability(
          mockRequest as AuthRequest,
          mockResponse as Response
        )
      ).rejects.toThrow(new AppError('Menu item not found', 404));
    });

    it('should throw 403 when user is not owner and not admin', async () => {
      mockRequest.user!.userId = 'different-user';
      mockRequest.user!.role = UserRole.CUSTOMER;

      const mockCheck = { owner_id: 'owner-123' };
      mockQuery.mockResolvedValueOnce({ rows: [mockCheck] });

      await expect(
        MenuController.toggleAvailability(
          mockRequest as AuthRequest,
          mockResponse as Response
        )
      ).rejects.toThrow(new AppError('Forbidden', 403));
    });

    it('should update updated_at timestamp', async () => {
      const mockCheck = { owner_id: 'owner-123' };
      const mockUpdated = { id: 'menu-123', is_available: false };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockCheck] })
        .mockResolvedValueOnce({ rows: [mockUpdated] });

      await MenuController.toggleAvailability(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('updated_at = NOW()'),
        expect.any(Array)
      );
    });
  });

  describe('addNutrition', () => {
    beforeEach(() => {
      mockRequest.params = { id: 'menu-123' };
      mockRequest.body = {
        serving_size: '250g',
        calories: 400,
        protein: 35,
        carbohydrates: 20,
        fat: 15,
        fiber: 5,
        sugar: 3,
        sodium: 500,
        allergens: ['gluten', 'dairy']
      };
    });

    it('should add new nutritional information as owner', async () => {
      const mockCheck = { owner_id: 'owner-123' };
      const mockExisting = { rows: [] };
      const mockNutrition = {
        id: 'nutr-123',
        menu_item_id: 'menu-123',
        ...mockRequest.body,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockCheck] })
        .mockResolvedValueOnce(mockExisting)
        .mockResolvedValueOnce({ rows: [mockNutrition] });

      await MenuController.addNutrition(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id FROM nutritional_info'),
        ['menu-123']
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO nutritional_info'),
        [
          'menu-123',
          '250g',
          400,
          35,
          20,
          15,
          5,
          3,
          500,
          ['gluten', 'dairy']
        ]
      );
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Nutritional information added successfully',
        nutritionInfo: mockNutrition
      });
    });

    it('should update existing nutritional information', async () => {
      const mockCheck = { owner_id: 'owner-123' };
      const mockExisting = { rows: [{ id: 'nutr-existing' }] };
      const mockUpdated = {
        id: 'nutr-existing',
        menu_item_id: 'menu-123',
        ...mockRequest.body
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockCheck] })
        .mockResolvedValueOnce(mockExisting)
        .mockResolvedValueOnce({ rows: [mockUpdated] });

      await MenuController.addNutrition(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE nutritional_info'),
        [
          '250g',
          400,
          35,
          20,
          15,
          5,
          3,
          500,
          ['gluten', 'dairy'],
          'nutr-existing'
        ]
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Nutritional information updated successfully',
        nutritionInfo: mockUpdated
      });
    });

    it('should add nutrition as admin', async () => {
      mockRequest.user!.userId = 'admin-123';
      mockRequest.user!.role = UserRole.ADMIN;

      const mockCheck = { owner_id: 'different-owner' };
      const mockExisting = { rows: [] };
      const mockNutrition = { id: 'nutr-123' };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockCheck] })
        .mockResolvedValueOnce(mockExisting)
        .mockResolvedValueOnce({ rows: [mockNutrition] });

      await MenuController.addNutrition(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(201);
    });

    it('should throw 404 when menu item not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(
        MenuController.addNutrition(
          mockRequest as AuthRequest,
          mockResponse as Response
        )
      ).rejects.toThrow(new AppError('Menu item not found', 404));
    });

    it('should throw 403 when user is not owner and not admin', async () => {
      mockRequest.user!.userId = 'different-user';
      mockRequest.user!.role = UserRole.CUSTOMER;

      const mockCheck = { owner_id: 'owner-123' };
      mockQuery.mockResolvedValueOnce({ rows: [mockCheck] });

      await expect(
        MenuController.addNutrition(
          mockRequest as AuthRequest,
          mockResponse as Response
        )
      ).rejects.toThrow(new AppError('Forbidden', 403));
    });

    it('should handle zero values for nutritional data', async () => {
      mockRequest.body = {
        serving_size: '100g',
        calories: 0,
        protein: 0,
        carbohydrates: 0,
        fat: 0,
        fiber: 0,
        sugar: 0,
        sodium: 0,
        allergens: []
      };

      const mockCheck = { owner_id: 'owner-123' };
      const mockExisting = { rows: [] };
      const mockNutrition = { id: 'nutr-123' };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockCheck] })
        .mockResolvedValueOnce(mockExisting)
        .mockResolvedValueOnce({ rows: [mockNutrition] });

      await MenuController.addNutrition(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO nutritional_info'),
        ['menu-123', '100g', 0, 0, 0, 0, 0, 0, 0, []]
      );
    });

    it('should handle high precision decimal values', async () => {
      mockRequest.body = {
        serving_size: '125.5g',
        calories: 450.75,
        protein: 38.25,
        carbohydrates: 22.5,
        fat: 16.33,
        fiber: 5.8,
        sugar: 3.2,
        sodium: 520.5,
        allergens: []
      };

      const mockCheck = { owner_id: 'owner-123' };
      const mockExisting = { rows: [] };
      const mockNutrition = { id: 'nutr-123' };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockCheck] })
        .mockResolvedValueOnce(mockExisting)
        .mockResolvedValueOnce({ rows: [mockNutrition] });

      await MenuController.addNutrition(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO nutritional_info'),
        [
          'menu-123',
          '125.5g',
          450.75,
          38.25,
          22.5,
          16.33,
          5.8,
          3.2,
          520.5,
          []
        ]
      );
    });

    it('should handle empty allergens array', async () => {
      mockRequest.body.allergens = [];

      const mockCheck = { owner_id: 'owner-123' };
      const mockExisting = { rows: [] };
      const mockNutrition = { id: 'nutr-123' };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockCheck] })
        .mockResolvedValueOnce(mockExisting)
        .mockResolvedValueOnce({ rows: [mockNutrition] });

      await MenuController.addNutrition(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO nutritional_info'),
        expect.arrayContaining([[]])
      );
    });

    it('should handle multiple allergens', async () => {
      mockRequest.body.allergens = [
        'gluten',
        'dairy',
        'nuts',
        'soy',
        'eggs',
        'fish'
      ];

      const mockCheck = { owner_id: 'owner-123' };
      const mockExisting = { rows: [] };
      const mockNutrition = { id: 'nutr-123' };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockCheck] })
        .mockResolvedValueOnce(mockExisting)
        .mockResolvedValueOnce({ rows: [mockNutrition] });

      await MenuController.addNutrition(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO nutritional_info'),
        expect.arrayContaining([
          ['gluten', 'dairy', 'nuts', 'soy', 'eggs', 'fish']
        ])
      );
    });

    it('should update timestamp when updating existing nutrition', async () => {
      const mockCheck = { owner_id: 'owner-123' };
      const mockExisting = { rows: [{ id: 'nutr-existing' }] };
      const mockUpdated = { id: 'nutr-existing' };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockCheck] })
        .mockResolvedValueOnce(mockExisting)
        .mockResolvedValueOnce({ rows: [mockUpdated] });

      await MenuController.addNutrition(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('updated_at = NOW()'),
        expect.any(Array)
      );
    });

    it('should handle optional nutrition fields as undefined', async () => {
      mockRequest.body = {
        serving_size: '200g',
        calories: 300,
        protein: 25,
        carbohydrates: 15,
        fat: 10
      };

      const mockCheck = { owner_id: 'owner-123' };
      const mockExisting = { rows: [] };
      const mockNutrition = { id: 'nutr-123' };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockCheck] })
        .mockResolvedValueOnce(mockExisting)
        .mockResolvedValueOnce({ rows: [mockNutrition] });

      await MenuController.addNutrition(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO nutritional_info'),
        [
          'menu-123',
          '200g',
          300,
          25,
          15,
          10,
          undefined,
          undefined,
          undefined,
          undefined
        ]
      );
    });

    it('should check for existing nutrition with variant_id IS NULL', async () => {
      const mockCheck = { owner_id: 'owner-123' };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockCheck] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 'nutr-123' }] });

      await MenuController.addNutrition(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT id FROM nutritional_info WHERE menu_item_id = $1 AND variant_id IS NULL',
        ['menu-123']
      );
    });

    it('should handle very large nutritional values', async () => {
      mockRequest.body = {
        serving_size: '1000g',
        calories: 9999,
        protein: 500,
        carbohydrates: 800,
        fat: 300,
        fiber: 100,
        sugar: 200,
        sodium: 5000,
        allergens: []
      };

      const mockCheck = { owner_id: 'owner-123' };
      const mockExisting = { rows: [] };
      const mockNutrition = { id: 'nutr-123' };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockCheck] })
        .mockResolvedValueOnce(mockExisting)
        .mockResolvedValueOnce({ rows: [mockNutrition] });

      await MenuController.addNutrition(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO nutritional_info'),
        ['menu-123', '1000g', 9999, 500, 800, 300, 100, 200, 5000, []]
      );
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    describe('Authentication and Authorization', () => {
      it('should handle missing user in request', async () => {
        mockRequest.user = undefined;
        mockRequest.params = { restaurantId: 'rest-123' };
        mockRequest.body = { name: 'Test' };

        mockQuery.mockResolvedValueOnce({ rows: [{ owner_id: 'owner-123' }] });

        await expect(
          MenuController.createMenuItem(
            mockRequest as AuthRequest,
            mockResponse as Response
          )
        ).rejects.toThrow();
      });

      it('should handle driver role trying to create menu item', async () => {
        mockRequest.user!.role = UserRole.DRIVER;
        mockRequest.params = { restaurantId: 'rest-123' };
        mockRequest.body = { name: 'Test' };

        mockQuery.mockResolvedValueOnce({ rows: [{ owner_id: 'different' }] });

        await expect(
          MenuController.createMenuItem(
            mockRequest as AuthRequest,
            mockResponse as Response
          )
        ).rejects.toThrow(new AppError('Forbidden', 403));
      });

      it('should handle support role trying to update menu item', async () => {
        mockRequest.user!.role = UserRole.SUPPORT;
        mockRequest.params = { id: 'menu-123' };
        mockRequest.body = { name: 'Test' };

        mockQuery.mockResolvedValueOnce({
          rows: [{ owner_id: 'different-owner' }]
        });

        await expect(
          MenuController.updateMenuItem(
            mockRequest as AuthRequest,
            mockResponse as Response
          )
        ).rejects.toThrow(new AppError('Forbidden', 403));
      });
    });

    describe('Database Edge Cases', () => {
      it('should handle database timeout', async () => {
        mockRequest.params = { restaurantId: 'rest-123' };
        mockQuery.mockRejectedValueOnce(new Error('Connection timeout'));

        await expect(
          MenuController.getMenuItems(
            mockRequest as AuthRequest,
            mockResponse as Response
          )
        ).rejects.toThrow('Connection timeout');
      });

      it('should handle null response from database', async () => {
        mockRequest.params = { id: 'menu-123' };
        mockQuery.mockResolvedValueOnce(null as any);

        await expect(
          MenuController.deleteMenuItem(
            mockRequest as AuthRequest,
            mockResponse as Response
          )
        ).rejects.toThrow();
      });
    });

    describe('Input Validation Edge Cases', () => {
      it('should handle empty body for create', async () => {
        mockRequest.params = { restaurantId: 'rest-123' };
        mockRequest.body = {};

        mockQuery.mockResolvedValueOnce({ rows: [{ owner_id: 'owner-123' }] });
        mockQuery.mockResolvedValueOnce({ rows: [{ id: 'menu-new' }] });

        await MenuController.createMenuItem(
          mockRequest as AuthRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(201);
      });

      it('should handle undefined body fields', async () => {
        mockRequest.params = { id: 'menu-123' };
        mockRequest.body = { name: undefined };

        const mockCheck = { owner_id: 'owner-123' };
        mockQuery.mockResolvedValueOnce({ rows: [mockCheck] });

        await expect(
          MenuController.updateMenuItem(
            mockRequest as AuthRequest,
            mockResponse as Response
          )
        ).rejects.toThrow(new AppError('No valid fields to update', 400));
      });

      it('should handle null values in body', async () => {
        mockRequest.params = { id: 'menu-123' };
        mockRequest.body = { name: null, description: null };

        const mockCheck = { owner_id: 'owner-123' };
        const mockUpdated = { id: 'menu-123', name: null, description: null };

        mockQuery
          .mockResolvedValueOnce({ rows: [mockCheck] })
          .mockResolvedValueOnce({ rows: [mockUpdated] });

        await MenuController.updateMenuItem(
          mockRequest as AuthRequest,
          mockResponse as Response
        );

        // Null values are treated as valid updates (setting field to null)
        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE menu_items SET'),
          expect.arrayContaining([null, null])
        );
      });
    });

    describe('Query Parameter Edge Cases', () => {
      it('should handle invalid availability query parameter', async () => {
        mockRequest.params = { restaurantId: 'rest-123' };
        mockRequest.query = { is_available: 'invalid' };

        mockQuery.mockResolvedValueOnce({ rows: [] });

        await MenuController.getMenuItems(
          mockRequest as AuthRequest,
          mockResponse as Response
        );

        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('AND mi.is_available = $2'),
          [expect.any(String), false]
        );
      });

      it('should handle numeric category', async () => {
        mockRequest.params = { restaurantId: 'rest-123' };
        mockRequest.query = { category: 123 as any };

        mockQuery.mockResolvedValueOnce({ rows: [] });

        await MenuController.getMenuItems(
          mockRequest as AuthRequest,
          mockResponse as Response
        );

        expect(mockQuery).toHaveBeenCalledWith(
          expect.any(String),
          ['rest-123', 123]
        );
      });
    });

    describe('Concurrent Operations', () => {
      it('should handle race condition in nutrition update', async () => {
        mockRequest.params = { id: 'menu-123' };
        mockRequest.body = {
          serving_size: '200g',
          calories: 300,
          protein: 30,
          carbohydrates: 20,
          fat: 10
        };

        const mockCheck = { owner_id: 'owner-123' };
        mockQuery
          .mockResolvedValueOnce({ rows: [mockCheck] })
          .mockResolvedValueOnce({ rows: [] })
          .mockRejectedValueOnce(
            new Error('duplicate key value violates unique constraint')
          );

        await expect(
          MenuController.addNutrition(
            mockRequest as AuthRequest,
            mockResponse as Response
          )
        ).rejects.toThrow('duplicate key value violates unique constraint');
      });
    });

    describe('Special Characters and Unicode', () => {
      it('should handle special characters in menu item name', async () => {
        mockRequest.params = { restaurantId: 'rest-123' };
        mockRequest.body = {
          name: "Chef's Special: Spicy Jalapeño & Cheese Burger 🍔",
          base_price: 25.99,
          category: 'lunch'
        };

        mockQuery
          .mockResolvedValueOnce({ rows: [{ owner_id: 'owner-123' }] })
          .mockResolvedValueOnce({ rows: [{ id: 'menu-new' }] });

        await MenuController.createMenuItem(
          mockRequest as AuthRequest,
          mockResponse as Response
        );

        expect(mockQuery).toHaveBeenCalledWith(
          expect.any(String),
          expect.arrayContaining([
            "Chef's Special: Spicy Jalapeño & Cheese Burger 🍔"
          ])
        );
      });

      it('should handle Arabic characters in description', async () => {
        mockRequest.params = { id: 'menu-123' };
        mockRequest.body = {
          description: 'وجبة لذيذة ومغذية'
        };

        const mockCheck = { owner_id: 'owner-123' };
        mockQuery
          .mockResolvedValueOnce({ rows: [mockCheck] })
          .mockResolvedValueOnce({ rows: [{ id: 'menu-123' }] });

        await MenuController.updateMenuItem(
          mockRequest as AuthRequest,
          mockResponse as Response
        );

        expect(mockQuery).toHaveBeenCalledWith(
          expect.any(String),
          expect.arrayContaining(['وجبة لذيذة ومغذية'])
        );
      });
    });

    describe('Price Edge Cases', () => {
      it('should handle very small price (cents)', async () => {
        mockRequest.params = { restaurantId: 'rest-123' };
        mockRequest.body = {
          name: 'Mint',
          base_price: 0.01,
          category: 'snacks'
        };

        mockQuery
          .mockResolvedValueOnce({ rows: [{ owner_id: 'owner-123' }] })
          .mockResolvedValueOnce({ rows: [{ id: 'menu-new' }] });

        await MenuController.createMenuItem(
          mockRequest as AuthRequest,
          mockResponse as Response
        );

        expect(mockQuery).toHaveBeenCalledWith(
          expect.any(String),
          expect.arrayContaining([0.01])
        );
      });

      it('should handle very large price', async () => {
        mockRequest.params = { restaurantId: 'rest-123' };
        mockRequest.body = {
          name: 'Luxury Meal',
          base_price: 9999.99,
          category: 'dinner'
        };

        mockQuery
          .mockResolvedValueOnce({ rows: [{ owner_id: 'owner-123' }] })
          .mockResolvedValueOnce({ rows: [{ id: 'menu-new' }] });

        await MenuController.createMenuItem(
          mockRequest as AuthRequest,
          mockResponse as Response
        );

        expect(mockQuery).toHaveBeenCalledWith(
          expect.any(String),
          expect.arrayContaining([9999.99])
        );
      });

      it('should handle price with high precision', async () => {
        mockRequest.params = { id: 'menu-123' };
        mockRequest.body = {
          base_price: 25.999
        };

        const mockCheck = { owner_id: 'owner-123' };
        mockQuery
          .mockResolvedValueOnce({ rows: [mockCheck] })
          .mockResolvedValueOnce({ rows: [{ id: 'menu-123' }] });

        await MenuController.updateMenuItem(
          mockRequest as AuthRequest,
          mockResponse as Response
        );

        expect(mockQuery).toHaveBeenCalledWith(
          expect.any(String),
          expect.arrayContaining([25.999])
        );
      });
    });

    describe('Response Status Codes', () => {
      it('should return 201 for new nutrition info', async () => {
        mockRequest.params = { id: 'menu-123' };
        mockRequest.body = {
          serving_size: '100g',
          calories: 200,
          protein: 20,
          carbohydrates: 10,
          fat: 5
        };

        mockQuery
          .mockResolvedValueOnce({ rows: [{ owner_id: 'owner-123' }] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ id: 'nutr-new' }] });

        await MenuController.addNutrition(
          mockRequest as AuthRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(201);
      });

      it('should return 200 for updated nutrition info', async () => {
        mockRequest.params = { id: 'menu-123' };
        mockRequest.body = {
          serving_size: '100g',
          calories: 200,
          protein: 20,
          carbohydrates: 10,
          fat: 5
        };

        mockQuery
          .mockResolvedValueOnce({ rows: [{ owner_id: 'owner-123' }] })
          .mockResolvedValueOnce({ rows: [{ id: 'nutr-existing' }] })
          .mockResolvedValueOnce({ rows: [{ id: 'nutr-existing' }] });

        await MenuController.addNutrition(
          mockRequest as AuthRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(200);
      });
    });

    describe('Multiple Query Conditions', () => {
      it('should build correct query with category only', async () => {
        mockRequest.params = { restaurantId: 'rest-123' };
        mockRequest.query = { category: 'breakfast' };

        mockQuery.mockResolvedValueOnce({ rows: [] });

        await MenuController.getMenuItems(
          mockRequest as AuthRequest,
          mockResponse as Response
        );

        const queryString = mockQuery.mock.calls[0][0];
        expect(queryString).toContain('WHERE mi.restaurant_id = $1');
        expect(queryString).toContain('AND mi.category = $2');
        expect(queryString).not.toContain('$3');
      });

      it('should build correct query with is_available only', async () => {
        mockRequest.params = { restaurantId: 'rest-123' };
        mockRequest.query = { is_available: 'true' };

        mockQuery.mockResolvedValueOnce({ rows: [] });

        await MenuController.getMenuItems(
          mockRequest as AuthRequest,
          mockResponse as Response
        );

        const queryString = mockQuery.mock.calls[0][0];
        expect(queryString).toContain('WHERE mi.restaurant_id = $1');
        expect(queryString).toContain('AND mi.is_available = $2');
        expect(queryString).not.toContain('$3');
      });

      it('should build correct query with both filters', async () => {
        mockRequest.params = { restaurantId: 'rest-123' };
        mockRequest.query = { category: 'lunch', is_available: 'false' };

        mockQuery.mockResolvedValueOnce({ rows: [] });

        await MenuController.getMenuItems(
          mockRequest as AuthRequest,
          mockResponse as Response
        );

        const queryString = mockQuery.mock.calls[0][0];
        expect(queryString).toContain('WHERE mi.restaurant_id = $1');
        expect(queryString).toContain('AND mi.category = $2');
        expect(queryString).toContain('AND mi.is_available = $3');
      });
    });
  });
});
