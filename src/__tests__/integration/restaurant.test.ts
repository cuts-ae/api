import request from 'supertest';
import express, { Application } from 'express';
import authRoutes from '../../routes/auth.routes';
import restaurantRoutes from '../../routes/restaurant.routes';
import { errorHandler } from '../../middleware/errorHandler';
import { supabase } from '../../config/database';
import { UserRole } from '../../types';

// Create test app
const createTestApp = (): Application => {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/restaurants', restaurantRoutes);
  app.use(errorHandler);
  return app;
};

describe('Restaurant Endpoints', () => {
  let app: Application;
  let ownerToken: string;
  let ownerId: string;
  let customerToken: string;
  let customerId: string;
  let restaurantId: string;

  beforeAll(async () => {
    app = createTestApp();

    // Create restaurant owner
    const ownerResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `owner-${Date.now()}@example.com`,
        password: 'OwnerPassword123!',
        first_name: 'Test',
        last_name: 'Owner',
        phone: '+971501111111',
        role: UserRole.RESTAURANT_OWNER
      });

    ownerToken = ownerResponse.body.token;
    ownerId = ownerResponse.body.user.id;

    // Create customer
    const customerResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `customer-${Date.now()}@example.com`,
        password: 'CustomerPassword123!',
        first_name: 'Test',
        last_name: 'Customer',
        phone: '+971502222222',
        role: UserRole.CUSTOMER
      });

    customerToken = customerResponse.body.token;
    customerId = customerResponse.body.user.id;
  });

  afterAll(async () => {
    // Cleanup: Delete test data
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

  describe('POST /api/v1/restaurants', () => {
    it('should create a restaurant as restaurant owner', async () => {
      const response = await request(app)
        .post('/api/v1/restaurants')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Test Restaurant',
          description: 'A test restaurant',
          cuisine_type: ['Italian', 'Healthy'],
          address: {
            street: '123 Test Street',
            city: 'Abu Dhabi',
            state: 'Abu Dhabi',
            postal_code: '12345',
            country: 'UAE'
          },
          phone: '+971501234567',
          email: 'test@restaurant.com',
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

      expect(response.body).toHaveProperty('restaurant');
      expect(response.body.restaurant.name).toBe('Test Restaurant');
      expect(response.body.restaurant.owner_id).toBe(ownerId);
      expect(response.body.restaurant.is_active).toBe(true);

      restaurantId = response.body.restaurant.id;
    });

    it('should fail to create restaurant as customer', async () => {
      const response = await request(app)
        .post('/api/v1/restaurants')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          name: 'Unauthorized Restaurant',
          description: 'Should not be created',
          cuisine_type: ['Test'],
          address: {
            street: '456 Test Street',
            city: 'Dubai',
            state: 'Dubai',
            postal_code: '54321',
            country: 'UAE'
          },
          phone: '+971509876543',
          email: 'unauthorized@restaurant.com',
          operating_hours: {
            monday: { open: '09:00', close: '22:00' }
          },
          average_prep_time: 25
        })
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/restaurants')
        .send({
          name: 'Unauthenticated Restaurant',
          description: 'Should not be created',
          cuisine_type: ['Test'],
          address: {
            street: '789 Test Street',
            city: 'Sharjah',
            state: 'Sharjah',
            postal_code: '99999',
            country: 'UAE'
          },
          phone: '+971505555555',
          email: 'unauth@restaurant.com',
          operating_hours: {
            monday: { open: '09:00', close: '22:00' }
          },
          average_prep_time: 20
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should fail with invalid phone format', async () => {
      const response = await request(app)
        .post('/api/v1/restaurants')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Invalid Phone Restaurant',
          description: 'Has invalid phone',
          cuisine_type: ['Test'],
          address: {
            street: '111 Test Street',
            city: 'Abu Dhabi',
            state: 'Abu Dhabi',
            postal_code: '11111',
            country: 'UAE'
          },
          phone: '123', // Invalid
          email: 'invalid@restaurant.com',
          operating_hours: {
            monday: { open: '09:00', close: '22:00' }
          },
          average_prep_time: 30
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should fail with missing required fields', async () => {
      const response = await request(app)
        .post('/api/v1/restaurants')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Incomplete Restaurant'
          // Missing required fields
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/restaurants', () => {
    it('should list all restaurants (public access)', async () => {
      const response = await request(app)
        .get('/api/v1/restaurants')
        .expect(200);

      expect(response.body).toHaveProperty('restaurants');
      expect(Array.isArray(response.body.restaurants)).toBe(true);
      expect(response.body.restaurants.length).toBeGreaterThan(0);
    });

    it('should filter restaurants by cuisine type', async () => {
      const response = await request(app)
        .get('/api/v1/restaurants?cuisine_type=Italian')
        .expect(200);

      expect(response.body).toHaveProperty('restaurants');
      expect(Array.isArray(response.body.restaurants)).toBe(true);
    });

    it('should filter restaurants by active status', async () => {
      const response = await request(app)
        .get('/api/v1/restaurants?is_active=true')
        .expect(200);

      expect(response.body).toHaveProperty('restaurants');
      expect(Array.isArray(response.body.restaurants)).toBe(true);

      // All returned restaurants should be active
      response.body.restaurants.forEach((restaurant: any) => {
        expect(restaurant.is_active).toBe(true);
      });
    });

    it('should paginate results', async () => {
      const response = await request(app)
        .get('/api/v1/restaurants?limit=5&offset=0')
        .expect(200);

      expect(response.body).toHaveProperty('restaurants');
      expect(Array.isArray(response.body.restaurants)).toBe(true);
      expect(response.body.restaurants.length).toBeLessThanOrEqual(5);
    });
  });

  describe('GET /api/v1/restaurants/:id', () => {
    it('should get restaurant details by id', async () => {
      const response = await request(app)
        .get(`/api/v1/restaurants/${restaurantId}`)
        .expect(200);

      expect(response.body).toHaveProperty('restaurant');
      expect(response.body.restaurant.id).toBe(restaurantId);
      expect(response.body.restaurant.name).toBe('Test Restaurant');
    });

    it('should fail with invalid restaurant id', async () => {
      const response = await request(app)
        .get('/api/v1/restaurants/invalid-uuid')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('should fail with non-existent restaurant id', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/v1/restaurants/${fakeId}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/v1/restaurants/:id', () => {
    it('should update restaurant as owner', async () => {
      const response = await request(app)
        .put(`/api/v1/restaurants/${restaurantId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Updated Restaurant Name',
          description: 'Updated description',
          average_prep_time: 35
        })
        .expect(200);

      expect(response.body).toHaveProperty('restaurant');
      expect(response.body.restaurant.name).toBe('Updated Restaurant Name');
      expect(response.body.restaurant.average_prep_time).toBe(35);
    });

    it('should fail to update as non-owner', async () => {
      const response = await request(app)
        .put(`/api/v1/restaurants/${restaurantId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          name: 'Unauthorized Update'
        })
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .put(`/api/v1/restaurants/${restaurantId}`)
        .send({
          name: 'Unauthenticated Update'
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should partially update restaurant fields', async () => {
      const response = await request(app)
        .put(`/api/v1/restaurants/${restaurantId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          description: 'Only updating description'
        })
        .expect(200);

      expect(response.body.restaurant.description).toBe('Only updating description');
      // Name should remain the same from previous update
      expect(response.body.restaurant.name).toBe('Updated Restaurant Name');
    });
  });

  describe('DELETE /api/v1/restaurants/:id', () => {
    let deleteRestaurantId: string;

    beforeAll(async () => {
      // Create a restaurant to delete
      const response = await request(app)
        .post('/api/v1/restaurants')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Restaurant To Delete',
          description: 'Will be deleted',
          cuisine_type: ['Test'],
          address: {
            street: '999 Test Street',
            city: 'Abu Dhabi',
            state: 'Abu Dhabi',
            postal_code: '99999',
            country: 'UAE'
          },
          phone: '+971509999999',
          email: 'delete@restaurant.com',
          operating_hours: {
            monday: { open: '09:00', close: '22:00' }
          },
          average_prep_time: 30
        });

      deleteRestaurantId = response.body.restaurant.id;
    });

    it('should delete restaurant as owner', async () => {
      const response = await request(app)
        .delete(`/api/v1/restaurants/${deleteRestaurantId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');

      // Verify it's deleted
      const getResponse = await request(app)
        .get(`/api/v1/restaurants/${deleteRestaurantId}`)
        .expect(404);
    });

    it('should fail to delete as non-owner', async () => {
      const response = await request(app)
        .delete(`/api/v1/restaurants/${restaurantId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .delete(`/api/v1/restaurants/${restaurantId}`)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/restaurants/:id/menu', () => {
    it('should get restaurant menu items', async () => {
      const response = await request(app)
        .get(`/api/v1/restaurants/${restaurantId}/menu`)
        .expect(200);

      expect(response.body).toHaveProperty('menu_items');
      expect(Array.isArray(response.body.menu_items)).toBe(true);
    });

    it('should filter menu items by category', async () => {
      const response = await request(app)
        .get(`/api/v1/restaurants/${restaurantId}/menu?category=lunch`)
        .expect(200);

      expect(response.body).toHaveProperty('menu_items');
      expect(Array.isArray(response.body.menu_items)).toBe(true);
    });

    it('should filter menu items by availability', async () => {
      const response = await request(app)
        .get(`/api/v1/restaurants/${restaurantId}/menu?is_available=true`)
        .expect(200);

      expect(response.body).toHaveProperty('menu_items');
      expect(Array.isArray(response.body.menu_items)).toBe(true);
    });
  });

  describe('GET /api/v1/restaurants/:id/analytics', () => {
    it('should get restaurant analytics as owner', async () => {
      const response = await request(app)
        .get(`/api/v1/restaurants/${restaurantId}/analytics`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('analytics');
      expect(response.body.analytics).toHaveProperty('total_orders');
      expect(response.body.analytics).toHaveProperty('total_revenue');
      expect(response.body.analytics).toHaveProperty('average_order_value');
    });

    it('should fail to get analytics as non-owner', async () => {
      const response = await request(app)
        .get(`/api/v1/restaurants/${restaurantId}/analytics`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get(`/api/v1/restaurants/${restaurantId}/analytics`)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });
});
