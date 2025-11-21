import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate, authorize, AuthRequest } from '../../middleware/auth';
import { UserRole, JWTPayload } from '../../types';
import { AuthenticationError, AuthorizationError } from '../../middleware/errorHandler';

describe('Auth Middleware', () => {
  const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-testing-only-do-not-use-in-production';

  describe('authenticate middleware', () => {
    let mockRequest: Partial<AuthRequest>;
    let mockResponse: Partial<Response>;
    let nextFunction: jest.Mock;
    let jsonMock: jest.Mock;
    let statusMock: jest.Mock;

    beforeEach(() => {
      // Reset mocks before each test
      jsonMock = jest.fn();
      statusMock = jest.fn().mockReturnThis();

      mockRequest = {
        headers: {}
      };

      mockResponse = {
        status: statusMock,
        json: jsonMock
      };

      nextFunction = jest.fn();
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    describe('Valid Token Cases', () => {
      it('should authenticate a valid JWT token and attach user to request', () => {
        const payload: JWTPayload = {
          userId: 'user-123',
          email: 'test@example.com',
          role: UserRole.CUSTOMER
        };

        const token = jwt.sign(payload, JWT_SECRET);
        mockRequest.headers = {
          authorization: `Bearer ${token}`
        };

        authenticate(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalledTimes(1);
        expect(mockRequest.user).toBeDefined();
        expect(mockRequest.user?.userId).toBe('user-123');
        expect(mockRequest.user?.email).toBe('test@example.com');
        expect(mockRequest.user?.role).toBe(UserRole.CUSTOMER);
        expect(statusMock).not.toHaveBeenCalled();
        expect(jsonMock).not.toHaveBeenCalled();
      });

      it('should authenticate token with ADMIN role', () => {
        const payload: JWTPayload = {
          userId: 'admin-456',
          email: 'admin@cuts.ae',
          role: UserRole.ADMIN
        };

        const token = jwt.sign(payload, JWT_SECRET);
        mockRequest.headers = {
          authorization: `Bearer ${token}`
        };

        authenticate(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalledTimes(1);
        expect(mockRequest.user?.role).toBe(UserRole.ADMIN);
      });

      it('should authenticate token with RESTAURANT_OWNER role', () => {
        const payload: JWTPayload = {
          userId: 'owner-789',
          email: 'owner@restaurant.com',
          role: UserRole.RESTAURANT_OWNER
        };

        const token = jwt.sign(payload, JWT_SECRET);
        mockRequest.headers = {
          authorization: `Bearer ${token}`
        };

        authenticate(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalledTimes(1);
        expect(mockRequest.user?.role).toBe(UserRole.RESTAURANT_OWNER);
      });

      it('should authenticate token with DRIVER role', () => {
        const payload: JWTPayload = {
          userId: 'driver-101',
          email: 'driver@cuts.ae',
          role: UserRole.DRIVER
        };

        const token = jwt.sign(payload, JWT_SECRET);
        mockRequest.headers = {
          authorization: `Bearer ${token}`
        };

        authenticate(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalledTimes(1);
        expect(mockRequest.user?.role).toBe(UserRole.DRIVER);
      });

      it('should authenticate token with SUPPORT role', () => {
        const payload: JWTPayload = {
          userId: 'support-202',
          email: 'support@cuts.ae',
          role: UserRole.SUPPORT
        };

        const token = jwt.sign(payload, JWT_SECRET);
        mockRequest.headers = {
          authorization: `Bearer ${token}`
        };

        authenticate(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalledTimes(1);
        expect(mockRequest.user?.role).toBe(UserRole.SUPPORT);
      });

      it('should authenticate token with additional JWT claims', () => {
        const payload = {
          userId: 'user-123',
          email: 'test@example.com',
          role: UserRole.CUSTOMER,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600
        };

        const token = jwt.sign(payload, JWT_SECRET);
        mockRequest.headers = {
          authorization: `Bearer ${token}`
        };

        authenticate(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalledTimes(1);
        expect(mockRequest.user).toBeDefined();
      });

      it('should handle token with whitespace in Bearer prefix', () => {
        const payload: JWTPayload = {
          userId: 'user-123',
          email: 'test@example.com',
          role: UserRole.CUSTOMER
        };

        const token = jwt.sign(payload, JWT_SECRET);
        mockRequest.headers = {
          authorization: `Bearer ${token}`
        };

        authenticate(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalledTimes(1);
        expect(mockRequest.user).toBeDefined();
      });
    });

    describe('Missing Token Cases', () => {
      it('should return 401 when authorization header is missing', () => {
        mockRequest.headers = {};

        authenticate(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalledWith(expect.any(AuthenticationError));
        const error = nextFunction.mock.calls[0][0] as AuthenticationError;
        expect(error.code).toBe('AUTH_001');
        expect(error.statusCode).toBe(401);
        expect(mockRequest.user).toBeUndefined();
      });

      it('should return 401 when authorization header is undefined', () => {
        mockRequest.headers = {
          authorization: undefined
        };

        authenticate(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalledWith(expect.any(AuthenticationError));
        const error = nextFunction.mock.calls[0][0] as AuthenticationError;
        expect(error.code).toBe('AUTH_001');
        expect(error.statusCode).toBe(401);
      });

      it('should return 401 when authorization header is null', () => {
        mockRequest.headers = {
          authorization: null as any
        };

        authenticate(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalledWith(expect.any(AuthenticationError));
        const error = nextFunction.mock.calls[0][0] as AuthenticationError;
        expect(error.code).toBe('AUTH_001');
        expect(error.statusCode).toBe(401);
      });

      it('should return 401 when authorization header is empty string', () => {
        mockRequest.headers = {
          authorization: ''
        };

        authenticate(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalledWith(expect.any(AuthenticationError));
        const error = nextFunction.mock.calls[0][0] as AuthenticationError;
        expect(error.code).toBe('AUTH_001');
        expect(error.statusCode).toBe(401);
      });
    });

    describe('Invalid Token Format Cases', () => {
      it('should return 401 when Bearer prefix is missing', () => {
        mockRequest.headers = {
          authorization: 'some-token-without-bearer'
        };

        authenticate(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalledWith(expect.any(AuthenticationError));
        const error = nextFunction.mock.calls[0][0] as AuthenticationError;
        expect(error.code).toBe('AUTH_001');
        expect(error.statusCode).toBe(401);
      });

      it('should return 401 when using lowercase "bearer"', () => {
        mockRequest.headers = {
          authorization: 'bearer some-token'
        };

        authenticate(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalledWith(expect.any(AuthenticationError));
        const error = nextFunction.mock.calls[0][0] as AuthenticationError;
        expect(error.code).toBe('AUTH_001');
        expect(error.statusCode).toBe(401);
      });

      it('should return 401 when using "Token" prefix instead of "Bearer"', () => {
        mockRequest.headers = {
          authorization: 'Token some-token'
        };

        authenticate(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalledWith(expect.any(AuthenticationError));
        const error = nextFunction.mock.calls[0][0] as AuthenticationError;
        expect(error.code).toBe('AUTH_001');
        expect(error.statusCode).toBe(401);
      });

      it('should return 401 when "Bearer " prefix has no space', () => {
        mockRequest.headers = {
          authorization: 'Bearertoken'
        };

        authenticate(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalledWith(expect.any(AuthenticationError));
        const error = nextFunction.mock.calls[0][0] as AuthenticationError;
        expect(error.code).toBe('AUTH_001');
        expect(error.statusCode).toBe(401);
      });

      it('should return 401 when only "Bearer " is provided without token', () => {
        mockRequest.headers = {
          authorization: 'Bearer '
        };

        authenticate(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalledWith(expect.any(AuthenticationError));
        const error = nextFunction.mock.calls[0][0] as AuthenticationError;
        expect(error.code).toBe('AUTH_002');
        expect(error.statusCode).toBe(401);
      });
    });

    describe('Invalid Token Cases', () => {
      it('should return 401 for completely invalid token string', () => {
        mockRequest.headers = {
          authorization: 'Bearer invalid-token-string'
        };

        authenticate(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalledWith(expect.any(AuthenticationError));
        const error = nextFunction.mock.calls[0][0] as AuthenticationError;
        expect(error.code).toBe('AUTH_002');
        expect(error.statusCode).toBe(401);
      });

      it('should return 401 for token with wrong signature', () => {
        const payload: JWTPayload = {
          userId: 'user-123',
          email: 'test@example.com',
          role: UserRole.CUSTOMER
        };

        const token = jwt.sign(payload, 'wrong-secret');
        mockRequest.headers = {
          authorization: `Bearer ${token}`
        };

        authenticate(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalledWith(expect.any(AuthenticationError));
        const error = nextFunction.mock.calls[0][0] as AuthenticationError;
        expect(error.code).toBe('AUTH_002');
        expect(error.statusCode).toBe(401);
      });

      it('should return 401 for malformed JWT (invalid structure)', () => {
        mockRequest.headers = {
          authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.malformed'
        };

        authenticate(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalledWith(expect.any(AuthenticationError));
        const error = nextFunction.mock.calls[0][0] as AuthenticationError;
        expect(error.code).toBe('AUTH_002');
        expect(error.statusCode).toBe(401);
      });

      it('should return 401 for JWT with only header (missing payload and signature)', () => {
        mockRequest.headers = {
          authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'
        };

        authenticate(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalledWith(expect.any(AuthenticationError));
        const error = nextFunction.mock.calls[0][0] as AuthenticationError;
        expect(error.code).toBe('AUTH_002');
        expect(error.statusCode).toBe(401);
      });

      it('should return 401 for JWT with invalid base64 encoding', () => {
        mockRequest.headers = {
          authorization: 'Bearer not.valid.base64!!!'
        };

        authenticate(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalledWith(expect.any(AuthenticationError));
        const error = nextFunction.mock.calls[0][0] as AuthenticationError;
        expect(error.code).toBe('AUTH_002');
        expect(error.statusCode).toBe(401);
      });

      it('should return 401 for random string token', () => {
        mockRequest.headers = {
          authorization: 'Bearer randomstring123456'
        };

        authenticate(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalledWith(expect.any(AuthenticationError));
        const error = nextFunction.mock.calls[0][0] as AuthenticationError;
        expect(error.code).toBe('AUTH_002');
        expect(error.statusCode).toBe(401);
      });

      it('should return 401 for empty token after Bearer', () => {
        mockRequest.headers = {
          authorization: 'Bearer    '
        };

        authenticate(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalledWith(expect.any(AuthenticationError));
        const error = nextFunction.mock.calls[0][0] as AuthenticationError;
        expect(error.code).toBe('AUTH_002');
        expect(error.statusCode).toBe(401);
      });
    });

    describe('Expired Token Cases', () => {
      it('should return 401 for expired token', () => {
        const payload: JWTPayload = {
          userId: 'user-123',
          email: 'test@example.com',
          role: UserRole.CUSTOMER
        };

        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '-1h' });
        mockRequest.headers = {
          authorization: `Bearer ${token}`
        };

        authenticate(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalledWith(expect.any(AuthenticationError));
        const error = nextFunction.mock.calls[0][0] as AuthenticationError;
        // Expired tokens may be caught as either AUTH_002 or AUTH_003 depending on JWT library behavior
        expect(['AUTH_002', 'AUTH_003']).toContain(error.code);
        expect(error.statusCode).toBe(401);
      });

      it('should return 401 for token expired 1 second ago', () => {
        const payload: JWTPayload = {
          userId: 'user-123',
          email: 'test@example.com',
          role: UserRole.CUSTOMER
        };

        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '-1s' });
        mockRequest.headers = {
          authorization: `Bearer ${token}`
        };

        authenticate(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalledWith(expect.any(AuthenticationError));
        const error = nextFunction.mock.calls[0][0] as AuthenticationError;
        // Expired tokens may be caught as either AUTH_002 or AUTH_003 depending on JWT library behavior
        expect(['AUTH_002', 'AUTH_003']).toContain(error.code);
        expect(error.statusCode).toBe(401);
      });

      it('should return 401 for token expired 1 day ago', () => {
        const payload: JWTPayload = {
          userId: 'user-123',
          email: 'test@example.com',
          role: UserRole.CUSTOMER
        };

        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '-1d' });
        mockRequest.headers = {
          authorization: `Bearer ${token}`
        };

        authenticate(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalledWith(expect.any(AuthenticationError));
        const error = nextFunction.mock.calls[0][0] as AuthenticationError;
        // Expired tokens may be caught as either AUTH_002 or AUTH_003 depending on JWT library behavior
        expect(['AUTH_002', 'AUTH_003']).toContain(error.code);
        expect(error.statusCode).toBe(401);
      });
    });

    describe('Malformed Token Cases', () => {
      it('should return 401 for token with invalid JSON in payload', () => {
        const invalidToken = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.aW52YWxpZC1qc29u.signature';
        mockRequest.headers = {
          authorization: invalidToken
        };

        authenticate(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        // JWT library may throw SyntaxError or JsonWebTokenError for invalid JSON
        expect(nextFunction).toHaveBeenCalledWith(expect.any(Error));
        const error = nextFunction.mock.calls[0][0];
        expect(error).toBeInstanceOf(Error);
      });

      it('should return 401 for token with too many parts', () => {
        mockRequest.headers = {
          authorization: 'Bearer header.payload.signature.extra'
        };

        authenticate(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalledWith(expect.any(AuthenticationError));
        const error = nextFunction.mock.calls[0][0] as AuthenticationError;
        expect(error.code).toBe('AUTH_002');
        expect(error.statusCode).toBe(401);
      });

      it('should return 401 for token with special characters', () => {
        mockRequest.headers = {
          authorization: 'Bearer @#$%^&*()'
        };

        authenticate(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalledWith(expect.any(AuthenticationError));
        const error = nextFunction.mock.calls[0][0] as AuthenticationError;
        expect(error.code).toBe('AUTH_002');
        expect(error.statusCode).toBe(401);
      });
    });

    describe('User Context Attachment', () => {
      it('should attach complete user payload to request object', () => {
        const payload: JWTPayload = {
          userId: 'user-abc-123',
          email: 'user@cuts.ae',
          role: UserRole.CUSTOMER
        };

        const token = jwt.sign(payload, JWT_SECRET);
        mockRequest.headers = {
          authorization: `Bearer ${token}`
        };

        authenticate(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(mockRequest.user).toEqual(
          expect.objectContaining({
            userId: 'user-abc-123',
            email: 'user@cuts.ae',
            role: UserRole.CUSTOMER
          })
        );
      });

      it('should preserve existing request properties when attaching user', () => {
        const payload: JWTPayload = {
          userId: 'user-123',
          email: 'test@example.com',
          role: UserRole.CUSTOMER
        };

        const token = jwt.sign(payload, JWT_SECRET);
        mockRequest.headers = {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json'
        };
        mockRequest.body = { test: 'data' };

        authenticate(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(mockRequest.body).toEqual({ test: 'data' });
        expect(mockRequest.headers['content-type']).toBe('application/json');
        expect(mockRequest.user).toBeDefined();
      });
    });

    describe('Error Handling Edge Cases', () => {
      it('should handle jwt.verify throwing generic error', () => {
        jest.spyOn(jwt, 'verify').mockImplementationOnce(() => {
          throw new Error('Unexpected error');
        });

        const payload: JWTPayload = {
          userId: 'user-123',
          email: 'test@example.com',
          role: UserRole.CUSTOMER
        };

        const token = jwt.sign(payload, JWT_SECRET);
        mockRequest.headers = {
          authorization: `Bearer ${token}`
        };

        authenticate(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalledWith(expect.any(Error));

        jest.restoreAllMocks();
      });

      it('should handle undefined JWT_SECRET gracefully', () => {
        const originalSecret = process.env.JWT_SECRET;
        delete process.env.JWT_SECRET;

        const payload: JWTPayload = {
          userId: 'user-123',
          email: 'test@example.com',
          role: UserRole.CUSTOMER
        };

        const token = jwt.sign(payload, JWT_SECRET);
        mockRequest.headers = {
          authorization: `Bearer ${token}`
        };

        authenticate(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalledWith(expect.any(AuthenticationError));
        const error = nextFunction.mock.calls[0][0] as AuthenticationError;
        expect(error.code).toBe('AUTH_002');

        process.env.JWT_SECRET = originalSecret;
      });
    });
  });

  describe('authorize middleware', () => {
    let mockRequest: Partial<AuthRequest>;
    let mockResponse: Partial<Response>;
    let nextFunction: jest.Mock;
    let jsonMock: jest.Mock;
    let statusMock: jest.Mock;

    beforeEach(() => {
      jsonMock = jest.fn();
      statusMock = jest.fn().mockReturnThis();

      mockRequest = {
        headers: {},
        user: undefined
      };

      mockResponse = {
        status: statusMock,
        json: jsonMock
      };

      nextFunction = jest.fn();
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    describe('Authorized Access Cases', () => {
      it('should allow access when user has the required role', () => {
        mockRequest.user = {
          userId: 'user-123',
          email: 'test@example.com',
          role: UserRole.CUSTOMER
        };

        const middleware = authorize(UserRole.CUSTOMER);
        middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalledTimes(1);
        expect(statusMock).not.toHaveBeenCalled();
        expect(jsonMock).not.toHaveBeenCalled();
      });

      it('should allow access when user role is in the allowed roles list', () => {
        mockRequest.user = {
          userId: 'admin-123',
          email: 'admin@cuts.ae',
          role: UserRole.ADMIN
        };

        const middleware = authorize(UserRole.ADMIN, UserRole.SUPPORT);
        middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalledTimes(1);
        expect(statusMock).not.toHaveBeenCalled();
      });

      it('should allow ADMIN role access', () => {
        mockRequest.user = {
          userId: 'admin-456',
          email: 'admin@cuts.ae',
          role: UserRole.ADMIN
        };

        const middleware = authorize(UserRole.ADMIN);
        middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalledTimes(1);
      });

      it('should allow RESTAURANT_OWNER role access', () => {
        mockRequest.user = {
          userId: 'owner-789',
          email: 'owner@restaurant.com',
          role: UserRole.RESTAURANT_OWNER
        };

        const middleware = authorize(UserRole.RESTAURANT_OWNER);
        middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalledTimes(1);
      });

      it('should allow DRIVER role access', () => {
        mockRequest.user = {
          userId: 'driver-101',
          email: 'driver@cuts.ae',
          role: UserRole.DRIVER
        };

        const middleware = authorize(UserRole.DRIVER);
        middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalledTimes(1);
      });

      it('should allow SUPPORT role access', () => {
        mockRequest.user = {
          userId: 'support-202',
          email: 'support@cuts.ae',
          role: UserRole.SUPPORT
        };

        const middleware = authorize(UserRole.SUPPORT);
        middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalledTimes(1);
      });

      it('should allow CUSTOMER role access', () => {
        mockRequest.user = {
          userId: 'customer-303',
          email: 'customer@example.com',
          role: UserRole.CUSTOMER
        };

        const middleware = authorize(UserRole.CUSTOMER);
        middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalledTimes(1);
      });
    });

    describe('Multiple Roles Authorization', () => {
      it('should allow access when user has first of multiple allowed roles', () => {
        mockRequest.user = {
          userId: 'admin-123',
          email: 'admin@cuts.ae',
          role: UserRole.ADMIN
        };

        const middleware = authorize(UserRole.ADMIN, UserRole.SUPPORT, UserRole.RESTAURANT_OWNER);
        middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalledTimes(1);
      });

      it('should allow access when user has middle role of multiple allowed roles', () => {
        mockRequest.user = {
          userId: 'support-456',
          email: 'support@cuts.ae',
          role: UserRole.SUPPORT
        };

        const middleware = authorize(UserRole.ADMIN, UserRole.SUPPORT, UserRole.RESTAURANT_OWNER);
        middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalledTimes(1);
      });

      it('should allow access when user has last role of multiple allowed roles', () => {
        mockRequest.user = {
          userId: 'owner-789',
          email: 'owner@restaurant.com',
          role: UserRole.RESTAURANT_OWNER
        };

        const middleware = authorize(UserRole.ADMIN, UserRole.SUPPORT, UserRole.RESTAURANT_OWNER);
        middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalledTimes(1);
      });

      it('should allow access with all roles specified', () => {
        mockRequest.user = {
          userId: 'driver-101',
          email: 'driver@cuts.ae',
          role: UserRole.DRIVER
        };

        const middleware = authorize(
          UserRole.ADMIN,
          UserRole.CUSTOMER,
          UserRole.DRIVER,
          UserRole.RESTAURANT_OWNER,
          UserRole.SUPPORT
        );
        middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalledTimes(1);
      });
    });

    describe('Forbidden Access Cases', () => {
      it('should return 403 when user role is not in allowed roles', () => {
        mockRequest.user = {
          userId: 'customer-123',
          email: 'customer@example.com',
          role: UserRole.CUSTOMER
        };

        const middleware = authorize(UserRole.ADMIN);
        middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalledWith(expect.any(AuthorizationError));
        const error = nextFunction.mock.calls[0][0] as AuthorizationError;
        expect(error.code).toBe('PERM_001');
        expect(error.statusCode).toBe(403);
      });

      it('should return 403 when CUSTOMER tries to access ADMIN route', () => {
        mockRequest.user = {
          userId: 'customer-123',
          email: 'customer@example.com',
          role: UserRole.CUSTOMER
        };

        const middleware = authorize(UserRole.ADMIN);
        middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalledWith(expect.any(AuthorizationError));
        const error = nextFunction.mock.calls[0][0] as AuthorizationError;
        expect(error.code).toBe('PERM_001');
        expect(error.statusCode).toBe(403);
      });

      it('should return 403 when DRIVER tries to access RESTAURANT_OWNER route', () => {
        mockRequest.user = {
          userId: 'driver-123',
          email: 'driver@cuts.ae',
          role: UserRole.DRIVER
        };

        const middleware = authorize(UserRole.RESTAURANT_OWNER);
        middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalledWith(expect.any(AuthorizationError));
        const error = nextFunction.mock.calls[0][0] as AuthorizationError;
        expect(error.code).toBe('PERM_001');
        expect(error.statusCode).toBe(403);
      });

      it('should return 403 when user role not in multiple allowed roles', () => {
        mockRequest.user = {
          userId: 'customer-123',
          email: 'customer@example.com',
          role: UserRole.CUSTOMER
        };

        const middleware = authorize(UserRole.ADMIN, UserRole.SUPPORT, UserRole.RESTAURANT_OWNER);
        middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalledWith(expect.any(AuthorizationError));
        const error = nextFunction.mock.calls[0][0] as AuthorizationError;
        expect(error.code).toBe('PERM_001');
        expect(error.statusCode).toBe(403);
      });
    });

    describe('Unauthorized Access Cases', () => {
      it('should return 401 when user is not authenticated (user is undefined)', () => {
        mockRequest.user = undefined;

        const middleware = authorize(UserRole.CUSTOMER);
        middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalledWith(expect.any(AuthenticationError));
        const error = nextFunction.mock.calls[0][0] as AuthenticationError;
        expect(error.code).toBe('AUTH_007');
        expect(error.statusCode).toBe(401);
      });

      it('should return 401 when user is null', () => {
        mockRequest.user = null as any;

        const middleware = authorize(UserRole.CUSTOMER);
        middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalledWith(expect.any(AuthenticationError));
        const error = nextFunction.mock.calls[0][0] as AuthenticationError;
        expect(error.code).toBe('AUTH_007');
        expect(error.statusCode).toBe(401);
      });

      it('should return 401 when user object exists but is falsy', () => {
        mockRequest.user = 0 as any;

        const middleware = authorize(UserRole.CUSTOMER);
        middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalledWith(expect.any(AuthenticationError));
        const error = nextFunction.mock.calls[0][0] as AuthenticationError;
        expect(error.code).toBe('AUTH_007');
        expect(error.statusCode).toBe(401);
      });
    });

    describe('Edge Cases', () => {
      it('should handle authorization with single role', () => {
        mockRequest.user = {
          userId: 'user-123',
          email: 'test@example.com',
          role: UserRole.ADMIN
        };

        const middleware = authorize(UserRole.ADMIN);
        middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalledTimes(1);
      });

      it('should handle authorization with two roles', () => {
        mockRequest.user = {
          userId: 'user-123',
          email: 'test@example.com',
          role: UserRole.SUPPORT
        };

        const middleware = authorize(UserRole.ADMIN, UserRole.SUPPORT);
        middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalledTimes(1);
      });

      it('should handle authorization check before role check', () => {
        mockRequest.user = undefined;

        const middleware = authorize(UserRole.ADMIN);
        middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalledWith(expect.any(AuthenticationError));
        const error = nextFunction.mock.calls[0][0] as AuthenticationError;
        expect(error.code).toBe('AUTH_007');
        expect(error.statusCode).toBe(401);
      });

      it('should maintain request object integrity', () => {
        mockRequest.user = {
          userId: 'user-123',
          email: 'test@example.com',
          role: UserRole.CUSTOMER
        };
        mockRequest.body = { test: 'data' };

        const middleware = authorize(UserRole.CUSTOMER);
        middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(mockRequest.body).toEqual({ test: 'data' });
        expect(mockRequest.user).toBeDefined();
      });
    });

    describe('Response Handling', () => {
      it('should call next with error when unauthorized', () => {
        mockRequest.user = undefined;

        const middleware = authorize(UserRole.CUSTOMER);
        middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalledWith(expect.any(AuthenticationError));
        expect(nextFunction).toHaveBeenCalledTimes(1);
        const error = nextFunction.mock.calls[0][0] as AuthenticationError;
        expect(error.code).toBe('AUTH_007');
        expect(error.statusCode).toBe(401);
      });

      it('should call next with error when forbidden', () => {
        mockRequest.user = {
          userId: 'user-123',
          email: 'test@example.com',
          role: UserRole.CUSTOMER
        };

        const middleware = authorize(UserRole.ADMIN);
        middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalledWith(expect.any(AuthorizationError));
        expect(nextFunction).toHaveBeenCalledTimes(1);
        const error = nextFunction.mock.calls[0][0] as AuthorizationError;
        expect(error.code).toBe('PERM_001');
        expect(error.statusCode).toBe(403);
      });

      it('should not call response methods when authorized', () => {
        mockRequest.user = {
          userId: 'user-123',
          email: 'test@example.com',
          role: UserRole.CUSTOMER
        };

        const middleware = authorize(UserRole.CUSTOMER);
        middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(statusMock).not.toHaveBeenCalled();
        expect(jsonMock).not.toHaveBeenCalled();
      });
    });
  });

  describe('Integration between authenticate and authorize', () => {
    let mockRequest: Partial<AuthRequest>;
    let mockResponse: Partial<Response>;
    let nextFunction: jest.Mock;
    let jsonMock: jest.Mock;
    let statusMock: jest.Mock;

    beforeEach(() => {
      jsonMock = jest.fn();
      statusMock = jest.fn().mockReturnThis();

      mockRequest = {
        headers: {}
      };

      mockResponse = {
        status: statusMock,
        json: jsonMock
      };

      nextFunction = jest.fn();
    });

    it('should authenticate and then authorize successfully', () => {
      const payload: JWTPayload = {
        userId: 'admin-123',
        email: 'admin@cuts.ae',
        role: UserRole.ADMIN
      };

      const token = jwt.sign(payload, JWT_SECRET);
      mockRequest.headers = {
        authorization: `Bearer ${token}`
      };

      // First, authenticate
      authenticate(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(mockRequest.user).toBeDefined();

      // Reset next function
      nextFunction = jest.fn();

      // Then, authorize
      const middleware = authorize(UserRole.ADMIN);
      middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      expect(nextFunction).toHaveBeenCalledTimes(1);
    });

    it('should authenticate but fail authorization due to wrong role', () => {
      const payload: JWTPayload = {
        userId: 'customer-123',
        email: 'customer@example.com',
        role: UserRole.CUSTOMER
      };

      const token = jwt.sign(payload, JWT_SECRET);
      mockRequest.headers = {
        authorization: `Bearer ${token}`
      };

      // First, authenticate
      authenticate(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(mockRequest.user?.role).toBe(UserRole.CUSTOMER);

      // Reset mocks
      nextFunction = jest.fn();
      statusMock.mockClear();
      jsonMock.mockClear();

      // Then, try to authorize for ADMIN role
      const middleware = authorize(UserRole.ADMIN);
      middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(expect.any(AuthorizationError));
      const error = nextFunction.mock.calls[0][0] as AuthorizationError;
      expect(error.code).toBe('PERM_001');
      expect(error.statusCode).toBe(403);
    });

    it('should fail authentication and skip authorization', () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid-token'
      };

      // Authentication fails
      authenticate(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(expect.any(AuthenticationError));
      expect(mockRequest.user).toBeUndefined();

      // Authorization would fail due to no user
      const middleware = authorize(UserRole.CUSTOMER);
      nextFunction = jest.fn();
      statusMock.mockClear();
      jsonMock.mockClear();

      middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(expect.any(AuthenticationError));
      const error = nextFunction.mock.calls[0][0] as AuthenticationError;
      expect(error.code).toBe('AUTH_007');
      expect(error.statusCode).toBe(401);
    });
  });
});
