import { z } from 'zod';
import {
  createRestaurantSchema,
  updateRestaurantSchema
} from '../../validators/restaurant.validators';

describe('Restaurant Validators', () => {
  describe('createRestaurantSchema', () => {
    const validRestaurantData = {
      name: 'Amazing Restaurant',
      description: 'A wonderful place to eat',
      cuisine_type: ['Italian', 'Mediterranean'],
      address: {
        street: '123 Main St',
        city: 'Dubai',
        state: 'Dubai',
        postal_code: '00000',
        country: 'UAE'
      },
      phone: '+971-4-123-4567',
      email: 'restaurant@cuts.ae',
      operating_hours: {
        monday: {
          open: '09:00',
          close: '22:00',
          is_closed: false
        },
        tuesday: {
          open: '09:00',
          close: '22:00'
        },
        sunday: {
          open: '10:00',
          close: '20:00',
          is_closed: false
        }
      },
      average_prep_time: 30
    };

    describe('Valid inputs', () => {
      it('should validate complete restaurant data', () => {
        const result = createRestaurantSchema.safeParse(validRestaurantData);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(validRestaurantData);
        }
      });

      it('should validate without optional description', () => {
        const { description, ...data } = validRestaurantData;
        const result = createRestaurantSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should validate without optional average_prep_time', () => {
        const { average_prep_time, ...data } = validRestaurantData;
        const result = createRestaurantSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should validate with minimum name length', () => {
        const data = { ...validRestaurantData, name: 'AB' };
        const result = createRestaurantSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should validate with long name', () => {
        const data = { ...validRestaurantData, name: 'A'.repeat(200) };
        const result = createRestaurantSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should validate with single cuisine type', () => {
        const data = { ...validRestaurantData, cuisine_type: ['Italian'] };
        const result = createRestaurantSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should validate with multiple cuisine types', () => {
        const data = {
          ...validRestaurantData,
          cuisine_type: ['Italian', 'Mediterranean', 'Seafood', 'Vegan']
        };
        const result = createRestaurantSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should validate with zero average_prep_time', () => {
        const data = { ...validRestaurantData, average_prep_time: 0 };
        const result = createRestaurantSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should validate with large average_prep_time', () => {
        const data = { ...validRestaurantData, average_prep_time: 120 };
        const result = createRestaurantSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should validate operating_hours without is_closed field', () => {
        const data = {
          ...validRestaurantData,
          operating_hours: {
            monday: {
              open: '09:00',
              close: '22:00'
            }
          }
        };
        const result = createRestaurantSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should validate operating_hours with is_closed true', () => {
        const data = {
          ...validRestaurantData,
          operating_hours: {
            monday: {
              open: '09:00',
              close: '22:00',
              is_closed: true
            }
          }
        };
        const result = createRestaurantSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should validate all days of the week in operating_hours', () => {
        const data = {
          ...validRestaurantData,
          operating_hours: {
            monday: { open: '09:00', close: '22:00' },
            tuesday: { open: '09:00', close: '22:00' },
            wednesday: { open: '09:00', close: '22:00' },
            thursday: { open: '09:00', close: '22:00' },
            friday: { open: '09:00', close: '23:00' },
            saturday: { open: '10:00', close: '23:00' },
            sunday: { open: '10:00', close: '20:00' }
          }
        };
        const result = createRestaurantSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should validate email with subdomain', () => {
        const data = { ...validRestaurantData, email: 'info@mail.restaurant.ae' };
        const result = createRestaurantSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should validate email with special characters', () => {
        const data = { ...validRestaurantData, email: 'restaurant+info@cuts.ae' };
        const result = createRestaurantSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should validate empty description', () => {
        const data = { ...validRestaurantData, description: '' };
        const result = createRestaurantSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    describe('Invalid name', () => {
      it('should reject name shorter than 2 characters', () => {
        const data = { ...validRestaurantData, name: 'A' };
        const result = createRestaurantSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toContain('name');
        }
      });

      it('should reject empty name', () => {
        const data = { ...validRestaurantData, name: '' };
        const result = createRestaurantSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject missing name', () => {
        const { name, ...data } = validRestaurantData;
        const result = createRestaurantSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject non-string name', () => {
        const data = { ...validRestaurantData, name: 123 as any };
        const result = createRestaurantSchema.safeParse(data);
        expect(result.success).toBe(false);
      });
    });

    describe('Invalid description', () => {
      it('should reject non-string description', () => {
        const data = { ...validRestaurantData, description: 123 as any };
        const result = createRestaurantSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toContain('description');
        }
      });
    });

    describe('Invalid cuisine_type', () => {
      it('should reject non-array cuisine_type', () => {
        const data = { ...validRestaurantData, cuisine_type: 'Italian' as any };
        const result = createRestaurantSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toContain('cuisine_type');
        }
      });

      it('should validate empty cuisine_type array', () => {
        const data = { ...validRestaurantData, cuisine_type: [] };
        const result = createRestaurantSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should reject array with non-string elements', () => {
        const data = { ...validRestaurantData, cuisine_type: [1, 2, 3] as any };
        const result = createRestaurantSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject missing cuisine_type', () => {
        const { cuisine_type, ...data } = validRestaurantData;
        const result = createRestaurantSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject null cuisine_type', () => {
        const data = { ...validRestaurantData, cuisine_type: null as any };
        const result = createRestaurantSchema.safeParse(data);
        expect(result.success).toBe(false);
      });
    });

    describe('Invalid address', () => {
      it('should reject missing address', () => {
        const { address, ...data } = validRestaurantData;
        const result = createRestaurantSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toContain('address');
        }
      });

      it('should reject missing street in address', () => {
        const data = {
          ...validRestaurantData,
          address: {
            city: 'Dubai',
            state: 'Dubai',
            postal_code: '00000',
            country: 'UAE'
          } as any
        };
        const result = createRestaurantSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject missing city in address', () => {
        const data = {
          ...validRestaurantData,
          address: {
            street: '123 Main St',
            state: 'Dubai',
            postal_code: '00000',
            country: 'UAE'
          } as any
        };
        const result = createRestaurantSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject missing state in address', () => {
        const data = {
          ...validRestaurantData,
          address: {
            street: '123 Main St',
            city: 'Dubai',
            postal_code: '00000',
            country: 'UAE'
          } as any
        };
        const result = createRestaurantSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject missing postal_code in address', () => {
        const data = {
          ...validRestaurantData,
          address: {
            street: '123 Main St',
            city: 'Dubai',
            state: 'Dubai',
            country: 'UAE'
          } as any
        };
        const result = createRestaurantSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject missing country in address', () => {
        const data = {
          ...validRestaurantData,
          address: {
            street: '123 Main St',
            city: 'Dubai',
            state: 'Dubai',
            postal_code: '00000'
          } as any
        };
        const result = createRestaurantSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should validate empty street', () => {
        const data = {
          ...validRestaurantData,
          address: {
            ...validRestaurantData.address,
            street: ''
          }
        };
        const result = createRestaurantSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should reject non-object address', () => {
        const data = { ...validRestaurantData, address: 'invalid' as any };
        const result = createRestaurantSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject non-string address fields', () => {
        const data = {
          ...validRestaurantData,
          address: {
            ...validRestaurantData.address,
            city: 123 as any
          }
        };
        const result = createRestaurantSchema.safeParse(data);
        expect(result.success).toBe(false);
      });
    });

    describe('Invalid phone', () => {
      it('should reject missing phone', () => {
        const { phone, ...data } = validRestaurantData;
        const result = createRestaurantSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toContain('phone');
        }
      });

      it('should validate empty phone', () => {
        const data = { ...validRestaurantData, phone: '' };
        const result = createRestaurantSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should reject non-string phone', () => {
        const data = { ...validRestaurantData, phone: 123456789 as any };
        const result = createRestaurantSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should validate phone with various formats', () => {
        const phoneFormats = [
          '+971-4-123-4567',
          '+97141234567',
          '04-123-4567',
          '(04) 123-4567'
        ];

        phoneFormats.forEach(phone => {
          const data = { ...validRestaurantData, phone };
          const result = createRestaurantSchema.safeParse(data);
          expect(result.success).toBe(true);
        });
      });
    });

    describe('Invalid email', () => {
      it('should reject invalid email format', () => {
        const data = { ...validRestaurantData, email: 'notanemail' };
        const result = createRestaurantSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toContain('email');
        }
      });

      it('should reject missing email', () => {
        const { email, ...data } = validRestaurantData;
        const result = createRestaurantSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject empty email', () => {
        const data = { ...validRestaurantData, email: '' };
        const result = createRestaurantSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject email without @', () => {
        const data = { ...validRestaurantData, email: 'restaurant.cuts.ae' };
        const result = createRestaurantSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject email without domain', () => {
        const data = { ...validRestaurantData, email: 'restaurant@' };
        const result = createRestaurantSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject non-string email', () => {
        const data = { ...validRestaurantData, email: 123 as any };
        const result = createRestaurantSchema.safeParse(data);
        expect(result.success).toBe(false);
      });
    });

    describe('Invalid operating_hours', () => {
      it('should reject missing operating_hours', () => {
        const { operating_hours, ...data } = validRestaurantData;
        const result = createRestaurantSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toContain('operating_hours');
        }
      });

      it('should reject non-object operating_hours', () => {
        const data = { ...validRestaurantData, operating_hours: 'invalid' as any };
        const result = createRestaurantSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject operating_hours with missing open time', () => {
        const data = {
          ...validRestaurantData,
          operating_hours: {
            monday: {
              close: '22:00'
            } as any
          }
        };
        const result = createRestaurantSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject operating_hours with missing close time', () => {
        const data = {
          ...validRestaurantData,
          operating_hours: {
            monday: {
              open: '09:00'
            } as any
          }
        };
        const result = createRestaurantSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject operating_hours with non-string open time', () => {
        const data = {
          ...validRestaurantData,
          operating_hours: {
            monday: {
              open: 9 as any,
              close: '22:00'
            }
          }
        };
        const result = createRestaurantSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject operating_hours with non-string close time', () => {
        const data = {
          ...validRestaurantData,
          operating_hours: {
            monday: {
              open: '09:00',
              close: 22 as any
            }
          }
        };
        const result = createRestaurantSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject operating_hours with non-boolean is_closed', () => {
        const data = {
          ...validRestaurantData,
          operating_hours: {
            monday: {
              open: '09:00',
              close: '22:00',
              is_closed: 'false' as any
            }
          }
        };
        const result = createRestaurantSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should validate empty operating_hours object', () => {
        const data = {
          ...validRestaurantData,
          operating_hours: {}
        };
        const result = createRestaurantSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    describe('Invalid average_prep_time', () => {
      it('should reject negative average_prep_time', () => {
        const data = { ...validRestaurantData, average_prep_time: -1 };
        const result = createRestaurantSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toContain('average_prep_time');
        }
      });

      it('should reject non-number average_prep_time', () => {
        const data = { ...validRestaurantData, average_prep_time: '30' as any };
        const result = createRestaurantSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject string as average_prep_time', () => {
        const data = { ...validRestaurantData, average_prep_time: 'thirty' as any };
        const result = createRestaurantSchema.safeParse(data);
        expect(result.success).toBe(false);
      });
    });

    describe('Type validation', () => {
      it('should reject null values for required fields', () => {
        const data = { ...validRestaurantData, name: null as any };
        const result = createRestaurantSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject undefined values for required fields', () => {
        const data = { ...validRestaurantData, phone: undefined as any };
        const result = createRestaurantSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject completely empty object', () => {
        const result = createRestaurantSchema.safeParse({});
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues.length).toBeGreaterThanOrEqual(5);
        }
      });
    });
  });

  describe('updateRestaurantSchema', () => {
    const validUpdateData = {
      name: 'Updated Restaurant',
      description: 'Updated description',
      cuisine_type: ['Japanese', 'Asian'],
      address: {
        street: '456 New St',
        city: 'Abu Dhabi',
        state: 'Abu Dhabi',
        postal_code: '11111',
        country: 'UAE'
      },
      phone: '+971-2-987-6543',
      email: 'updated@cuts.ae',
      operating_hours: {
        monday: {
          open: '10:00',
          close: '23:00',
          is_closed: false
        }
      },
      average_prep_time: 45,
      is_active: true
    };

    describe('Valid inputs', () => {
      it('should validate complete update data', () => {
        const result = updateRestaurantSchema.safeParse(validUpdateData);
        expect(result.success).toBe(true);
      });

      it('should validate with only name', () => {
        const data = { name: 'Updated Name' };
        const result = updateRestaurantSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should validate with only description', () => {
        const data = { description: 'Updated description' };
        const result = updateRestaurantSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should validate with only cuisine_type', () => {
        const data = { cuisine_type: ['Indian'] };
        const result = updateRestaurantSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should validate with only address', () => {
        const data = {
          address: {
            street: '789 Another St',
            city: 'Sharjah',
            state: 'Sharjah',
            postal_code: '22222',
            country: 'UAE'
          }
        };
        const result = updateRestaurantSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should validate with only phone', () => {
        const data = { phone: '+971-6-555-5555' };
        const result = updateRestaurantSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should validate with only email', () => {
        const data = { email: 'newemail@cuts.ae' };
        const result = updateRestaurantSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should validate with only operating_hours', () => {
        const data = {
          operating_hours: {
            tuesday: {
              open: '08:00',
              close: '20:00'
            }
          }
        };
        const result = updateRestaurantSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should validate with only average_prep_time', () => {
        const data = { average_prep_time: 60 };
        const result = updateRestaurantSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should validate with only is_active', () => {
        const data = { is_active: false };
        const result = updateRestaurantSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should validate empty object', () => {
        const result = updateRestaurantSchema.safeParse({});
        expect(result.success).toBe(true);
      });

      it('should validate partial update with multiple fields', () => {
        const data = {
          name: 'Partial Update',
          is_active: true,
          average_prep_time: 25
        };
        const result = updateRestaurantSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should validate with is_active true', () => {
        const data = { is_active: true };
        const result = updateRestaurantSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should validate with is_active false', () => {
        const data = { is_active: false };
        const result = updateRestaurantSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should validate with undefined description', () => {
        const data = { description: undefined };
        const result = updateRestaurantSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should validate with zero average_prep_time', () => {
        const data = { average_prep_time: 0 };
        const result = updateRestaurantSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should validate with empty cuisine_type array', () => {
        const data = { cuisine_type: [] };
        const result = updateRestaurantSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    describe('Invalid name when provided', () => {
      it('should reject name shorter than 2 characters', () => {
        const data = { name: 'A' };
        const result = updateRestaurantSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toContain('name');
        }
      });

      it('should reject empty name', () => {
        const data = { name: '' };
        const result = updateRestaurantSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject non-string name', () => {
        const data = { name: 123 as any };
        const result = updateRestaurantSchema.safeParse(data);
        expect(result.success).toBe(false);
      });
    });

    describe('Invalid description when provided', () => {
      it('should reject non-string description', () => {
        const data = { description: 123 as any };
        const result = updateRestaurantSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toContain('description');
        }
      });

      it('should validate empty string description', () => {
        const data = { description: '' };
        const result = updateRestaurantSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    describe('Invalid cuisine_type when provided', () => {
      it('should reject non-array cuisine_type', () => {
        const data = { cuisine_type: 'Italian' as any };
        const result = updateRestaurantSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toContain('cuisine_type');
        }
      });

      it('should reject array with non-string elements', () => {
        const data = { cuisine_type: [1, 2, 3] as any };
        const result = updateRestaurantSchema.safeParse(data);
        expect(result.success).toBe(false);
      });
    });

    describe('Invalid address when provided', () => {
      it('should reject incomplete address (missing street)', () => {
        const data = {
          address: {
            city: 'Dubai',
            state: 'Dubai',
            postal_code: '00000',
            country: 'UAE'
          } as any
        };
        const result = updateRestaurantSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toContain('address');
        }
      });

      it('should reject incomplete address (missing city)', () => {
        const data = {
          address: {
            street: '123 Main St',
            state: 'Dubai',
            postal_code: '00000',
            country: 'UAE'
          } as any
        };
        const result = updateRestaurantSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject incomplete address (missing state)', () => {
        const data = {
          address: {
            street: '123 Main St',
            city: 'Dubai',
            postal_code: '00000',
            country: 'UAE'
          } as any
        };
        const result = updateRestaurantSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject incomplete address (missing postal_code)', () => {
        const data = {
          address: {
            street: '123 Main St',
            city: 'Dubai',
            state: 'Dubai',
            country: 'UAE'
          } as any
        };
        const result = updateRestaurantSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject incomplete address (missing country)', () => {
        const data = {
          address: {
            street: '123 Main St',
            city: 'Dubai',
            state: 'Dubai',
            postal_code: '00000'
          } as any
        };
        const result = updateRestaurantSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject non-object address', () => {
        const data = { address: 'invalid' as any };
        const result = updateRestaurantSchema.safeParse(data);
        expect(result.success).toBe(false);
      });
    });

    describe('Invalid phone when provided', () => {
      it('should validate empty phone', () => {
        const data = { phone: '' };
        const result = updateRestaurantSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should reject non-string phone', () => {
        const data = { phone: 123456789 as any };
        const result = updateRestaurantSchema.safeParse(data);
        expect(result.success).toBe(false);
      });
    });

    describe('Invalid email when provided', () => {
      it('should reject invalid email format', () => {
        const data = { email: 'notanemail' };
        const result = updateRestaurantSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toContain('email');
        }
      });

      it('should reject empty email', () => {
        const data = { email: '' };
        const result = updateRestaurantSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject email without @', () => {
        const data = { email: 'restaurant.cuts.ae' };
        const result = updateRestaurantSchema.safeParse(data);
        expect(result.success).toBe(false);
      });
    });

    describe('Invalid operating_hours when provided', () => {
      it('should reject operating_hours with missing open time', () => {
        const data = {
          operating_hours: {
            monday: {
              close: '22:00'
            } as any
          }
        };
        const result = updateRestaurantSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toContain('operating_hours');
        }
      });

      it('should reject operating_hours with missing close time', () => {
        const data = {
          operating_hours: {
            monday: {
              open: '09:00'
            } as any
          }
        };
        const result = updateRestaurantSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject operating_hours with non-string times', () => {
        const data = {
          operating_hours: {
            monday: {
              open: 9 as any,
              close: 22 as any
            }
          }
        };
        const result = updateRestaurantSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject operating_hours with non-boolean is_closed', () => {
        const data = {
          operating_hours: {
            monday: {
              open: '09:00',
              close: '22:00',
              is_closed: 'false' as any
            }
          }
        };
        const result = updateRestaurantSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject non-object operating_hours', () => {
        const data = { operating_hours: 'invalid' as any };
        const result = updateRestaurantSchema.safeParse(data);
        expect(result.success).toBe(false);
      });
    });

    describe('Invalid average_prep_time when provided', () => {
      it('should reject negative average_prep_time', () => {
        const data = { average_prep_time: -1 };
        const result = updateRestaurantSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toContain('average_prep_time');
        }
      });

      it('should reject non-number average_prep_time', () => {
        const data = { average_prep_time: '30' as any };
        const result = updateRestaurantSchema.safeParse(data);
        expect(result.success).toBe(false);
      });
    });

    describe('Invalid is_active when provided', () => {
      it('should reject non-boolean is_active', () => {
        const data = { is_active: 'true' as any };
        const result = updateRestaurantSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toContain('is_active');
        }
      });

      it('should reject number as is_active', () => {
        const data = { is_active: 1 as any };
        const result = updateRestaurantSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject string as is_active', () => {
        const data = { is_active: 'yes' as any };
        const result = updateRestaurantSchema.safeParse(data);
        expect(result.success).toBe(false);
      });
    });

    describe('Type validation', () => {
      it('should reject null values when provided', () => {
        const data = { name: null as any };
        const result = updateRestaurantSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject array values for string fields', () => {
        const data = { phone: [] as any };
        const result = updateRestaurantSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject object values for string fields', () => {
        const data = { email: {} as any };
        const result = updateRestaurantSchema.safeParse(data);
        expect(result.success).toBe(false);
      });
    });

    describe('Multiple validation errors', () => {
      it('should report all validation errors', () => {
        const invalidData = {
          name: 'A',
          email: 'invalid',
          average_prep_time: -1,
          is_active: 'yes' as any
        };
        const result = updateRestaurantSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues.length).toBeGreaterThan(1);
        }
      });
    });
  });
});
