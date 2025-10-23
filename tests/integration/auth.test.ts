import request from 'supertest';
import app from '../../src/index';
import { TestHelpers } from '../helpers/testHelpers';
import { testUsers } from '../helpers/testData';
import { UserRole } from '../../src/types';

describe('Authentication API', () => {
  beforeEach(async () => {
    await TestHelpers.cleanup();
  });

  afterAll(async () => {
    await TestHelpers.cleanup();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new customer successfully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(testUsers.customer)
        .expect(201);

      expect(response.body).toHaveProperty('message', 'User registered successfully');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toMatchObject({
        email: testUsers.customer.email,
        first_name: testUsers.customer.first_name,
        last_name: testUsers.customer.last_name,
        role: UserRole.CUSTOMER
      });
      expect(response.body.user).toHaveProperty('id');
    });

    it('should register a restaurant owner successfully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(testUsers.restaurantOwner)
        .expect(201);

      expect(response.body.user.role).toBe(UserRole.RESTAURANT_OWNER);
    });

    it('should return error when email already exists', async () => {
      await request(app)
        .post('/api/v1/auth/register')
        .send(testUsers.customer)
        .expect(201);

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(testUsers.customer)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Email already registered');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@test.com'
          // Missing required fields
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          ...testUsers.customer,
          email: 'invalid-email'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should validate password strength', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          ...testUsers.customer,
          password: '123' // Weak password
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should not return password hash in response', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(testUsers.customer)
        .expect(201);

      expect(response.body.user).not.toHaveProperty('password');
      expect(response.body.user).not.toHaveProperty('password_hash');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/v1/auth/register')
        .send(testUsers.customer);
    });

    it('should login successfully with correct credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUsers.customer.email,
          password: testUsers.customer.password
        })
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Login successful');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toMatchObject({
        email: testUsers.customer.email,
        role: UserRole.CUSTOMER
      });
    });

    it('should return error with incorrect email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'wrong@email.com',
          password: testUsers.customer.password
        })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });

    it('should return error with incorrect password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUsers.customer.email,
          password: 'WrongPassword123!'
        })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUsers.customer.email
          // Missing password
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should not return password in response', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUsers.customer.email,
          password: testUsers.customer.password
        })
        .expect(200);

      expect(response.body.user).not.toHaveProperty('password');
      expect(response.body.user).not.toHaveProperty('password_hash');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    let token: string;
    let userId: string;

    beforeEach(async () => {
      const result = await TestHelpers.registerUser(testUsers.customer);
      token = result.token;
      userId = result.userId;
    });

    it('should return current user info with valid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.user).toMatchObject({
        id: userId,
        email: testUsers.customer.email,
        first_name: testUsers.customer.first_name,
        last_name: testUsers.customer.last_name,
        role: UserRole.CUSTOMER
      });
    });

    it('should return error without token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'No token provided');
    });

    it('should return error with invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Invalid token');
    });

    it('should return error with malformed authorization header', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', token) // Missing "Bearer "
        .expect(401);

      expect(response.body).toHaveProperty('error', 'No token provided');
    });

    it('should not return password in response', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.user).not.toHaveProperty('password');
      expect(response.body.user).not.toHaveProperty('password_hash');
    });
  });

  describe('JWT Token', () => {
    it('should generate valid JWT token on registration', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(testUsers.customer)
        .expect(201);

      const token = response.body.token;
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should generate valid JWT token on login', async () => {
      await request(app)
        .post('/api/v1/auth/register')
        .send(testUsers.customer);

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUsers.customer.email,
          password: testUsers.customer.password
        })
        .expect(200);

      const token = response.body.token;
      expect(token).toBeTruthy();
      expect(token.split('.')).toHaveLength(3);
    });

    it('should allow authenticated requests with valid token', async () => {
      const { token } = await TestHelpers.registerUser(testUsers.customer);

      await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });
  });

  describe('Role-based registration', () => {
    it('should allow registration as customer', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({ ...testUsers.customer, role: UserRole.CUSTOMER })
        .expect(201);

      expect(response.body.user.role).toBe(UserRole.CUSTOMER);
    });

    it('should allow registration as restaurant owner', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({ ...testUsers.restaurantOwner, role: UserRole.RESTAURANT_OWNER })
        .expect(201);

      expect(response.body.user.role).toBe(UserRole.RESTAURANT_OWNER);
    });

    it('should allow registration as driver', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({ ...testUsers.driver, role: UserRole.DRIVER })
        .expect(201);

      expect(response.body.user.role).toBe(UserRole.DRIVER);
    });
  });
});
