import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { rbacMiddleware, requireRole, requireAdmin, requireOwnership } from '../../middleware/rbac';
import { UserRole } from '../../types';
import * as permissions from '../../config/permissions';

describe('RBAC Middleware', () => {
  let mockRequest: any;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;
  let consoleLogSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    mockRequest = {
      method: 'GET',
      path: '/api/v1/test',
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('test-user-agent'),
      params: {}
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    nextFunction = jest.fn();

    // Spy on console methods to suppress logs during tests
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('rbacMiddleware - Public Endpoints', () => {
    it('should allow access to public health endpoint', () => {
      mockRequest.method = 'GET';
      mockRequest.path = '/health';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Public endpoint accessed: GET /health')
      );
    });

    it('should allow access to root endpoint', () => {
      mockRequest.method = 'GET';
      mockRequest.path = '/';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Public endpoint accessed: GET /')
      );
    });

    it('should allow access to public uploads endpoint with wildcard', () => {
      mockRequest.method = 'GET';
      mockRequest.path = '/uploads/image.jpg';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow access to public auth register endpoint', () => {
      mockRequest.method = 'POST';
      mockRequest.path = '/api/v1/auth/register';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow access to public auth login endpoint', () => {
      mockRequest.method = 'POST';
      mockRequest.path = '/api/v1/auth/login';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow access to public restaurants list endpoint', () => {
      mockRequest.method = 'GET';
      mockRequest.path = '/api/v1/restaurants';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow access to public restaurant details endpoint with ID', () => {
      mockRequest.method = 'GET';
      mockRequest.path = '/api/v1/restaurants/rest-123';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow access to public menu items endpoint', () => {
      mockRequest.method = 'GET';
      mockRequest.path = '/api/v1/restaurants/rest-123/menu-items';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow access to public support ticket creation', () => {
      mockRequest.method = 'POST';
      mockRequest.path = '/api/v1/support/tickets';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow access to public support login', () => {
      mockRequest.method = 'POST';
      mockRequest.path = '/api/v1/support/auth/login';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });

  describe('rbacMiddleware - Undefined Endpoints (Fail-Secure)', () => {
    it('should deny access to undefined endpoint', () => {
      mockRequest.method = 'GET';
      mockRequest.path = '/api/v1/undefined-endpoint';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Forbidden',
        message: 'No permissions defined for this endpoint'
      });
      expect(nextFunction).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('SECURITY WARNING: No permissions defined for GET /api/v1/undefined-endpoint')
      );
    });

    it('should deny access to undefined POST endpoint', () => {
      mockRequest.method = 'POST';
      mockRequest.path = '/api/v1/unknown';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Forbidden',
        message: 'No permissions defined for this endpoint'
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should log security warning with IP and user agent for undefined endpoint', () => {
      mockRequest.method = 'DELETE';
      mockRequest.path = '/api/v1/secret-endpoint';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('IP: 127.0.0.1')
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('User-Agent: test-user-agent')
      );
    });
  });

  describe('rbacMiddleware - Unauthenticated Access', () => {
    it('should deny unauthenticated access to protected endpoint', () => {
      mockRequest.method = 'GET';
      mockRequest.path = '/api/v1/auth/me';
      mockRequest.user = undefined;

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required'
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should log warning for unauthenticated access attempt', () => {
      mockRequest.method = 'GET';
      mockRequest.path = '/api/v1/auth/me';
      mockRequest.user = undefined;

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unauthenticated access attempt to GET /api/v1/auth/me')
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('IP: 127.0.0.1')
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('User-Agent: test-user-agent')
      );
    });

    it('should deny unauthenticated access to admin endpoints', () => {
      mockRequest.method = 'GET';
      mockRequest.path = '/api/v1/admin/analytics';
      mockRequest.user = undefined;

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required'
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should deny unauthenticated access to order creation', () => {
      mockRequest.method = 'POST';
      mockRequest.path = '/api/v1/orders';
      mockRequest.user = undefined;

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('rbacMiddleware - CUSTOMER Role', () => {
    beforeEach(() => {
      mockRequest.user = {
        userId: 'customer-123',
        email: 'customer@cuts.ae',
        role: UserRole.CUSTOMER
      };
    });

    it('should allow CUSTOMER to access /api/v1/auth/me', () => {
      mockRequest.method = 'GET';
      mockRequest.path = '/api/v1/auth/me';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Permission granted')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('User ID: customer-123')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Role: customer')
      );
    });

    it('should allow CUSTOMER to create orders', () => {
      mockRequest.method = 'POST';
      mockRequest.path = '/api/v1/orders';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow CUSTOMER to view orders', () => {
      mockRequest.method = 'GET';
      mockRequest.path = '/api/v1/orders';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow CUSTOMER to view specific order', () => {
      mockRequest.method = 'GET';
      mockRequest.path = '/api/v1/orders/order-123';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow CUSTOMER to cancel orders', () => {
      mockRequest.method = 'POST';
      mockRequest.path = '/api/v1/orders/order-123/cancel';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow CUSTOMER to view support tickets', () => {
      mockRequest.method = 'GET';
      mockRequest.path = '/api/v1/support/tickets';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow CUSTOMER to reply to support tickets', () => {
      mockRequest.method = 'POST';
      mockRequest.path = '/api/v1/support/tickets/ticket-123/replies';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow CUSTOMER to create chat sessions', () => {
      mockRequest.method = 'POST';
      mockRequest.path = '/api/v1/chat/sessions';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow CUSTOMER to view their own chat sessions', () => {
      mockRequest.method = 'GET';
      mockRequest.path = '/api/v1/chat/sessions/my';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should deny CUSTOMER access to admin analytics', () => {
      mockRequest.method = 'GET';
      mockRequest.path = '/api/v1/admin/analytics';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Forbidden',
        message: 'You do not have permission to access this resource. Required roles: admin'
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should deny CUSTOMER access to restaurant creation', () => {
      mockRequest.method = 'POST';
      mockRequest.path = '/api/v1/restaurants';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Forbidden',
        message: expect.stringContaining('restaurant_owner, admin')
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should deny CUSTOMER access to order status updates', () => {
      mockRequest.method = 'PATCH';
      mockRequest.path = '/api/v1/orders/order-123/status';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should deny CUSTOMER access to support ticket status updates', () => {
      mockRequest.method = 'PATCH';
      mockRequest.path = '/api/v1/support/tickets/ticket-123/status';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should deny CUSTOMER access to all chat sessions', () => {
      mockRequest.method = 'GET';
      mockRequest.path = '/api/v1/chat/sessions';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should log permission denied with all user details', () => {
      mockRequest.method = 'GET';
      mockRequest.path = '/api/v1/admin/analytics';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Permission denied')
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('User ID: customer-123')
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Email: customer@cuts.ae')
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Role: customer')
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('IP: 127.0.0.1')
      );
    });
  });

  describe('rbacMiddleware - RESTAURANT_OWNER Role', () => {
    beforeEach(() => {
      mockRequest.user = {
        userId: 'owner-123',
        email: 'owner@cuts.ae',
        role: UserRole.RESTAURANT_OWNER
      };
    });

    it('should allow RESTAURANT_OWNER to access /api/v1/auth/me', () => {
      mockRequest.method = 'GET';
      mockRequest.path = '/api/v1/auth/me';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow RESTAURANT_OWNER to get their restaurants', () => {
      mockRequest.method = 'GET';
      mockRequest.path = '/api/v1/restaurants/my/restaurants';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow RESTAURANT_OWNER to create restaurants', () => {
      mockRequest.method = 'POST';
      mockRequest.path = '/api/v1/restaurants';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow RESTAURANT_OWNER to update restaurants', () => {
      mockRequest.method = 'PUT';
      mockRequest.path = '/api/v1/restaurants/rest-123';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow RESTAURANT_OWNER to update operating status', () => {
      mockRequest.method = 'PATCH';
      mockRequest.path = '/api/v1/restaurants/rest-123/operating-status';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow RESTAURANT_OWNER to view restaurant analytics', () => {
      mockRequest.method = 'GET';
      mockRequest.path = '/api/v1/restaurants/rest-123/analytics';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow RESTAURANT_OWNER to create menu items', () => {
      mockRequest.method = 'POST';
      mockRequest.path = '/api/v1/restaurants/rest-123/menu-items';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow RESTAURANT_OWNER to update menu items', () => {
      mockRequest.method = 'PUT';
      mockRequest.path = '/api/v1/menu-items/item-123';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow RESTAURANT_OWNER to delete menu items', () => {
      mockRequest.method = 'DELETE';
      mockRequest.path = '/api/v1/menu-items/item-123';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow RESTAURANT_OWNER to update menu item availability', () => {
      mockRequest.method = 'PATCH';
      mockRequest.path = '/api/v1/menu-items/item-123/availability';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow RESTAURANT_OWNER to add nutrition info', () => {
      mockRequest.method = 'POST';
      mockRequest.path = '/api/v1/menu-items/item-123/nutrition';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow RESTAURANT_OWNER to view orders', () => {
      mockRequest.method = 'GET';
      mockRequest.path = '/api/v1/orders';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow RESTAURANT_OWNER to view specific order', () => {
      mockRequest.method = 'GET';
      mockRequest.path = '/api/v1/orders/order-123';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow RESTAURANT_OWNER to update order status', () => {
      mockRequest.method = 'PATCH';
      mockRequest.path = '/api/v1/orders/order-123/status';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow RESTAURANT_OWNER to view support tickets', () => {
      mockRequest.method = 'GET';
      mockRequest.path = '/api/v1/support/tickets';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow RESTAURANT_OWNER to create chat sessions', () => {
      mockRequest.method = 'POST';
      mockRequest.path = '/api/v1/chat/sessions';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should deny RESTAURANT_OWNER access to create orders', () => {
      mockRequest.method = 'POST';
      mockRequest.path = '/api/v1/orders';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should deny RESTAURANT_OWNER access to cancel orders', () => {
      mockRequest.method = 'POST';
      mockRequest.path = '/api/v1/orders/order-123/cancel';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should deny RESTAURANT_OWNER access to admin analytics', () => {
      mockRequest.method = 'GET';
      mockRequest.path = '/api/v1/admin/analytics';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should deny RESTAURANT_OWNER access to admin restaurant approval', () => {
      mockRequest.method = 'POST';
      mockRequest.path = '/api/v1/admin/restaurants/rest-123/approve';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should deny RESTAURANT_OWNER access to update support ticket status', () => {
      mockRequest.method = 'PATCH';
      mockRequest.path = '/api/v1/support/tickets/ticket-123/status';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should deny RESTAURANT_OWNER access to all chat sessions', () => {
      mockRequest.method = 'GET';
      mockRequest.path = '/api/v1/chat/sessions';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('rbacMiddleware - DRIVER Role', () => {
    beforeEach(() => {
      mockRequest.user = {
        userId: 'driver-123',
        email: 'driver@cuts.ae',
        role: UserRole.DRIVER
      };
    });

    it('should allow DRIVER to access /api/v1/auth/me', () => {
      mockRequest.method = 'GET';
      mockRequest.path = '/api/v1/auth/me';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow DRIVER to view orders', () => {
      mockRequest.method = 'GET';
      mockRequest.path = '/api/v1/orders';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow DRIVER to view specific order', () => {
      mockRequest.method = 'GET';
      mockRequest.path = '/api/v1/orders/order-123';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow DRIVER to update order status', () => {
      mockRequest.method = 'PATCH';
      mockRequest.path = '/api/v1/orders/order-123/status';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow DRIVER to view support tickets', () => {
      mockRequest.method = 'GET';
      mockRequest.path = '/api/v1/support/tickets';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow DRIVER to reply to support tickets', () => {
      mockRequest.method = 'POST';
      mockRequest.path = '/api/v1/support/tickets/ticket-123/replies';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow DRIVER to create chat sessions', () => {
      mockRequest.method = 'POST';
      mockRequest.path = '/api/v1/chat/sessions';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow DRIVER to view their own chat sessions', () => {
      mockRequest.method = 'GET';
      mockRequest.path = '/api/v1/chat/sessions/my';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should deny DRIVER access to create orders', () => {
      mockRequest.method = 'POST';
      mockRequest.path = '/api/v1/orders';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should deny DRIVER access to cancel orders', () => {
      mockRequest.method = 'POST';
      mockRequest.path = '/api/v1/orders/order-123/cancel';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should deny DRIVER access to create restaurants', () => {
      mockRequest.method = 'POST';
      mockRequest.path = '/api/v1/restaurants';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should deny DRIVER access to menu item creation', () => {
      mockRequest.method = 'POST';
      mockRequest.path = '/api/v1/restaurants/rest-123/menu-items';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should deny DRIVER access to admin analytics', () => {
      mockRequest.method = 'GET';
      mockRequest.path = '/api/v1/admin/analytics';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should deny DRIVER access to update support ticket status', () => {
      mockRequest.method = 'PATCH';
      mockRequest.path = '/api/v1/support/tickets/ticket-123/status';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should deny DRIVER access to all chat sessions', () => {
      mockRequest.method = 'GET';
      mockRequest.path = '/api/v1/chat/sessions';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('rbacMiddleware - ADMIN Role', () => {
    beforeEach(() => {
      mockRequest.user = {
        userId: 'admin-123',
        email: 'admin@cuts.ae',
        role: UserRole.ADMIN
      };
    });

    it('should allow ADMIN to access /api/v1/auth/me', () => {
      mockRequest.method = 'GET';
      mockRequest.path = '/api/v1/auth/me';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow ADMIN to access platform analytics', () => {
      mockRequest.method = 'GET';
      mockRequest.path = '/api/v1/admin/analytics';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow ADMIN to access admin restaurants', () => {
      mockRequest.method = 'GET';
      mockRequest.path = '/api/v1/admin/restaurants';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow ADMIN to approve restaurants', () => {
      mockRequest.method = 'POST';
      mockRequest.path = '/api/v1/admin/restaurants/rest-123/approve';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow ADMIN to access admin drivers', () => {
      mockRequest.method = 'GET';
      mockRequest.path = '/api/v1/admin/drivers';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow ADMIN to approve drivers', () => {
      mockRequest.method = 'POST';
      mockRequest.path = '/api/v1/admin/drivers/driver-123/approve';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow ADMIN to access admin invoices', () => {
      mockRequest.method = 'GET';
      mockRequest.path = '/api/v1/admin/invoices';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow ADMIN to access specific invoice', () => {
      mockRequest.method = 'GET';
      mockRequest.path = '/api/v1/admin/invoices/inv-123';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow ADMIN to generate invoices', () => {
      mockRequest.method = 'POST';
      mockRequest.path = '/api/v1/admin/invoices/generate';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow ADMIN to access admin users', () => {
      mockRequest.method = 'GET';
      mockRequest.path = '/api/v1/admin/users';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow ADMIN to access admin orders', () => {
      mockRequest.method = 'GET';
      mockRequest.path = '/api/v1/admin/orders';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow ADMIN to create restaurants', () => {
      mockRequest.method = 'POST';
      mockRequest.path = '/api/v1/restaurants';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow ADMIN to update restaurants', () => {
      mockRequest.method = 'PUT';
      mockRequest.path = '/api/v1/restaurants/rest-123';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow ADMIN to create menu items', () => {
      mockRequest.method = 'POST';
      mockRequest.path = '/api/v1/restaurants/rest-123/menu-items';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow ADMIN to delete menu items', () => {
      mockRequest.method = 'DELETE';
      mockRequest.path = '/api/v1/menu-items/item-123';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow ADMIN to create orders', () => {
      mockRequest.method = 'POST';
      mockRequest.path = '/api/v1/orders';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow ADMIN to view orders', () => {
      mockRequest.method = 'GET';
      mockRequest.path = '/api/v1/orders';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow ADMIN to update order status', () => {
      mockRequest.method = 'PATCH';
      mockRequest.path = '/api/v1/orders/order-123/status';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow ADMIN to cancel orders', () => {
      mockRequest.method = 'POST';
      mockRequest.path = '/api/v1/orders/order-123/cancel';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow ADMIN to access support auth me', () => {
      mockRequest.method = 'GET';
      mockRequest.path = '/api/v1/support/auth/me';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow ADMIN to view support tickets', () => {
      mockRequest.method = 'GET';
      mockRequest.path = '/api/v1/support/tickets';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow ADMIN to update support ticket status', () => {
      mockRequest.method = 'PATCH';
      mockRequest.path = '/api/v1/support/tickets/ticket-123/status';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow ADMIN to update support ticket priority', () => {
      mockRequest.method = 'PATCH';
      mockRequest.path = '/api/v1/support/tickets/ticket-123/priority';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow ADMIN to convert ticket to chat', () => {
      mockRequest.method = 'POST';
      mockRequest.path = '/api/v1/support/tickets/ticket-123/chat';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow ADMIN to create chat sessions', () => {
      mockRequest.method = 'POST';
      mockRequest.path = '/api/v1/chat/sessions';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow ADMIN to view all chat sessions', () => {
      mockRequest.method = 'GET';
      mockRequest.path = '/api/v1/chat/sessions';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow ADMIN to assign chat sessions', () => {
      mockRequest.method = 'POST';
      mockRequest.path = '/api/v1/chat/sessions/session-123/assign';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow ADMIN to update chat session status', () => {
      mockRequest.method = 'PATCH';
      mockRequest.path = '/api/v1/chat/sessions/session-123/status';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });

  describe('rbacMiddleware - SUPPORT Role', () => {
    beforeEach(() => {
      mockRequest.user = {
        userId: 'support-123',
        email: 'support@cuts.ae',
        role: UserRole.SUPPORT
      };
    });

    it('should allow SUPPORT to access /api/v1/auth/me', () => {
      mockRequest.method = 'GET';
      mockRequest.path = '/api/v1/auth/me';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow SUPPORT to access support auth me', () => {
      mockRequest.method = 'GET';
      mockRequest.path = '/api/v1/support/auth/me';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow SUPPORT to view support tickets', () => {
      mockRequest.method = 'GET';
      mockRequest.path = '/api/v1/support/tickets';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow SUPPORT to view specific ticket', () => {
      mockRequest.method = 'GET';
      mockRequest.path = '/api/v1/support/tickets/ticket-123';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow SUPPORT to reply to tickets', () => {
      mockRequest.method = 'POST';
      mockRequest.path = '/api/v1/support/tickets/ticket-123/replies';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow SUPPORT to update ticket status', () => {
      mockRequest.method = 'PATCH';
      mockRequest.path = '/api/v1/support/tickets/ticket-123/status';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow SUPPORT to update ticket priority', () => {
      mockRequest.method = 'PATCH';
      mockRequest.path = '/api/v1/support/tickets/ticket-123/priority';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow SUPPORT to convert ticket to chat', () => {
      mockRequest.method = 'POST';
      mockRequest.path = '/api/v1/support/tickets/ticket-123/chat';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow SUPPORT to create chat sessions', () => {
      mockRequest.method = 'POST';
      mockRequest.path = '/api/v1/chat/sessions';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow SUPPORT to view all chat sessions', () => {
      mockRequest.method = 'GET';
      mockRequest.path = '/api/v1/chat/sessions';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow SUPPORT to view their own chat sessions', () => {
      mockRequest.method = 'GET';
      mockRequest.path = '/api/v1/chat/sessions/my';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow SUPPORT to assign chat sessions', () => {
      mockRequest.method = 'POST';
      mockRequest.path = '/api/v1/chat/sessions/session-123/assign';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow SUPPORT to update chat session status', () => {
      mockRequest.method = 'PATCH';
      mockRequest.path = '/api/v1/chat/sessions/session-123/status';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should deny SUPPORT access to admin analytics', () => {
      mockRequest.method = 'GET';
      mockRequest.path = '/api/v1/admin/analytics';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should deny SUPPORT access to create restaurants', () => {
      mockRequest.method = 'POST';
      mockRequest.path = '/api/v1/restaurants';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should deny SUPPORT access to create orders', () => {
      mockRequest.method = 'POST';
      mockRequest.path = '/api/v1/orders';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should deny SUPPORT access to update order status', () => {
      mockRequest.method = 'PATCH';
      mockRequest.path = '/api/v1/orders/order-123/status';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should deny SUPPORT access to admin restaurants', () => {
      mockRequest.method = 'GET';
      mockRequest.path = '/api/v1/admin/restaurants';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should deny SUPPORT access to admin invoices', () => {
      mockRequest.method = 'GET';
      mockRequest.path = '/api/v1/admin/invoices';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('rbacMiddleware - Edge Cases', () => {
    it('should handle missing user-agent header', () => {
      mockRequest.method = 'GET';
      mockRequest.path = '/api/v1/undefined';
      mockRequest.get = jest.fn().mockReturnValue(undefined);

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('User-Agent: undefined')
      );
    });

    it('should handle missing IP', () => {
      mockRequest.method = 'GET';
      mockRequest.path = '/api/v1/undefined';
      mockRequest.ip = undefined;

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('IP: undefined')
      );
    });

    it('should handle user with missing email', () => {
      mockRequest.method = 'GET';
      mockRequest.path = '/api/v1/auth/me';
      mockRequest.user = {
        userId: 'test-123',
        email: undefined as any,
        role: UserRole.CUSTOMER
      };

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Email: undefined')
      );
    });

    it('should handle user with missing userId', () => {
      mockRequest.method = 'GET';
      mockRequest.path = '/api/v1/auth/me';
      mockRequest.user = {
        userId: undefined as any,
        email: 'test@cuts.ae',
        role: UserRole.CUSTOMER
      };

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('User ID: undefined')
      );
    });

    it('should handle various HTTP methods on public endpoints', () => {
      const testCases = [
        { method: 'GET', path: '/health' },
        { method: 'GET', path: '/' },
        { method: 'POST', path: '/api/v1/auth/register' },
        { method: 'POST', path: '/api/v1/auth/login' },
        { method: 'GET', path: '/api/v1/restaurants' },
        { method: 'POST', path: '/api/v1/support/tickets' }
      ];

      testCases.forEach(testCase => {
        jest.clearAllMocks();
        mockRequest.method = testCase.method;
        mockRequest.path = testCase.path;

        rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalled();
      });
    });

    it('should handle paths with multiple parameters', () => {
      mockRequest.method = 'GET';
      mockRequest.path = '/api/v1/restaurants/rest-123/menu-items/item-456';
      mockRequest.user = {
        userId: 'test-123',
        email: 'test@cuts.ae',
        role: UserRole.CUSTOMER
      };

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      // This path is not defined, should fail secure
      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });

    it('should handle paths with special characters', () => {
      mockRequest.method = 'GET';
      mockRequest.path = '/uploads/image-name-with-dashes_and_underscores.jpg';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should handle case sensitivity in methods', () => {
      mockRequest.method = 'get' as any;
      mockRequest.path = '/health';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should include timestamp in logs', () => {
      mockRequest.method = 'GET';
      mockRequest.path = '/health';

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[RBAC\] \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/)
      );
    });
  });

  describe('requireRole Middleware Factory', () => {
    beforeEach(() => {
      mockRequest.user = {
        userId: 'test-123',
        email: 'test@cuts.ae',
        role: UserRole.CUSTOMER
      };
    });

    it('should allow access for single matching role', () => {
      const middleware = requireRole(UserRole.CUSTOMER);
      middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow access for multiple roles when user has one', () => {
      const middleware = requireRole(UserRole.CUSTOMER, UserRole.ADMIN, UserRole.SUPPORT);
      middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should deny access when user role does not match', () => {
      const middleware = requireRole(UserRole.ADMIN);
      middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Forbidden',
        message: 'Insufficient permissions. Required roles: admin'
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should deny access when user is not authenticated', () => {
      mockRequest.user = undefined;
      const middleware = requireRole(UserRole.CUSTOMER);
      middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required'
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should log warning when role check fails', () => {
      const middleware = requireRole(UserRole.ADMIN, UserRole.SUPPORT);
      middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Role check failed: User test@cuts.ae (customer)')
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Required roles: admin, support')
      );
    });

    it('should allow ADMIN role', () => {
      mockRequest.user!.role = UserRole.ADMIN;
      const middleware = requireRole(UserRole.ADMIN);
      middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should allow RESTAURANT_OWNER role', () => {
      mockRequest.user!.role = UserRole.RESTAURANT_OWNER;
      const middleware = requireRole(UserRole.RESTAURANT_OWNER);
      middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should allow DRIVER role', () => {
      mockRequest.user!.role = UserRole.DRIVER;
      const middleware = requireRole(UserRole.DRIVER);
      middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should allow SUPPORT role', () => {
      mockRequest.user!.role = UserRole.SUPPORT;
      const middleware = requireRole(UserRole.SUPPORT);
      middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should handle empty roles array', () => {
      const middleware = requireRole();
      middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should format multiple required roles in message', () => {
      const middleware = requireRole(UserRole.ADMIN, UserRole.RESTAURANT_OWNER, UserRole.SUPPORT);
      middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Forbidden',
        message: 'Insufficient permissions. Required roles: admin, restaurant_owner, support'
      });
    });
  });

  describe('requireAdmin Middleware', () => {
    it('should allow ADMIN access', () => {
      mockRequest.user = {
        userId: 'admin-123',
        email: 'admin@cuts.ae',
        role: UserRole.ADMIN
      };

      requireAdmin(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should deny CUSTOMER access', () => {
      mockRequest.user = {
        userId: 'customer-123',
        email: 'customer@cuts.ae',
        role: UserRole.CUSTOMER
      };

      requireAdmin(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Forbidden',
        message: 'Insufficient permissions. Required roles: admin'
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should deny RESTAURANT_OWNER access', () => {
      mockRequest.user = {
        userId: 'owner-123',
        email: 'owner@cuts.ae',
        role: UserRole.RESTAURANT_OWNER
      };

      requireAdmin(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should deny DRIVER access', () => {
      mockRequest.user = {
        userId: 'driver-123',
        email: 'driver@cuts.ae',
        role: UserRole.DRIVER
      };

      requireAdmin(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should deny SUPPORT access', () => {
      mockRequest.user = {
        userId: 'support-123',
        email: 'support@cuts.ae',
        role: UserRole.SUPPORT
      };

      requireAdmin(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should deny unauthenticated access', () => {
      mockRequest.user = undefined;

      requireAdmin(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required'
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('requireOwnership Middleware Factory', () => {
    beforeEach(() => {
      mockRequest.params = { id: 'resource-123' };
      mockRequest.user = {
        userId: 'resource-123',
        email: 'user@cuts.ae',
        role: UserRole.CUSTOMER
      };
    });

    it('should allow access when resource ID matches user ID', () => {
      const middleware = requireOwnership('id');
      middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should deny access when resource ID does not match user ID', () => {
      mockRequest.params = { id: 'different-resource' };
      const middleware = requireOwnership('id');
      middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Forbidden',
        message: 'You do not have permission to access this resource'
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should bypass ownership check for ADMIN', () => {
      mockRequest.params = { id: 'different-resource' };
      mockRequest.user!.role = UserRole.ADMIN;
      const middleware = requireOwnership('id');
      middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should deny access when user is not authenticated', () => {
      mockRequest.user = undefined;
      const middleware = requireOwnership('id');
      middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required'
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should use custom userIdField parameter', () => {
      mockRequest.params = { orderId: 'order-123' };
      mockRequest.user = {
        userId: 'user-123',
        email: 'user@cuts.ae',
        role: UserRole.CUSTOMER,
        customId: 'order-123'
      } as any;

      const middleware = requireOwnership('orderId', 'customId');
      middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should deny access with custom userIdField when not matching', () => {
      mockRequest.params = { orderId: 'order-456' };
      mockRequest.user = {
        userId: 'user-123',
        email: 'user@cuts.ae',
        role: UserRole.CUSTOMER,
        customId: 'order-123'
      } as any;

      const middleware = requireOwnership('orderId', 'customId');
      middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should log warning for ownership validation failure', () => {
      mockRequest.params = { id: 'different-resource' };
      const middleware = requireOwnership('id');
      middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Ownership validation failed: User user@cuts.ae')
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('attempted to access resource different-resource')
      );
    });

    it('should handle missing route parameter', () => {
      mockRequest.params = {};
      const middleware = requireOwnership('id');
      middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should handle null resource ID', () => {
      mockRequest.params = { id: null as any };
      const middleware = requireOwnership('id');
      middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should handle undefined user field', () => {
      mockRequest.params = { id: 'resource-123' };
      mockRequest.user = {
        userId: undefined as any,
        email: 'user@cuts.ae',
        role: UserRole.CUSTOMER
      };

      const middleware = requireOwnership('id');
      middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should allow ADMIN to bypass ownership check for any resource', () => {
      mockRequest.params = { id: 'any-resource' };
      mockRequest.user = {
        userId: 'admin-123',
        email: 'admin@cuts.ae',
        role: UserRole.ADMIN
      };

      const middleware = requireOwnership('id');
      middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should not allow other roles to bypass ownership check', () => {
      mockRequest.params = { id: 'different-resource' };

      const roles = [UserRole.CUSTOMER, UserRole.RESTAURANT_OWNER, UserRole.DRIVER, UserRole.SUPPORT];

      roles.forEach(role => {
        jest.clearAllMocks();
        mockRequest.user = {
          userId: 'user-123',
          email: 'user@cuts.ae',
          role: role
        };

        const middleware = requireOwnership('id');
        middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(mockResponse.status).toHaveBeenCalledWith(403);
        expect(nextFunction).not.toHaveBeenCalled();
      });
    });
  });

  describe('Integration - Multiple Middleware Scenarios', () => {
    it('should handle public endpoint without authentication', () => {
      mockRequest.method = 'GET';
      mockRequest.path = '/api/v1/restaurants';
      mockRequest.user = undefined;

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should handle authenticated endpoint with valid user', () => {
      mockRequest.method = 'GET';
      mockRequest.path = '/api/v1/auth/me';
      mockRequest.user = {
        userId: 'user-123',
        email: 'user@cuts.ae',
        role: UserRole.CUSTOMER
      };

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should handle role-based restriction correctly', () => {
      mockRequest.method = 'GET';
      mockRequest.path = '/api/v1/admin/analytics';
      mockRequest.user = {
        userId: 'user-123',
        email: 'user@cuts.ae',
        role: UserRole.CUSTOMER
      };

      rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should handle admin access to all endpoints', () => {
      const adminUser = {
        userId: 'admin-123',
        email: 'admin@cuts.ae',
        role: UserRole.ADMIN
      };

      const endpoints = [
        { method: 'GET', path: '/api/v1/admin/analytics' },
        { method: 'POST', path: '/api/v1/orders' },
        { method: 'PATCH', path: '/api/v1/orders/order-123/status' },
        { method: 'POST', path: '/api/v1/restaurants' },
        { method: 'GET', path: '/api/v1/admin/users' }
      ];

      endpoints.forEach(endpoint => {
        jest.clearAllMocks();
        mockRequest.method = endpoint.method;
        mockRequest.path = endpoint.path;
        mockRequest.user = adminUser;

        rbacMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalled();
        expect(mockResponse.status).not.toHaveBeenCalled();
      });
    });
  });
});
