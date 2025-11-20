import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validation';

describe('Validation Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      body: {}
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    nextFunction = jest.fn();
  });

  describe('validate - Basic Validation', () => {
    it('should pass validation with valid data', async () => {
      const schema = z.object({
        name: z.string(),
        age: z.number()
      });

      mockRequest.body = {
        name: 'John Doe',
        age: 30
      };

      const middleware = validate(schema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(nextFunction).toHaveBeenCalledWith();
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it('should reject invalid data type', async () => {
      const schema = z.object({
        name: z.string(),
        age: z.number()
      });

      mockRequest.body = {
        name: 'John Doe',
        age: 'thirty' // Invalid: should be number
      };

      const middleware = validate(schema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: expect.arrayContaining([
          expect.objectContaining({
            code: 'invalid_type',
            path: ['age'],
            message: expect.any(String)
          })
        ])
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should reject missing required fields', async () => {
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

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: expect.arrayContaining([
          expect.objectContaining({
            code: 'invalid_type',
            path: expect.arrayContaining(['email'])
          }),
          expect.objectContaining({
            code: 'invalid_type',
            path: expect.arrayContaining(['age'])
          })
        ])
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should reject empty body when fields are required', async () => {
      const schema = z.object({
        name: z.string(),
        email: z.string()
      });

      mockRequest.body = {};

      const middleware = validate(schema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: expect.any(Array)
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('validate - String Validation', () => {
    it('should validate email format', async () => {
      const schema = z.object({
        email: z.string().email()
      });

      mockRequest.body = {
        email: 'invalid-email'
      };

      const middleware = validate(schema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: expect.arrayContaining([
          expect.objectContaining({
            path: ['email'],
            message: expect.any(String)
          })
        ])
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should validate valid email format', async () => {
      const schema = z.object({
        email: z.string().email()
      });

      mockRequest.body = {
        email: 'user@cuts.ae'
      };

      const middleware = validate(schema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should validate string minimum length', async () => {
      const schema = z.object({
        password: z.string().min(8)
      });

      mockRequest.body = {
        password: '123'
      };

      const middleware = validate(schema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: expect.arrayContaining([
          expect.objectContaining({
            code: 'too_small',
            path: ['password']
          })
        ])
      });
    });

    it('should validate string maximum length', async () => {
      const schema = z.object({
        username: z.string().max(20)
      });

      mockRequest.body = {
        username: 'a'.repeat(25)
      };

      const middleware = validate(schema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: expect.arrayContaining([
          expect.objectContaining({
            code: 'too_big',
            path: ['username']
          })
        ])
      });
    });

    it('should validate URL format', async () => {
      const schema = z.object({
        website: z.string().url()
      });

      mockRequest.body = {
        website: 'not-a-url'
      };

      const middleware = validate(schema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should validate UUID format', async () => {
      const schema = z.object({
        id: z.string().uuid()
      });

      mockRequest.body = {
        id: 'not-a-uuid'
      };

      const middleware = validate(schema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('validate - Number Validation', () => {
    it('should validate number minimum value', async () => {
      const schema = z.object({
        age: z.number().min(0)
      });

      mockRequest.body = {
        age: -5
      };

      const middleware = validate(schema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: expect.arrayContaining([
          expect.objectContaining({
            code: 'too_small',
            path: ['age']
          })
        ])
      });
    });

    it('should validate number maximum value', async () => {
      const schema = z.object({
        quantity: z.number().max(100)
      });

      mockRequest.body = {
        quantity: 150
      };

      const middleware = validate(schema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: expect.arrayContaining([
          expect.objectContaining({
            code: 'too_big',
            path: ['quantity']
          })
        ])
      });
    });

    it('should validate positive numbers', async () => {
      const schema = z.object({
        price: z.number().positive()
      });

      mockRequest.body = {
        price: -10
      };

      const middleware = validate(schema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should validate integer values', async () => {
      const schema = z.object({
        count: z.number().int()
      });

      mockRequest.body = {
        count: 3.14
      };

      const middleware = validate(schema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('validate - Object Validation', () => {
    it('should validate nested objects', async () => {
      const schema = z.object({
        user: z.object({
          name: z.string(),
          address: z.object({
            street: z.string(),
            city: z.string(),
            zipCode: z.string()
          })
        })
      });

      mockRequest.body = {
        user: {
          name: 'John Doe',
          address: {
            street: '123 Main St',
            city: 'Abu Dhabi',
            zipCode: '12345'
          }
        }
      };

      const middleware = validate(schema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should reject invalid nested object', async () => {
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
            street: '123 Main St'
            // Missing city
          }
        }
      };

      const middleware = validate(schema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: expect.arrayContaining([
          expect.objectContaining({
            path: ['user', 'address', 'city']
          })
        ])
      });
    });

    it('should validate deeply nested objects', async () => {
      const schema = z.object({
        level1: z.object({
          level2: z.object({
            level3: z.object({
              value: z.string()
            })
          })
        })
      });

      mockRequest.body = {
        level1: {
          level2: {
            level3: {
              value: 123 // Invalid: should be string
            }
          }
        }
      };

      const middleware = validate(schema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: expect.arrayContaining([
          expect.objectContaining({
            path: ['level1', 'level2', 'level3', 'value']
          })
        ])
      });
    });
  });

  describe('validate - Array Validation', () => {
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

      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should reject invalid array items', async () => {
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

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: expect.arrayContaining([
          expect.objectContaining({
            path: ['items', 1, 'quantity']
          })
        ])
      });
    });

    it('should validate array minimum length', async () => {
      const schema = z.object({
        tags: z.array(z.string()).min(1)
      });

      mockRequest.body = {
        tags: []
      };

      const middleware = validate(schema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: expect.arrayContaining([
          expect.objectContaining({
            code: 'too_small',
            path: ['tags']
          })
        ])
      });
    });

    it('should validate array maximum length', async () => {
      const schema = z.object({
        tags: z.array(z.string()).max(3)
      });

      mockRequest.body = {
        tags: ['tag1', 'tag2', 'tag3', 'tag4']
      };

      const middleware = validate(schema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: expect.arrayContaining([
          expect.objectContaining({
            code: 'too_big',
            path: ['tags']
          })
        ])
      });
    });

    it('should validate empty arrays when allowed', async () => {
      const schema = z.object({
        tags: z.array(z.string())
      });

      mockRequest.body = {
        tags: []
      };

      const middleware = validate(schema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should reject non-array when array is expected', async () => {
      const schema = z.object({
        items: z.array(z.string())
      });

      mockRequest.body = {
        items: 'not-an-array'
      };

      const middleware = validate(schema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('validate - Optional and Nullable Fields', () => {
    it('should validate optional fields when present', async () => {
      const schema = z.object({
        name: z.string(),
        nickname: z.string().optional()
      });

      mockRequest.body = {
        name: 'John Doe',
        nickname: 'Johnny'
      };

      const middleware = validate(schema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should validate optional fields when absent', async () => {
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

      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should validate nullable fields with null value', async () => {
      const schema = z.object({
        name: z.string(),
        middleName: z.string().nullable()
      });

      mockRequest.body = {
        name: 'John Doe',
        middleName: null
      };

      const middleware = validate(schema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should validate nullable fields with value', async () => {
      const schema = z.object({
        name: z.string(),
        middleName: z.string().nullable()
      });

      mockRequest.body = {
        name: 'John Doe',
        middleName: 'Michael'
      };

      const middleware = validate(schema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should validate optional and nullable fields', async () => {
      const schema = z.object({
        name: z.string(),
        middleName: z.string().nullable().optional()
      });

      mockRequest.body = {
        name: 'John Doe'
      };

      const middleware = validate(schema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });

  describe('validate - Enum Validation', () => {
    it('should validate enum values', async () => {
      enum Status {
        ACTIVE = 'active',
        INACTIVE = 'inactive',
        PENDING = 'pending'
      }

      const schema = z.object({
        status: z.nativeEnum(Status)
      });

      mockRequest.body = {
        status: 'active'
      };

      const middleware = validate(schema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should reject invalid enum values', async () => {
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

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: expect.arrayContaining([
          expect.objectContaining({
            path: ['status'],
            message: expect.any(String)
          })
        ])
      });
    });

    it('should validate zod enum', async () => {
      const schema = z.object({
        role: z.enum(['admin', 'user', 'guest'])
      });

      mockRequest.body = {
        role: 'user'
      };

      const middleware = validate(schema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should reject invalid zod enum', async () => {
      const schema = z.object({
        role: z.enum(['admin', 'user', 'guest'])
      });

      mockRequest.body = {
        role: 'superuser'
      };

      const middleware = validate(schema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('validate - Boolean Validation', () => {
    it('should validate boolean values', async () => {
      const schema = z.object({
        isActive: z.boolean(),
        isVerified: z.boolean()
      });

      mockRequest.body = {
        isActive: true,
        isVerified: false
      };

      const middleware = validate(schema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should reject non-boolean values', async () => {
      const schema = z.object({
        isActive: z.boolean()
      });

      mockRequest.body = {
        isActive: 'yes'
      };

      const middleware = validate(schema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: expect.arrayContaining([
          expect.objectContaining({
            code: 'invalid_type',
            path: ['isActive']
          })
        ])
      });
    });
  });

  describe('validate - Date Validation', () => {
    it('should validate date objects', async () => {
      const schema = z.object({
        birthDate: z.date()
      });

      mockRequest.body = {
        birthDate: new Date('1990-01-01')
      };

      const middleware = validate(schema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should reject invalid date values', async () => {
      const schema = z.object({
        birthDate: z.date()
      });

      mockRequest.body = {
        birthDate: 'not-a-date'
      };

      const middleware = validate(schema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('validate - Complex Schemas', () => {
    it('should validate complex restaurant order schema', async () => {
      const schema = z.object({
        restaurantId: z.string().uuid(),
        customerId: z.string().uuid(),
        items: z.array(z.object({
          menuItemId: z.string().uuid(),
          quantity: z.number().int().positive(),
          price: z.number().positive(),
          customizations: z.array(z.string()).optional()
        })).min(1),
        deliveryAddress: z.object({
          street: z.string().min(1),
          city: z.string().min(1),
          zipCode: z.string().min(1),
          coordinates: z.object({
            lat: z.number(),
            lng: z.number()
          }).optional()
        }),
        specialInstructions: z.string().max(500).optional(),
        paymentMethod: z.enum(['card', 'cash', 'wallet'])
      });

      mockRequest.body = {
        restaurantId: '123e4567-e89b-12d3-a456-426614174000',
        customerId: '123e4567-e89b-12d3-a456-426614174001',
        items: [
          {
            menuItemId: '123e4567-e89b-12d3-a456-426614174002',
            quantity: 2,
            price: 25.99,
            customizations: ['no onions', 'extra cheese']
          }
        ],
        deliveryAddress: {
          street: '123 Main St',
          city: 'Dubai',
          zipCode: '12345',
          coordinates: {
            lat: 25.2048,
            lng: 55.2708
          }
        },
        specialInstructions: 'Please ring doorbell',
        paymentMethod: 'card'
      };

      const middleware = validate(schema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should reject complex schema with multiple errors', async () => {
      const schema = z.object({
        restaurantId: z.string().uuid(),
        items: z.array(z.object({
          menuItemId: z.string().uuid(),
          quantity: z.number().int().positive()
        })).min(1),
        paymentMethod: z.enum(['card', 'cash', 'wallet'])
      });

      mockRequest.body = {
        restaurantId: 'invalid-uuid',
        items: [],
        paymentMethod: 'bitcoin'
      };

      const middleware = validate(schema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: expect.arrayContaining([
          expect.objectContaining({
            path: ['restaurantId']
          }),
          expect.objectContaining({
            path: ['items']
          }),
          expect.objectContaining({
            path: ['paymentMethod']
          })
        ])
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('validate - Custom Refinements', () => {
    it('should validate with custom refinement', async () => {
      const schema = z.object({
        password: z.string().min(8),
        confirmPassword: z.string()
      }).refine((data) => data.password === data.confirmPassword, {
        message: "Passwords don't match",
        path: ['confirmPassword']
      });

      mockRequest.body = {
        password: 'password123',
        confirmPassword: 'password123'
      };

      const middleware = validate(schema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should reject with failed custom refinement', async () => {
      const schema = z.object({
        password: z.string().min(8),
        confirmPassword: z.string()
      }).refine((data) => data.password === data.confirmPassword, {
        message: "Passwords don't match",
        path: ['confirmPassword']
      });

      mockRequest.body = {
        password: 'password123',
        confirmPassword: 'different123'
      };

      const middleware = validate(schema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: expect.arrayContaining([
          expect.objectContaining({
            path: ['confirmPassword'],
            message: "Passwords don't match"
          })
        ])
      });
    });
  });

  describe('validate - Union Types', () => {
    it('should validate union types', async () => {
      const schema = z.object({
        value: z.union([z.string(), z.number()])
      });

      mockRequest.body = {
        value: 'text'
      };

      const middleware = validate(schema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should validate union types with number', async () => {
      const schema = z.object({
        value: z.union([z.string(), z.number()])
      });

      mockRequest.body = {
        value: 123
      };

      const middleware = validate(schema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should reject invalid union types', async () => {
      const schema = z.object({
        value: z.union([z.string(), z.number()])
      });

      mockRequest.body = {
        value: true
      };

      const middleware = validate(schema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('validate - Record Types', () => {
    it('should validate record types', async () => {
      const schema = z.object({
        settings: z.record(z.string(), z.boolean())
      });

      mockRequest.body = {
        settings: {
          notifications: true,
          darkMode: false,
          analytics: true
        }
      };

      const middleware = validate(schema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should reject invalid record values', async () => {
      const schema = z.object({
        settings: z.record(z.string(), z.boolean())
      });

      mockRequest.body = {
        settings: {
          notifications: true,
          darkMode: 'yes' // Invalid: should be boolean
        }
      };

      const middleware = validate(schema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('validate - Error Handling', () => {
    it('should handle ZodError and return formatted error details', async () => {
      const schema = z.object({
        email: z.string().email(),
        age: z.number().min(0).max(120)
      });

      mockRequest.body = {
        email: 'invalid',
        age: 200
      };

      const middleware = validate(schema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: expect.any(Array)
      });

      const jsonCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.details).toHaveLength(2);
      expect(jsonCall.details[0]).toHaveProperty('code');
      expect(jsonCall.details[0]).toHaveProperty('path');
      expect(jsonCall.details[0]).toHaveProperty('message');
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should pass non-ZodError to next middleware', async () => {
      const schema = z.object({
        name: z.string()
      });

      mockRequest.body = {
        name: 'John'
      };

      // Mock parseAsync to throw non-ZodError
      const originalParseAsync = schema.parseAsync;
      jest.spyOn(schema, 'parseAsync').mockRejectedValue(new Error('Database connection error'));

      const middleware = validate(schema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
      expect(nextFunction).toHaveBeenCalledWith(expect.any(Error));
      expect(nextFunction).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Database connection error'
        })
      );

      // Restore original method
      jest.spyOn(schema, 'parseAsync').mockRestore();
    });

    it('should include all error details in response', async () => {
      const schema = z.object({
        email: z.string().email(),
        password: z.string().min(8),
        age: z.number().positive()
      });

      mockRequest.body = {
        email: 'not-an-email',
        password: '123',
        age: -5
      };

      const middleware = validate(schema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(400);

      const jsonCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall).toEqual({
        error: 'Validation failed',
        details: expect.arrayContaining([
          expect.objectContaining({ path: ['email'] }),
          expect.objectContaining({ path: ['password'] }),
          expect.objectContaining({ path: ['age'] })
        ])
      });
    });
  });

  describe('validate - Async Validation', () => {
    it('should handle async validation successfully', async () => {
      const schema = z.object({
        username: z.string().min(3)
      });

      mockRequest.body = {
        username: 'john_doe'
      };

      const middleware = validate(schema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should handle async validation errors', async () => {
      const schema = z.object({
        email: z.string().email()
      });

      mockRequest.body = {
        email: 'invalid'
      };

      const middleware = validate(schema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('validate - Edge Cases', () => {
    it('should handle undefined body', async () => {
      const schema = z.object({
        name: z.string()
      });

      mockRequest.body = undefined;

      const middleware = validate(schema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should handle null body', async () => {
      const schema = z.object({
        name: z.string()
      });

      mockRequest.body = null;

      const middleware = validate(schema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should handle extra fields with strict schema', async () => {
      const schema = z.object({
        name: z.string(),
        age: z.number()
      }).strict();

      mockRequest.body = {
        name: 'John Doe',
        age: 30,
        extraField: 'should not be here'
      };

      const middleware = validate(schema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should allow extra fields with non-strict schema', async () => {
      const schema = z.object({
        name: z.string(),
        age: z.number()
      });

      mockRequest.body = {
        name: 'John Doe',
        age: 30,
        extraField: 'this is allowed'
      };

      const middleware = validate(schema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should validate empty object schema', async () => {
      const schema = z.object({});

      mockRequest.body = {};

      const middleware = validate(schema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should validate primitive schemas', async () => {
      const schema = z.string().email();

      mockRequest.body = 'user@cuts.ae';

      const middleware = validate(schema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should reject primitive schemas with invalid data', async () => {
      const schema = z.string().email();

      mockRequest.body = 'not-an-email';

      const middleware = validate(schema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('validate - Real-world Scenarios', () => {
    it('should validate user registration payload', async () => {
      const schema = z.object({
        email: z.string().email(),
        password: z.string().min(8),
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/),
        role: z.enum(['customer', 'restaurant_owner', 'driver'])
      });

      mockRequest.body = {
        email: 'newuser@cuts.ae',
        password: 'securepass123',
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: '+971501234567',
        role: 'customer'
      };

      const middleware = validate(schema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should validate menu item creation payload', async () => {
      const schema = z.object({
        name: z.string().min(1).max(100),
        description: z.string().max(500),
        price: z.number().positive(),
        category: z.string(),
        isAvailable: z.boolean(),
        preparationTime: z.number().int().positive(),
        image: z.string().url().optional(),
        nutritionalInfo: z.object({
          calories: z.number().nonnegative(),
          protein: z.number().nonnegative(),
          carbs: z.number().nonnegative(),
          fat: z.number().nonnegative()
        }).optional()
      });

      mockRequest.body = {
        name: 'Margherita Pizza',
        description: 'Classic Italian pizza with tomato and mozzarella',
        price: 45.99,
        category: 'Pizza',
        isAvailable: true,
        preparationTime: 20,
        image: 'https://cuts.ae/images/pizza.jpg',
        nutritionalInfo: {
          calories: 800,
          protein: 30,
          carbs: 100,
          fat: 25
        }
      };

      const middleware = validate(schema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should validate order status update payload', async () => {
      const schema = z.object({
        orderId: z.string().uuid(),
        status: z.enum(['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled']),
        notes: z.string().max(500).optional()
      });

      mockRequest.body = {
        orderId: '123e4567-e89b-12d3-a456-426614174000',
        status: 'preparing',
        notes: 'Order being prepared'
      };

      const middleware = validate(schema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });

  describe('validate - Type Coercion', () => {
    it('should validate with coerced number', async () => {
      const schema = z.object({
        age: z.coerce.number()
      });

      mockRequest.body = {
        age: '30' // String that can be coerced to number
      };

      const middleware = validate(schema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should validate with coerced boolean', async () => {
      const schema = z.object({
        isActive: z.coerce.boolean()
      });

      mockRequest.body = {
        isActive: 'true' // String that can be coerced to boolean
      };

      const middleware = validate(schema);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });
});
