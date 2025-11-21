import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate, authorize, AuthRequest } from '../../middleware/auth';
import { validate } from '../../middleware/validation';
import { errorHandler, AppError } from '../../middleware/errorHandler';
import { UserRole, JWTPayload } from '../../types';
import { z } from 'zod';

describe('Authentication Middleware', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {}
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    nextFunction = jest.fn();
  });

  describe('authenticate', () => {
    it('should authenticate valid token', () => {
      const payload: JWTPayload = {
        userId: '123',
        email: 'test@cuts.ae',
        role: UserRole.CUSTOMER
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET!);
      mockRequest.headers = {
        authorization: `Bearer ${token}`
      };

      authenticate(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith();
      expect(mockRequest.user).toBeDefined();
      expect(mockRequest.user?.userId).toBe('123');
      expect(mockRequest.user?.email).toBe('test@cuts.ae');
      expect(mockRequest.user?.role).toBe(UserRole.CUSTOMER);
    });

    it('should pass error to next() without authorization header', () => {
      authenticate(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'AUTH_001',
          statusCode: 401,
          name: 'AuthenticationError'
        })
      );
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it('should pass error to next() with invalid token format', () => {
      mockRequest.headers = {
        authorization: 'InvalidFormat token'
      };

      authenticate(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'AUTH_001',
          statusCode: 401,
          name: 'AuthenticationError'
        })
      );
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it('should pass error to next() with invalid token', () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid-token-here'
      };

      authenticate(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'AUTH_002',
          statusCode: 401,
          name: 'AuthenticationError'
        })
      );
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it('should pass error to next() for expired token', () => {
      const payload: JWTPayload = {
        userId: '123',
        email: 'test@cuts.ae',
        role: UserRole.CUSTOMER
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '-1h' });
      mockRequest.headers = {
        authorization: `Bearer ${token}`
      };

      authenticate(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'AUTH_003',
          statusCode: 401,
          name: 'AuthenticationError'
        })
      );
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it('should pass error to next() for malformed JWT signature', () => {
      // Create a token with valid structure but signed with wrong secret
      const payload: JWTPayload = {
        userId: '123',
        email: 'test@cuts.ae',
        role: UserRole.CUSTOMER
      };
      const token = jwt.sign(payload, 'wrong-secret');
      mockRequest.headers = {
        authorization: `Bearer ${token}`
      };

      authenticate(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'AUTH_002',
          statusCode: 401,
          name: 'AuthenticationError'
        })
      );
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });
  });

  describe('authorize', () => {
    beforeEach(() => {
      mockRequest.user = {
        userId: '123',
        email: 'test@cuts.ae',
        role: UserRole.CUSTOMER
      };
    });

    it('should allow access for authorized role', () => {
      const middleware = authorize(UserRole.CUSTOMER);
      middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow access for multiple authorized roles', () => {
      const middleware = authorize(UserRole.CUSTOMER, UserRole.ADMIN);
      middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should pass error to next() for unauthorized role', () => {
      const middleware = authorize(UserRole.RESTAURANT_OWNER);
      middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'PERM_001',
          statusCode: 403,
          name: 'AuthorizationError',
          details: expect.objectContaining({
            userRole: UserRole.CUSTOMER,
            requiredRoles: [UserRole.RESTAURANT_OWNER]
          })
        })
      );
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it('should pass error to next() when user is not set', () => {
      mockRequest.user = undefined;
      const middleware = authorize(UserRole.CUSTOMER);
      middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'AUTH_007',
          statusCode: 401,
          name: 'AuthenticationError'
        })
      );
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it('should allow admin access', () => {
      mockRequest.user!.role = UserRole.ADMIN;
      const middleware = authorize(UserRole.ADMIN);
      middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith();
    });

    it('should allow restaurant owner access', () => {
      mockRequest.user!.role = UserRole.RESTAURANT_OWNER;
      const middleware = authorize(UserRole.RESTAURANT_OWNER);
      middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith();
    });

    it('should allow driver access', () => {
      mockRequest.user!.role = UserRole.DRIVER;
      const middleware = authorize(UserRole.DRIVER);
      middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith();
    });
  });
});

