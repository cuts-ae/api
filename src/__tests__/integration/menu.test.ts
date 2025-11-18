import request from 'supertest';
import express, { Application } from 'express';
import authRoutes from '../../routes/auth.routes';
import restaurantRoutes from '../../routes/restaurant.routes';
import menuRoutes from '../../routes/menu.routes';
import { errorHandler } from '../../middleware/errorHandler';
import pool from "../../config/database";
import { UserRole } from '../../types';

// Create test app
const createTestApp = (): Application => {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/restaurants', restaurantRoutes);
  app.use('/api/v1/menu', menuRoutes);
  app.use(errorHandler);
  return app;
};

describe('Menu Endpoints', () => {
  let app: Application;
  let ownerToken: string;
  let ownerId: string;
  let customerToken: string;
  let customerId: string;
  let restaurantId: string;
  let menuItemId: string;

  beforeAll(async () => {
    app = createTestApp();

    // Create restaurant owner
    const ownerResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `menu-owner-${Date.now()}@cuts.ae`,
        password: 'OwnerPassword123!',
        first_name: 'Menu',
        last_name: 'Owner',
        phone: '+971503333333',
        role: UserRole.RESTAURANT_OWNER
      });

    ownerToken = ownerResponse.body.token;
    ownerId = ownerResponse.body.user.id;

    // Create customer
    const customerResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `menu-customer-${Date.now()}@cuts.ae`,
        password: 'CustomerPassword123!',
        first_name: 'Menu',
        last_name: 'Customer',
        phone: '+971504444444',
        role: UserRole.CUSTOMER
      });

    customerToken = customerResponse.body.token;
    customerId = customerResponse.body.user.id;

    // Create restaurant
    const restaurantResponse = await request(app)
      .post('/api/v1/restaurants')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Menu Test Restaurant',
        description: 'For testing menu endpoints',
        cuisine_type: ['Healthy', 'Test'],
        address: {
          street: '456 Menu Street',
          city: 'Dubai',
          state: 'Dubai',
          postal_code: '54321',
          country: 'UAE'
        },
        phone: '+971505555555',
        email: 'menu@restaurant.com',
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
  });

  afterAll(async () => {
    // Cleanup: Delete test data
    if (menuItemId) {
      await supabase
        .from('menu_items')
        .delete()
        .eq('id', menuItemId);
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

  describe('POST /api/v1/menu', () => {
    it('should create menu item as restaurant owner', async () => {
      const response = await request(app)
        .post('/api/v1/menu')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          restaurant_id: restaurantId,
          name: 'Grilled Chicken Bowl',
          description: 'Healthy grilled chicken with vegetables',
          base_price: 45.50,
          category: 'lunch',
          is_available: true,
          prep_time: 20
        })
        .expect(201);

      expect(response.body).toHaveProperty('menu_item');
      expect(response.body.menu_item.name).toBe('Grilled Chicken Bowl');
      expect(response.body.menu_item.base_price).toBe(45.50);
      expect(response.body.menu_item.category).toBe('lunch');
      expect(response.body.menu_item.is_available).toBe(true);

      menuItemId = response.body.menu_item.id;
    });

    it('should fail to create menu item as customer', async () => {
      const response = await request(app)
        .post('/api/v1/menu')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          restaurant_id: restaurantId,
          name: 'Unauthorized Item',
          description: 'Should not be created',
          base_price: 30.00,
          category: 'lunch',
          is_available: true,
          prep_time: 15
        })
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/menu')
        .send({
          restaurant_id: restaurantId,
          name: 'Unauthenticated Item',
          description: 'Should not be created',
          base_price: 25.00,
          category: 'dinner',
          is_available: true,
          prep_time: 25
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should fail with invalid category', async () => {
      const response = await request(app)
        .post('/api/v1/menu')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          restaurant_id: restaurantId,
          name: 'Invalid Category Item',
          description: 'Has invalid category',
          base_price: 35.00,
          category: 'invalid_category',
          is_available: true,
          prep_time: 20
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should fail with negative price', async () => {
      const response = await request(app)
        .post('/api/v1/menu')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          restaurant_id: restaurantId,
          name: 'Negative Price Item',
          description: 'Has negative price',
          base_price: -10.00,
          category: 'lunch',
          is_available: true,
          prep_time: 15
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should fail with missing required fields', async () => {
      const response = await request(app)
        .post('/api/v1/menu')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          restaurant_id: restaurantId,
          name: 'Incomplete Item'
          // Missing required fields
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/menu/:id', () => {
    it('should get menu item by id (public access)', async () => {
      const response = await request(app)
        .get(`/api/v1/menu/${menuItemId}`)
        .expect(200);

      expect(response.body).toHaveProperty('menu_item');
      expect(response.body.menu_item.id).toBe(menuItemId);
      expect(response.body.menu_item.name).toBe('Grilled Chicken Bowl');
    });

    it('should fail with invalid menu item id', async () => {
      const response = await request(app)
        .get('/api/v1/menu/invalid-uuid')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('should fail with non-existent menu item id', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/v1/menu/${fakeId}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/v1/menu/:id', () => {
    it('should update menu item as restaurant owner', async () => {
      const response = await request(app)
        .put(`/api/v1/menu/${menuItemId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Updated Chicken Bowl',
          base_price: 48.00,
          description: 'Updated description'
        })
        .expect(200);

      expect(response.body).toHaveProperty('menu_item');
      expect(response.body.menu_item.name).toBe('Updated Chicken Bowl');
      expect(response.body.menu_item.base_price).toBe(48.00);
    });

    it('should fail to update as non-owner', async () => {
      const response = await request(app)
        .put(`/api/v1/menu/${menuItemId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          name: 'Unauthorized Update'
        })
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .put(`/api/v1/menu/${menuItemId}`)
        .send({
          name: 'Unauthenticated Update'
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should toggle availability', async () => {
      const response = await request(app)
        .put(`/api/v1/menu/${menuItemId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          is_available: false
        })
        .expect(200);

      expect(response.body.menu_item.is_available).toBe(false);

      // Toggle back
      const response2 = await request(app)
        .put(`/api/v1/menu/${menuItemId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          is_available: true
        })
        .expect(200);

      expect(response2.body.menu_item.is_available).toBe(true);
    });
  });

  describe('DELETE /api/v1/menu/:id', () => {
    let deleteMenuItemId: string;

    beforeAll(async () => {
      // Create a menu item to delete
      const response = await request(app)
        .post('/api/v1/menu')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          restaurant_id: restaurantId,
          name: 'Item To Delete',
          description: 'Will be deleted',
          base_price: 30.00,
          category: 'snacks',
          is_available: true,
          prep_time: 10
        });

      deleteMenuItemId = response.body.menu_item.id;
    });

    it('should delete menu item as restaurant owner', async () => {
      const response = await request(app)
        .delete(`/api/v1/menu/${deleteMenuItemId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');

      // Verify it's deleted
      const getResponse = await request(app)
        .get(`/api/v1/menu/${deleteMenuItemId}`)
        .expect(404);
    });

    it('should fail to delete as non-owner', async () => {
      const response = await request(app)
        .delete(`/api/v1/menu/${menuItemId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .delete(`/api/v1/menu/${menuItemId}`)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/v1/menu/:id/nutrition', () => {
    it('should add nutrition info as restaurant owner', async () => {
      const response = await request(app)
        .post(`/api/v1/menu/${menuItemId}/nutrition`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          serving_size: '1 bowl (400g)',
          calories: 480,
          protein: 45,
          carbohydrates: 35,
          fat: 18,
          fiber: 8,
          sugar: 5,
          sodium: 720,
          allergens: ['gluten']
        })
        .expect(201);

      expect(response.body).toHaveProperty('nutrition');
      expect(response.body.nutrition.calories).toBe(480);
      expect(response.body.nutrition.protein).toBe(45);
      expect(response.body.nutrition.allergens).toContain('gluten');
    });

    it('should update existing nutrition info', async () => {
      const response = await request(app)
        .post(`/api/v1/menu/${menuItemId}/nutrition`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          serving_size: '1 bowl (400g)',
          calories: 500,
          protein: 48,
          carbohydrates: 38,
          fat: 20,
          fiber: 9,
          sugar: 6,
          sodium: 750,
          allergens: ['gluten', 'dairy']
        })
        .expect(201);

      expect(response.body.nutrition.calories).toBe(500);
      expect(response.body.nutrition.protein).toBe(48);
      expect(response.body.nutrition.allergens).toContain('dairy');
    });

    it('should fail to add nutrition as non-owner', async () => {
      const response = await request(app)
        .post(`/api/v1/menu/${menuItemId}/nutrition`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          serving_size: '1 bowl',
          calories: 450,
          protein: 40,
          carbohydrates: 30,
          fat: 15,
          fiber: 5,
          sugar: 3,
          sodium: 600,
          allergens: []
        })
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });

    it('should fail with negative nutritional values', async () => {
      const response = await request(app)
        .post(`/api/v1/menu/${menuItemId}/nutrition`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          serving_size: '1 bowl',
          calories: -100,
          protein: 40,
          carbohydrates: 30,
          fat: 15,
          fiber: 5,
          sugar: 3,
          sodium: 600,
          allergens: []
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should fail with missing required fields', async () => {
      const response = await request(app)
        .post(`/api/v1/menu/${menuItemId}/nutrition`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          serving_size: '1 bowl',
          calories: 450
          // Missing other required fields
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/menu/:id/nutrition', () => {
    it('should get nutrition info (public access)', async () => {
      const response = await request(app)
        .get(`/api/v1/menu/${menuItemId}/nutrition`)
        .expect(200);

      expect(response.body).toHaveProperty('nutrition');
      expect(response.body.nutrition.calories).toBe(500);
      expect(response.body.nutrition.protein).toBe(48);
    });

    it('should fail for menu item without nutrition info', async () => {
      // Create item without nutrition
      const menuResponse = await request(app)
        .post('/api/v1/menu')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          restaurant_id: restaurantId,
          name: 'No Nutrition Item',
          description: 'Has no nutrition info',
          base_price: 20.00,
          category: 'snacks',
          is_available: true,
          prep_time: 5
        });

      const response = await request(app)
        .get(`/api/v1/menu/${menuResponse.body.menu_item.id}/nutrition`)
        .expect(404);

      expect(response.body).toHaveProperty('error');

      // Cleanup
      await supabase
        .from('menu_items')
        .delete()
        .eq('id', menuResponse.body.menu_item.id);
    });
  });

  describe('POST /api/v1/menu/:id/variants', () => {
    it('should add menu item variant as restaurant owner', async () => {
      const response = await request(app)
        .post(`/api/v1/menu/${menuItemId}/variants`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Large Size',
          price_adjustment: 10.00,
          is_available: true
        })
        .expect(201);

      expect(response.body).toHaveProperty('variant');
      expect(response.body.variant.name).toBe('Large Size');
      expect(response.body.variant.price_adjustment).toBe(10.00);
    });

    it('should add variant with negative price adjustment', async () => {
      const response = await request(app)
        .post(`/api/v1/menu/${menuItemId}/variants`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Small Size',
          price_adjustment: -5.00,
          is_available: true
        })
        .expect(201);

      expect(response.body.variant.price_adjustment).toBe(-5.00);
    });

    it('should fail to add variant as non-owner', async () => {
      const response = await request(app)
        .post(`/api/v1/menu/${menuItemId}/variants`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          name: 'Unauthorized Variant',
          price_adjustment: 5.00,
          is_available: true
        })
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .post(`/api/v1/menu/${menuItemId}/variants`)
        .send({
          name: 'Unauthenticated Variant',
          price_adjustment: 5.00,
          is_available: true
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/menu/:id/variants', () => {
    it('should get all variants for menu item (public access)', async () => {
      const response = await request(app)
        .get(`/api/v1/menu/${menuItemId}/variants`)
        .expect(200);

      expect(response.body).toHaveProperty('variants');
      expect(Array.isArray(response.body.variants)).toBe(true);
      expect(response.body.variants.length).toBeGreaterThan(0);
    });

    it('should return empty array for item with no variants', async () => {
      // Create item without variants
      const menuResponse = await request(app)
        .post('/api/v1/menu')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          restaurant_id: restaurantId,
          name: 'No Variants Item',
          description: 'Has no variants',
          base_price: 25.00,
          category: 'dinner',
          is_available: true,
          prep_time: 15
        });

      const response = await request(app)
        .get(`/api/v1/menu/${menuResponse.body.menu_item.id}/variants`)
        .expect(200);

      expect(response.body.variants).toEqual([]);

      // Cleanup
      await supabase
        .from('menu_items')
        .delete()
        .eq('id', menuResponse.body.menu_item.id);
    });
  });
});
