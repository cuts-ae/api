import request from 'supertest';
import express, { Express } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { UserRole } from '../../types';
import jwt from 'jsonwebtoken';
import { errorHandler } from '../../middleware/errorHandler';

describe('Authentication Bypass Security Tests', () => {
  let app: Express;
  const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

  beforeEach(() => {
    app = express();
    app.use(express.json());

    // Customer-only endpoint
    app.get('/protected', authenticate, requireRole(UserRole.CUSTOMER, UserRole.ADMIN), (req, res) => {
      res.json({ message: 'Protected resource accessed', user: (req as any).user });
    });

    // Admin-only endpoint
    app.get('/admin-only', authenticate, requireRole(UserRole.ADMIN), (req, res) => {
      res.json({ message: 'Admin resource accessed', user: (req as any).user });
    });

    // Add error handler middleware (must be last)
    app.use(errorHandler);
  });

  describe('Token Manipulation', () => {
    it('should reject requests with no authorization header', async () => {
      const response = await request(app)
        .get('/protected')
        .expect(401);

      expect(response.body.code).toBe('AUTH_001');
      expect(response.body.message).toBeDefined();
      expect(response.body.success).toBe(false);
    });

    it('should reject requests with malformed authorization header', async () => {
      const response = await request(app)
        .get('/protected')
        .set('Authorization', 'InvalidFormat token123')
        .expect(401);

      expect(response.body.code).toBe('AUTH_001');
      expect(response.body.message).toBeDefined();
      expect(response.body.success).toBe(false);
    });

    it('should reject requests with Bearer but no token', async () => {
      const response = await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer ')
        .expect(401);

      // Empty token after Bearer is treated as missing token
      expect(response.body.code).toBe('AUTH_001');
      expect(response.body.message).toBeDefined();
      expect(response.body.success).toBe(false);
    });

    it('should reject requests with invalid JWT format', async () => {
      const response = await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer not.a.valid.jwt.token')
        .expect(401);

      expect(response.body.code).toBe('AUTH_002');
      expect(response.body.message).toBeDefined();
      expect(response.body.success).toBe(false);
    });

    it('should reject requests with tampered JWT signature', async () => {
      const validToken = jwt.sign(
        { userId: '123e4567-e89b-12d3-a456-426614174000', email: 'test@cuts.ae', role: UserRole.CUSTOMER },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const parts = validToken.split('.');
      const tamperedToken = `${parts[0]}.${parts[1]}.tampered_signature`;

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${tamperedToken}`)
        .expect(401);

      expect(response.body.code).toBe('AUTH_002');
      expect(response.body.message).toBeDefined();
      expect(response.body.success).toBe(false);
    });

    it('should reject requests with expired token', async () => {
      const expiredToken = jwt.sign(
        { userId: '123e4567-e89b-12d3-a456-426614174000', email: 'test@cuts.ae', role: UserRole.CUSTOMER },
        JWT_SECRET,
        { expiresIn: '-1h' }
      );

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      // Expired tokens may be caught as AUTH_002 or AUTH_003 depending on JWT library behavior
      expect(['AUTH_002', 'AUTH_003']).toContain(response.body.code);
      expect(response.body.message).toBeDefined();
      expect(response.body.success).toBe(false);
    });

    it('should reject token signed with wrong secret', async () => {
      const wrongSecretToken = jwt.sign(
        { userId: '123e4567-e89b-12d3-a456-426614174000', email: 'test@cuts.ae', role: UserRole.CUSTOMER },
        'wrong-secret-key',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${wrongSecretToken}`)
        .expect(401);

      expect(response.body.code).toBe('AUTH_002');
      expect(response.body.message).toBeDefined();
      expect(response.body.success).toBe(false);
    });
  });

  describe('Role Escalation Attempts', () => {
    it('should reject customer trying to access admin endpoint', async () => {
      const customerToken = jwt.sign(
        { userId: '123e4567-e89b-12d3-a456-426614174000', email: 'test@cuts.ae', role: UserRole.CUSTOMER },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/admin-only')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);

      expect(response.body.code).toBe('PERM_001');
      expect(response.body.message).toBeDefined();
      expect(response.body.success).toBe(false);
    });

    it('should reject driver trying to access admin endpoint', async () => {
      const driverToken = jwt.sign(
        { userId: '223e4567-e89b-12d3-a456-426614174000', email: 'test@cuts.ae', role: UserRole.DRIVER },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/admin-only')
        .set('Authorization', `Bearer ${driverToken}`)
        .expect(403);

      expect(response.body.code).toBe('PERM_001');
      expect(response.body.message).toBeDefined();
      expect(response.body.success).toBe(false);
    });

    it('should reject restaurant owner trying to access admin endpoint', async () => {
      const ownerToken = jwt.sign(
        { userId: '323e4567-e89b-12d3-a456-426614174000', email: 'test@cuts.ae', role: UserRole.RESTAURANT_OWNER },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/admin-only')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(403);

      expect(response.body.code).toBe('PERM_001');
      expect(response.body.message).toBeDefined();
      expect(response.body.success).toBe(false);
    });

    it('should reject support staff trying to access admin endpoint', async () => {
      const supportToken = jwt.sign(
        { userId: '423e4567-e89b-12d3-a456-426614174000', email: 'test@cuts.ae', role: UserRole.SUPPORT },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/admin-only')
        .set('Authorization', `Bearer ${supportToken}`)
        .expect(403);

      expect(response.body.code).toBe('PERM_001');
      expect(response.body.message).toBeDefined();
      expect(response.body.success).toBe(false);
    });
  });

  describe('JWT Algorithm Manipulation', () => {
    it('should reject unsigned JWT (algorithm none)', async () => {
      const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(JSON.stringify({
        userId: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@cuts.ae',
        role: UserRole.ADMIN,
        exp: Math.floor(Date.now() / 1000) + 3600
      })).toString('base64url');
      const unsignedToken = `${header}.${payload}.`;

      const response = await request(app)
        .get('/admin-only')
        .set('Authorization', `Bearer ${unsignedToken}`)
        .expect(401);

      expect(response.body.code).toBe('AUTH_002');
      expect(response.body.message).toBeDefined();
      expect(response.body.success).toBe(false);
    });

    it('should reject token with missing signature', async () => {
      const validToken = jwt.sign(
        { userId: '123e4567-e89b-12d3-a456-426614174000', email: 'test@cuts.ae', role: UserRole.ADMIN },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const parts = validToken.split('.');
      const tokenWithoutSignature = `${parts[0]}.${parts[1]}.`;

      const response = await request(app)
        .get('/admin-only')
        .set('Authorization', `Bearer ${tokenWithoutSignature}`)
        .expect(401);

      expect(response.body.code).toBe('AUTH_002');
      expect(response.body.message).toBeDefined();
      expect(response.body.success).toBe(false);
    });
  });

  describe('Token Reuse and Session Management', () => {
    it('should accept valid token multiple times (stateless JWT)', async () => {
      const validToken = jwt.sign(
        { userId: '123e4567-e89b-12d3-a456-426614174000', email: 'test@cuts.ae', role: UserRole.CUSTOMER },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);
    });

    it('should reject token after expiration time', async () => {
      const shortLivedToken = jwt.sign(
        { userId: '123e4567-e89b-12d3-a456-426614174000', email: 'test@cuts.ae', role: UserRole.CUSTOMER },
        JWT_SECRET,
        { expiresIn: '1s' }
      );

      await new Promise(resolve => setTimeout(resolve, 2000));

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${shortLivedToken}`)
        .expect(401);

      expect(['AUTH_002', 'AUTH_003']).toContain(response.body.code);
      expect(response.body.message).toBeDefined();
      expect(response.body.success).toBe(false);
    });
  });

  describe('Payload Manipulation Attempts', () => {
    it('should reject token with additional malicious claims', async () => {
      const maliciousToken = jwt.sign(
        {
          userId: '123e4567-e89b-12d3-a456-426614174000',
          email: 'test@cuts.ae',
          role: UserRole.CUSTOMER,
          isAdmin: true,
          isSuperUser: true,
          permissions: ['*']
        } as any,
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Even with malicious claims, role-based middleware should only check the role field
      const response = await request(app)
        .get('/admin-only')
        .set('Authorization', `Bearer ${maliciousToken}`)
        .expect(403);

      expect(response.body.code).toBe('PERM_001');
      expect(response.body.message).toBeDefined();
      expect(response.body.success).toBe(false);
    });

    // Note: JWT library prevents __proto__ in payload, so this attack is already mitigated at the library level
  });

  describe('Header Manipulation', () => {
    it('should reject authorization in query parameter', async () => {
      const validToken = jwt.sign(
        { userId: '123e4567-e89b-12d3-a456-426614174000', email: 'test@cuts.ae', role: UserRole.CUSTOMER },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get(`/protected?token=${validToken}`)
        .expect(401);

      expect(response.body.code).toBe('AUTH_001');
      expect(response.body.message).toBeDefined();
      expect(response.body.success).toBe(false);
    });

    it('should reject authorization in request body', async () => {
      const validToken = jwt.sign(
        { userId: '123e4567-e89b-12d3-a456-426614174000', email: 'test@cuts.ae', role: UserRole.CUSTOMER },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/protected')
        .send({ token: validToken })
        .expect(401);

      expect(response.body.code).toBe('AUTH_001');
      expect(response.body.message).toBeDefined();
      expect(response.body.success).toBe(false);
    });

    it('should reject case variations of Bearer prefix', async () => {
      const validToken = jwt.sign(
        { userId: '123e4567-e89b-12d3-a456-426614174000', email: 'test@cuts.ae', role: UserRole.CUSTOMER },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `bearer ${validToken}`)
        .expect(401);

      expect(response.body.code).toBe('AUTH_001');
      expect(response.body.message).toBeDefined();
      expect(response.body.success).toBe(false);
    });

    it('should reject BEARER in uppercase', async () => {
      const validToken = jwt.sign(
        { userId: '123e4567-e89b-12d3-a456-426614174000', email: 'test@cuts.ae', role: UserRole.CUSTOMER },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `BEARER ${validToken}`)
        .expect(401);

      expect(response.body.code).toBe('AUTH_001');
      expect(response.body.message).toBeDefined();
      expect(response.body.success).toBe(false);
    });
  });

  describe('Valid Authentication', () => {
    it('should allow valid customer token to access customer endpoint', async () => {
      const validToken = jwt.sign(
        { userId: '123e4567-e89b-12d3-a456-426614174000', email: 'test@cuts.ae', role: UserRole.CUSTOMER },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.message).toBe('Protected resource accessed');
      expect(response.body.user.userId).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(response.body.user.role).toBe(UserRole.CUSTOMER);
    });

    it('should allow valid admin token to access admin endpoint', async () => {
      const adminToken = jwt.sign(
        { userId: '223e4567-e89b-12d3-a456-426614174000', email: 'admin@cuts.ae', role: UserRole.ADMIN },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/admin-only')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.message).toBe('Admin resource accessed');
      expect(response.body.user.userId).toBe('223e4567-e89b-12d3-a456-426614174000');
      expect(response.body.user.role).toBe(UserRole.ADMIN);
    });

    it('should allow admin to access customer endpoints', async () => {
      const adminToken = jwt.sign(
        { userId: '223e4567-e89b-12d3-a456-426614174000', email: 'admin@cuts.ae', role: UserRole.ADMIN },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.message).toBe('Protected resource accessed');
    });
  });

  describe('Edge Cases', () => {
    it('should reject extremely long authorization header', async () => {
      const longToken = 'a'.repeat(10000);

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${longToken}`)
        .expect(401);

      expect(response.body.code).toBe('AUTH_002');
      expect(response.body.message).toBeDefined();
      expect(response.body.success).toBe(false);
    });

    it('should reject token with special characters', async () => {
      const response = await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer <script>alert("xss")</script>')
        .expect(401);

      expect(response.body.code).toBe('AUTH_002');
      expect(response.body.message).toBeDefined();
      expect(response.body.success).toBe(false);
    });

    // Note: HTTP headers cannot contain null bytes - Node.js http module prevents this at the protocol level

    it('should reject empty Bearer token', async () => {
      const response = await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer')
        .expect(401);

      expect(response.body.code).toBe('AUTH_001');
      expect(response.body.message).toBeDefined();
      expect(response.body.success).toBe(false);
    });
  });
});
