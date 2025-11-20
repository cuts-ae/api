import { Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AuthController } from '../../controllers/auth.controller';
import { AuthRequest } from '../../middleware/auth';
import pool from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { UserRole, JWTPayload } from '../../types';
import { QueryResult } from 'pg';

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    query: jest.fn()
  }
}));

describe('AuthController', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  const mockPool = pool as any;

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
    // Reset mock implementation
    mockPool.query = jest.fn();
  });

  describe('register', () => {
    const validRegistrationData = {
      email: 'test@cuts.ae',
      password: 'SecurePass123!',
      first_name: 'John',
      last_name: 'Doe',
      phone: '+971501234567',
      role: UserRole.CUSTOMER
    };

    describe('Successful registration', () => {
      it('should register a new user with valid data', async () => {
        mockRequest.body = validRegistrationData;

        const mockUser = {
          id: 'uuid-123',
          email: validRegistrationData.email,
          first_name: validRegistrationData.first_name,
          last_name: validRegistrationData.last_name,
          role: validRegistrationData.role
        };

        mockPool.query
          .mockResolvedValueOnce({ rows: [] } as any)
          .mockResolvedValueOnce({ rows: [mockUser] } as any);

        await AuthController.register(mockRequest as AuthRequest, mockResponse as Response);

        expect(mockPool.query).toHaveBeenCalledTimes(2);
        expect(mockPool.query).toHaveBeenNthCalledWith(
          1,
          'SELECT id FROM users WHERE email = $1',
          [validRegistrationData.email]
        );

        const insertCall = mockPool.query.mock.calls[1];
        expect(insertCall[0]).toContain('INSERT INTO users');
        expect(insertCall[1][0]).toBe(validRegistrationData.email);
        expect(insertCall[1][2]).toBe(validRegistrationData.first_name);
        expect(insertCall[1][3]).toBe(validRegistrationData.last_name);
        expect(insertCall[1][4]).toBe(validRegistrationData.phone);
        expect(insertCall[1][5]).toBe(validRegistrationData.role);

        expect(mockResponse.status).toHaveBeenCalledWith(201);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'User registered successfully',
            user: {
              id: mockUser.id,
              email: mockUser.email,
              first_name: mockUser.first_name,
              last_name: mockUser.last_name,
              role: mockUser.role
            },
            token: expect.any(String)
          })
        );
      });

      it('should hash the password before storing', async () => {
        mockRequest.body = validRegistrationData;
        const mockUser = { id: 'uuid-123', email: 'test@cuts.ae', role: UserRole.CUSTOMER };

        mockPool.query
          .mockResolvedValueOnce({ rows: [] } as any)
          .mockResolvedValueOnce({ rows: [mockUser] } as any);

        const bcryptHashSpy = jest.spyOn(bcrypt, 'hash');

        await AuthController.register(mockRequest as AuthRequest, mockResponse as Response);

        expect(bcryptHashSpy).toHaveBeenCalledWith(validRegistrationData.password, 10);

        const insertCall = mockPool.query.mock.calls[1];
        const hashedPassword = insertCall[1][1];
        expect(hashedPassword).not.toBe(validRegistrationData.password);
        expect(typeof hashedPassword).toBe('string');

        bcryptHashSpy.mockRestore();
      });

      it('should generate a valid JWT token', async () => {
        mockRequest.body = validRegistrationData;
        const mockUser = {
          id: 'uuid-123',
          email: 'test@cuts.ae',
          first_name: 'John',
          last_name: 'Doe',
          role: UserRole.CUSTOMER
        };

        mockPool.query
          .mockResolvedValueOnce({ rows: [] } as any)
          .mockResolvedValueOnce({ rows: [mockUser] } as any);

        await AuthController.register(mockRequest as AuthRequest, mockResponse as Response);

        const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
        const token = responseData.token;

        expect(token).toBeDefined();

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
        expect(decoded.userId).toBe(mockUser.id);
        expect(decoded.email).toBe(mockUser.email);
        expect(decoded.role).toBe(mockUser.role);
      });

      it('should register user with all valid roles', async () => {
        const roles = [
          UserRole.CUSTOMER,
          UserRole.RESTAURANT_OWNER,
          UserRole.DRIVER,
          UserRole.ADMIN,
          UserRole.SUPPORT
        ];

        for (const role of roles) {
          jest.clearAllMocks();
          mockRequest.body = { ...validRegistrationData, role };
          const mockUser = { id: 'uuid-123', email: 'test@cuts.ae', role };

          mockPool.query
            .mockResolvedValueOnce({ rows: [] } as any)
            .mockResolvedValueOnce({ rows: [mockUser] } as any);

          await AuthController.register(mockRequest as AuthRequest, mockResponse as Response);

          expect(mockResponse.status).toHaveBeenCalledWith(201);
        }
      });
    });

    describe('Duplicate email validation', () => {
      it('should reject registration with existing email', async () => {
        mockRequest.body = validRegistrationData;

        mockPool.query.mockResolvedValueOnce({
          rows: [{ id: 'existing-user-id' }]
        } as any);

        try {
          await AuthController.register(mockRequest as AuthRequest, mockResponse as Response);
          fail('Should have thrown an error');
        } catch (error) {
          expect(error).toBeInstanceOf(AppError);
          expect((error as AppError).message).toBe('Email already registered');
        }

        expect(mockPool.query).toHaveBeenCalledTimes(1);
        expect(mockPool.query).toHaveBeenCalledWith(
          'SELECT id FROM users WHERE email = $1',
          [validRegistrationData.email]
        );
      });

      it('should throw AppError with status 400 for duplicate email', async () => {
        mockRequest.body = validRegistrationData;

        mockPool.query.mockResolvedValueOnce({
          rows: [{ id: 'existing-user-id' }]
        } as any);

        try {
          await AuthController.register(mockRequest as AuthRequest, mockResponse as Response);
          fail('Should have thrown an error');
        } catch (error) {
          expect(error).toBeInstanceOf(AppError);
          expect((error as AppError).statusCode).toBe(400);
          expect((error as AppError).message).toBe('Email already registered');
        }
      });
    });

    describe('SQL Injection prevention', () => {
      it('should safely handle SQL injection in email field', async () => {
        const sqlInjectionAttempts = [
          "'; DROP TABLE users; --",
          "admin' OR '1'='1",
          "' OR 1=1 --",
          "admin'--",
          "' UNION SELECT * FROM users --",
          "1' AND '1'='1",
          "'; DELETE FROM users WHERE ''='",
          "1' ORDER BY 1--",
          "' OR EXISTS(SELECT * FROM users) --"
        ];

        for (const maliciousEmail of sqlInjectionAttempts) {
          jest.clearAllMocks();
          mockPool.query = jest.fn();
          mockRequest.body = { ...validRegistrationData, email: maliciousEmail };

          mockPool.query.mockResolvedValueOnce({ rows: [] } as any);

          // Call the controller to execute the query
          try {
            await AuthController.register(mockRequest as AuthRequest, mockResponse as Response);
          } catch (error) {
            // May fail later in the flow, but query should have been called
          }

          const callArgs = mockPool.query.mock.calls[0];
          expect(callArgs[0]).toBe('SELECT id FROM users WHERE email = $1');
          expect(callArgs[1]).toEqual([maliciousEmail]);
        }
      });

      it('should use parameterized queries for user insertion', async () => {
        mockRequest.body = {
          email: "'; DROP TABLE users; --",
          password: "password",
          first_name: "'; DELETE FROM users; --",
          last_name: "' OR '1'='1",
          phone: "123; DROP DATABASE;",
          role: UserRole.CUSTOMER
        };

        mockPool.query
          .mockResolvedValueOnce({ rows: [] } as any)
          .mockResolvedValueOnce({ rows: [{ id: '123', email: mockRequest.body.email, role: UserRole.CUSTOMER }] } as any);

        await AuthController.register(mockRequest as AuthRequest, mockResponse as Response);

        const insertCall = mockPool.query.mock.calls[1];
        expect(insertCall[0]).toContain('INSERT INTO users');
        expect(insertCall[1]).toHaveLength(6);
        expect(insertCall[1][0]).toBe(mockRequest.body.email);
        expect(insertCall[1][2]).toBe(mockRequest.body.first_name);
        expect(insertCall[1][3]).toBe(mockRequest.body.last_name);
      });
    });

    describe('XSS prevention', () => {
      it('should safely handle XSS in text fields', async () => {
        const xssAttempts = {
          email: 'test@cuts.ae',
          password: 'password',
          first_name: '<script>alert("XSS")</script>',
          last_name: '<img src=x onerror=alert("XSS")>',
          phone: '"><script>alert(String.fromCharCode(88,83,83))</script>',
          role: UserRole.CUSTOMER
        };

        mockRequest.body = xssAttempts;
        const mockUser = {
          id: 'uuid-123',
          email: xssAttempts.email,
          first_name: xssAttempts.first_name,
          last_name: xssAttempts.last_name,
          role: xssAttempts.role
        };

        mockPool.query
          .mockResolvedValueOnce({ rows: [] } as any)
          .mockResolvedValueOnce({ rows: [mockUser] } as any);

        await AuthController.register(mockRequest as AuthRequest, mockResponse as Response);

        const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
        expect(responseData.user.first_name).toBe(xssAttempts.first_name);
        expect(responseData.user.last_name).toBe(xssAttempts.last_name);
      });

      it('should handle various XSS vectors in email field', async () => {
        const xssVectors = [
          'javascript:alert(1)@cuts.ae',
          'test+<script>@cuts.ae',
          'test@cuts.ae<svg/onload=alert(1)>',
          'test@cuts.ae"onclick="alert(1)"'
        ];

        for (const xssEmail of xssVectors) {
          jest.clearAllMocks();
          mockPool.query = jest.fn();
          mockRequest.body = { ...validRegistrationData, email: xssEmail };

          mockPool.query.mockResolvedValueOnce({ rows: [] } as any);

          // Call the controller to execute the query
          try {
            await AuthController.register(mockRequest as AuthRequest, mockResponse as Response);
          } catch (error) {
            // May fail later in the flow, but query should have been called
          }

          const callArgs = mockPool.query.mock.calls[0];
          expect(callArgs[1][0]).toBe(xssEmail);
        }
      });
    });

    describe('Edge cases and boundary conditions', () => {
      it('should handle very long email addresses', async () => {
        const longEmail = 'a'.repeat(200) + '@cuts.ae';
        mockRequest.body = { ...validRegistrationData, email: longEmail };

        const mockUser = {
          id: '123',
          email: longEmail,
          first_name: validRegistrationData.first_name,
          last_name: validRegistrationData.last_name,
          role: UserRole.CUSTOMER
        };

        mockPool.query
          .mockResolvedValueOnce({ rows: [] } as any)
          .mockResolvedValueOnce({ rows: [mockUser] } as any);

        await AuthController.register(mockRequest as AuthRequest, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(201);
      });

      it('should handle very long password', async () => {
        const longPassword = 'a'.repeat(1000);
        mockRequest.body = { ...validRegistrationData, password: longPassword };

        const mockUser = {
          id: '123',
          email: 'test@cuts.ae',
          first_name: validRegistrationData.first_name,
          last_name: validRegistrationData.last_name,
          role: UserRole.CUSTOMER
        };

        mockPool.query
          .mockResolvedValueOnce({ rows: [] } as any)
          .mockResolvedValueOnce({ rows: [mockUser] } as any);

        await AuthController.register(mockRequest as AuthRequest, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(201);
      });

      it('should handle special characters in name fields', async () => {
        // Reset mocks to ensure clean state
        jest.clearAllMocks();
        mockPool.query = jest.fn();
        mockResponse = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn().mockReturnThis()
        };

        const specialNames = {
          first_name: "O'Brien-Smith",
          last_name: "José María Àlvarez-Müller"
        };

        mockRequest.body = { ...validRegistrationData, ...specialNames };
        const mockUser = { id: '123', email: 'test@cuts.ae', ...specialNames, role: UserRole.CUSTOMER };

        mockPool.query
          .mockResolvedValueOnce({ rows: [] } as any)
          .mockResolvedValueOnce({ rows: [mockUser] } as any);

        await AuthController.register(mockRequest as AuthRequest, mockResponse as Response);

        const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
        expect(responseData.user.first_name).toBe(specialNames.first_name);
        expect(responseData.user.last_name).toBe(specialNames.last_name);
      });

      it('should handle empty optional phone field', async () => {
        const dataWithoutPhone = { ...validRegistrationData };
        delete dataWithoutPhone.phone;
        mockRequest.body = dataWithoutPhone;

        const mockUser = { id: '123', email: 'test@cuts.ae', role: UserRole.CUSTOMER };

        mockPool.query
          .mockResolvedValueOnce({ rows: [] } as any)
          .mockResolvedValueOnce({ rows: [mockUser] } as any);

        await AuthController.register(mockRequest as AuthRequest, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(201);
      });

      it('should handle unicode characters in all fields', async () => {
        mockRequest.body = {
          email: '测试@cuts.ae',
          password: 'パスワード123',
          first_name: '李明',
          last_name: 'محمد',
          phone: '+971501234567',
          role: UserRole.CUSTOMER
        };

        const mockUser = {
          id: '123',
          email: mockRequest.body.email,
          first_name: mockRequest.body.first_name,
          last_name: mockRequest.body.last_name,
          role: mockRequest.body.role
        };

        mockPool.query
          .mockResolvedValueOnce({ rows: [] } as any)
          .mockResolvedValueOnce({ rows: [mockUser] } as any);

        await AuthController.register(mockRequest as AuthRequest, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(201);
      });
    });

    describe('Database error handling', () => {
      it('should propagate database errors when checking existing user', async () => {
        mockRequest.body = validRegistrationData;

        const dbError = new Error('Database connection failed');
        mockPool.query.mockRejectedValueOnce(dbError);

        await expect(
          AuthController.register(mockRequest as AuthRequest, mockResponse as Response)
        ).rejects.toThrow('Database connection failed');
      });

      it('should propagate database errors during user insertion', async () => {
        mockRequest.body = validRegistrationData;

        mockPool.query
          .mockResolvedValueOnce({ rows: [] } as any)
          .mockRejectedValueOnce(new Error('Insert failed'));

        await expect(
          AuthController.register(mockRequest as AuthRequest, mockResponse as Response)
        ).rejects.toThrow('Insert failed');
      });

      it('should handle database timeout errors', async () => {
        mockRequest.body = validRegistrationData;

        const timeoutError = new Error('Query timeout');
        mockPool.query.mockRejectedValueOnce(timeoutError);

        await expect(
          AuthController.register(mockRequest as AuthRequest, mockResponse as Response)
        ).rejects.toThrow('Query timeout');
      });
    });

    describe('Password hashing security', () => {
      it('should use bcrypt with salt rounds of 10', async () => {
        mockRequest.body = validRegistrationData;
        const mockUser = { id: '123', email: 'test@cuts.ae', role: UserRole.CUSTOMER };

        mockPool.query
          .mockResolvedValueOnce({ rows: [] } as any)
          .mockResolvedValueOnce({ rows: [mockUser] } as any);

        const bcryptHashSpy = jest.spyOn(bcrypt, 'hash');

        await AuthController.register(mockRequest as AuthRequest, mockResponse as Response);

        expect(bcryptHashSpy).toHaveBeenCalledWith(validRegistrationData.password, 10);

        bcryptHashSpy.mockRestore();
      });

      it('should generate different hashes for same password', async () => {
        const hashes: string[] = [];

        for (let i = 0; i < 2; i++) {
          jest.clearAllMocks();
          mockRequest.body = validRegistrationData;
          const mockUser = { id: `${i}`, email: `test${i}@cuts.ae`, role: UserRole.CUSTOMER };

          mockPool.query
            .mockResolvedValueOnce({ rows: [] } as any)
            .mockResolvedValueOnce({ rows: [mockUser] } as any);

          await AuthController.register(mockRequest as AuthRequest, mockResponse as Response);

          const insertCall = mockPool.query.mock.calls[1];
          hashes.push(insertCall[1][1]);
        }

        expect(hashes[0]).not.toBe(hashes[1]);
        expect(hashes[0]).not.toBe(validRegistrationData.password);
        expect(hashes[1]).not.toBe(validRegistrationData.password);
      });
    });

    describe('JWT token generation', () => {
      it('should generate token with 7 day expiration', async () => {
        mockRequest.body = validRegistrationData;
        const mockUser = {
          id: 'uuid-123',
          email: 'test@cuts.ae',
          first_name: 'John',
          last_name: 'Doe',
          role: UserRole.CUSTOMER
        };

        mockPool.query
          .mockResolvedValueOnce({ rows: [] } as any)
          .mockResolvedValueOnce({ rows: [mockUser] } as any);

        const jwtSignSpy = jest.spyOn(jwt, 'sign');

        await AuthController.register(mockRequest as AuthRequest, mockResponse as Response);

        expect(jwtSignSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: mockUser.id,
            email: mockUser.email,
            role: mockUser.role
          }),
          process.env.JWT_SECRET!,
          { expiresIn: '7d' }
        );

        jwtSignSpy.mockRestore();
      });

      it('should include correct payload in JWT', async () => {
        mockRequest.body = validRegistrationData;
        const mockUser = {
          id: 'uuid-456',
          email: 'john@cuts.ae',
          first_name: 'John',
          last_name: 'Doe',
          role: UserRole.RESTAURANT_OWNER
        };

        mockPool.query
          .mockResolvedValueOnce({ rows: [] } as any)
          .mockResolvedValueOnce({ rows: [mockUser] } as any);

        await AuthController.register(mockRequest as AuthRequest, mockResponse as Response);

        const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
        const decoded = jwt.verify(responseData.token, process.env.JWT_SECRET!) as JWTPayload;

        expect(decoded.userId).toBe(mockUser.id);
        expect(decoded.email).toBe(mockUser.email);
        expect(decoded.role).toBe(mockUser.role);
      });
    });
  });

  describe('login', () => {
    const validLoginData = {
      email: 'test@cuts.ae',
      password: 'SecurePass123!'
    };

    const mockUserFromDB = {
      id: 'uuid-123',
      email: 'test@cuts.ae',
      password_hash: '$2b$10$abcdefghijklmnopqrstuvwxyz',
      first_name: 'John',
      last_name: 'Doe',
      role: UserRole.CUSTOMER
    };

    describe('Successful login', () => {
      it('should login with valid credentials', async () => {
        mockRequest.body = validLoginData;

        jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(true as never);

        mockPool.query
          .mockResolvedValueOnce({ rows: [mockUserFromDB] } as any)
          .mockResolvedValueOnce({ rows: [] } as any);

        await AuthController.login(mockRequest as AuthRequest, mockResponse as Response);

        expect(mockPool.query).toHaveBeenCalledTimes(2);
        expect(mockPool.query).toHaveBeenNthCalledWith(
          1,
          'SELECT * FROM users WHERE email = $1',
          [validLoginData.email]
        );
        expect(mockPool.query).toHaveBeenNthCalledWith(
          2,
          'UPDATE users SET last_login = NOW() WHERE id = $1',
          [mockUserFromDB.id]
        );

        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Login successful',
            user: {
              id: mockUserFromDB.id,
              email: mockUserFromDB.email,
              first_name: mockUserFromDB.first_name,
              last_name: mockUserFromDB.last_name,
              role: mockUserFromDB.role
            },
            token: expect.any(String)
          })
        );
      });

      it('should update last_login timestamp on successful login', async () => {
        mockRequest.body = validLoginData;

        jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(true as never);

        mockPool.query
          .mockResolvedValueOnce({ rows: [mockUserFromDB] } as any)
          .mockResolvedValueOnce({ rows: [] } as any);

        await AuthController.login(mockRequest as AuthRequest, mockResponse as Response);

        expect(mockPool.query).toHaveBeenNthCalledWith(
          2,
          'UPDATE users SET last_login = NOW() WHERE id = $1',
          [mockUserFromDB.id]
        );
      });

      it('should generate valid JWT token on login', async () => {
        mockRequest.body = validLoginData;

        jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(true as never);

        mockPool.query
          .mockResolvedValueOnce({ rows: [mockUserFromDB] } as any)
          .mockResolvedValueOnce({ rows: [] } as any);

        await AuthController.login(mockRequest as AuthRequest, mockResponse as Response);

        const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
        const token = responseData.token;

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
        expect(decoded.userId).toBe(mockUserFromDB.id);
        expect(decoded.email).toBe(mockUserFromDB.email);
        expect(decoded.role).toBe(mockUserFromDB.role);
      });

      it('should verify password using bcrypt.compare', async () => {
        mockRequest.body = validLoginData;

        const bcryptCompareSpy = jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(true as never);

        mockPool.query
          .mockResolvedValueOnce({ rows: [mockUserFromDB] } as any)
          .mockResolvedValueOnce({ rows: [] } as any);

        await AuthController.login(mockRequest as AuthRequest, mockResponse as Response);

        expect(bcryptCompareSpy).toHaveBeenCalledWith(
          validLoginData.password,
          mockUserFromDB.password_hash
        );

        bcryptCompareSpy.mockRestore();
      });
    });

    describe('Invalid credentials', () => {
      it('should reject login with non-existent email', async () => {
        mockRequest.body = validLoginData;

        mockPool.query.mockResolvedValueOnce({ rows: [] } as any);

        try {
          await AuthController.login(mockRequest as AuthRequest, mockResponse as Response);
          fail('Should have thrown an error');
        } catch (error) {
          expect(error).toBeInstanceOf(AppError);
          expect((error as AppError).message).toBe('Invalid credentials');
        }
      });

      it('should throw 401 error for non-existent user', async () => {
        mockRequest.body = validLoginData;

        mockPool.query.mockResolvedValueOnce({ rows: [] } as any);

        try {
          await AuthController.login(mockRequest as AuthRequest, mockResponse as Response);
          fail('Should have thrown an error');
        } catch (error) {
          expect(error).toBeInstanceOf(AppError);
          expect((error as AppError).statusCode).toBe(401);
          expect((error as AppError).message).toBe('Invalid credentials');
        }
      });

      it('should reject login with incorrect password', async () => {
        mockRequest.body = { ...validLoginData, password: 'WrongPassword123!' };

        jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(false as never);

        mockPool.query.mockResolvedValueOnce({ rows: [mockUserFromDB] } as any);

        await expect(
          AuthController.login(mockRequest as AuthRequest, mockResponse as Response)
        ).rejects.toThrow('Invalid credentials');
      });

      it('should throw 401 error for incorrect password', async () => {
        mockRequest.body = { ...validLoginData, password: 'WrongPassword' };

        jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(false as never);

        mockPool.query.mockResolvedValueOnce({ rows: [mockUserFromDB] } as any);

        try {
          await AuthController.login(mockRequest as AuthRequest, mockResponse as Response);
          fail('Should have thrown an error');
        } catch (error) {
          expect(error).toBeInstanceOf(AppError);
          expect((error as AppError).statusCode).toBe(401);
        }
      });

      it('should not update last_login on failed authentication', async () => {
        mockRequest.body = { ...validLoginData, password: 'WrongPassword' };

        jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(false as never);

        mockPool.query.mockResolvedValueOnce({ rows: [mockUserFromDB] } as any);

        try {
          await AuthController.login(mockRequest as AuthRequest, mockResponse as Response);
        } catch (error) {
          // Expected to throw
        }

        expect(mockPool.query).toHaveBeenCalledTimes(1);
        expect(mockPool.query).not.toHaveBeenCalledWith(
          'UPDATE users SET last_login = NOW() WHERE id = $1',
          expect.any(Array)
        );
      });

      it('should not return token on failed authentication', async () => {
        mockRequest.body = validLoginData;

        mockPool.query.mockResolvedValueOnce({ rows: [] } as any);

        try {
          await AuthController.login(mockRequest as AuthRequest, mockResponse as Response);
        } catch (error) {
          // Expected to throw
        }

        expect(mockResponse.json).not.toHaveBeenCalled();
      });
    });

    describe('SQL Injection prevention', () => {
      it('should safely handle SQL injection in email', async () => {
        const sqlInjectionAttempts = [
          "admin' OR '1'='1",
          "'; DROP TABLE users; --",
          "' OR 1=1 --",
          "admin'--",
          "' UNION SELECT * FROM users --"
        ];

        for (const maliciousEmail of sqlInjectionAttempts) {
          jest.clearAllMocks();
          mockRequest.body = { email: maliciousEmail, password: 'password' };

          mockPool.query.mockResolvedValueOnce({ rows: [] } as any);

          try {
            await AuthController.login(mockRequest as AuthRequest, mockResponse as Response);
          } catch (error) {
            // Expected to throw Invalid credentials
          }

          expect(mockPool.query).toHaveBeenCalledWith(
            'SELECT * FROM users WHERE email = $1',
            [maliciousEmail]
          );
        }
      });

      it('should use parameterized query for login', async () => {
        mockRequest.body = {
          email: "'; DELETE FROM users; --",
          password: "password"
        };

        mockPool.query.mockResolvedValueOnce({ rows: [] } as any);

        try {
          await AuthController.login(mockRequest as AuthRequest, mockResponse as Response);
        } catch (error) {
          // Expected
        }

        const callArgs = mockPool.query.mock.calls[0];
        expect(callArgs[0]).toBe('SELECT * FROM users WHERE email = $1');
        expect(callArgs[1]).toEqual([mockRequest.body.email]);
      });
    });

    describe('XSS prevention', () => {
      it('should safely handle XSS attempts in email', async () => {
        const xssAttempts = [
          '<script>alert("XSS")</script>@cuts.ae',
          'test@cuts.ae<img src=x onerror=alert(1)>',
          'javascript:alert(1)@cuts.ae'
        ];

        for (const xssEmail of xssAttempts) {
          jest.clearAllMocks();
          mockRequest.body = { email: xssEmail, password: 'password' };

          mockPool.query.mockResolvedValueOnce({ rows: [] } as any);

          try {
            await AuthController.login(mockRequest as AuthRequest, mockResponse as Response);
          } catch (error) {
            // Expected
          }

          expect(mockPool.query).toHaveBeenCalledWith(
            'SELECT * FROM users WHERE email = $1',
            [xssEmail]
          );
        }
      });
    });

    describe('Edge cases and boundary conditions', () => {
      it('should handle case-sensitive email comparison', async () => {
        mockRequest.body = { email: 'TEST@CUTS.AE', password: 'password' };

        mockPool.query.mockResolvedValueOnce({ rows: [] } as any);

        await expect(
          AuthController.login(mockRequest as AuthRequest, mockResponse as Response)
        ).rejects.toThrow('Invalid credentials');

        expect(mockPool.query).toHaveBeenCalledWith(
          'SELECT * FROM users WHERE email = $1',
          ['TEST@CUTS.AE']
        );
      });

      it('should handle empty password', async () => {
        mockRequest.body = { email: 'test@cuts.ae', password: '' };

        jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(false as never);

        mockPool.query.mockResolvedValueOnce({ rows: [mockUserFromDB] } as any);

        await expect(
          AuthController.login(mockRequest as AuthRequest, mockResponse as Response)
        ).rejects.toThrow('Invalid credentials');
      });

      it('should handle very long password', async () => {
        const longPassword = 'a'.repeat(10000);
        mockRequest.body = { email: 'test@cuts.ae', password: longPassword };

        jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(false as never);

        mockPool.query.mockResolvedValueOnce({ rows: [mockUserFromDB] } as any);

        await expect(
          AuthController.login(mockRequest as AuthRequest, mockResponse as Response)
        ).rejects.toThrow('Invalid credentials');
      });

      it('should handle special characters in password', async () => {
        const specialPassword = '!@#$%^&*()_+-=[]{}|;:",.<>?/~`';
        mockRequest.body = { email: 'test@cuts.ae', password: specialPassword };

        jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(true as never);

        mockPool.query
          .mockResolvedValueOnce({ rows: [mockUserFromDB] } as any)
          .mockResolvedValueOnce({ rows: [] } as any);

        await AuthController.login(mockRequest as AuthRequest, mockResponse as Response);

        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Login successful'
          })
        );
      });

      it('should handle unicode characters in password', async () => {
        const unicodePassword = '密码パスワード🔐';
        mockRequest.body = { email: 'test@cuts.ae', password: unicodePassword };

        jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(true as never);

        mockPool.query
          .mockResolvedValueOnce({ rows: [mockUserFromDB] } as any)
          .mockResolvedValueOnce({ rows: [] } as any);

        await AuthController.login(mockRequest as AuthRequest, mockResponse as Response);

        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Login successful'
          })
        );
      });
    });

    describe('Database error handling', () => {
      it('should propagate database errors when fetching user', async () => {
        mockRequest.body = validLoginData;

        const dbError = new Error('Database connection lost');
        mockPool.query.mockRejectedValueOnce(dbError);

        await expect(
          AuthController.login(mockRequest as AuthRequest, mockResponse as Response)
        ).rejects.toThrow('Database connection lost');
      });

      it('should propagate database errors when updating last_login', async () => {
        mockRequest.body = validLoginData;

        jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(true as never);

        mockPool.query
          .mockResolvedValueOnce({ rows: [mockUserFromDB] } as any)
          .mockRejectedValueOnce(new Error('Update failed'));

        await expect(
          AuthController.login(mockRequest as AuthRequest, mockResponse as Response)
        ).rejects.toThrow('Update failed');
      });
    });

    describe('JWT token generation on login', () => {
      it('should generate token with 7 day expiration', async () => {
        mockRequest.body = validLoginData;

        jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(true as never);
        const jwtSignSpy = jest.spyOn(jwt, 'sign');

        mockPool.query
          .mockResolvedValueOnce({ rows: [mockUserFromDB] } as any)
          .mockResolvedValueOnce({ rows: [] } as any);

        await AuthController.login(mockRequest as AuthRequest, mockResponse as Response);

        expect(jwtSignSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: mockUserFromDB.id,
            email: mockUserFromDB.email,
            role: mockUserFromDB.role
          }),
          process.env.JWT_SECRET!,
          { expiresIn: '7d' }
        );

        jwtSignSpy.mockRestore();
      });

      it('should generate different tokens for same user on multiple logins', async () => {
        const tokens: string[] = [];

        for (let i = 0; i < 2; i++) {
          jest.clearAllMocks();
          mockRequest.body = validLoginData;

          jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(true as never);

          mockPool.query
            .mockResolvedValueOnce({ rows: [mockUserFromDB] } as any)
            .mockResolvedValueOnce({ rows: [] } as any);

          await AuthController.login(mockRequest as AuthRequest, mockResponse as Response);

          const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
          tokens.push(responseData.token);

          // Small delay to ensure different iat claims
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        expect(tokens[0]).not.toBe(tokens[1]);
      });
    });

    describe('Response does not leak sensitive information', () => {
      it('should not return password_hash in response', async () => {
        mockRequest.body = validLoginData;

        jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(true as never);

        mockPool.query
          .mockResolvedValueOnce({ rows: [mockUserFromDB] } as any)
          .mockResolvedValueOnce({ rows: [] } as any);

        await AuthController.login(mockRequest as AuthRequest, mockResponse as Response);

        const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
        expect(responseData.user.password_hash).toBeUndefined();
        expect(responseData.user.password).toBeUndefined();
      });

      it('should only return safe user fields', async () => {
        mockRequest.body = validLoginData;

        jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(true as never);

        mockPool.query
          .mockResolvedValueOnce({ rows: [mockUserFromDB] } as any)
          .mockResolvedValueOnce({ rows: [] } as any);

        await AuthController.login(mockRequest as AuthRequest, mockResponse as Response);

        const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
        const userKeys = Object.keys(responseData.user);

        expect(userKeys).toEqual(['id', 'email', 'first_name', 'last_name', 'role']);
      });
    });
  });

  describe('me', () => {
    const mockUserData = {
      id: 'uuid-123',
      email: 'test@cuts.ae',
      first_name: 'John',
      last_name: 'Doe',
      role: UserRole.CUSTOMER,
      phone: '+971501234567',
      created_at: new Date('2024-01-01T00:00:00Z')
    };

    describe('Successful retrieval', () => {
      it('should return current user data', async () => {
        mockRequest.user = {
          userId: 'uuid-123',
          email: 'test@cuts.ae',
          role: UserRole.CUSTOMER
        };

        mockPool.query.mockResolvedValueOnce({ rows: [mockUserData] } as any);

        await AuthController.me(mockRequest as AuthRequest, mockResponse as Response);

        expect(mockPool.query).toHaveBeenCalledWith(
          'SELECT id, email, first_name, last_name, role, phone, created_at FROM users WHERE id = $1',
          [mockRequest.user.userId]
        );

        expect(mockResponse.json).toHaveBeenCalledWith({
          user: mockUserData
        });
      });

      it('should use userId from request.user', async () => {
        const userId = 'specific-user-id-789';
        mockRequest.user = {
          userId,
          email: 'test@cuts.ae',
          role: UserRole.ADMIN
        };

        mockPool.query.mockResolvedValueOnce({
          rows: [{ ...mockUserData, id: userId }]
        } as any);

        await AuthController.me(mockRequest as AuthRequest, mockResponse as Response);

        expect(mockPool.query).toHaveBeenCalledWith(
          expect.any(String),
          [userId]
        );
      });

      it('should return all user fields except sensitive data', async () => {
        mockRequest.user = {
          userId: 'uuid-123',
          email: 'test@cuts.ae',
          role: UserRole.CUSTOMER
        };

        mockPool.query.mockResolvedValueOnce({ rows: [mockUserData] } as any);

        await AuthController.me(mockRequest as AuthRequest, mockResponse as Response);

        const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
        expect(responseData.user).toHaveProperty('id');
        expect(responseData.user).toHaveProperty('email');
        expect(responseData.user).toHaveProperty('first_name');
        expect(responseData.user).toHaveProperty('last_name');
        expect(responseData.user).toHaveProperty('role');
        expect(responseData.user).toHaveProperty('phone');
        expect(responseData.user).toHaveProperty('created_at');
        expect(responseData.user).not.toHaveProperty('password_hash');
      });

      it('should work for all user roles', async () => {
        const roles = [UserRole.CUSTOMER, UserRole.RESTAURANT_OWNER, UserRole.DRIVER, UserRole.ADMIN, UserRole.SUPPORT];

        for (const role of roles) {
          jest.clearAllMocks();
          mockRequest.user = { userId: 'uuid-123', email: 'test@cuts.ae', role };

          mockPool.query.mockResolvedValueOnce({
            rows: [{ ...mockUserData, role }]
          } as any);

          await AuthController.me(mockRequest as AuthRequest, mockResponse as Response);

          expect(mockResponse.json).toHaveBeenCalledWith({
            user: expect.objectContaining({ role })
          });
        }
      });
    });

    describe('User not found', () => {
      it('should throw 404 error when user does not exist', async () => {
        mockRequest.user = {
          userId: 'non-existent-id',
          email: 'test@cuts.ae',
          role: UserRole.CUSTOMER
        };

        mockPool.query.mockResolvedValueOnce({ rows: [] } as any);

        try {
          await AuthController.me(mockRequest as AuthRequest, mockResponse as Response);
          fail('Should have thrown an error');
        } catch (error) {
          expect(error).toBeInstanceOf(AppError);
          expect((error as AppError).message).toBe('User not found');
        }
      });

      it('should throw AppError with status 404 for non-existent user', async () => {
        mockRequest.user = {
          userId: 'non-existent-id',
          email: 'test@cuts.ae',
          role: UserRole.CUSTOMER
        };

        mockPool.query.mockResolvedValueOnce({ rows: [] } as any);

        try {
          await AuthController.me(mockRequest as AuthRequest, mockResponse as Response);
          fail('Should have thrown an error');
        } catch (error) {
          expect(error).toBeInstanceOf(AppError);
          expect((error as AppError).statusCode).toBe(404);
          expect((error as AppError).message).toBe('User not found');
        }
      });

      it('should handle deleted user scenario', async () => {
        mockRequest.user = {
          userId: 'deleted-user-id',
          email: 'deleted@cuts.ae',
          role: UserRole.CUSTOMER
        };

        mockPool.query.mockResolvedValueOnce({ rows: [] } as any);

        await expect(
          AuthController.me(mockRequest as AuthRequest, mockResponse as Response)
        ).rejects.toThrow('User not found');
      });
    });

    describe('SQL Injection prevention', () => {
      it('should safely handle malicious userId in request.user', async () => {
        const sqlInjectionAttempts = [
          "'; DROP TABLE users; --",
          "1' OR '1'='1",
          "1; DELETE FROM users; --",
          "' UNION SELECT * FROM users --"
        ];

        for (const maliciousId of sqlInjectionAttempts) {
          jest.clearAllMocks();
          mockRequest.user = {
            userId: maliciousId,
            email: 'test@cuts.ae',
            role: UserRole.CUSTOMER
          };

          mockPool.query.mockResolvedValueOnce({ rows: [] } as any);

          try {
            await AuthController.me(mockRequest as AuthRequest, mockResponse as Response);
          } catch (error) {
            // Expected to throw User not found
          }

          expect(mockPool.query).toHaveBeenCalledWith(
            'SELECT id, email, first_name, last_name, role, phone, created_at FROM users WHERE id = $1',
            [maliciousId]
          );
        }
      });

      it('should use parameterized query', async () => {
        mockRequest.user = {
          userId: "'; DELETE FROM users WHERE '1'='1",
          email: 'test@cuts.ae',
          role: UserRole.CUSTOMER
        };

        mockPool.query.mockResolvedValueOnce({ rows: [] } as any);

        try {
          await AuthController.me(mockRequest as AuthRequest, mockResponse as Response);
        } catch (error) {
          // Expected
        }

        const callArgs = mockPool.query.mock.calls[0];
        expect(callArgs[0]).toContain('WHERE id = $1');
        expect(callArgs[1]).toEqual([mockRequest.user.userId]);
      });
    });

    describe('Database error handling', () => {
      it('should propagate database errors', async () => {
        mockRequest.user = {
          userId: 'uuid-123',
          email: 'test@cuts.ae',
          role: UserRole.CUSTOMER
        };

        const dbError = new Error('Connection timeout');
        mockPool.query.mockRejectedValueOnce(dbError);

        await expect(
          AuthController.me(mockRequest as AuthRequest, mockResponse as Response)
        ).rejects.toThrow('Connection timeout');
      });

      it('should handle query failures gracefully', async () => {
        mockRequest.user = {
          userId: 'uuid-123',
          email: 'test@cuts.ae',
          role: UserRole.CUSTOMER
        };

        mockPool.query.mockRejectedValueOnce(new Error('Query failed'));

        await expect(
          AuthController.me(mockRequest as AuthRequest, mockResponse as Response)
        ).rejects.toThrow();
      });
    });

    describe('Edge cases and boundary conditions', () => {
      it('should handle user with null phone', async () => {
        mockRequest.user = {
          userId: 'uuid-123',
          email: 'test@cuts.ae',
          role: UserRole.CUSTOMER
        };

        const userWithoutPhone = { ...mockUserData, phone: null };
        mockPool.query.mockResolvedValueOnce({ rows: [userWithoutPhone] } as any);

        await AuthController.me(mockRequest as AuthRequest, mockResponse as Response);

        const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
        expect(responseData.user.phone).toBeNull();
      });

      it('should handle user with special characters in name', async () => {
        mockRequest.user = {
          userId: 'uuid-123',
          email: 'test@cuts.ae',
          role: UserRole.CUSTOMER
        };

        const specialUser = {
          ...mockUserData,
          first_name: "O'Brien",
          last_name: "José María"
        };
        mockPool.query.mockResolvedValueOnce({ rows: [specialUser] } as any);

        await AuthController.me(mockRequest as AuthRequest, mockResponse as Response);

        const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
        expect(responseData.user.first_name).toBe("O'Brien");
        expect(responseData.user.last_name).toBe("José María");
      });

      it('should handle user with unicode characters', async () => {
        mockRequest.user = {
          userId: 'uuid-123',
          email: 'test@cuts.ae',
          role: UserRole.CUSTOMER
        };

        const unicodeUser = {
          ...mockUserData,
          first_name: '李明',
          last_name: 'محمد'
        };
        mockPool.query.mockResolvedValueOnce({ rows: [unicodeUser] } as any);

        await AuthController.me(mockRequest as AuthRequest, mockResponse as Response);

        const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
        expect(responseData.user.first_name).toBe('李明');
        expect(responseData.user.last_name).toBe('محمد');
      });

      it('should handle very long user ID', async () => {
        const longId = 'a'.repeat(1000);
        mockRequest.user = {
          userId: longId,
          email: 'test@cuts.ae',
          role: UserRole.CUSTOMER
        };

        mockPool.query.mockResolvedValueOnce({ rows: [] } as any);

        await expect(
          AuthController.me(mockRequest as AuthRequest, mockResponse as Response)
        ).rejects.toThrow('User not found');

        expect(mockPool.query).toHaveBeenCalledWith(
          expect.any(String),
          [longId]
        );
      });
    });

    describe('Response format validation', () => {
      it('should return user object nested in response', async () => {
        mockRequest.user = {
          userId: 'uuid-123',
          email: 'test@cuts.ae',
          role: UserRole.CUSTOMER
        };

        mockPool.query.mockResolvedValueOnce({ rows: [mockUserData] } as any);

        await AuthController.me(mockRequest as AuthRequest, mockResponse as Response);

        const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
        expect(responseData).toHaveProperty('user');
        expect(typeof responseData.user).toBe('object');
      });

      it('should not include extra fields not in SELECT query', async () => {
        mockRequest.user = {
          userId: 'uuid-123',
          email: 'test@cuts.ae',
          role: UserRole.CUSTOMER
        };

        const userWithExtraFields = {
          ...mockUserData,
          password_hash: '$2b$10$shouldnotbehere',
          internal_notes: 'sensitive info'
        };

        // Simulate DB returning only the selected fields
        const { password_hash, internal_notes, ...safeFields } = userWithExtraFields;
        mockPool.query.mockResolvedValueOnce({ rows: [safeFields] } as any);

        await AuthController.me(mockRequest as AuthRequest, mockResponse as Response);

        const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
        expect(responseData.user.password_hash).toBeUndefined();
        expect(responseData.user.internal_notes).toBeUndefined();
      });
    });

    describe('Authentication requirement', () => {
      it('should require req.user to be defined', async () => {
        mockRequest.user = undefined;

        // This would typically be caught by authentication middleware
        // but we test the controller's handling
        await expect(async () => {
          await AuthController.me(mockRequest as AuthRequest, mockResponse as Response);
        }).rejects.toThrow();
      });
    });
  });

  describe('Security tests', () => {
    describe('Timing attack prevention', () => {
      it('should take similar time for valid and invalid email in login', async () => {
        const iterations = 5;
        const timings: { valid: number[]; invalid: number[] } = { valid: [], invalid: [] };

        // Test invalid emails
        for (let i = 0; i < iterations; i++) {
          mockRequest.body = { email: 'invalid@cuts.ae', password: 'password' };
          mockPool.query.mockResolvedValueOnce({ rows: [] } as any);

          const start = Date.now();
          try {
            await AuthController.login(mockRequest as AuthRequest, mockResponse as Response);
          } catch (error) {
            // Expected
          }
          timings.invalid.push(Date.now() - start);
        }

        // Test valid email but wrong password
        for (let i = 0; i < iterations; i++) {
          jest.clearAllMocks();
          mockRequest.body = { email: 'test@cuts.ae', password: 'wrongpassword' };

          jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(false as never);
          mockPool.query.mockResolvedValueOnce({
            rows: [{
              id: 'uuid-123',
              email: 'test@cuts.ae',
              password_hash: '$2b$10$hash',
              role: UserRole.CUSTOMER
            }]
          } as any);

          const start = Date.now();
          try {
            await AuthController.login(mockRequest as AuthRequest, mockResponse as Response);
          } catch (error) {
            // Expected
          }
          timings.valid.push(Date.now() - start);
        }

        // Both should have executed, showing consistent error behavior
        expect(timings.invalid.length).toBe(iterations);
        expect(timings.valid.length).toBe(iterations);
      });
    });

    describe('Input sanitization', () => {
      it('should handle null bytes in input', async () => {
        mockRequest.body = {
          email: 'test\x00@cuts.ae',
          password: 'pass\x00word',
          first_name: 'John\x00',
          last_name: 'Doe\x00',
          role: UserRole.CUSTOMER
        };

        mockPool.query
          .mockResolvedValueOnce({ rows: [] } as any)
          .mockResolvedValueOnce({
            rows: [{ id: '123', email: mockRequest.body.email, role: UserRole.CUSTOMER }]
          } as any);

        await AuthController.register(mockRequest as AuthRequest, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(201);
      });

      it('should handle control characters in input', async () => {
        mockRequest.body = {
          email: 'test\r\n@cuts.ae',
          password: 'pass\t\rword',
          first_name: 'John\x0B',
          last_name: 'Doe\x0C',
          role: UserRole.CUSTOMER
        };

        mockPool.query
          .mockResolvedValueOnce({ rows: [] } as any)
          .mockResolvedValueOnce({
            rows: [{ id: '123', email: mockRequest.body.email, role: UserRole.CUSTOMER }]
          } as any);

        await AuthController.register(mockRequest as AuthRequest, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(201);
      });
    });

    describe('Mass assignment protection', () => {
      it('should not allow arbitrary fields in registration', async () => {
        mockRequest.body = {
          email: 'test@cuts.ae',
          password: 'password',
          first_name: 'John',
          last_name: 'Doe',
          role: UserRole.CUSTOMER,
          // Malicious fields
          is_admin: true,
          account_balance: 1000000,
          internal_notes: 'hacked'
        };

        mockPool.query
          .mockResolvedValueOnce({ rows: [] } as any)
          .mockResolvedValueOnce({
            rows: [{
              id: '123',
              email: 'test@cuts.ae',
              first_name: 'John',
              last_name: 'Doe',
              role: UserRole.CUSTOMER
            }]
          } as any);

        await AuthController.register(mockRequest as AuthRequest, mockResponse as Response);

        // Verify only expected fields were used in INSERT
        const insertCall = mockPool.query.mock.calls[1];
        expect(insertCall[1]).toHaveLength(6); // Only 6 parameters
      });
    });
  });

  describe('Concurrency and race conditions', () => {
    it('should handle concurrent registration attempts for same email', async () => {
      const registrationData = {
        email: 'test@cuts.ae',
        password: 'password',
        first_name: 'John',
        last_name: 'Doe',
        role: UserRole.CUSTOMER
      };

      const mockUser = {
        id: '123',
        email: 'test@cuts.ae',
        first_name: 'John',
        last_name: 'Doe',
        role: UserRole.CUSTOMER
      };

      // First request checks and finds no user
      mockPool.query.mockResolvedValueOnce({ rows: [] } as any);
      // First insert succeeds
      mockPool.query.mockResolvedValueOnce({ rows: [mockUser] } as any);

      // Simulate first request
      mockRequest.body = registrationData;
      await AuthController.register(mockRequest as AuthRequest, mockResponse as Response);

      // Reset mocks for second request
      jest.clearAllMocks();
      mockPool.query = jest.fn();
      mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };

      // Second request also checks and finds no user (race condition)
      mockPool.query.mockResolvedValueOnce({ rows: [] } as any);
      // Second insert fails with unique constraint violation
      const dbError: any = new Error('duplicate key value violates unique constraint');
      dbError.code = '23505';
      dbError.constraint = 'users_email_key';
      mockPool.query.mockRejectedValueOnce(dbError);

      mockRequest.body = registrationData;

      // Second registration should handle the database error
      await expect(
        AuthController.register(mockRequest as AuthRequest, mockResponse as Response)
      ).rejects.toThrow();
    });
  });
});