describe('Validation Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      body: {},
      query: {},
      params: {}
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    nextFunction = jest.fn();
  });

  describe('validate', () => {
    it('should validate correct body data', async () => {
      const schema = z.object({
        name: z.string(),
        age: z.number().min(0)
      });

      mockRequest.body = {
        name: 'John Doe',
        age: 30
      };

      const middleware = validate(schema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should pass validation error to next() for invalid body data', async () => {
      const schema = z.object({
        name: z.string(),
        age: z.number().min(0)
      });

      mockRequest.body = {
        name: 'John Doe',
        age: -5 // Invalid: negative age
      };

      const middleware = validate(schema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'VAL_001',
          statusCode: 400,
          name: 'ValidationError',
          details: expect.any(Array)
        })
      );
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it('should pass validation error to next() for missing required fields', async () => {
      const schema = z.object({
        name: z.string(),
        email: z.string().email(),
        age: z.number()
      });

      mockRequest.body = {
        name: 'John Doe'
        // Missing email and age
      };

      const middleware = validate(schema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'VAL_001',
          statusCode: 400,
          name: 'ValidationError'
        })
      );
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it('should pass validation error to next() for invalid email format', async () => {
      const schema = z.object({
        email: z.string().email()
      });

      mockRequest.body = {
        email: 'invalid-email'
      };

      const middleware = validate(schema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'VAL_001',
          statusCode: 400,
          name: 'ValidationError'
        })
      );
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it('should validate nested objects', async () => {
      const schema = z.object({
        user: z.object({
          name: z.string(),
          address: z.object({
            street: z.string(),
            city: z.string()
          })
        })
      });

      mockRequest.body = {
        user: {
          name: 'John Doe',
          address: {
            street: '123 Main St',
            city: 'Abu Dhabi'
          }
        }
      };

      const middleware = validate(schema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith();
    });

    it('should validate arrays', async () => {
      const schema = z.object({
        items: z.array(z.object({
          id: z.string(),
          quantity: z.number().min(1)
        }))
      });

      mockRequest.body = {
        items: [
          { id: '1', quantity: 2 },
          { id: '2', quantity: 1 }
        ]
      };

      const middleware = validate(schema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith();
    });

    it('should pass validation error to next() for invalid array items', async () => {
      const schema = z.object({
        items: z.array(z.object({
          id: z.string(),
          quantity: z.number().min(1)
        }))
      });

      mockRequest.body = {
        items: [
          { id: '1', quantity: 2 },
          { id: '2', quantity: 0 } // Invalid: quantity must be >= 1
        ]
      };

      const middleware = validate(schema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'VAL_001',
          statusCode: 400,
          name: 'ValidationError'
        })
      );
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it('should validate optional fields', async () => {
      const schema = z.object({
        name: z.string(),
        nickname: z.string().optional()
      });

      mockRequest.body = {
        name: 'John Doe'
        // nickname is optional
      };

      const middleware = validate(schema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith();
    });

    it('should pass validation error to next() for invalid enum values', async () => {
      enum Status {
        ACTIVE = 'active',
        INACTIVE = 'inactive'
      }

      const schema = z.object({
        status: z.nativeEnum(Status)
      });

      mockRequest.body = {
        status: 'invalid-status'
      };

      const middleware = validate(schema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'VAL_001',
          statusCode: 400,
          name: 'ValidationError'
        })
      );
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });
  });
});

describe('Error Handler Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    nextFunction = jest.fn();
  });

  it('should handle generic errors', () => {
    const error = new Error('Something went wrong');

    errorHandler(error, mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Internal server error'
      })
    );
  });

  it('should handle AppError with status code', () => {
    const error = new AppError('SYS_004');

    errorHandler(error, mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(404);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.any(String),
        code: expect.any(String),
        statusCode: 404
      })
    );
  });

  it('should handle validation errors with AppError', () => {
    const error = new AppError('VAL_001');

    errorHandler(error, mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.any(String),
        code: expect.any(String),
        statusCode: 400
      })
    );
  });

  it('should handle authentication errors with AppError', () => {
    const error = new AppError('AUTH_002');

    errorHandler(error, mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.any(String),
        code: expect.any(String),
        statusCode: 401
      })
    );
  });

  it('should handle authorization errors with AppError', () => {
    const error = new AppError('PERM_001');

    errorHandler(error, mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.any(String),
        code: expect.any(String),
        statusCode: 403
      })
    );
  });

  it('should default to 500 for errors without status code', () => {
    const error = new Error('Internal error');

    errorHandler(error, mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Internal server error'
      })
    );
  });

  it('should handle AppError with error code', () => {
    const error = new AppError('DB_002');

    errorHandler(error, mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.any(String),
        code: expect.any(String),
        statusCode: 500
      })
    );
  });

  it('should handle Zod validation errors', () => {
    const error: any = new Error('Validation failed');
    error.name = 'ZodError';

    errorHandler(error, mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.any(String),
        code: 'VAL_001'
      })
    );
  });
});
