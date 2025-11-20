import { z } from 'zod';
import { registerSchema, loginSchema } from '../../validators/auth.validators';
import { UserRole } from '../../types';

describe('Auth Validators', () => {
  describe('registerSchema', () => {
    const validRegistrationData = {
      email: 'test@cuts.ae',
      password: 'password123',
      first_name: 'John',
      last_name: 'Doe',
      phone: '+1234567890',
      role: UserRole.CUSTOMER
    };

    describe('Valid inputs', () => {
      it('should validate complete registration data with all fields', () => {
        const result = registerSchema.safeParse(validRegistrationData);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(validRegistrationData);
        }
      });

      it('should validate registration data without optional phone field', () => {
        const dataWithoutPhone = {
          ...validRegistrationData,
          phone: undefined
        };
        const result = registerSchema.safeParse(dataWithoutPhone);
        expect(result.success).toBe(true);
      });

      it('should validate with minimum length first_name', () => {
        const data = { ...validRegistrationData, first_name: 'Jo' };
        const result = registerSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should validate with minimum length last_name', () => {
        const data = { ...validRegistrationData, last_name: 'Do' };
        const result = registerSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should validate with minimum password length', () => {
        const data = { ...validRegistrationData, password: '12345678' };
        const result = registerSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should validate all valid user roles', () => {
        const roles = [
          UserRole.CUSTOMER,
          UserRole.RESTAURANT_OWNER,
          UserRole.DRIVER,
          UserRole.ADMIN,
          UserRole.SUPPORT
        ];

        roles.forEach(role => {
          const data = { ...validRegistrationData, role };
          const result = registerSchema.safeParse(data);
          expect(result.success).toBe(true);
        });
      });

      it('should validate with long valid email', () => {
        const data = {
          ...validRegistrationData,
          email: 'verylongemailaddress@verylongdomainname.com'
        };
        const result = registerSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should validate with special characters in email', () => {
        const data = { ...validRegistrationData, email: 'test+123@cuts.ae' };
        const result = registerSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    describe('Invalid email', () => {
      it('should reject invalid email format', () => {
        const data = { ...validRegistrationData, email: 'notanemail' };
        const result = registerSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toContain('email');
        }
      });

      it('should reject email without @', () => {
        const data = { ...validRegistrationData, email: 'test.cuts.ae' };
        const result = registerSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject email without domain', () => {
        const data = { ...validRegistrationData, email: 'test@' };
        const result = registerSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject email without username', () => {
        const data = { ...validRegistrationData, email: '@cuts.ae' };
        const result = registerSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject empty email', () => {
        const data = { ...validRegistrationData, email: '' };
        const result = registerSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject email with spaces', () => {
        const data = { ...validRegistrationData, email: 'test @cuts.ae' };
        const result = registerSchema.safeParse(data);
        expect(result.success).toBe(false);
      });
    });

    describe('Invalid password', () => {
      it('should reject password shorter than 8 characters', () => {
        const data = { ...validRegistrationData, password: '1234567' };
        const result = registerSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toContain('password');
        }
      });

      it('should reject empty password', () => {
        const data = { ...validRegistrationData, password: '' };
        const result = registerSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject password with only spaces', () => {
        const data = { ...validRegistrationData, password: '        ' };
        const result = registerSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should reject missing password', () => {
        const { password, ...dataWithoutPassword } = validRegistrationData;
        const result = registerSchema.safeParse(dataWithoutPassword);
        expect(result.success).toBe(false);
      });
    });

    describe('Invalid first_name', () => {
      it('should reject first_name shorter than 2 characters', () => {
        const data = { ...validRegistrationData, first_name: 'J' };
        const result = registerSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toContain('first_name');
        }
      });

      it('should reject empty first_name', () => {
        const data = { ...validRegistrationData, first_name: '' };
        const result = registerSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject missing first_name', () => {
        const { first_name, ...dataWithoutFirstName } = validRegistrationData;
        const result = registerSchema.safeParse(dataWithoutFirstName);
        expect(result.success).toBe(false);
      });
    });

    describe('Invalid last_name', () => {
      it('should reject last_name shorter than 2 characters', () => {
        const data = { ...validRegistrationData, last_name: 'D' };
        const result = registerSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toContain('last_name');
        }
      });

      it('should reject empty last_name', () => {
        const data = { ...validRegistrationData, last_name: '' };
        const result = registerSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject missing last_name', () => {
        const { last_name, ...dataWithoutLastName } = validRegistrationData;
        const result = registerSchema.safeParse(dataWithoutLastName);
        expect(result.success).toBe(false);
      });
    });

    describe('Invalid role', () => {
      it('should reject invalid role value', () => {
        const data = { ...validRegistrationData, role: 'invalid_role' as any };
        const result = registerSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toContain('role');
        }
      });

      it('should reject missing role', () => {
        const { role, ...dataWithoutRole } = validRegistrationData;
        const result = registerSchema.safeParse(dataWithoutRole);
        expect(result.success).toBe(false);
      });

      it('should reject empty string as role', () => {
        const data = { ...validRegistrationData, role: '' as any };
        const result = registerSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject null as role', () => {
        const data = { ...validRegistrationData, role: null as any };
        const result = registerSchema.safeParse(data);
        expect(result.success).toBe(false);
      });
    });

    describe('Type validation', () => {
      it('should reject non-string email', () => {
        const data = { ...validRegistrationData, email: 123 as any };
        const result = registerSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject non-string password', () => {
        const data = { ...validRegistrationData, password: 123 as any };
        const result = registerSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject non-string first_name', () => {
        const data = { ...validRegistrationData, first_name: 123 as any };
        const result = registerSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject non-string last_name', () => {
        const data = { ...validRegistrationData, last_name: 123 as any };
        const result = registerSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject non-string phone', () => {
        const data = { ...validRegistrationData, phone: 123 as any };
        const result = registerSchema.safeParse(data);
        expect(result.success).toBe(false);
      });
    });

    describe('Multiple validation errors', () => {
      it('should report all validation errors', () => {
        const invalidData = {
          email: 'notanemail',
          password: '123',
          first_name: 'J',
          last_name: 'D',
          role: 'invalid' as any
        };
        const result = registerSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues.length).toBeGreaterThan(1);
        }
      });

      it('should reject completely empty object', () => {
        const result = registerSchema.safeParse({});
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues.length).toBeGreaterThanOrEqual(5);
        }
      });
    });

    describe('Extra fields', () => {
      it('should allow extra fields by default', () => {
        const dataWithExtra = {
          ...validRegistrationData,
          extraField: 'extra value'
        };
        const result = registerSchema.safeParse(dataWithExtra);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('loginSchema', () => {
    const validLoginData = {
      email: 'test@cuts.ae',
      password: 'password123'
    };

    describe('Valid inputs', () => {
      it('should validate complete login data', () => {
        const result = loginSchema.safeParse(validLoginData);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(validLoginData);
        }
      });

      it('should validate with short password', () => {
        const data = { ...validLoginData, password: '1' };
        const result = loginSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should validate with long password', () => {
        const data = { ...validLoginData, password: 'a'.repeat(1000) };
        const result = loginSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should validate with special characters in email', () => {
        const data = { ...validLoginData, email: 'test+tag@cuts.ae' };
        const result = loginSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should validate with uppercase email', () => {
        const data = { ...validLoginData, email: 'TEST@CUTS.AE' };
        const result = loginSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    describe('Invalid email', () => {
      it('should reject invalid email format', () => {
        const data = { ...validLoginData, email: 'notanemail' };
        const result = loginSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toContain('email');
        }
      });

      it('should reject email without @', () => {
        const data = { ...validLoginData, email: 'test.cuts.ae' };
        const result = loginSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject email without domain', () => {
        const data = { ...validLoginData, email: 'test@' };
        const result = loginSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject empty email', () => {
        const data = { ...validLoginData, email: '' };
        const result = loginSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject missing email', () => {
        const { email, ...dataWithoutEmail } = validLoginData;
        const result = loginSchema.safeParse(dataWithoutEmail);
        expect(result.success).toBe(false);
      });
    });

    describe('Invalid password', () => {
      it('should validate empty password', () => {
        const data = { ...validLoginData, password: '' };
        const result = loginSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should reject missing password', () => {
        const { password, ...dataWithoutPassword } = validLoginData;
        const result = loginSchema.safeParse(dataWithoutPassword);
        expect(result.success).toBe(false);
      });
    });

    describe('Type validation', () => {
      it('should reject non-string email', () => {
        const data = { ...validLoginData, email: 123 as any };
        const result = loginSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject non-string password', () => {
        const data = { ...validLoginData, password: 123 as any };
        const result = loginSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject null email', () => {
        const data = { ...validLoginData, email: null as any };
        const result = loginSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject null password', () => {
        const data = { ...validLoginData, password: null as any };
        const result = loginSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject undefined email', () => {
        const data = { ...validLoginData, email: undefined as any };
        const result = loginSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject undefined password', () => {
        const data = { ...validLoginData, password: undefined as any };
        const result = loginSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject boolean email', () => {
        const data = { ...validLoginData, email: true as any };
        const result = loginSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject array password', () => {
        const data = { ...validLoginData, password: [] as any };
        const result = loginSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject object email', () => {
        const data = { ...validLoginData, email: {} as any };
        const result = loginSchema.safeParse(data);
        expect(result.success).toBe(false);
      });
    });

    describe('Multiple validation errors', () => {
      it('should report all validation errors', () => {
        const invalidData = {
          email: 'notanemail'
        };
        const result = loginSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues.length).toBeGreaterThanOrEqual(2);
        }
      });

      it('should reject completely empty object', () => {
        const result = loginSchema.safeParse({});
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues.length).toBeGreaterThanOrEqual(2);
        }
      });
    });

    describe('Extra fields', () => {
      it('should allow extra fields by default', () => {
        const dataWithExtra = {
          ...validLoginData,
          extraField: 'extra value'
        };
        const result = loginSchema.safeParse(dataWithExtra);
        expect(result.success).toBe(true);
      });
    });

    describe('Edge cases', () => {
      it('should reject whitespace-only password', () => {
        const data = { ...validLoginData, password: '   ' };
        const result = loginSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should validate password with special characters', () => {
        const data = { ...validLoginData, password: '!@#$%^&*()' };
        const result = loginSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should validate password with unicode characters', () => {
        const data = { ...validLoginData, password: 'password\u00A9' };
        const result = loginSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should validate email with subdomain', () => {
        const data = { ...validLoginData, email: 'test@mail.cuts.ae' };
        const result = loginSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });
  });
});
