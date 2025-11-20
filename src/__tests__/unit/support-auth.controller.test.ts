import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { supportLogin, getSupportAgentProfile } from '../../controllers/support-auth.controller';
import pool from '../../config/database';
import { UserRole, JWTPayload } from '../../types';

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    query: jest.fn()
  }
}));

jest.mock('bcrypt');
jest.mock('jsonwebtoken');

interface RequestWithUser extends Request {
  user?: JWTPayload;
}

describe('Support Auth Controller', () => {
  let mockRequest: Partial<RequestWithUser>;
  let mockResponse: Partial<Response>;
  const mockPool = pool as any;
  const originalEnv = process.env;

  beforeEach(() => {
    mockRequest = {
      body: {},
      user: undefined
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    jest.clearAllMocks();
    mockPool.query = jest.fn();
    process.env = { ...originalEnv, JWT_SECRET: 'test-secret-key' };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('supportLogin', () => {
    const validLoginData = {
      email: 'support@cuts.ae',
      password: 'SecurePass123!'
    };

    const mockSupportUser = {
      id: 'support-uuid-123',
      email: 'support@cuts.ae',
      first_name: 'Jane',
      last_name: 'Support',
      role: 'support',
      password_hash: '$2b$10$hashedpassword'
    };

    describe('Successful login', () => {
      it('should successfully login a support agent with valid credentials', async () => {
        mockRequest.body = validLoginData;

        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        (jwt.sign as jest.Mock).mockReturnValue('mock-jwt-token');

        mockPool.query
          .mockResolvedValueOnce({ rows: [mockSupportUser] })
          .mockResolvedValueOnce({ rows: [] });

        await supportLogin(mockRequest as RequestWithUser, mockResponse as Response);

        expect(mockPool.query).toHaveBeenCalledTimes(2);
        expect(mockPool.query).toHaveBeenNthCalledWith(
          1,
          `SELECT id, email, first_name, last_name, role, password_hash
       FROM users
       WHERE email = $1 AND role = 'support'`,
          [validLoginData.email]
        );

        expect(bcrypt.compare).toHaveBeenCalledWith(
          validLoginData.password,
          mockSupportUser.password_hash
        );

        expect(mockPool.query).toHaveBeenNthCalledWith(
          2,
          'UPDATE users SET last_login = NOW() WHERE id = $1',
          [mockSupportUser.id]
        );

        expect(jwt.sign).toHaveBeenCalledWith(
          {
            userId: mockSupportUser.id,
            email: mockSupportUser.email,
            role: mockSupportUser.role,
            firstName: mockSupportUser.first_name,
            lastName: mockSupportUser.last_name
          },
          'test-secret-key',
          { expiresIn: '7d' }
        );

        expect(mockResponse.json).toHaveBeenCalledWith({
          success: true,
          message: 'Login successful',
          token: 'mock-jwt-token',
          agent: {
            id: mockSupportUser.id,
            email: mockSupportUser.email,
            first_name: mockSupportUser.first_name,
            last_name: mockSupportUser.last_name,
            role: mockSupportUser.role
          }
        });
      });

      it('should update last_login timestamp on successful login', async () => {
        mockRequest.body = validLoginData;

        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        (jwt.sign as jest.Mock).mockReturnValue('mock-jwt-token');

        mockPool.query
          .mockResolvedValueOnce({ rows: [mockSupportUser] })
          .mockResolvedValueOnce({ rows: [] });

        await supportLogin(mockRequest as RequestWithUser, mockResponse as Response);

        expect(mockPool.query).toHaveBeenCalledWith(
          'UPDATE users SET last_login = NOW() WHERE id = $1',
          [mockSupportUser.id]
        );
      });

      it('should generate JWT token with correct payload and expiration', async () => {
        mockRequest.body = validLoginData;

        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        (jwt.sign as jest.Mock).mockReturnValue('mock-jwt-token');

        mockPool.query
          .mockResolvedValueOnce({ rows: [mockSupportUser] })
          .mockResolvedValueOnce({ rows: [] });

        await supportLogin(mockRequest as RequestWithUser, mockResponse as Response);

        expect(jwt.sign).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: mockSupportUser.id,
            email: mockSupportUser.email,
            role: mockSupportUser.role,
            firstName: mockSupportUser.first_name,
            lastName: mockSupportUser.last_name
          }),
          'test-secret-key',
          { expiresIn: '7d' }
        );
      });
    });

    describe('Validation errors', () => {
      it('should return 400 if email is missing', async () => {
        mockRequest.body = {
          password: 'SecurePass123!'
        };

        await supportLogin(mockRequest as RequestWithUser, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          error: 'Email and password are required'
        });
        expect(mockPool.query).not.toHaveBeenCalled();
      });

      it('should return 400 if password is missing', async () => {
        mockRequest.body = {
          email: 'support@cuts.ae'
        };

        await supportLogin(mockRequest as RequestWithUser, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          error: 'Email and password are required'
        });
        expect(mockPool.query).not.toHaveBeenCalled();
      });

      it('should return 400 if both email and password are missing', async () => {
        mockRequest.body = {};

        await supportLogin(mockRequest as RequestWithUser, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          error: 'Email and password are required'
        });
        expect(mockPool.query).not.toHaveBeenCalled();
      });

      it('should return 400 if email is empty string', async () => {
        mockRequest.body = {
          email: '',
          password: 'SecurePass123!'
        };

        await supportLogin(mockRequest as RequestWithUser, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          error: 'Email and password are required'
        });
        expect(mockPool.query).not.toHaveBeenCalled();
      });

      it('should return 400 if password is empty string', async () => {
        mockRequest.body = {
          email: 'support@cuts.ae',
          password: ''
        };

        await supportLogin(mockRequest as RequestWithUser, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          error: 'Email and password are required'
        });
        expect(mockPool.query).not.toHaveBeenCalled();
      });
    });

    describe('Authentication errors', () => {
      it('should return 401 if user does not exist', async () => {
        mockRequest.body = validLoginData;

        mockPool.query.mockResolvedValueOnce({ rows: [] });

        await supportLogin(mockRequest as RequestWithUser, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          error: 'Invalid credentials or not a support agent'
        });
        expect(bcrypt.compare).not.toHaveBeenCalled();
      });

      it('should return 401 if user exists but is not a support agent', async () => {
        mockRequest.body = validLoginData;

        mockPool.query.mockResolvedValueOnce({ rows: [] });

        await supportLogin(mockRequest as RequestWithUser, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          error: 'Invalid credentials or not a support agent'
        });
      });

      it('should return 401 if password is incorrect', async () => {
        mockRequest.body = validLoginData;

        mockPool.query.mockResolvedValueOnce({ rows: [mockSupportUser] });
        (bcrypt.compare as jest.Mock).mockResolvedValue(false);

        await supportLogin(mockRequest as RequestWithUser, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          error: 'Invalid credentials'
        });
        expect(mockPool.query).toHaveBeenCalledTimes(1);
        expect(jwt.sign).not.toHaveBeenCalled();
      });

      it('should verify password using bcrypt.compare', async () => {
        mockRequest.body = validLoginData;

        mockPool.query.mockResolvedValueOnce({ rows: [mockSupportUser] });
        (bcrypt.compare as jest.Mock).mockResolvedValue(false);

        await supportLogin(mockRequest as RequestWithUser, mockResponse as Response);

        expect(bcrypt.compare).toHaveBeenCalledWith(
          validLoginData.password,
          mockSupportUser.password_hash
        );
      });
    });

    describe('Database query errors', () => {
      it('should return 500 if database query fails during user lookup', async () => {
        mockRequest.body = validLoginData;

        const dbError = new Error('Database connection failed');
        mockPool.query.mockRejectedValueOnce(dbError);

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        await supportLogin(mockRequest as RequestWithUser, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          error: 'Failed to login'
        });
        expect(consoleSpy).toHaveBeenCalledWith('Error in support login:', dbError);

        consoleSpy.mockRestore();
      });

      it('should return 500 if database query fails during last_login update', async () => {
        mockRequest.body = validLoginData;

        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        (jwt.sign as jest.Mock).mockReturnValue('mock-jwt-token');

        const dbError = new Error('Update failed');
        mockPool.query
          .mockResolvedValueOnce({ rows: [mockSupportUser] })
          .mockRejectedValueOnce(dbError);

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        await supportLogin(mockRequest as RequestWithUser, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          error: 'Failed to login'
        });
        expect(consoleSpy).toHaveBeenCalledWith('Error in support login:', dbError);

        consoleSpy.mockRestore();
      });

      it('should log error to console on failure', async () => {
        mockRequest.body = validLoginData;

        const dbError = new Error('Database error');
        mockPool.query.mockRejectedValueOnce(dbError);

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        await supportLogin(mockRequest as RequestWithUser, mockResponse as Response);

        expect(consoleSpy).toHaveBeenCalledWith('Error in support login:', dbError);

        consoleSpy.mockRestore();
      });
    });

    describe('bcrypt errors', () => {
      it('should return 500 if bcrypt.compare throws an error', async () => {
        mockRequest.body = validLoginData;

        mockPool.query.mockResolvedValueOnce({ rows: [mockSupportUser] });
        const bcryptError = new Error('Bcrypt comparison failed');
        (bcrypt.compare as jest.Mock).mockRejectedValue(bcryptError);

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        await supportLogin(mockRequest as RequestWithUser, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          error: 'Failed to login'
        });
        expect(consoleSpy).toHaveBeenCalledWith('Error in support login:', bcryptError);

        consoleSpy.mockRestore();
      });
    });

    describe('JWT errors', () => {
      it('should return 500 if JWT signing throws an error', async () => {
        mockRequest.body = validLoginData;

        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        const jwtError = new Error('JWT signing failed');
        (jwt.sign as jest.Mock).mockImplementation(() => {
          throw jwtError;
        });

        mockPool.query
          .mockResolvedValueOnce({ rows: [mockSupportUser] })
          .mockResolvedValueOnce({ rows: [] });

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        await supportLogin(mockRequest as RequestWithUser, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          error: 'Failed to login'
        });
        expect(consoleSpy).toHaveBeenCalledWith('Error in support login:', jwtError);

        consoleSpy.mockRestore();
      });
    });

    describe('Edge cases', () => {
      it('should handle null email gracefully', async () => {
        mockRequest.body = {
          email: null,
          password: 'SecurePass123!'
        };

        await supportLogin(mockRequest as RequestWithUser, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          error: 'Email and password are required'
        });
      });

      it('should handle null password gracefully', async () => {
        mockRequest.body = {
          email: 'support@cuts.ae',
          password: null
        };

        await supportLogin(mockRequest as RequestWithUser, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          error: 'Email and password are required'
        });
      });

      it('should handle undefined user fields gracefully', async () => {
        mockRequest.body = validLoginData;

        const userWithMissingFields = {
          id: 'support-uuid-123',
          email: 'support@cuts.ae',
          first_name: undefined,
          last_name: undefined,
          role: 'support',
          password_hash: '$2b$10$hashedpassword'
        };

        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        (jwt.sign as jest.Mock).mockReturnValue('mock-jwt-token');

        mockPool.query
          .mockResolvedValueOnce({ rows: [userWithMissingFields] })
          .mockResolvedValueOnce({ rows: [] });

        await supportLogin(mockRequest as RequestWithUser, mockResponse as Response);

        expect(mockResponse.json).toHaveBeenCalledWith({
          success: true,
          message: 'Login successful',
          token: 'mock-jwt-token',
          agent: {
            id: userWithMissingFields.id,
            email: userWithMissingFields.email,
            first_name: undefined,
            last_name: undefined,
            role: userWithMissingFields.role
          }
        });
      });

      it('should query with exact role check for support', async () => {
        mockRequest.body = validLoginData;

        mockPool.query.mockResolvedValueOnce({ rows: [] });

        await supportLogin(mockRequest as RequestWithUser, mockResponse as Response);

        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining("role = 'support'"),
          [validLoginData.email]
        );
      });
    });

    describe('Session management', () => {
      it('should include all required user fields in JWT payload', async () => {
        mockRequest.body = validLoginData;

        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        (jwt.sign as jest.Mock).mockReturnValue('mock-jwt-token');

        mockPool.query
          .mockResolvedValueOnce({ rows: [mockSupportUser] })
          .mockResolvedValueOnce({ rows: [] });

        await supportLogin(mockRequest as RequestWithUser, mockResponse as Response);

        const jwtPayload = (jwt.sign as jest.Mock).mock.calls[0][0];

        expect(jwtPayload).toHaveProperty('userId', mockSupportUser.id);
        expect(jwtPayload).toHaveProperty('email', mockSupportUser.email);
        expect(jwtPayload).toHaveProperty('role', mockSupportUser.role);
        expect(jwtPayload).toHaveProperty('firstName', mockSupportUser.first_name);
        expect(jwtPayload).toHaveProperty('lastName', mockSupportUser.last_name);
      });

      it('should set JWT expiration to 7 days', async () => {
        mockRequest.body = validLoginData;

        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        (jwt.sign as jest.Mock).mockReturnValue('mock-jwt-token');

        mockPool.query
          .mockResolvedValueOnce({ rows: [mockSupportUser] })
          .mockResolvedValueOnce({ rows: [] });

        await supportLogin(mockRequest as RequestWithUser, mockResponse as Response);

        expect(jwt.sign).toHaveBeenCalledWith(
          expect.any(Object),
          expect.any(String),
          { expiresIn: '7d' }
        );
      });

      it('should use JWT_SECRET from environment', async () => {
        mockRequest.body = validLoginData;

        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        (jwt.sign as jest.Mock).mockReturnValue('mock-jwt-token');

        mockPool.query
          .mockResolvedValueOnce({ rows: [mockSupportUser] })
          .mockResolvedValueOnce({ rows: [] });

        await supportLogin(mockRequest as RequestWithUser, mockResponse as Response);

        expect(jwt.sign).toHaveBeenCalledWith(
          expect.any(Object),
          'test-secret-key',
          expect.any(Object)
        );
      });
    });

    describe('Response format', () => {
      it('should return success flag in response', async () => {
        mockRequest.body = validLoginData;

        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        (jwt.sign as jest.Mock).mockReturnValue('mock-jwt-token');

        mockPool.query
          .mockResolvedValueOnce({ rows: [mockSupportUser] })
          .mockResolvedValueOnce({ rows: [] });

        await supportLogin(mockRequest as RequestWithUser, mockResponse as Response);

        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({ success: true })
        );
      });

      it('should return message in response', async () => {
        mockRequest.body = validLoginData;

        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        (jwt.sign as jest.Mock).mockReturnValue('mock-jwt-token');

        mockPool.query
          .mockResolvedValueOnce({ rows: [mockSupportUser] })
          .mockResolvedValueOnce({ rows: [] });

        await supportLogin(mockRequest as RequestWithUser, mockResponse as Response);

        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({ message: 'Login successful' })
        );
      });

      it('should return token in response', async () => {
        mockRequest.body = validLoginData;

        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        (jwt.sign as jest.Mock).mockReturnValue('mock-jwt-token');

        mockPool.query
          .mockResolvedValueOnce({ rows: [mockSupportUser] })
          .mockResolvedValueOnce({ rows: [] });

        await supportLogin(mockRequest as RequestWithUser, mockResponse as Response);

        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({ token: 'mock-jwt-token' })
        );
      });

      it('should return agent object with all required fields', async () => {
        mockRequest.body = validLoginData;

        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        (jwt.sign as jest.Mock).mockReturnValue('mock-jwt-token');

        mockPool.query
          .mockResolvedValueOnce({ rows: [mockSupportUser] })
          .mockResolvedValueOnce({ rows: [] });

        await supportLogin(mockRequest as RequestWithUser, mockResponse as Response);

        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            agent: {
              id: mockSupportUser.id,
              email: mockSupportUser.email,
              first_name: mockSupportUser.first_name,
              last_name: mockSupportUser.last_name,
              role: mockSupportUser.role
            }
          })
        );
      });

      it('should not include password_hash in response', async () => {
        mockRequest.body = validLoginData;

        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        (jwt.sign as jest.Mock).mockReturnValue('mock-jwt-token');

        mockPool.query
          .mockResolvedValueOnce({ rows: [mockSupportUser] })
          .mockResolvedValueOnce({ rows: [] });

        await supportLogin(mockRequest as RequestWithUser, mockResponse as Response);

        const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
        expect(responseData.agent).not.toHaveProperty('password_hash');
      });
    });
  });

  describe('getSupportAgentProfile', () => {
    const mockSupportUser = {
      id: 'support-uuid-123',
      email: 'support@cuts.ae',
      first_name: 'Jane',
      last_name: 'Support',
      role: 'support',
      created_at: new Date('2023-01-01')
    };

    describe('Successful profile retrieval', () => {
      it('should successfully retrieve support agent profile', async () => {
        (mockRequest as any).user = {
          userId: mockSupportUser.id,
          email: mockSupportUser.email,
          role: UserRole.SUPPORT
        };

        mockPool.query.mockResolvedValueOnce({ rows: [mockSupportUser] });

        await getSupportAgentProfile(mockRequest as RequestWithUser, mockResponse as Response);

        expect(mockPool.query).toHaveBeenCalledWith(
          `SELECT id, email, first_name, last_name, role, created_at
       FROM users
       WHERE id = $1 AND role = 'support'`,
          [mockSupportUser.id]
        );

        expect(mockResponse.json).toHaveBeenCalledWith({
          success: true,
          agent: mockSupportUser
        });
      });

      it('should query database with userId from request', async () => {
        const userId = 'test-user-id-456';
        (mockRequest as any).user = {
          userId: userId,
          email: 'test@cuts.ae',
          role: UserRole.SUPPORT
        };

        mockPool.query.mockResolvedValueOnce({ rows: [mockSupportUser] });

        await getSupportAgentProfile(mockRequest as RequestWithUser, mockResponse as Response);

        expect(mockPool.query).toHaveBeenCalledWith(
          expect.any(String),
          [userId]
        );
      });

      it('should return all user fields except password', async () => {
        (mockRequest as any).user = {
          userId: mockSupportUser.id,
          email: mockSupportUser.email,
          role: UserRole.SUPPORT
        };

        mockPool.query.mockResolvedValueOnce({ rows: [mockSupportUser] });

        await getSupportAgentProfile(mockRequest as RequestWithUser, mockResponse as Response);

        expect(mockResponse.json).toHaveBeenCalledWith({
          success: true,
          agent: {
            id: mockSupportUser.id,
            email: mockSupportUser.email,
            first_name: mockSupportUser.first_name,
            last_name: mockSupportUser.last_name,
            role: mockSupportUser.role,
            created_at: mockSupportUser.created_at
          }
        });
      });
    });

    describe('Error handling', () => {
      it('should return 404 if support agent not found', async () => {
        (mockRequest as any).user = {
          userId: 'non-existent-id',
          email: 'test@cuts.ae',
          role: UserRole.SUPPORT
        };

        mockPool.query.mockResolvedValueOnce({ rows: [] });

        await getSupportAgentProfile(mockRequest as RequestWithUser, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(404);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          error: 'Support agent not found'
        });
      });

      it('should return 404 if user exists but is not a support agent', async () => {
        (mockRequest as any).user = {
          userId: 'customer-id',
          email: 'customer@cuts.ae',
          role: UserRole.CUSTOMER
        };

        mockPool.query.mockResolvedValueOnce({ rows: [] });

        await getSupportAgentProfile(mockRequest as RequestWithUser, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(404);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          error: 'Support agent not found'
        });
      });

      it('should return 500 if database query fails', async () => {
        (mockRequest as any).user = {
          userId: mockSupportUser.id,
          email: mockSupportUser.email,
          role: UserRole.SUPPORT
        };

        const dbError = new Error('Database connection failed');
        mockPool.query.mockRejectedValueOnce(dbError);

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        await getSupportAgentProfile(mockRequest as RequestWithUser, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          error: 'Failed to get profile'
        });
        expect(consoleSpy).toHaveBeenCalledWith('Error getting support agent profile:', dbError);

        consoleSpy.mockRestore();
      });

      it('should log error to console on database failure', async () => {
        (mockRequest as any).user = {
          userId: mockSupportUser.id,
          email: mockSupportUser.email,
          role: UserRole.SUPPORT
        };

        const dbError = new Error('Database error');
        mockPool.query.mockRejectedValueOnce(dbError);

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        await getSupportAgentProfile(mockRequest as RequestWithUser, mockResponse as Response);

        expect(consoleSpy).toHaveBeenCalledWith('Error getting support agent profile:', dbError);

        consoleSpy.mockRestore();
      });
    });

    describe('User context handling', () => {
      it('should handle missing user object gracefully', async () => {
        mockRequest.user = undefined;

        mockPool.query.mockResolvedValueOnce({ rows: [] });

        await getSupportAgentProfile(mockRequest as RequestWithUser, mockResponse as Response);

        expect(mockPool.query).toHaveBeenCalledWith(
          expect.any(String),
          [undefined]
        );

        expect(mockResponse.status).toHaveBeenCalledWith(404);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          error: 'Support agent not found'
        });
      });

      it('should handle missing userId in user object', async () => {
        (mockRequest as any).user = {
          email: 'test@cuts.ae',
          role: UserRole.SUPPORT
        };

        mockPool.query.mockResolvedValueOnce({ rows: [] });

        await getSupportAgentProfile(mockRequest as RequestWithUser, mockResponse as Response);

        expect(mockPool.query).toHaveBeenCalledWith(
          expect.any(String),
          [undefined]
        );
      });

      it('should handle null userId', async () => {
        (mockRequest as any).user = {
          userId: null,
          email: 'test@cuts.ae',
          role: UserRole.SUPPORT
        };

        mockPool.query.mockResolvedValueOnce({ rows: [] });

        await getSupportAgentProfile(mockRequest as RequestWithUser, mockResponse as Response);

        expect(mockPool.query).toHaveBeenCalledWith(
          expect.any(String),
          [null]
        );
      });
    });

    describe('Query validation', () => {
      it('should only select specific fields from database', async () => {
        (mockRequest as any).user = {
          userId: mockSupportUser.id,
          email: mockSupportUser.email,
          role: UserRole.SUPPORT
        };

        mockPool.query.mockResolvedValueOnce({ rows: [mockSupportUser] });

        await getSupportAgentProfile(mockRequest as RequestWithUser, mockResponse as Response);

        const query = mockPool.query.mock.calls[0][0];
        expect(query).toContain('SELECT id, email, first_name, last_name, role, created_at');
        expect(query).not.toContain('password');
        expect(query).not.toContain('password_hash');
      });

      it('should filter by both id and role in query', async () => {
        (mockRequest as any).user = {
          userId: mockSupportUser.id,
          email: mockSupportUser.email,
          role: UserRole.SUPPORT
        };

        mockPool.query.mockResolvedValueOnce({ rows: [mockSupportUser] });

        await getSupportAgentProfile(mockRequest as RequestWithUser, mockResponse as Response);

        const query = mockPool.query.mock.calls[0][0];
        expect(query).toContain("WHERE id = $1 AND role = 'support'");
      });
    });

    describe('Response format', () => {
      it('should return success flag in response', async () => {
        (mockRequest as any).user = {
          userId: mockSupportUser.id,
          email: mockSupportUser.email,
          role: UserRole.SUPPORT
        };

        mockPool.query.mockResolvedValueOnce({ rows: [mockSupportUser] });

        await getSupportAgentProfile(mockRequest as RequestWithUser, mockResponse as Response);

        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({ success: true })
        );
      });

      it('should return agent object in response', async () => {
        (mockRequest as any).user = {
          userId: mockSupportUser.id,
          email: mockSupportUser.email,
          role: UserRole.SUPPORT
        };

        mockPool.query.mockResolvedValueOnce({ rows: [mockSupportUser] });

        await getSupportAgentProfile(mockRequest as RequestWithUser, mockResponse as Response);

        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            agent: expect.objectContaining({
              id: mockSupportUser.id,
              email: mockSupportUser.email,
              first_name: mockSupportUser.first_name,
              last_name: mockSupportUser.last_name,
              role: mockSupportUser.role
            })
          })
        );
      });

      it('should not modify the user object from database', async () => {
        (mockRequest as any).user = {
          userId: mockSupportUser.id,
          email: mockSupportUser.email,
          role: UserRole.SUPPORT
        };

        const dbUser = { ...mockSupportUser };
        mockPool.query.mockResolvedValueOnce({ rows: [dbUser] });

        await getSupportAgentProfile(mockRequest as RequestWithUser, mockResponse as Response);

        expect(mockResponse.json).toHaveBeenCalledWith({
          success: true,
          agent: dbUser
        });
      });
    });

    describe('Edge cases', () => {
      it('should handle database returning multiple rows by using first row', async () => {
        (mockRequest as any).user = {
          userId: mockSupportUser.id,
          email: mockSupportUser.email,
          role: UserRole.SUPPORT
        };

        const duplicateUser = { ...mockSupportUser, id: 'duplicate-id' };
        mockPool.query.mockResolvedValueOnce({ rows: [mockSupportUser, duplicateUser] });

        await getSupportAgentProfile(mockRequest as RequestWithUser, mockResponse as Response);

        expect(mockResponse.json).toHaveBeenCalledWith({
          success: true,
          agent: mockSupportUser
        });
      });

      it('should handle user with missing optional fields', async () => {
        (mockRequest as any).user = {
          userId: 'minimal-user-id',
          email: 'minimal@cuts.ae',
          role: UserRole.SUPPORT
        };

        const minimalUser = {
          id: 'minimal-user-id',
          email: 'minimal@cuts.ae',
          first_name: null,
          last_name: null,
          role: 'support',
          created_at: null
        };

        mockPool.query.mockResolvedValueOnce({ rows: [minimalUser] });

        await getSupportAgentProfile(mockRequest as RequestWithUser, mockResponse as Response);

        expect(mockResponse.json).toHaveBeenCalledWith({
          success: true,
          agent: minimalUser
        });
      });

      it('should handle unexpected database response structure', async () => {
        (mockRequest as any).user = {
          userId: mockSupportUser.id,
          email: mockSupportUser.email,
          role: UserRole.SUPPORT
        };

        mockPool.query.mockResolvedValueOnce({ rows: undefined });

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        await getSupportAgentProfile(mockRequest as RequestWithUser, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          error: 'Failed to get profile'
        });

        consoleSpy.mockRestore();
      });
    });

    describe('Database interaction', () => {
      it('should call database query exactly once', async () => {
        (mockRequest as any).user = {
          userId: mockSupportUser.id,
          email: mockSupportUser.email,
          role: UserRole.SUPPORT
        };

        mockPool.query.mockResolvedValueOnce({ rows: [mockSupportUser] });

        await getSupportAgentProfile(mockRequest as RequestWithUser, mockResponse as Response);

        expect(mockPool.query).toHaveBeenCalledTimes(1);
      });

      it('should use parameterized query to prevent SQL injection', async () => {
        const maliciousUserId = "'; DROP TABLE users; --";
        (mockRequest as any).user = {
          userId: maliciousUserId,
          email: 'test@cuts.ae',
          role: UserRole.SUPPORT
        };

        mockPool.query.mockResolvedValueOnce({ rows: [] });

        await getSupportAgentProfile(mockRequest as RequestWithUser, mockResponse as Response);

        expect(mockPool.query).toHaveBeenCalledWith(
          expect.any(String),
          [maliciousUserId]
        );

        const query = mockPool.query.mock.calls[0][0];
        expect(query).toContain('$1');
        expect(query).not.toContain(maliciousUserId);
      });
    });
  });
});
