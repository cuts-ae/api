import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../app';
import pool from '../../config/database';
import { UserRole, MealCategory } from '../../types';

jest.mock('../../config/database');

describe('Menu Integration Tests', () => {
  let mockQuery: jest.Mock;
  let restaurantOwner1Token: string;
  let restaurantOwner2Token: string;
  let adminToken: string;

  const restaurant1Id = 'restaurant-1';
  const restaurant2Id = 'restaurant-2';
  const owner1Id = 'owner-1';
  const owner2Id = 'owner-2';
  const adminId = 'admin-1';

  beforeAll(() => {
    // Create JWT tokens for testing
    const jwtSecret = process.env.JWT_SECRET || 'test-secret';

    restaurantOwner1Token = jwt.sign(
      {
        userId: owner1Id,
        email: 'owner1@cuts.ae',
        role: UserRole.RESTAURANT_OWNER
      },
      jwtSecret
    );

    restaurantOwner2Token = jwt.sign(
      {
        userId: owner2Id,
        email: 'owner2@cuts.ae',
        role: UserRole.RESTAURANT_OWNER
      },
      jwtSecret
    );

    adminToken = jwt.sign(
      {
        userId: adminId,
        email: 'admin@cuts.ae',
        role: UserRole.ADMIN
      },
      jwtSecret
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery = jest.fn();
    (pool.query as jest.Mock) = mockQuery;
  });

  describe('POST /api/v1/restaurants/:restaurantId/menu-items', () => {
    const validMenuItem = {
      name: 'Grilled Chicken Bowl',
      description: 'Healthy grilled chicken with quinoa',
      image_url: 'https://example.com/chicken.jpg',
      base_price: 35.99,
      category: MealCategory.LUNCH,
      prep_time: 25
    };

    it('should create a menu item with all fields as restaurant owner', async () => {
      // Mock restaurant ownership check
      mockQuery.mockResolvedValueOnce({
        rows: [{ owner_id: owner1Id }]
      });

      // Mock menu item creation
      const createdMenuItem = {
        id: 'menu-1',
        restaurant_id: restaurant1Id,
        ...validMenuItem,
        is_available: true,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockQuery.mockResolvedValueOnce({
        rows: [createdMenuItem]
      });

      const response = await request(app)
        .post(`/api/v1/restaurants/${restaurant1Id}/menu-items`)
        .set('Authorization', `Bearer ${restaurantOwner1Token}`)
        .send(validMenuItem);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Menu item created successfully');
      expect(response.body.menuItem).toMatchObject({
        id: 'menu-1',
        restaurant_id: restaurant1Id,
        name: validMenuItem.name,
        base_price: validMenuItem.base_price,
        category: validMenuItem.category
      });

      expect(mockQuery).toHaveBeenCalledTimes(2);
      // Verify ownership check
      expect(mockQuery).toHaveBeenNthCalledWith(
        1,
        'SELECT owner_id FROM restaurants WHERE id = $1',
        [restaurant1Id]
      );
    });

    it('should create a menu item with minimal fields', async () => {
      const minimalMenuItem = {
        name: 'Simple Salad',
        base_price: 15.00,
        category: MealCategory.LUNCH
      };

      mockQuery.mockResolvedValueOnce({
        rows: [{ owner_id: owner1Id }]
      });

      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'menu-2',
          restaurant_id: restaurant1Id,
          ...minimalMenuItem,
          is_available: true
        }]
      });

      const response = await request(app)
        .post(`/api/v1/restaurants/${restaurant1Id}/menu-items`)
        .set('Authorization', `Bearer ${restaurantOwner1Token}`)
        .send(minimalMenuItem);

      expect(response.status).toBe(201);
      expect(response.body.menuItem.name).toBe('Simple Salad');
      expect(response.body.menuItem.base_price).toBe(15.00);
    });

    it('should create a menu item with is_available set to false', async () => {
      const menuItem = {
        ...validMenuItem,
        is_available: false
      };

      mockQuery.mockResolvedValueOnce({
        rows: [{ owner_id: owner1Id }]
      });

      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'menu-3',
          restaurant_id: restaurant1Id,
          ...menuItem
        }]
      });

      const response = await request(app)
        .post(`/api/v1/restaurants/${restaurant1Id}/menu-items`)
        .set('Authorization', `Bearer ${restaurantOwner1Token}`)
        .send(menuItem);

      expect(response.status).toBe(201);
      expect(response.body.menuItem.is_available).toBe(false);
    });

    it('should allow admin to create menu item for any restaurant', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ owner_id: owner1Id }]
      });

      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'menu-4',
          restaurant_id: restaurant1Id,
          ...validMenuItem
        }]
      });

      const response = await request(app)
        .post(`/api/v1/restaurants/${restaurant1Id}/menu-items`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validMenuItem);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Menu item created successfully');
    });

    it('should reject when restaurant not found', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: []
      });

      const response = await request(app)
        .post(`/api/v1/restaurants/nonexistent-id/menu-items`)
        .set('Authorization', `Bearer ${restaurantOwner1Token}`)
        .send(validMenuItem);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Restaurant not found');
    });

    it('should reject when owner tries to create item for another restaurant', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ owner_id: owner2Id }]
      });

      const response = await request(app)
        .post(`/api/v1/restaurants/${restaurant2Id}/menu-items`)
        .set('Authorization', `Bearer ${restaurantOwner1Token}`)
        .send(validMenuItem);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Not the owner of this restaurant');
    });

    it('should reject with missing required fields', async () => {
      const response = await request(app)
        .post(`/api/v1/restaurants/${restaurant1Id}/menu-items`)
        .set('Authorization', `Bearer ${restaurantOwner1Token}`)
        .send({
          name: 'Test'
          // Missing base_price and category
        });

      expect(response.status).toBe(400);
    });

    it('should reject with negative price', async () => {
      const response = await request(app)
        .post(`/api/v1/restaurants/${restaurant1Id}/menu-items`)
        .set('Authorization', `Bearer ${restaurantOwner1Token}`)
        .send({
          ...validMenuItem,
          base_price: -10
        });

      expect(response.status).toBe(400);
    });

    it('should reject with invalid category', async () => {
      const response = await request(app)
        .post(`/api/v1/restaurants/${restaurant1Id}/menu-items`)
        .set('Authorization', `Bearer ${restaurantOwner1Token}`)
        .send({
          ...validMenuItem,
          category: 'invalid_category'
        });

      expect(response.status).toBe(400);
    });

    it('should reject with name too short', async () => {
      const response = await request(app)
        .post(`/api/v1/restaurants/${restaurant1Id}/menu-items`)
        .set('Authorization', `Bearer ${restaurantOwner1Token}`)
        .send({
          ...validMenuItem,
          name: 'A'
        });

      expect(response.status).toBe(400);
    });

    it('should reject with invalid image URL', async () => {
      const response = await request(app)
        .post(`/api/v1/restaurants/${restaurant1Id}/menu-items`)
        .set('Authorization', `Bearer ${restaurantOwner1Token}`)
        .send({
          ...validMenuItem,
          image_url: 'not-a-url'
        });

      expect(response.status).toBe(400);
    });

    it('should reject with negative prep time', async () => {
      const response = await request(app)
        .post(`/api/v1/restaurants/${restaurant1Id}/menu-items`)
        .set('Authorization', `Bearer ${restaurantOwner1Token}`)
        .send({
          ...validMenuItem,
          prep_time: -5
        });

      expect(response.status).toBe(400);
    });

    it('should reject without authentication token', async () => {
      const response = await request(app)
        .post(`/api/v1/restaurants/${restaurant1Id}/menu-items`)
        .send(validMenuItem);

      expect(response.status).toBe(401);
    });

    it('should reject with invalid token', async () => {
      const response = await request(app)
        .post(`/api/v1/restaurants/${restaurant1Id}/menu-items`)
        .set('Authorization', 'Bearer invalid-token')
        .send(validMenuItem);

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/restaurants/:restaurantId/menu-items', () => {
    const mockMenuItems = [
      {
        id: 'menu-1',
        restaurant_id: restaurant1Id,
        name: 'Grilled Chicken',
        description: 'Healthy grilled chicken',
        base_price: 35.99,
        category: MealCategory.LUNCH,
        is_available: true,
        prep_time: 25,
        nutritional_info: [
          {
            id: 'nutr-1',
            serving_size: '300g',
            calories: 350,
            protein: 45,
            carbohydrates: 10,
            fat: 12,
            allergens: ['dairy']
          }
        ]
      },
      {
        id: 'menu-2',
        restaurant_id: restaurant1Id,
        name: 'Caesar Salad',
        base_price: 18.50,
        category: MealCategory.LUNCH,
        is_available: false,
        nutritional_info: null
      }
    ];

    it('should get all menu items for a restaurant (public access)', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: mockMenuItems
      });

      const response = await request(app)
        .get(`/api/v1/restaurants/${restaurant1Id}/menu-items`);

      expect(response.status).toBe(200);
      expect(response.body.menuItems).toHaveLength(2);
      expect(response.body.menuItems[0].name).toBe('Grilled Chicken');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT mi.*'),
        [restaurant1Id]
      );
    });

    it('should filter menu items by category', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [mockMenuItems[0]]
      });

      const response = await request(app)
        .get(`/api/v1/restaurants/${restaurant1Id}/menu-items`)
        .query({ category: MealCategory.LUNCH });

      expect(response.status).toBe(200);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND mi.category = $2'),
        [restaurant1Id, MealCategory.LUNCH]
      );
    });

    it('should filter menu items by availability (true)', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [mockMenuItems[0]]
      });

      const response = await request(app)
        .get(`/api/v1/restaurants/${restaurant1Id}/menu-items`)
        .query({ is_available: 'true' });

      expect(response.status).toBe(200);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND mi.is_available = $2'),
        [restaurant1Id, true]
      );
    });

    it('should filter menu items by availability (false)', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [mockMenuItems[1]]
      });

      const response = await request(app)
        .get(`/api/v1/restaurants/${restaurant1Id}/menu-items`)
        .query({ is_available: 'false' });

      expect(response.status).toBe(200);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND mi.is_available = $2'),
        [restaurant1Id, false]
      );
    });

    it('should filter by both category and availability', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [mockMenuItems[0]]
      });

      const response = await request(app)
        .get(`/api/v1/restaurants/${restaurant1Id}/menu-items`)
        .query({
          category: MealCategory.LUNCH,
          is_available: 'true'
        });

      expect(response.status).toBe(200);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND mi.category = $2'),
        [restaurant1Id, MealCategory.LUNCH, true]
      );
    });

    it('should return empty array when no menu items found', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: []
      });

      const response = await request(app)
        .get(`/api/v1/restaurants/${restaurant1Id}/menu-items`);

      expect(response.status).toBe(200);
      expect(response.body.menuItems).toEqual([]);
    });
  });

  describe('PUT /api/v1/menu-items/:id', () => {
    const menuItemId = 'menu-1';
    const updateData = {
      name: 'Updated Chicken Bowl',
      description: 'Updated description',
      base_price: 39.99,
      category: MealCategory.DINNER,
      prep_time: 30,
      is_available: false
    };

    it('should update all fields of a menu item as owner', async () => {
      // Mock ownership check
      mockQuery.mockResolvedValueOnce({
        rows: [{
          restaurant_id: restaurant1Id,
          owner_id: owner1Id
        }]
      });

      // Mock update
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: menuItemId,
          restaurant_id: restaurant1Id,
          ...updateData,
          updated_at: new Date()
        }]
      });

      const response = await request(app)
        .put(`/api/v1/menu-items/${menuItemId}`)
        .set('Authorization', `Bearer ${restaurantOwner1Token}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Menu item updated successfully');
      expect(response.body.menuItem.name).toBe('Updated Chicken Bowl');
      expect(response.body.menuItem.base_price).toBe(39.99);
    });

    it('should partially update menu item (only name)', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ owner_id: owner1Id }]
      });

      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: menuItemId,
          name: 'New Name Only'
        }]
      });

      const response = await request(app)
        .put(`/api/v1/menu-items/${menuItemId}`)
        .set('Authorization', `Bearer ${restaurantOwner1Token}`)
        .send({ name: 'New Name Only' });

      expect(response.status).toBe(200);
      expect(response.body.menuItem.name).toBe('New Name Only');
    });

    it('should partially update menu item (only price)', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ owner_id: owner1Id }]
      });

      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: menuItemId,
          base_price: 45.00
        }]
      });

      const response = await request(app)
        .put(`/api/v1/menu-items/${menuItemId}`)
        .set('Authorization', `Bearer ${restaurantOwner1Token}`)
        .send({ base_price: 45.00 });

      expect(response.status).toBe(200);
      expect(response.body.menuItem.base_price).toBe(45.00);
    });

    it('should allow admin to update any menu item', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ owner_id: owner2Id }]
      });

      mockQuery.mockResolvedValueOnce({
        rows: [{ id: menuItemId, ...updateData }]
      });

      const response = await request(app)
        .put(`/api/v1/menu-items/${menuItemId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Menu item updated successfully');
    });

    it('should reject when menu item not found', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: []
      });

      const response = await request(app)
        .put(`/api/v1/menu-items/${menuItemId}`)
        .set('Authorization', `Bearer ${restaurantOwner1Token}`)
        .send(updateData);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Menu item not found');
    });

    it('should reject when owner tries to update another restaurant menu item', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ owner_id: owner2Id }]
      });

      const response = await request(app)
        .put(`/api/v1/menu-items/${menuItemId}`)
        .set('Authorization', `Bearer ${restaurantOwner1Token}`)
        .send(updateData);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Not the owner of this restaurant');
    });

    it('should reject with no valid fields to update', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ owner_id: owner1Id }]
      });

      const response = await request(app)
        .put(`/api/v1/menu-items/${menuItemId}`)
        .set('Authorization', `Bearer ${restaurantOwner1Token}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Request validation failed');
    });

    it('should reject with negative price in update', async () => {
      const response = await request(app)
        .put(`/api/v1/menu-items/${menuItemId}`)
        .set('Authorization', `Bearer ${restaurantOwner1Token}`)
        .send({ base_price: -10 });

      expect(response.status).toBe(400);
    });

    it('should reject with invalid category in update', async () => {
      const response = await request(app)
        .put(`/api/v1/menu-items/${menuItemId}`)
        .set('Authorization', `Bearer ${restaurantOwner1Token}`)
        .send({ category: 'invalid_category' });

      expect(response.status).toBe(400);
    });

    it('should reject with name too short in update', async () => {
      const response = await request(app)
        .put(`/api/v1/menu-items/${menuItemId}`)
        .set('Authorization', `Bearer ${restaurantOwner1Token}`)
        .send({ name: 'A' });

      expect(response.status).toBe(400);
    });

    it('should reject without authentication', async () => {
      const response = await request(app)
        .put(`/api/v1/menu-items/${menuItemId}`)
        .send(updateData);

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/v1/menu-items/:id', () => {
    const menuItemId = 'menu-1';

    it('should delete menu item as owner', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ owner_id: owner1Id }]
      });

      mockQuery.mockResolvedValueOnce({
        rows: []
      });

      const response = await request(app)
        .delete(`/api/v1/menu-items/${menuItemId}`)
        .set('Authorization', `Bearer ${restaurantOwner1Token}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Menu item deleted successfully');
      expect(mockQuery).toHaveBeenCalledWith(
        'DELETE FROM menu_items WHERE id = $1',
        [menuItemId]
      );
    });

    it('should allow admin to delete any menu item', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ owner_id: owner2Id }]
      });

      mockQuery.mockResolvedValueOnce({
        rows: []
      });

      const response = await request(app)
        .delete(`/api/v1/menu-items/${menuItemId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Menu item deleted successfully');
    });

    it('should reject when menu item not found', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: []
      });

      const response = await request(app)
        .delete(`/api/v1/menu-items/${menuItemId}`)
        .set('Authorization', `Bearer ${restaurantOwner1Token}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Menu item not found');
    });

    it('should reject when owner tries to delete another restaurant menu item', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ owner_id: owner2Id }]
      });

      const response = await request(app)
        .delete(`/api/v1/menu-items/${menuItemId}`)
        .set('Authorization', `Bearer ${restaurantOwner1Token}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Not the owner of this restaurant');
    });

    it('should reject without authentication', async () => {
      const response = await request(app)
        .delete(`/api/v1/menu-items/${menuItemId}`);

      expect(response.status).toBe(401);
    });
  });

  describe('PATCH /api/v1/menu-items/:id/availability', () => {
    const menuItemId = 'menu-1';

    it('should toggle availability to false as owner', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ owner_id: owner1Id }]
      });

      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: menuItemId,
          is_available: false,
          updated_at: new Date()
        }]
      });

      const response = await request(app)
        .patch(`/api/v1/menu-items/${menuItemId}/availability`)
        .set('Authorization', `Bearer ${restaurantOwner1Token}`)
        .send({ is_available: false });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Availability updated successfully');
      expect(response.body.menuItem.is_available).toBe(false);
    });

    it('should toggle availability to true as owner', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ owner_id: owner1Id }]
      });

      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: menuItemId,
          is_available: true,
          updated_at: new Date()
        }]
      });

      const response = await request(app)
        .patch(`/api/v1/menu-items/${menuItemId}/availability`)
        .set('Authorization', `Bearer ${restaurantOwner1Token}`)
        .send({ is_available: true });

      expect(response.status).toBe(200);
      expect(response.body.menuItem.is_available).toBe(true);
    });

    it('should allow admin to toggle availability', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ owner_id: owner2Id }]
      });

      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: menuItemId,
          is_available: false
        }]
      });

      const response = await request(app)
        .patch(`/api/v1/menu-items/${menuItemId}/availability`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ is_available: false });

      expect(response.status).toBe(200);
    });

    it('should reject when menu item not found', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: []
      });

      const response = await request(app)
        .patch(`/api/v1/menu-items/${menuItemId}/availability`)
        .set('Authorization', `Bearer ${restaurantOwner1Token}`)
        .send({ is_available: false });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Menu item not found');
    });

    it('should reject when owner tries to toggle another restaurant item', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ owner_id: owner2Id }]
      });

      const response = await request(app)
        .patch(`/api/v1/menu-items/${menuItemId}/availability`)
        .set('Authorization', `Bearer ${restaurantOwner1Token}`)
        .send({ is_available: false });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Not the owner of this restaurant');
    });

    it('should reject without authentication', async () => {
      const response = await request(app)
        .patch(`/api/v1/menu-items/${menuItemId}/availability`)
        .send({ is_available: false });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/v1/menu-items/:id/nutrition', () => {
    const menuItemId = 'menu-1';
    const nutritionData = {
      serving_size: '350g',
      calories: 450,
      protein: 35,
      carbohydrates: 40,
      fat: 15,
      fiber: 8,
      sugar: 5,
      sodium: 650,
      allergens: ['gluten', 'dairy', 'soy']
    };

    it('should add nutritional information as owner (create new)', async () => {
      // Mock ownership check
      mockQuery.mockResolvedValueOnce({
        rows: [{ owner_id: owner1Id }]
      });

      // Mock check for existing nutrition info
      mockQuery.mockResolvedValueOnce({
        rows: []
      });

      // Mock insert
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'nutr-1',
          menu_item_id: menuItemId,
          ...nutritionData,
          created_at: new Date(),
          updated_at: new Date()
        }]
      });

      const response = await request(app)
        .post(`/api/v1/menu-items/${menuItemId}/nutrition`)
        .set('Authorization', `Bearer ${restaurantOwner1Token}`)
        .send(nutritionData);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Nutritional information added successfully');
      expect(response.body.nutritionInfo.calories).toBe(450);
      expect(response.body.nutritionInfo.allergens).toEqual(['gluten', 'dairy', 'soy']);
    });

    it('should update existing nutritional information as owner', async () => {
      // Mock ownership check
      mockQuery.mockResolvedValueOnce({
        rows: [{ owner_id: owner1Id }]
      });

      // Mock check for existing nutrition info
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'nutr-1' }]
      });

      // Mock update
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'nutr-1',
          menu_item_id: menuItemId,
          ...nutritionData,
          updated_at: new Date()
        }]
      });

      const response = await request(app)
        .post(`/api/v1/menu-items/${menuItemId}/nutrition`)
        .set('Authorization', `Bearer ${restaurantOwner1Token}`)
        .send(nutritionData);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Nutritional information updated successfully');
    });

    it('should add nutritional information with minimal fields', async () => {
      const minimalNutrition = {
        serving_size: '200g',
        calories: 250,
        protein: 20,
        carbohydrates: 30,
        fat: 10
      };

      mockQuery.mockResolvedValueOnce({
        rows: [{ owner_id: owner1Id }]
      });

      mockQuery.mockResolvedValueOnce({
        rows: []
      });

      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'nutr-2',
          menu_item_id: menuItemId,
          ...minimalNutrition
        }]
      });

      const response = await request(app)
        .post(`/api/v1/menu-items/${menuItemId}/nutrition`)
        .set('Authorization', `Bearer ${restaurantOwner1Token}`)
        .send(minimalNutrition);

      expect(response.status).toBe(201);
      expect(response.body.nutritionInfo.calories).toBe(250);
    });

    it('should add nutritional information with empty allergens array', async () => {
      const nutritionWithNoAllergens = {
        ...nutritionData,
        allergens: []
      };

      mockQuery.mockResolvedValueOnce({
        rows: [{ owner_id: owner1Id }]
      });

      mockQuery.mockResolvedValueOnce({
        rows: []
      });

      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'nutr-3',
          menu_item_id: menuItemId,
          ...nutritionWithNoAllergens
        }]
      });

      const response = await request(app)
        .post(`/api/v1/menu-items/${menuItemId}/nutrition`)
        .set('Authorization', `Bearer ${restaurantOwner1Token}`)
        .send(nutritionWithNoAllergens);

      expect(response.status).toBe(201);
      expect(response.body.nutritionInfo.allergens).toEqual([]);
    });

    it('should allow admin to add nutrition info', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ owner_id: owner2Id }]
      });

      mockQuery.mockResolvedValueOnce({
        rows: []
      });

      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'nutr-4',
          menu_item_id: menuItemId,
          ...nutritionData
        }]
      });

      const response = await request(app)
        .post(`/api/v1/menu-items/${menuItemId}/nutrition`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(nutritionData);

      expect(response.status).toBe(201);
    });

    it('should reject when menu item not found', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: []
      });

      const response = await request(app)
        .post(`/api/v1/menu-items/${menuItemId}/nutrition`)
        .set('Authorization', `Bearer ${restaurantOwner1Token}`)
        .send(nutritionData);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Menu item not found');
    });

    it('should reject when owner tries to add nutrition for another restaurant item', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ owner_id: owner2Id }]
      });

      const response = await request(app)
        .post(`/api/v1/menu-items/${menuItemId}/nutrition`)
        .set('Authorization', `Bearer ${restaurantOwner1Token}`)
        .send(nutritionData);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Not the owner of this restaurant');
    });

    it('should reject with negative calories', async () => {
      const response = await request(app)
        .post(`/api/v1/menu-items/${menuItemId}/nutrition`)
        .set('Authorization', `Bearer ${restaurantOwner1Token}`)
        .send({
          ...nutritionData,
          calories: -100
        });

      expect(response.status).toBe(400);
    });

    it('should reject with negative protein', async () => {
      const response = await request(app)
        .post(`/api/v1/menu-items/${menuItemId}/nutrition`)
        .set('Authorization', `Bearer ${restaurantOwner1Token}`)
        .send({
          ...nutritionData,
          protein: -5
        });

      expect(response.status).toBe(400);
    });

    it('should reject with missing required fields', async () => {
      const response = await request(app)
        .post(`/api/v1/menu-items/${menuItemId}/nutrition`)
        .set('Authorization', `Bearer ${restaurantOwner1Token}`)
        .send({
          serving_size: '100g'
          // Missing required fields
        });

      expect(response.status).toBe(400);
    });

    it('should reject without authentication', async () => {
      const response = await request(app)
        .post(`/api/v1/menu-items/${menuItemId}/nutrition`)
        .send(nutritionData);

      expect(response.status).toBe(401);
    });
  });

  describe('Authorization Edge Cases', () => {
    it('should reject customer role from creating menu items', async () => {
      const customerToken = jwt.sign(
        {
          userId: 'customer-1',
          email: 'customer@cuts.ae',
          role: UserRole.CUSTOMER
        },
        process.env.JWT_SECRET || 'test-secret'
      );

      const response = await request(app)
        .post(`/api/v1/restaurants/${restaurant1Id}/menu-items`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          name: 'Test Item',
          base_price: 10,
          category: MealCategory.LUNCH
        });

      expect(response.status).toBe(403);
    });

    it('should reject driver role from updating menu items', async () => {
      const driverToken = jwt.sign(
        {
          userId: 'driver-1',
          email: 'driver@cuts.ae',
          role: UserRole.DRIVER
        },
        process.env.JWT_SECRET || 'test-secret'
      );

      const response = await request(app)
        .put(`/api/v1/menu-items/menu-1`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(403);
    });

    it('should reject support role from deleting menu items', async () => {
      const supportToken = jwt.sign(
        {
          userId: 'support-1',
          email: 'support@cuts.ae',
          role: UserRole.SUPPORT
        },
        process.env.JWT_SECRET || 'test-secret'
      );

      const response = await request(app)
        .delete(`/api/v1/menu-items/menu-1`)
        .set('Authorization', `Bearer ${supportToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('Price Validation', () => {
    it('should accept price of zero', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ owner_id: owner1Id }]
      });

      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'menu-free',
          base_price: 0
        }]
      });

      const response = await request(app)
        .post(`/api/v1/restaurants/${restaurant1Id}/menu-items`)
        .set('Authorization', `Bearer ${restaurantOwner1Token}`)
        .send({
          name: 'Free Sample',
          base_price: 0,
          category: MealCategory.SNACKS
        });

      expect(response.status).toBe(201);
    });

    it('should accept decimal prices', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ owner_id: owner1Id }]
      });

      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'menu-decimal',
          base_price: 12.99
        }]
      });

      const response = await request(app)
        .post(`/api/v1/restaurants/${restaurant1Id}/menu-items`)
        .set('Authorization', `Bearer ${restaurantOwner1Token}`)
        .send({
          name: 'Item with Decimal',
          base_price: 12.99,
          category: MealCategory.SNACKS
        });

      expect(response.status).toBe(201);
    });

    it('should accept large prices', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ owner_id: owner1Id }]
      });

      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'menu-expensive',
          base_price: 999.99
        }]
      });

      const response = await request(app)
        .post(`/api/v1/restaurants/${restaurant1Id}/menu-items`)
        .set('Authorization', `Bearer ${restaurantOwner1Token}`)
        .send({
          name: 'Expensive Item',
          base_price: 999.99,
          category: MealCategory.DINNER
        });

      expect(response.status).toBe(201);
    });
  });

  describe('Category Validation', () => {
    const categories = [
      MealCategory.BREAKFAST,
      MealCategory.LUNCH,
      MealCategory.DINNER,
      MealCategory.SNACKS,
      MealCategory.BEVERAGES
    ];

    categories.forEach(category => {
      it(`should accept valid category: ${category}`, async () => {
        mockQuery.mockResolvedValueOnce({
          rows: [{ owner_id: owner1Id }]
        });

        mockQuery.mockResolvedValueOnce({
          rows: [{
            id: `menu-${category}`,
            category: category
          }]
        });

        const response = await request(app)
          .post(`/api/v1/restaurants/${restaurant1Id}/menu-items`)
          .set('Authorization', `Bearer ${restaurantOwner1Token}`)
          .send({
            name: `${category} Item`,
            base_price: 20,
            category: category
          });

        expect(response.status).toBe(201);
      });
    });
  });
});
