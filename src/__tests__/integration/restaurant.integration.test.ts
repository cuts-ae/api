import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../app';
import pool from '../../config/database';
import { UserRole, JWTPayload } from '../../types';

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    query: jest.fn()
  }
}));

describe('Restaurant Integration Tests', () => {
  const mockPool = pool as any;

  // Test data
  const restaurantOwner1: JWTPayload = {
    userId: 'owner-uuid-1',
    email: 'owner1@cuts.ae',
    role: UserRole.RESTAURANT_OWNER
  };

  const restaurantOwner2: JWTPayload = {
    userId: 'owner-uuid-2',
    email: 'owner2@cuts.ae',
    role: UserRole.RESTAURANT_OWNER
  };

  const adminUser: JWTPayload = {
    userId: 'admin-uuid-1',
    email: 'admin@cuts.ae',
    role: UserRole.ADMIN
  };

  const customerUser: JWTPayload = {
    userId: 'customer-uuid-1',
    email: 'customer@cuts.ae',
    role: UserRole.CUSTOMER
  };

  const mockRestaurant1 = {
    id: 'restaurant-uuid-1',
    owner_id: 'owner-uuid-1',
    name: 'Healthy Bites',
    slug: 'healthy-bites',
    description: 'Fresh and healthy meals',
    cuisine_type: ['healthy', 'mediterranean'],
    address: {
      street: '123 Main St',
      city: 'Dubai',
      state: 'Dubai',
      postal_code: '12345',
      country: 'UAE'
    },
    phone: '+971501234567',
    email: 'contact@healthybites.ae',
    operating_hours: {
      monday: { open: '09:00', close: '22:00' },
      tuesday: { open: '09:00', close: '22:00' }
    },
    average_prep_time: 30,
    commission_rate: 0.15,
    is_active: true,
    operating_status: 'open',
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01')
  };

  const mockRestaurant2 = {
    id: 'restaurant-uuid-2',
    owner_id: 'owner-uuid-2',
    name: 'Protein Palace',
    slug: 'protein-palace',
    description: 'High protein meals',
    cuisine_type: ['fitness', 'healthy'],
    address: {
      street: '456 Street',
      city: 'Abu Dhabi',
      state: 'Abu Dhabi',
      postal_code: '54321',
      country: 'UAE'
    },
    phone: '+971509876543',
    email: 'contact@proteinpalace.ae',
    operating_hours: {
      monday: { open: '08:00', close: '21:00' }
    },
    average_prep_time: 25,
    commission_rate: 0.15,
    is_active: true,
    operating_status: 'open',
    created_at: new Date('2024-01-02'),
    updated_at: new Date('2024-01-02')
  };

  // Helper function to generate JWT tokens
  const generateToken = (payload: JWTPayload): string => {
    return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '7d' });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockPool.query = jest.fn();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('GET /api/v1/restaurants', () => {
    describe('Public access', () => {
      it('should get all restaurants without authentication', async () => {
        mockPool.query.mockResolvedValueOnce({
          rows: [mockRestaurant1, mockRestaurant2]
        });

        const response = await request(app)
          .get('/api/v1/restaurants')
          .expect(200);

        expect(response.body).toHaveProperty('restaurants');
        expect(response.body.restaurants).toHaveLength(2);
        expect(response.body.restaurants[0].name).toBe('Healthy Bites');
        expect(response.body.restaurants[1].name).toBe('Protein Palace');
      });

      it('should filter restaurants by is_active status', async () => {
        mockPool.query.mockResolvedValueOnce({
          rows: [mockRestaurant1]
        });

        const response = await request(app)
          .get('/api/v1/restaurants?is_active=true')
          .expect(200);

        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining('AND is_active = $1'),
          [true]
        );
        expect(response.body.restaurants).toHaveLength(1);
      });

      it('should filter restaurants by cuisine_type', async () => {
        mockPool.query.mockResolvedValueOnce({
          rows: [mockRestaurant1]
        });

        const response = await request(app)
          .get('/api/v1/restaurants?cuisine_type=mediterranean')
          .expect(200);

        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining('AND $1 = ANY(cuisine_type)'),
          ['mediterranean']
        );
        expect(response.body.restaurants).toHaveLength(1);
      });

      it('should filter by multiple criteria', async () => {
        mockPool.query.mockResolvedValueOnce({
          rows: [mockRestaurant1]
        });

        const response = await request(app)
          .get('/api/v1/restaurants?is_active=true&cuisine_type=healthy')
          .expect(200);

        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining('AND is_active = $1'),
          [true, 'healthy']
        );
      });

      it('should return empty array when no restaurants found', async () => {
        mockPool.query.mockResolvedValueOnce({
          rows: []
        });

        const response = await request(app)
          .get('/api/v1/restaurants')
          .expect(200);

        expect(response.body.restaurants).toEqual([]);
      });

      it('should handle database errors gracefully', async () => {
        mockPool.query.mockRejectedValueOnce(new Error('Database connection failed'));

        await request(app)
          .get('/api/v1/restaurants')
          .expect(500);
      });
    });
  });

  describe('GET /api/v1/restaurants/:id', () => {
    describe('Public access - Get by ID', () => {
      it('should get restaurant by UUID', async () => {
        mockPool.query.mockResolvedValueOnce({
          rows: [mockRestaurant1]
        });

        const response = await request(app)
          .get(`/api/v1/restaurants/${mockRestaurant1.id}`)
          .expect(200);

        expect(response.body).toHaveProperty('restaurant');
        expect(response.body.restaurant.id).toBe(mockRestaurant1.id);
        expect(response.body.restaurant.name).toBe('Healthy Bites');
        // UUIDs contain hyphens and are 36 characters long, so they're detected as UUIDs
        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining('WHERE'),
          [mockRestaurant1.id]
        );
      });

      it('should get restaurant by slug with @ prefix', async () => {
        mockPool.query.mockResolvedValueOnce({
          rows: [mockRestaurant1]
        });

        const response = await request(app)
          .get('/api/v1/restaurants/@healthy-bites')
          .expect(200);

        expect(response.body.restaurant.slug).toBe('healthy-bites');
        expect(mockPool.query).toHaveBeenCalledWith(
          'SELECT * FROM restaurants WHERE slug = $1',
          ['healthy-bites']
        );
      });

      it('should get restaurant by slug without @ prefix', async () => {
        mockPool.query.mockResolvedValueOnce({
          rows: [mockRestaurant1]
        });

        const response = await request(app)
          .get('/api/v1/restaurants/healthy-bites')
          .expect(200);

        expect(response.body.restaurant.slug).toBe('healthy-bites');
        expect(mockPool.query).toHaveBeenCalledWith(
          'SELECT * FROM restaurants WHERE slug = $1',
          ['healthy-bites']
        );
      });

      it('should return 404 for non-existent restaurant', async () => {
        mockPool.query.mockResolvedValueOnce({
          rows: []
        });

        await request(app)
          .get('/api/v1/restaurants/non-existent-id')
          .expect(404);
      });

      it('should handle database errors', async () => {
        mockPool.query.mockRejectedValueOnce(new Error('Query failed'));

        await request(app)
          .get(`/api/v1/restaurants/${mockRestaurant1.id}`)
          .expect(500);
      });
    });
  });

  describe('POST /api/v1/restaurants', () => {
    const validRestaurantData = {
      name: 'New Healthy Restaurant',
      description: 'Fresh healthy meals',
      cuisine_type: ['healthy', 'vegan'],
      address: {
        street: '789 New St',
        city: 'Dubai',
        state: 'Dubai',
        postal_code: '67890',
        country: 'UAE'
      },
      phone: '+971501111111',
      email: 'contact@newhealthy.ae',
      operating_hours: {
        monday: { open: '09:00', close: '22:00' },
        tuesday: { open: '09:00', close: '22:00' }
      },
      average_prep_time: 35
    };

    describe('Authentication and Authorization', () => {
      it('should require authentication', async () => {
        await request(app)
          .post('/api/v1/restaurants')
          .send(validRestaurantData)
          .expect(401);

        expect(mockPool.query).not.toHaveBeenCalled();
      });

      it('should reject customers from creating restaurants', async () => {
        const token = generateToken(customerUser);

        await request(app)
          .post('/api/v1/restaurants')
          .set('Authorization', `Bearer ${token}`)
          .send(validRestaurantData)
          .expect(403);
      });

      it('should allow restaurant owners to create restaurants', async () => {
        const token = generateToken(restaurantOwner1);
        const expectedSlug = 'new-healthy-restaurant';

        mockPool.query
          .mockResolvedValueOnce({ rows: [] }) // Slug check
          .mockResolvedValueOnce({
            rows: [{
              ...validRestaurantData,
              id: 'new-uuid',
              owner_id: restaurantOwner1.userId,
              slug: expectedSlug
            }]
          });

        const response = await request(app)
          .post('/api/v1/restaurants')
          .set('Authorization', `Bearer ${token}`)
          .send(validRestaurantData)
          .expect(201);

        expect(response.body.message).toBe('Restaurant created successfully');
        expect(response.body.restaurant).toBeDefined();
      });

      it('should allow admins to create restaurants', async () => {
        const token = generateToken(adminUser);

        mockPool.query
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({
            rows: [{
              ...validRestaurantData,
              id: 'admin-created-uuid',
              owner_id: adminUser.userId
            }]
          });

        await request(app)
          .post('/api/v1/restaurants')
          .set('Authorization', `Bearer ${token}`)
          .send(validRestaurantData)
          .expect(201);
      });
    });

    describe('Slug Generation', () => {
      it('should generate slug from restaurant name', async () => {
        const token = generateToken(restaurantOwner1);

        mockPool.query
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ id: 'new-uuid' }] });

        await request(app)
          .post('/api/v1/restaurants')
          .set('Authorization', `Bearer ${token}`)
          .send(validRestaurantData);

        const slugCheckCall = mockPool.query.mock.calls[0];
        expect(slugCheckCall[0]).toContain('SELECT id FROM restaurants WHERE slug = $1');
        expect(slugCheckCall[1][0]).toBe('new-healthy-restaurant');
      });

      it('should generate slug with hyphens from spaces', async () => {
        const token = generateToken(restaurantOwner1);

        mockPool.query
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ id: 'new-uuid' }] });

        await request(app)
          .post('/api/v1/restaurants')
          .set('Authorization', `Bearer ${token}`)
          .send({ ...validRestaurantData, name: 'Multiple Word Restaurant Name' });

        const slugCheckCall = mockPool.query.mock.calls[0];
        expect(slugCheckCall[1][0]).toBe('multiple-word-restaurant-name');
      });

      it('should generate slug removing special characters', async () => {
        const token = generateToken(restaurantOwner1);

        mockPool.query
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ id: 'new-uuid' }] });

        await request(app)
          .post('/api/v1/restaurants')
          .set('Authorization', `Bearer ${token}`)
          .send({ ...validRestaurantData, name: "Joe's Café & Grill!" });

        const slugCheckCall = mockPool.query.mock.calls[0];
        // The slug generation may include trailing hyphens from special characters
        expect(slugCheckCall[1][0]).toMatch(/^joe-s-caf-grill-?$/);
      });

      it('should convert to lowercase for slug', async () => {
        const token = generateToken(restaurantOwner1);

        mockPool.query
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ id: 'new-uuid' }] });

        await request(app)
          .post('/api/v1/restaurants')
          .set('Authorization', `Bearer ${token}`)
          .send({ ...validRestaurantData, name: 'UPPERCASE RESTAURANT' });

        const slugCheckCall = mockPool.query.mock.calls[0];
        expect(slugCheckCall[1][0]).toBe('uppercase-restaurant');
      });

      it('should reject duplicate slug', async () => {
        const token = generateToken(restaurantOwner1);

        mockPool.query.mockResolvedValueOnce({
          rows: [{ id: 'existing-uuid' }]
        });

        await request(app)
          .post('/api/v1/restaurants')
          .set('Authorization', `Bearer ${token}`)
          .send(validRestaurantData)
          .expect(400);
      });
    });

    describe('Data Validation', () => {
      it('should validate required fields', async () => {
        const token = generateToken(restaurantOwner1);

        await request(app)
          .post('/api/v1/restaurants')
          .set('Authorization', `Bearer ${token}`)
          .send({})
          .expect(400);
      });

      it('should validate email format', async () => {
        const token = generateToken(restaurantOwner1);

        await request(app)
          .post('/api/v1/restaurants')
          .set('Authorization', `Bearer ${token}`)
          .send({ ...validRestaurantData, email: 'invalid-email' })
          .expect(400);
      });

      it('should validate cuisine_type as array', async () => {
        const token = generateToken(restaurantOwner1);

        await request(app)
          .post('/api/v1/restaurants')
          .set('Authorization', `Bearer ${token}`)
          .send({ ...validRestaurantData, cuisine_type: 'not-an-array' })
          .expect(400);
      });

      it('should validate address structure', async () => {
        const token = generateToken(restaurantOwner1);

        await request(app)
          .post('/api/v1/restaurants')
          .set('Authorization', `Bearer ${token}`)
          .send({ ...validRestaurantData, address: { street: 'incomplete' } })
          .expect(400);
      });

      it('should validate operating_hours structure', async () => {
        const token = generateToken(restaurantOwner1);

        await request(app)
          .post('/api/v1/restaurants')
          .set('Authorization', `Bearer ${token}`)
          .send({ ...validRestaurantData, operating_hours: 'invalid' })
          .expect(400);
      });

      it('should accept valid minimum data', async () => {
        const token = generateToken(restaurantOwner1);

        mockPool.query
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ id: 'new-uuid' }] });

        const minimalData = {
          name: 'Minimal Restaurant',
          cuisine_type: ['healthy'],
          address: {
            street: '123 St',
            city: 'Dubai',
            state: 'Dubai',
            postal_code: '12345',
            country: 'UAE'
          },
          phone: '+971501234567',
          email: 'contact@minimal.ae',
          operating_hours: {
            monday: { open: '09:00', close: '22:00' }
          }
        };

        await request(app)
          .post('/api/v1/restaurants')
          .set('Authorization', `Bearer ${token}`)
          .send(minimalData)
          .expect(201);
      });
    });

    describe('Location Data Handling', () => {
      it('should store address as JSON', async () => {
        const token = generateToken(restaurantOwner1);

        mockPool.query
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ id: 'new-uuid' }] });

        await request(app)
          .post('/api/v1/restaurants')
          .set('Authorization', `Bearer ${token}`)
          .send(validRestaurantData);

        const insertCall = mockPool.query.mock.calls[1];
        const addressParam = insertCall[1][5];
        expect(typeof addressParam).toBe('string');
        const parsedAddress = JSON.parse(addressParam);
        expect(parsedAddress).toEqual(validRestaurantData.address);
      });

      it('should store operating_hours as JSON', async () => {
        const token = generateToken(restaurantOwner1);

        mockPool.query
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ id: 'new-uuid' }] });

        await request(app)
          .post('/api/v1/restaurants')
          .set('Authorization', `Bearer ${token}`)
          .send(validRestaurantData);

        const insertCall = mockPool.query.mock.calls[1];
        const operatingHoursParam = insertCall[1][8];
        expect(typeof operatingHoursParam).toBe('string');
        const parsedHours = JSON.parse(operatingHoursParam);
        expect(parsedHours).toEqual(validRestaurantData.operating_hours);
      });
    });

    describe('Default Values', () => {
      it('should set default average_prep_time to 30 if not provided', async () => {
        const token = generateToken(restaurantOwner1);
        const dataWithoutPrepTime = { ...validRestaurantData };
        delete dataWithoutPrepTime.average_prep_time;

        mockPool.query
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ id: 'new-uuid' }] });

        await request(app)
          .post('/api/v1/restaurants')
          .set('Authorization', `Bearer ${token}`)
          .send(dataWithoutPrepTime);

        const insertCall = mockPool.query.mock.calls[1];
        const prepTimeParam = insertCall[1][9];
        expect(prepTimeParam).toBe(30);
      });

      it('should set commission_rate to 0.15', async () => {
        const token = generateToken(restaurantOwner1);

        mockPool.query
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ id: 'new-uuid' }] });

        await request(app)
          .post('/api/v1/restaurants')
          .set('Authorization', `Bearer ${token}`)
          .send(validRestaurantData);

        const insertCall = mockPool.query.mock.calls[1];
        expect(insertCall[0]).toContain('0.15');
      });

      it('should set is_active to true by default', async () => {
        const token = generateToken(restaurantOwner1);

        mockPool.query
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ id: 'new-uuid' }] });

        await request(app)
          .post('/api/v1/restaurants')
          .set('Authorization', `Bearer ${token}`)
          .send(validRestaurantData);

        const insertCall = mockPool.query.mock.calls[1];
        expect(insertCall[0]).toContain('true');
      });
    });
  });

  describe('PUT /api/v1/restaurants/:id', () => {
    const updateData = {
      name: 'Updated Restaurant Name',
      description: 'Updated description',
      phone: '+971509999999'
    };

    describe('Authentication and Authorization', () => {
      it('should require authentication', async () => {
        await request(app)
          .put(`/api/v1/restaurants/${mockRestaurant1.id}`)
          .send(updateData)
          .expect(401);
      });

      it('should allow owner to update their own restaurant', async () => {
        const token = generateToken(restaurantOwner1);

        mockPool.query
          .mockResolvedValueOnce({
            rows: [{ owner_id: restaurantOwner1.userId }]
          })
          .mockResolvedValueOnce({
            rows: [{ ...mockRestaurant1, ...updateData }]
          });

        const response = await request(app)
          .put(`/api/v1/restaurants/${mockRestaurant1.id}`)
          .set('Authorization', `Bearer ${token}`)
          .send(updateData)
          .expect(200);

        expect(response.body.message).toBe('Restaurant updated successfully');
      });

      it('should reject owner updating another restaurant', async () => {
        const token = generateToken(restaurantOwner1);

        mockPool.query.mockResolvedValueOnce({
          rows: [{ owner_id: restaurantOwner2.userId }]
        });

        await request(app)
          .put(`/api/v1/restaurants/${mockRestaurant2.id}`)
          .set('Authorization', `Bearer ${token}`)
          .send(updateData)
          .expect(403);
      });

      it('should allow admin to update any restaurant', async () => {
        const token = generateToken(adminUser);

        mockPool.query
          .mockResolvedValueOnce({
            rows: [{ owner_id: restaurantOwner1.userId }]
          })
          .mockResolvedValueOnce({
            rows: [{ ...mockRestaurant1, ...updateData }]
          });

        await request(app)
          .put(`/api/v1/restaurants/${mockRestaurant1.id}`)
          .set('Authorization', `Bearer ${token}`)
          .send(updateData)
          .expect(200);
      });

      it('should reject customer from updating restaurants', async () => {
        const token = generateToken(customerUser);

        await request(app)
          .put(`/api/v1/restaurants/${mockRestaurant1.id}`)
          .set('Authorization', `Bearer ${token}`)
          .send(updateData)
          .expect(403);
      });

      it('should return 404 for non-existent restaurant', async () => {
        const token = generateToken(restaurantOwner1);

        mockPool.query.mockResolvedValueOnce({ rows: [] });

        await request(app)
          .put('/api/v1/restaurants/non-existent-id')
          .set('Authorization', `Bearer ${token}`)
          .send(updateData)
          .expect(404);
      });
    });

    describe('Partial Updates', () => {
      it('should allow updating only name', async () => {
        const token = generateToken(restaurantOwner1);

        mockPool.query
          .mockResolvedValueOnce({ rows: [{ owner_id: restaurantOwner1.userId }] })
          .mockResolvedValueOnce({ rows: [mockRestaurant1] });

        await request(app)
          .put(`/api/v1/restaurants/${mockRestaurant1.id}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ name: 'New Name Only' })
          .expect(200);

        const updateCall = mockPool.query.mock.calls[1];
        expect(updateCall[0]).toContain('name = $2');
        expect(updateCall[1]).toContain('New Name Only');
      });

      it('should allow updating multiple fields', async () => {
        const token = generateToken(restaurantOwner1);

        mockPool.query
          .mockResolvedValueOnce({ rows: [{ owner_id: restaurantOwner1.userId }] })
          .mockResolvedValueOnce({ rows: [mockRestaurant1] });

        await request(app)
          .put(`/api/v1/restaurants/${mockRestaurant1.id}`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            name: 'New Name',
            description: 'New Description',
            phone: '+971501111111'
          })
          .expect(200);
      });

      it('should update updated_at timestamp', async () => {
        const token = generateToken(restaurantOwner1);

        mockPool.query
          .mockResolvedValueOnce({ rows: [{ owner_id: restaurantOwner1.userId }] })
          .mockResolvedValueOnce({ rows: [mockRestaurant1] });

        await request(app)
          .put(`/api/v1/restaurants/${mockRestaurant1.id}`)
          .set('Authorization', `Bearer ${token}`)
          .send(updateData);

        const updateCall = mockPool.query.mock.calls[1];
        expect(updateCall[0]).toContain('updated_at = NOW()');
      });
    });

    describe('Validation', () => {
      it('should validate email format when updating', async () => {
        const token = generateToken(restaurantOwner1);

        await request(app)
          .put(`/api/v1/restaurants/${mockRestaurant1.id}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ email: 'invalid-email' })
          .expect(400);
      });

      it('should validate name minimum length when updating', async () => {
        const token = generateToken(restaurantOwner1);

        await request(app)
          .put(`/api/v1/restaurants/${mockRestaurant1.id}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ name: 'A' })
          .expect(400);
      });

      it('should validate address structure when updating', async () => {
        const token = generateToken(restaurantOwner1);

        await request(app)
          .put(`/api/v1/restaurants/${mockRestaurant1.id}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ address: { street: 'incomplete' } })
          .expect(400);
      });
    });
  });

  describe('PATCH /api/v1/restaurants/:id/operating-status', () => {
    describe('Authentication and Authorization', () => {
      it('should require authentication', async () => {
        await request(app)
          .patch(`/api/v1/restaurants/${mockRestaurant1.id}/operating-status`)
          .send({ operating_status: 'closed' })
          .expect(401);
      });

      it('should allow owner to update operating status', async () => {
        const token = generateToken(restaurantOwner1);

        mockPool.query
          .mockResolvedValueOnce({ rows: [{ owner_id: restaurantOwner1.userId }] })
          .mockResolvedValueOnce({
            rows: [{ ...mockRestaurant1, operating_status: 'closed' }]
          });

        const response = await request(app)
          .patch(`/api/v1/restaurants/${mockRestaurant1.id}/operating-status`)
          .set('Authorization', `Bearer ${token}`)
          .send({ operating_status: 'closed' })
          .expect(200);

        expect(response.body.message).toBe('Operating status updated successfully');
        expect(response.body.restaurant.operating_status).toBe('closed');
      });

      it('should allow admin to update operating status', async () => {
        const token = generateToken(adminUser);

        mockPool.query
          .mockResolvedValueOnce({ rows: [{ owner_id: restaurantOwner1.userId }] })
          .mockResolvedValueOnce({
            rows: [{ ...mockRestaurant1, operating_status: 'not_accepting_orders' }]
          });

        await request(app)
          .patch(`/api/v1/restaurants/${mockRestaurant1.id}/operating-status`)
          .set('Authorization', `Bearer ${token}`)
          .send({ operating_status: 'not_accepting_orders' })
          .expect(200);
      });

      it('should reject non-owner from updating status', async () => {
        const token = generateToken(restaurantOwner2);

        mockPool.query.mockResolvedValueOnce({
          rows: [{ owner_id: restaurantOwner1.userId }]
        });

        await request(app)
          .patch(`/api/v1/restaurants/${mockRestaurant1.id}/operating-status`)
          .set('Authorization', `Bearer ${token}`)
          .send({ operating_status: 'closed' })
          .expect(403);
      });
    });

    describe('Status Validation', () => {
      it('should accept valid status: open', async () => {
        const token = generateToken(restaurantOwner1);

        mockPool.query
          .mockResolvedValueOnce({ rows: [{ owner_id: restaurantOwner1.userId }] })
          .mockResolvedValueOnce({ rows: [mockRestaurant1] });

        await request(app)
          .patch(`/api/v1/restaurants/${mockRestaurant1.id}/operating-status`)
          .set('Authorization', `Bearer ${token}`)
          .send({ operating_status: 'open' })
          .expect(200);
      });

      it('should accept valid status: not_accepting_orders', async () => {
        const token = generateToken(restaurantOwner1);

        mockPool.query
          .mockResolvedValueOnce({ rows: [{ owner_id: restaurantOwner1.userId }] })
          .mockResolvedValueOnce({ rows: [mockRestaurant1] });

        await request(app)
          .patch(`/api/v1/restaurants/${mockRestaurant1.id}/operating-status`)
          .set('Authorization', `Bearer ${token}`)
          .send({ operating_status: 'not_accepting_orders' })
          .expect(200);
      });

      it('should accept valid status: closed', async () => {
        const token = generateToken(restaurantOwner1);

        mockPool.query
          .mockResolvedValueOnce({ rows: [{ owner_id: restaurantOwner1.userId }] })
          .mockResolvedValueOnce({ rows: [mockRestaurant1] });

        await request(app)
          .patch(`/api/v1/restaurants/${mockRestaurant1.id}/operating-status`)
          .set('Authorization', `Bearer ${token}`)
          .send({ operating_status: 'closed' })
          .expect(200);
      });

      it('should reject invalid status', async () => {
        const token = generateToken(restaurantOwner1);

        mockPool.query.mockResolvedValueOnce({
          rows: [{ owner_id: restaurantOwner1.userId }]
        });

        await request(app)
          .patch(`/api/v1/restaurants/${mockRestaurant1.id}/operating-status`)
          .set('Authorization', `Bearer ${token}`)
          .send({ operating_status: 'invalid_status' })
          .expect(400);
      });

      it('should return 404 for non-existent restaurant', async () => {
        const token = generateToken(restaurantOwner1);

        mockPool.query.mockResolvedValueOnce({ rows: [] });

        await request(app)
          .patch('/api/v1/restaurants/non-existent-id/operating-status')
          .set('Authorization', `Bearer ${token}`)
          .send({ operating_status: 'closed' })
          .expect(404);
      });
    });
  });

  describe('GET /api/v1/restaurants/:id/analytics', () => {
    const mockAnalyticsData = {
      orders: [
        { quantity: 2, item_total: 50, created_at: new Date(), status: 'delivered' },
        { quantity: 1, item_total: 25, created_at: new Date(), status: 'confirmed' }
      ],
      topItems: [
        { menu_item_id: 'item-1', name: 'Grilled Chicken', count: '10' },
        { menu_item_id: 'item-2', name: 'Caesar Salad', count: '8' }
      ],
      revenueByDay: [
        { date: '2024-01-01', orders: '15', revenue: '750' },
        { date: '2024-01-02', orders: '20', revenue: '1000' }
      ],
      ordersByStatus: [
        { status: 'delivered', count: '10' },
        { status: 'confirmed', count: '5' }
      ],
      peakHours: [
        { hour: 12, orders: '25' },
        { hour: 19, orders: '30' }
      ]
    };

    describe('Authentication and Authorization', () => {
      it('should require authentication', async () => {
        await request(app)
          .get(`/api/v1/restaurants/${mockRestaurant1.id}/analytics`)
          .expect(401);
      });

      it('should allow owner to view their restaurant analytics', async () => {
        const token = generateToken(restaurantOwner1);

        mockPool.query
          .mockResolvedValueOnce({ rows: [{ owner_id: restaurantOwner1.userId }] })
          .mockResolvedValueOnce({ rows: mockAnalyticsData.orders })
          .mockResolvedValueOnce({ rows: mockAnalyticsData.topItems })
          .mockResolvedValueOnce({ rows: mockAnalyticsData.revenueByDay })
          .mockResolvedValueOnce({ rows: mockAnalyticsData.ordersByStatus })
          .mockResolvedValueOnce({ rows: mockAnalyticsData.peakHours });

        const response = await request(app)
          .get(`/api/v1/restaurants/${mockRestaurant1.id}/analytics`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.body).toHaveProperty('analytics');
        expect(response.body.analytics).toHaveProperty('today');
        expect(response.body.analytics).toHaveProperty('topItems');
        expect(response.body.analytics).toHaveProperty('revenueByDay');
        expect(response.body.analytics).toHaveProperty('ordersByStatus');
        expect(response.body.analytics).toHaveProperty('peakHours');
      });

      it('should allow admin to view any restaurant analytics', async () => {
        const token = generateToken(adminUser);

        mockPool.query
          .mockResolvedValueOnce({ rows: [{ owner_id: restaurantOwner1.userId }] })
          .mockResolvedValueOnce({ rows: mockAnalyticsData.orders })
          .mockResolvedValueOnce({ rows: mockAnalyticsData.topItems })
          .mockResolvedValueOnce({ rows: mockAnalyticsData.revenueByDay })
          .mockResolvedValueOnce({ rows: mockAnalyticsData.ordersByStatus })
          .mockResolvedValueOnce({ rows: mockAnalyticsData.peakHours });

        await request(app)
          .get(`/api/v1/restaurants/${mockRestaurant1.id}/analytics`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);
      });

      it('should reject non-owner from viewing analytics', async () => {
        const token = generateToken(restaurantOwner2);

        mockPool.query.mockResolvedValueOnce({
          rows: [{ owner_id: restaurantOwner1.userId }]
        });

        await request(app)
          .get(`/api/v1/restaurants/${mockRestaurant1.id}/analytics`)
          .set('Authorization', `Bearer ${token}`)
          .expect(403);
      });

      it('should reject customers from viewing analytics', async () => {
        const token = generateToken(customerUser);

        await request(app)
          .get(`/api/v1/restaurants/${mockRestaurant1.id}/analytics`)
          .set('Authorization', `Bearer ${token}`)
          .expect(403);
      });

      it('should return 404 for non-existent restaurant', async () => {
        const token = generateToken(restaurantOwner1);

        mockPool.query.mockResolvedValueOnce({ rows: [] });

        await request(app)
          .get('/api/v1/restaurants/non-existent-id/analytics')
          .set('Authorization', `Bearer ${token}`)
          .expect(404);
      });
    });

    describe('Analytics Data', () => {
      it('should calculate today orders and revenue correctly', async () => {
        const token = generateToken(restaurantOwner1);

        mockPool.query
          .mockResolvedValueOnce({ rows: [{ owner_id: restaurantOwner1.userId }] })
          .mockResolvedValueOnce({ rows: mockAnalyticsData.orders })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [] });

        const response = await request(app)
          .get(`/api/v1/restaurants/${mockRestaurant1.id}/analytics`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.body.analytics.today.orders).toBe(2);
        expect(response.body.analytics.today.revenue).toBe(75);
      });

      it('should return empty analytics when no data available', async () => {
        const token = generateToken(restaurantOwner1);

        mockPool.query
          .mockResolvedValueOnce({ rows: [{ owner_id: restaurantOwner1.userId }] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [] });

        const response = await request(app)
          .get(`/api/v1/restaurants/${mockRestaurant1.id}/analytics`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.body.analytics.today.orders).toBe(0);
        expect(response.body.analytics.today.revenue).toBe(0);
        expect(response.body.analytics.topItems).toEqual([]);
      });

      it('should format revenue by day correctly', async () => {
        const token = generateToken(restaurantOwner1);

        mockPool.query
          .mockResolvedValueOnce({ rows: [{ owner_id: restaurantOwner1.userId }] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: mockAnalyticsData.revenueByDay })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [] });

        const response = await request(app)
          .get(`/api/v1/restaurants/${mockRestaurant1.id}/analytics`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.body.analytics.revenueByDay).toHaveLength(2);
        expect(response.body.analytics.revenueByDay[0].orders).toBe(15);
        expect(response.body.analytics.revenueByDay[0].revenue).toBe(750);
      });

      it('should format peak hours correctly', async () => {
        const token = generateToken(restaurantOwner1);

        mockPool.query
          .mockResolvedValueOnce({ rows: [{ owner_id: restaurantOwner1.userId }] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: mockAnalyticsData.peakHours });

        const response = await request(app)
          .get(`/api/v1/restaurants/${mockRestaurant1.id}/analytics`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.body.analytics.peakHours).toHaveLength(2);
        expect(response.body.analytics.peakHours[0].hour).toBe(12);
        expect(response.body.analytics.peakHours[0].orders).toBe(25);
      });
    });
  });

  describe('GET /api/v1/restaurants/my/restaurants', () => {
    describe('Authentication and Authorization', () => {
      it('should require authentication', async () => {
        await request(app)
          .get('/api/v1/restaurants/my/restaurants')
          .expect(401);
      });

      it('should allow restaurant owner to view their restaurants', async () => {
        const token = generateToken(restaurantOwner1);

        mockPool.query
          .mockResolvedValueOnce({ rows: [mockRestaurant1] })
          .mockResolvedValueOnce({ rows: [{ orders_today: '5', revenue_today: '250' }] });

        const response = await request(app)
          .get('/api/v1/restaurants/my/restaurants')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.body.restaurants).toHaveLength(1);
        expect(response.body.restaurants[0].id).toBe(mockRestaurant1.id);
        expect(response.body.restaurants[0]).toHaveProperty('ordersToday');
        expect(response.body.restaurants[0]).toHaveProperty('revenue');
      });

      it('should allow admin to view all restaurants', async () => {
        const token = generateToken(adminUser);

        mockPool.query
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [] });

        await request(app)
          .get('/api/v1/restaurants/my/restaurants')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);
      });

      it('should reject customers from accessing endpoint', async () => {
        const token = generateToken(customerUser);

        await request(app)
          .get('/api/v1/restaurants/my/restaurants')
          .set('Authorization', `Bearer ${token}`)
          .expect(403);
      });

      it('should return empty array when owner has no restaurants', async () => {
        const token = generateToken(restaurantOwner1);

        mockPool.query.mockResolvedValueOnce({ rows: [] });

        const response = await request(app)
          .get('/api/v1/restaurants/my/restaurants')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.body.restaurants).toEqual([]);
      });

      it('should include today stats for each restaurant', async () => {
        const token = generateToken(restaurantOwner1);

        mockPool.query
          .mockResolvedValueOnce({ rows: [mockRestaurant1, mockRestaurant1] })
          .mockResolvedValueOnce({ rows: [{ orders_today: '3', revenue_today: '150' }] })
          .mockResolvedValueOnce({ rows: [{ orders_today: '7', revenue_today: '350' }] });

        const response = await request(app)
          .get('/api/v1/restaurants/my/restaurants')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.body.restaurants).toHaveLength(2);
        expect(response.body.restaurants[0].ordersToday).toBe(3);
        expect(response.body.restaurants[0].revenue).toBe('AED 150.00');
        expect(response.body.restaurants[1].ordersToday).toBe(7);
        expect(response.body.restaurants[1].revenue).toBe('AED 350.00');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Connection failed'));

      await request(app)
        .get('/api/v1/restaurants')
        .expect(500);
    });

    it('should handle malformed JSON in request body', async () => {
      const token = generateToken(restaurantOwner1);

      await request(app)
        .post('/api/v1/restaurants')
        .set('Authorization', `Bearer ${token}`)
        .set('Content-Type', 'application/json')
        .send('{ invalid json')
        .expect(400);
    });

    it('should handle invalid JWT tokens', async () => {
      await request(app)
        .post('/api/v1/restaurants')
        .set('Authorization', 'Bearer invalid-token')
        .send({ name: 'Test' })
        .expect(401);
    });

    it('should handle expired JWT tokens', async () => {
      const expiredToken = jwt.sign(
        restaurantOwner1,
        process.env.JWT_SECRET!,
        { expiresIn: '-1h' }
      );

      await request(app)
        .post('/api/v1/restaurants')
        .set('Authorization', `Bearer ${expiredToken}`)
        .send({ name: 'Test' })
        .expect(401);
    });

    it('should handle missing Authorization header', async () => {
      await request(app)
        .put(`/api/v1/restaurants/${mockRestaurant1.id}`)
        .send({ name: 'Test' })
        .expect(401);
    });

    it('should handle malformed Authorization header', async () => {
      await request(app)
        .put(`/api/v1/restaurants/${mockRestaurant1.id}`)
        .set('Authorization', 'InvalidFormat')
        .send({ name: 'Test' })
        .expect(401);
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should safely handle SQL injection in restaurant ID', async () => {
      const maliciousId = "'; DROP TABLE restaurants; --";

      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await request(app)
        .get(`/api/v1/restaurants/${maliciousId}`)
        .expect(404);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE slug = $1'),
        [maliciousId]
      );
    });

    it('should safely handle SQL injection in query parameters', async () => {
      const maliciousCuisine = "'; DROP TABLE restaurants; --";

      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await request(app)
        .get(`/api/v1/restaurants?cuisine_type=${encodeURIComponent(maliciousCuisine)}`)
        .expect(200);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([maliciousCuisine])
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long restaurant names', async () => {
      const token = generateToken(restaurantOwner1);
      const longName = 'A'.repeat(500);

      mockPool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 'new-uuid' }] });

      await request(app)
        .post('/api/v1/restaurants')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: longName,
          cuisine_type: ['healthy'],
          address: {
            street: '123 St',
            city: 'Dubai',
            state: 'Dubai',
            postal_code: '12345',
            country: 'UAE'
          },
          phone: '+971501234567',
          email: 'test@test.ae',
          operating_hours: { monday: { open: '09:00', close: '22:00' } }
        })
        .expect(201);
    });

    it('should handle restaurants with many cuisine types', async () => {
      const cuisineTypes = Array.from({ length: 20 }, (_, i) => `cuisine-${i}`);

      mockPool.query.mockResolvedValueOnce({
        rows: [{ ...mockRestaurant1, cuisine_type: cuisineTypes }]
      });

      const response = await request(app)
        .get('/api/v1/restaurants')
        .expect(200);

      expect(response.body.restaurants[0].cuisine_type).toHaveLength(20);
    });

    it('should handle special characters in restaurant name for slug', async () => {
      const token = generateToken(restaurantOwner1);

      mockPool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 'new-uuid' }] });

      await request(app)
        .post('/api/v1/restaurants')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Café & Grïll™ #1',
          cuisine_type: ['healthy'],
          address: {
            street: '123 St',
            city: 'Dubai',
            state: 'Dubai',
            postal_code: '12345',
            country: 'UAE'
          },
          phone: '+971501234567',
          email: 'test@test.ae',
          operating_hours: { monday: { open: '09:00', close: '22:00' } }
        });

      const slugCheckCall = mockPool.query.mock.calls[0];
      expect(slugCheckCall[1][0]).toBe('caf-gr-ll-1');
    });

    it('should handle concurrent requests from same owner', async () => {
      const token = generateToken(restaurantOwner1);

      mockPool.query.mockResolvedValue({
        rows: [mockRestaurant1]
      });

      const requests = Array.from({ length: 5 }, () =>
        request(app)
          .get('/api/v1/restaurants/my/restaurants')
          .set('Authorization', `Bearer ${token}`)
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });
});
