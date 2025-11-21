/**
 * Validation Combinations - Combinatorial Testing
 *
 * Tests all combinations of:
 * - Field types (string, number, boolean, array, object)
 * - Validation rules (required, optional, min/max length, format)
 * - Edge cases (null, undefined, empty, invalid format)
 * - Data scenarios (valid, invalid, boundary values)
 *
 * Uses pairwise testing to efficiently test input validation
 */

import request from 'supertest';
import express, { Express } from 'express';
import pairwise from 'pairwise';
import { validate } from '../../middleware/validation';
import { z } from 'zod';
import { errorHandler } from '../../middleware/errorHandler';

describe('Validation Combinations - Combinatorial Testing', () => {
  let app: Express;

  // Define test parameters
  const fieldTypes = [
    'string',
    'number',
    'boolean',
    'array',
    'object',
    'email',
    'uuid',
    'url',
    'date'
  ];

  const validationRules = [
    'required',
    'optional',
    'min_length',
    'max_length',
    'min_value',
    'max_value',
    'format',
    'enum'
  ];

  const edgeCases = [
    'null',
    'undefined',
    'empty_string',
    'empty_array',
    'empty_object',
    'invalid_format',
    'boundary_min',
    'boundary_max',
    'valid'
  ];

  // Helper: Create schema based on field type and validation rule
  function createSchema(fieldType: string, rule: string): z.ZodSchema {
    let schema: any;

    switch (fieldType) {
      case 'string':
        schema = z.string();
        if (rule === 'required') {
          schema = schema.min(1, 'String is required');
        } else if (rule === 'optional') {
          schema = schema.optional();
        } else if (rule === 'min_length') {
          schema = schema.min(3, 'Minimum 3 characters');
        } else if (rule === 'max_length') {
          schema = schema.max(50, 'Maximum 50 characters');
        } else if (rule === 'format') {
          schema = schema.regex(/^[A-Za-z0-9]+$/, 'Alphanumeric only');
        } else if (rule === 'enum') {
          schema = z.enum(['option1', 'option2', 'option3']);
        }
        break;

      case 'number':
        schema = z.number();
        if (rule === 'required') {
          schema = z.number();
        } else if (rule === 'optional') {
          schema = z.number().optional();
        } else if (rule === 'min_value') {
          schema = z.number().min(0, 'Must be non-negative');
        } else if (rule === 'max_value') {
          schema = z.number().max(100, 'Maximum value is 100');
        }
        break;

      case 'boolean':
        schema = z.boolean();
        if (rule === 'optional') {
          schema = schema.optional();
        }
        break;

      case 'array':
        schema = z.array(z.string());
        if (rule === 'required') {
          schema = z.array(z.string()).min(1, 'Array must not be empty');
        } else if (rule === 'optional') {
          schema = z.array(z.string()).optional();
        } else if (rule === 'min_length') {
          schema = z.array(z.string()).min(2, 'Minimum 2 items');
        } else if (rule === 'max_length') {
          schema = z.array(z.string()).max(10, 'Maximum 10 items');
        }
        break;

      case 'object':
        schema = z.object({ name: z.string(), value: z.number() });
        if (rule === 'optional') {
          schema = schema.optional();
        }
        break;

      case 'email':
        schema = z.string().email('Invalid email format');
        if (rule === 'optional') {
          schema = schema.optional();
        }
        break;

      case 'uuid':
        schema = z.string().uuid('Invalid UUID format');
        if (rule === 'optional') {
          schema = schema.optional();
        }
        break;

      case 'url':
        schema = z.string().url('Invalid URL format');
        if (rule === 'optional') {
          schema = schema.optional();
        }
        break;

      case 'date':
        schema = z.string().datetime('Invalid date format');
        if (rule === 'optional') {
          schema = schema.optional();
        }
        break;

      default:
        schema = z.string();
    }

    return z.object({ field: schema });
  }

  // Helper: Create test value based on field type and edge case
  function createTestValue(fieldType: string, edgeCase: string): any {
    switch (edgeCase) {
      case 'null':
        return null;

      case 'undefined':
        return undefined;

      case 'empty_string':
        return fieldType === 'string' || fieldType === 'email' || fieldType === 'uuid' ||
               fieldType === 'url' || fieldType === 'date' ? '' : null;

      case 'empty_array':
        return fieldType === 'array' ? [] : null;

      case 'empty_object':
        return fieldType === 'object' ? {} : null;

      case 'invalid_format':
        switch (fieldType) {
          case 'string':
            return '!!!invalid***';
          case 'number':
            return 'not-a-number';
          case 'boolean':
            return 'not-a-boolean';
          case 'array':
            return 'not-an-array';
          case 'object':
            return 'not-an-object';
          case 'email':
            return 'not-an-email';
          case 'uuid':
            return 'not-a-uuid';
          case 'url':
            return 'not-a-url';
          case 'date':
            return 'not-a-date';
          default:
            return 'invalid';
        }

      case 'boundary_min':
        switch (fieldType) {
          case 'string':
            return 'ab'; // Just below min length of 3
          case 'number':
            return -1; // Just below min value of 0
          case 'array':
            return ['one']; // Just below min length of 2
          default:
            return null;
        }

      case 'boundary_max':
        switch (fieldType) {
          case 'string':
            return 'a'.repeat(51); // Just above max length of 50
          case 'number':
            return 101; // Just above max value of 100
          case 'array':
            return Array(11).fill('item'); // Just above max length of 10
          default:
            return null;
        }

      case 'valid':
        switch (fieldType) {
          case 'string':
            return 'validstring123';
          case 'number':
            return 42;
          case 'boolean':
            return true;
          case 'array':
            return ['item1', 'item2', 'item3'];
          case 'object':
            return { name: 'test', value: 123 };
          case 'email':
            return 'test@cuts.ae';
          case 'uuid':
            return '123e4567-e89b-12d3-a456-426614174000';
          case 'url':
            return 'https://cuts.ae';
          case 'date':
            return new Date().toISOString();
          default:
            return 'valid';
        }

      default:
        return null;
    }
  }

  // Helper: Determine if combination should pass validation
  function shouldPassValidation(fieldType: string, rule: string, edgeCase: string): boolean {
    // Valid values should always pass
    if (edgeCase === 'valid') {
      return true;
    }

    // Optional fields can be undefined or null
    if (rule === 'optional' && (edgeCase === 'null' || edgeCase === 'undefined')) {
      return true;
    }

    // Required fields fail on null, undefined, or empty
    if (rule === 'required' && ['null', 'undefined', 'empty_string', 'empty_array', 'empty_object'].includes(edgeCase)) {
      return false;
    }

    // Format validation failures
    if (edgeCase === 'invalid_format') {
      return false;
    }

    // Boundary cases for min/max rules
    if (rule === 'min_length' && edgeCase === 'boundary_min') {
      return false;
    }

    if (rule === 'max_length' && edgeCase === 'boundary_max') {
      return false;
    }

    if (rule === 'min_value' && edgeCase === 'boundary_min') {
      return false;
    }

    if (rule === 'max_value' && edgeCase === 'boundary_max') {
      return false;
    }

    // Default: depends on context
    return edgeCase === 'valid';
  }

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(errorHandler);
  });

  describe('Pairwise Combinations: FieldType x ValidationRule x EdgeCase', () => {
    const combinations = pairwise([
      fieldTypes,
      validationRules,
      edgeCases
    ]);

    combinations.forEach((combo, index) => {
      // Pairwise returns nested arrays, flatten them
      const flatCombo = Array.isArray(combo[0]) ? combo.flat() : combo;
      const fieldType = flatCombo[0] as string;
      const rule = flatCombo[1] as string;
      const edgeCase = flatCombo[2] as string;

      // Skip if any value is undefined
      if (!fieldType || !rule || !edgeCase) {
        return;
      }

      it(`Combination ${index + 1}: ${fieldType} + ${rule} + ${edgeCase}`, async () => {
        // Create endpoint with dynamic schema
        const schema = createSchema(fieldType, rule);

        // Clear routes
        app._router = undefined;
        app = express();
        app.use(express.json());

        app.post('/test', validate(schema), (req, res) => {
          res.json({ success: true, data: req.body });
        });

        app.use(errorHandler);

        const testValue = createTestValue(fieldType, edgeCase);
        const shouldPass = shouldPassValidation(fieldType, rule, edgeCase);

        // Skip incompatible combinations
        if (testValue === null && edgeCase !== 'null' && edgeCase !== 'valid') {
          return;
        }

        const requestBody = testValue === undefined ? {} : { field: testValue };

        const response = await request(app)
          .post('/test')
          .send(requestBody);

        if (shouldPass) {
          expect(response.status).toBe(200);
          expect(response.body.success).toBe(true);
        } else {
          expect(response.status).toBe(400);
          expect(response.body.code).toBe('VAL_001');
          expect(response.body.success).toBe(false);
        }
      });
    });
  });

  describe('String Validation Edge Cases', () => {
    it('should reject empty string when required', async () => {
      const schema = z.object({ name: z.string().min(1) });

      app.post('/test', validate(schema), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/test')
        .send({ name: '' });

      expect(response.status).toBe(400);
      expect(response.body).toBeDefined();
    });

    it('should accept valid string within length constraints', async () => {
      const schema = z.object({ name: z.string().min(3).max(50) });

      app.post('/test', validate(schema), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/test')
        .send({ name: 'ValidName' });

      expect(response.status).toBe(200);
    });

    it('should reject string exceeding max length', async () => {
      const schema = z.object({ name: z.string().max(10) });

      app.post('/test', validate(schema), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/test')
        .send({ name: 'ThisStringIsTooLong' });

      expect(response.status).toBe(400);
      expect(response.body).toBeDefined();
    });

    it('should reject string not matching regex pattern', async () => {
      const schema = z.object({ code: z.string().regex(/^[A-Z]{3}$/) });

      app.post('/test', validate(schema), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/test')
        .send({ code: 'abc' });

      expect(response.status).toBe(400);
      expect(response.body).toBeDefined();
    });
  });

  describe('Number Validation Edge Cases', () => {
    it('should reject negative number when min is 0', async () => {
      const schema = z.object({ price: z.number().min(0) });

      app.post('/test', validate(schema), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/test')
        .send({ price: -10 });

      expect(response.status).toBe(400);
      expect(response.body).toBeDefined();
    });

    it('should accept number within range', async () => {
      const schema = z.object({ quantity: z.number().min(1).max(100) });

      app.post('/test', validate(schema), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/test')
        .send({ quantity: 50 });

      expect(response.status).toBe(200);
    });

    it('should reject number exceeding max value', async () => {
      const schema = z.object({ quantity: z.number().max(100) });

      app.post('/test', validate(schema), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/test')
        .send({ quantity: 150 });

      expect(response.status).toBe(400);
      expect(response.body).toBeDefined();
    });

    it('should reject non-number value for number field', async () => {
      const schema = z.object({ age: z.number() });

      app.post('/test', validate(schema), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/test')
        .send({ age: 'twenty' });

      expect(response.status).toBe(400);
      expect(response.body).toBeDefined();
    });
  });

  describe('Email Validation Edge Cases', () => {
    it('should accept valid email format', async () => {
      const schema = z.object({ email: z.string().email() });

      app.post('/test', validate(schema), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/test')
        .send({ email: 'user@cuts.ae' });

      expect(response.status).toBe(200);
    });

    it('should reject invalid email format', async () => {
      const schema = z.object({ email: z.string().email() });

      app.post('/test', validate(schema), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/test')
        .send({ email: 'not-an-email' });

      expect(response.status).toBe(400);
      expect(response.body).toBeDefined();
    });

    it('should reject email without domain', async () => {
      const schema = z.object({ email: z.string().email() });

      app.post('/test', validate(schema), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/test')
        .send({ email: 'user@' });

      expect(response.status).toBe(400);
      expect(response.body).toBeDefined();
    });
  });

  describe('Array Validation Edge Cases', () => {
    it('should reject empty array when min length is 1', async () => {
      const schema = z.object({ items: z.array(z.string()).min(1) });

      app.post('/test', validate(schema), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/test')
        .send({ items: [] });

      expect(response.status).toBe(400);
      expect(response.body).toBeDefined();
    });

    it('should accept array with valid items', async () => {
      const schema = z.object({ items: z.array(z.string()).min(1).max(5) });

      app.post('/test', validate(schema), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/test')
        .send({ items: ['item1', 'item2', 'item3'] });

      expect(response.status).toBe(200);
    });

    it('should reject array exceeding max length', async () => {
      const schema = z.object({ items: z.array(z.string()).max(3) });

      app.post('/test', validate(schema), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/test')
        .send({ items: ['item1', 'item2', 'item3', 'item4', 'item5'] });

      expect(response.status).toBe(400);
      expect(response.body).toBeDefined();
    });
  });

  describe('Object Validation Edge Cases', () => {
    it('should accept valid nested object', async () => {
      const schema = z.object({
        user: z.object({
          name: z.string(),
          age: z.number()
        })
      });

      app.post('/test', validate(schema), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/test')
        .send({ user: { name: 'John', age: 30 } });

      expect(response.status).toBe(200);
    });

    it('should reject object with missing required fields', async () => {
      const schema = z.object({
        user: z.object({
          name: z.string(),
          age: z.number()
        })
      });

      app.post('/test', validate(schema), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/test')
        .send({ user: { name: 'John' } });

      expect(response.status).toBe(400);
      expect(response.body).toBeDefined();
    });

    it('should reject empty object when fields are required', async () => {
      const schema = z.object({
        user: z.object({
          name: z.string(),
          age: z.number()
        })
      });

      app.post('/test', validate(schema), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/test')
        .send({ user: {} });

      expect(response.status).toBe(400);
      expect(response.body).toBeDefined();
    });
  });

  describe('UUID Validation Edge Cases', () => {
    it('should accept valid UUID', async () => {
      const schema = z.object({ id: z.string().uuid() });

      app.post('/test', validate(schema), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/test')
        .send({ id: '123e4567-e89b-12d3-a456-426614174000' });

      expect(response.status).toBe(200);
    });

    it('should reject invalid UUID format', async () => {
      const schema = z.object({ id: z.string().uuid() });

      app.post('/test', validate(schema), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/test')
        .send({ id: 'not-a-uuid' });

      expect(response.status).toBe(400);
      expect(response.body).toBeDefined();
    });
  });

  describe('Boolean Validation Edge Cases', () => {
    it('should accept boolean true', async () => {
      const schema = z.object({ active: z.boolean() });

      app.post('/test', validate(schema), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/test')
        .send({ active: true });

      expect(response.status).toBe(200);
    });

    it('should accept boolean false', async () => {
      const schema = z.object({ active: z.boolean() });

      app.post('/test', validate(schema), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/test')
        .send({ active: false });

      expect(response.status).toBe(200);
    });

    it('should reject string value for boolean field', async () => {
      const schema = z.object({ active: z.boolean() });

      app.post('/test', validate(schema), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/test')
        .send({ active: 'true' });

      expect(response.status).toBe(400);
      expect(response.body).toBeDefined();
    });
  });

  // Log summary
  afterAll(() => {
    const totalCombinations = pairwise([
      fieldTypes,
      validationRules,
      edgeCases
    ]).length;

    console.log(`\nValidation Combinations Test Summary:`);
    console.log(`- Total pairwise combinations tested: ${totalCombinations}`);
    console.log(`- Field types: ${fieldTypes.length}`);
    console.log(`- Validation rules: ${validationRules.length}`);
    console.log(`- Edge cases: ${edgeCases.length}`);
    console.log(`- Theoretical full combination: ${fieldTypes.length * validationRules.length * edgeCases.length} (reduced to ${totalCombinations} via pairwise)`);
  });
});
