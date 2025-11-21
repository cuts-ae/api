/**
 * Authentication Combinations - Combinatorial Testing
 *
 * Tests all combinations of:
 * - User roles (CUSTOMER, DRIVER, RESTAURANT_OWNER, ADMIN, SUPPORT)
 * - Authentication states (valid token, invalid token, expired token, no token)
 * - HTTP methods (GET, POST, PUT, DELETE)
 * - Endpoints (auth, orders, restaurants, admin)
 *
 * Uses pairwise testing to generate efficient test combinations
 */

import request from 'supertest';
import express, { Express } from 'express';
import pairwise from 'pairwise';
import jwt from 'jsonwebtoken';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { UserRole } from '../../types';
import { errorHandler } from '../../middleware/errorHandler';

describe('Authentication Combinations - Combinatorial Testing', () => {
  let app: Express;
  const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

  // Define test parameters
  const userRoles = [
    UserRole.CUSTOMER,
    UserRole.DRIVER,
    UserRole.RESTAURANT_OWNER,
    UserRole.ADMIN,
    UserRole.SUPPORT
  ];

  const authStates = [
    'valid_token',
    'invalid_token',
    'expired_token',
    'no_token',
    'malformed_token',
    'tampered_token'
  ];

  const httpMethods = ['GET', 'POST', 'PUT', 'DELETE'];

  const endpoints = [
    { path: '/public', requiresAuth: false, allowedRoles: [] },
    { path: '/auth/me', requiresAuth: true, allowedRoles: [UserRole.CUSTOMER, UserRole.DRIVER, UserRole.RESTAURANT_OWNER, UserRole.ADMIN, UserRole.SUPPORT] },
    { path: '/orders', requiresAuth: true, allowedRoles: [UserRole.CUSTOMER, UserRole.ADMIN] },
    { path: '/restaurants', requiresAuth: true, allowedRoles: [UserRole.RESTAURANT_OWNER, UserRole.ADMIN] },
    { path: '/admin/users', requiresAuth: true, allowedRoles: [UserRole.ADMIN] },
    { path: '/support/tickets', requiresAuth: true, allowedRoles: [UserRole.SUPPORT, UserRole.ADMIN] }
  ];

  beforeEach(() => {
    app = express();
    app.use(express.json());

    // Public endpoint
    app.all('/public', (req, res) => {
      res.json({ message: 'Public endpoint', method: req.method });
    });

    // Auth endpoint - all roles
    app.all('/auth/me', authenticate, (req, res) => {
      res.json({ message: 'Auth endpoint', user: (req as any).user, method: req.method });
    });

    // Orders endpoint - CUSTOMER and ADMIN
    app.all('/orders', authenticate, requireRole(UserRole.CUSTOMER, UserRole.ADMIN), (req, res) => {
      res.json({ message: 'Orders endpoint', user: (req as any).user, method: req.method });
    });

    // Restaurants endpoint - RESTAURANT_OWNER and ADMIN
    app.all('/restaurants', authenticate, requireRole(UserRole.RESTAURANT_OWNER, UserRole.ADMIN), (req, res) => {
      res.json({ message: 'Restaurants endpoint', user: (req as any).user, method: req.method });
    });

    // Admin endpoint - ADMIN only
    app.all('/admin/users', authenticate, requireRole(UserRole.ADMIN), (req, res) => {
      res.json({ message: 'Admin endpoint', user: (req as any).user, method: req.method });
    });

    // Support endpoint - SUPPORT and ADMIN
    app.all('/support/tickets', authenticate, requireRole(UserRole.SUPPORT, UserRole.ADMIN), (req, res) => {
      res.json({ message: 'Support endpoint', user: (req as any).user, method: req.method });
    });

    app.use(errorHandler);
  });

  // Helper function to create token based on auth state
  function createToken(role: UserRole, authState: string): string | null {
    const payload = {
      userId: '123e4567-e89b-12d3-a456-426614174000',
      email: 'test@cuts.ae',
      role: role
    };

    switch (authState) {
      case 'valid_token':
        return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

      case 'invalid_token':
        return 'invalid.token.string';

      case 'expired_token':
        return jwt.sign(payload, JWT_SECRET, { expiresIn: '-1h' });

      case 'no_token':
        return null;

      case 'malformed_token':
        return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.malformed';

      case 'tampered_token':
        const validToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
        const parts = validToken.split('.');
        return `${parts[0]}.${parts[1]}.tampered_signature`;

      default:
        return null;
    }
  }

  // Helper function to make request based on method
  async function makeRequest(method: string, path: string, token: string | null) {
    const req = request(app);
    let requestChain: any;

    switch (method) {
      case 'GET':
        requestChain = req.get(path);
        break;
      case 'POST':
        requestChain = req.post(path).send({});
        break;
      case 'PUT':
        requestChain = req.put(path).send({});
        break;
      case 'DELETE':
        requestChain = req.delete(path);
        break;
      default:
        requestChain = req.get(path);
    }

    if (token) {
      requestChain = requestChain.set('Authorization', `Bearer ${token}`);
    }

    return requestChain;
  }

  // Helper function to determine expected status code
  function getExpectedStatus(
    endpoint: typeof endpoints[0],
    authState: string,
    role: UserRole
  ): number {
    // Public endpoints always succeed
    if (!endpoint.requiresAuth) {
      return 200;
    }

    // No token or invalid auth states should return 401
    if (authState === 'no_token' || authState === 'invalid_token' ||
        authState === 'malformed_token' || authState === 'tampered_token' ||
        authState === 'expired_token') {
      return 401;
    }

    // Valid token - check role permissions
    if (authState === 'valid_token') {
      if (endpoint.allowedRoles.length === 0 || endpoint.allowedRoles.includes(role)) {
        return 200;
      } else {
        return 403;
      }
    }

    return 401;
  }

  // Helper function to get expected error code
  function getExpectedErrorCode(
    endpoint: typeof endpoints[0],
    authState: string,
    role: UserRole
  ): string | null {
    if (!endpoint.requiresAuth) {
      return null;
    }

    if (authState === 'no_token') {
      return 'AUTH_001';
    }

    if (authState === 'invalid_token' || authState === 'malformed_token' ||
        authState === 'tampered_token') {
      return 'AUTH_002';
    }

    if (authState === 'expired_token') {
      return 'AUTH_002'; // May also be AUTH_003
    }

    if (authState === 'valid_token') {
      if (endpoint.allowedRoles.length > 0 && !endpoint.allowedRoles.includes(role)) {
        return 'PERM_001';
      }
    }

    return null;
  }

  describe('Pairwise Combinations: Role x AuthState x Method x Endpoint', () => {
    // Generate pairwise combinations
    const combinations = pairwise([
      userRoles,
      authStates,
      httpMethods,
      endpoints.map((e, i) => i) // Use indices for endpoints
    ]);

    combinations.forEach((combo, index) => {
      // Pairwise returns nested arrays, flatten them
      const flatCombo = Array.isArray(combo[0]) ? combo.flat() : combo;
      const role = flatCombo[0] as UserRole;
      const authState = flatCombo[1] as string;
      const method = flatCombo[2] as string;
      const endpointIndex = flatCombo[3] as number;
      const endpoint = endpoints[endpointIndex];

      // Skip if endpoint is undefined (can happen with pairwise)
      if (!endpoint) {
        return;
      }

      it(`Combination ${index + 1}: ${role} + ${authState} + ${method} + ${endpoint.path}`, async () => {
        const token = createToken(role, authState);
        const expectedStatus = getExpectedStatus(endpoint, authState, role);
        const expectedErrorCode = getExpectedErrorCode(endpoint, authState, role);

        const response = await makeRequest(method, endpoint.path, token);

        expect(response.status).toBe(expectedStatus);

        if (expectedErrorCode) {
          expect(response.body.code).toBeDefined();
          // Allow for both AUTH_002 and AUTH_003 for expired tokens
          if (authState === 'expired_token') {
            expect(['AUTH_002', 'AUTH_003']).toContain(response.body.code);
          } else {
            expect(response.body.code).toBe(expectedErrorCode);
          }
          expect(response.body.success).toBe(false);
        }

        if (expectedStatus === 200) {
          expect(response.body.message).toBeDefined();
        }
      });
    });
  });

  describe('Specific High-Risk Combinations', () => {
    it('should reject CUSTOMER with expired token accessing admin endpoint', async () => {
      const token = createToken(UserRole.CUSTOMER, 'expired_token');
      const response = await makeRequest('GET', '/admin/users', token);

      expect(response.status).toBe(401);
      expect(['AUTH_002', 'AUTH_003']).toContain(response.body.code);
    });

    it('should reject DRIVER with tampered token accessing orders', async () => {
      const token = createToken(UserRole.DRIVER, 'tampered_token');
      const response = await makeRequest('GET', '/orders', token);

      expect(response.status).toBe(401);
      expect(response.body.code).toBe('AUTH_002');
    });

    it('should reject RESTAURANT_OWNER with valid token accessing admin endpoint', async () => {
      const token = createToken(UserRole.RESTAURANT_OWNER, 'valid_token');
      const response = await makeRequest('DELETE', '/admin/users', token);

      expect(response.status).toBe(403);
      expect(response.body.code).toBe('PERM_001');
    });

    it('should allow ADMIN with valid token accessing all endpoints', async () => {
      const token = createToken(UserRole.ADMIN, 'valid_token');

      const protectedEndpoints = ['/auth/me', '/orders', '/restaurants', '/admin/users', '/support/tickets'];

      for (const path of protectedEndpoints) {
        const response = await makeRequest('GET', path, token);
        expect(response.status).toBe(200);
      }
    });

    it('should allow public endpoint access with no token', async () => {
      const response = await makeRequest('GET', '/public', null);
      expect(response.status).toBe(200);
    });

    it('should reject SUPPORT with valid token accessing restaurants', async () => {
      const token = createToken(UserRole.SUPPORT, 'valid_token');
      const response = await makeRequest('POST', '/restaurants', token);

      expect(response.status).toBe(403);
      expect(response.body.code).toBe('PERM_001');
    });

    it('should allow SUPPORT with valid token accessing support tickets', async () => {
      const token = createToken(UserRole.SUPPORT, 'valid_token');
      const response = await makeRequest('GET', '/support/tickets', token);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Support endpoint');
    });

    it('should reject CUSTOMER with no token accessing orders', async () => {
      const response = await makeRequest('POST', '/orders', null);

      expect(response.status).toBe(401);
      expect(response.body.code).toBe('AUTH_001');
    });

    it('should reject malformed token for all roles', async () => {
      for (const role of userRoles) {
        const token = createToken(role, 'malformed_token');
        const response = await makeRequest('GET', '/auth/me', token);

        expect(response.status).toBe(401);
        expect(response.body.code).toBe('AUTH_002');
      }
    });
  });

  describe('Edge Case Combinations', () => {
    it('should handle valid token with PUT method on auth endpoint', async () => {
      const token = createToken(UserRole.CUSTOMER, 'valid_token');
      const response = await makeRequest('PUT', '/auth/me', token);

      expect(response.status).toBe(200);
      expect(response.body.method).toBe('PUT');
    });

    it('should handle DELETE method with no authentication', async () => {
      const response = await makeRequest('DELETE', '/orders', null);

      expect(response.status).toBe(401);
      expect(response.body.code).toBe('AUTH_001');
    });

    it('should handle all HTTP methods on public endpoint', async () => {
      const methods = ['GET', 'POST', 'PUT', 'DELETE'];

      for (const method of methods) {
        const response = await makeRequest(method, '/public', null);
        expect(response.status).toBe(200);
        expect(response.body.method).toBe(method);
      }
    });
  });

  // Log summary
  afterAll(() => {
    const totalCombinations = pairwise([
      userRoles,
      authStates,
      httpMethods,
      endpoints.map((e, i) => i)
    ]).length;

    console.log(`\nAuth Combinations Test Summary:`);
    console.log(`- Total pairwise combinations tested: ${totalCombinations}`);
    console.log(`- User roles: ${userRoles.length}`);
    console.log(`- Auth states: ${authStates.length}`);
    console.log(`- HTTP methods: ${httpMethods.length}`);
    console.log(`- Endpoints: ${endpoints.length}`);
    console.log(`- Theoretical full combination: ${userRoles.length * authStates.length * httpMethods.length * endpoints.length} (reduced to ${totalCombinations} via pairwise)`);
  });
});
