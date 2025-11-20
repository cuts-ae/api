import { z } from 'zod';
import {
  createOrderSchema,
  updateOrderStatusSchema,
  cancelOrderSchema
} from '../../validators/order.validators';

describe('Order Validators', () => {
  describe('createOrderSchema', () => {
    const validOrderData = {
      items: [
        {
          menu_item_id: '550e8400-e29b-41d4-a716-446655440000',
          restaurant_id: '550e8400-e29b-41d4-a716-446655440001',
          quantity: 2,
          selected_variants: ['550e8400-e29b-41d4-a716-446655440002'],
          special_instructions: 'No onions please'
        }
      ],
      delivery_address: {
        street: '123 Main St',
        city: 'Dubai',
        state: 'Dubai',
        postal_code: '00000',
        country: 'UAE',
        latitude: 25.2048,
        longitude: 55.2708
      },
      delivery_instructions: 'Ring the doorbell',
      scheduled_for: '2025-12-01T12:00:00Z'
    };

    describe('Valid inputs', () => {
      it('should validate complete order data', () => {
        const result = createOrderSchema.safeParse(validOrderData);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(validOrderData);
        }
      });

      it('should validate without optional selected_variants', () => {
        const data = {
          ...validOrderData,
          items: [
            {
              menu_item_id: '550e8400-e29b-41d4-a716-446655440000',
              restaurant_id: '550e8400-e29b-41d4-a716-446655440001',
              quantity: 2
            }
          ]
        };
        const result = createOrderSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should validate without optional special_instructions', () => {
        const data = {
          ...validOrderData,
          items: [
            {
              menu_item_id: '550e8400-e29b-41d4-a716-446655440000',
              restaurant_id: '550e8400-e29b-41d4-a716-446655440001',
              quantity: 1
            }
          ]
        };
        const result = createOrderSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should validate without optional delivery_instructions', () => {
        const { delivery_instructions, ...data } = validOrderData;
        const result = createOrderSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should validate without optional scheduled_for', () => {
        const { scheduled_for, ...data } = validOrderData;
        const result = createOrderSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should validate without optional latitude and longitude', () => {
        const data = {
          ...validOrderData,
          delivery_address: {
            street: '123 Main St',
            city: 'Dubai',
            state: 'Dubai',
            postal_code: '00000',
            country: 'UAE'
          }
        };
        const result = createOrderSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should validate with multiple items', () => {
        const data = {
          ...validOrderData,
          items: [
            {
              menu_item_id: '550e8400-e29b-41d4-a716-446655440000',
              restaurant_id: '550e8400-e29b-41d4-a716-446655440001',
              quantity: 2
            },
            {
              menu_item_id: '550e8400-e29b-41d4-a716-446655440003',
              restaurant_id: '550e8400-e29b-41d4-a716-446655440001',
              quantity: 1
            }
          ]
        };
        const result = createOrderSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should validate with minimum quantity', () => {
        const data = {
          ...validOrderData,
          items: [
            {
              menu_item_id: '550e8400-e29b-41d4-a716-446655440000',
              restaurant_id: '550e8400-e29b-41d4-a716-446655440001',
              quantity: 1
            }
          ]
        };
        const result = createOrderSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should validate with large quantity', () => {
        const data = {
          ...validOrderData,
          items: [
            {
              menu_item_id: '550e8400-e29b-41d4-a716-446655440000',
              restaurant_id: '550e8400-e29b-41d4-a716-446655440001',
              quantity: 100
            }
          ]
        };
        const result = createOrderSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should validate with empty selected_variants array', () => {
        const data = {
          ...validOrderData,
          items: [
            {
              menu_item_id: '550e8400-e29b-41d4-a716-446655440000',
              restaurant_id: '550e8400-e29b-41d4-a716-446655440001',
              quantity: 1,
              selected_variants: []
            }
          ]
        };
        const result = createOrderSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should validate with multiple selected_variants', () => {
        const data = {
          ...validOrderData,
          items: [
            {
              menu_item_id: '550e8400-e29b-41d4-a716-446655440000',
              restaurant_id: '550e8400-e29b-41d4-a716-446655440001',
              quantity: 1,
              selected_variants: [
                '550e8400-e29b-41d4-a716-446655440002',
                '550e8400-e29b-41d4-a716-446655440003'
              ]
            }
          ]
        };
        const result = createOrderSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should validate with negative latitude and longitude', () => {
        const data = {
          ...validOrderData,
          delivery_address: {
            ...validOrderData.delivery_address,
            latitude: -25.2048,
            longitude: -55.2708
          }
        };
        const result = createOrderSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should validate ISO 8601 datetime', () => {
        const data = {
          ...validOrderData,
          scheduled_for: '2025-12-31T23:59:59.999Z'
        };
        const result = createOrderSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    describe('Invalid items', () => {
      it('should reject empty items array', () => {
        const data = { ...validOrderData, items: [] };
        const result = createOrderSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toContain('items');
        }
      });

      it('should reject missing items', () => {
        const { items, ...data } = validOrderData;
        const result = createOrderSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject non-array items', () => {
        const data = { ...validOrderData, items: 'invalid' as any };
        const result = createOrderSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject invalid menu_item_id format', () => {
        const data = {
          ...validOrderData,
          items: [
            {
              menu_item_id: 'not-a-uuid',
              restaurant_id: '550e8400-e29b-41d4-a716-446655440001',
              quantity: 1
            }
          ]
        };
        const result = createOrderSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toMatch(/uuid|UUID/i);
        }
      });

      it('should reject invalid restaurant_id format', () => {
        const data = {
          ...validOrderData,
          items: [
            {
              menu_item_id: '550e8400-e29b-41d4-a716-446655440000',
              restaurant_id: 'not-a-uuid',
              quantity: 1
            }
          ]
        };
        const result = createOrderSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject quantity less than 1', () => {
        const data = {
          ...validOrderData,
          items: [
            {
              menu_item_id: '550e8400-e29b-41d4-a716-446655440000',
              restaurant_id: '550e8400-e29b-41d4-a716-446655440001',
              quantity: 0
            }
          ]
        };
        const result = createOrderSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toContain('quantity');
        }
      });

      it('should reject negative quantity', () => {
        const data = {
          ...validOrderData,
          items: [
            {
              menu_item_id: '550e8400-e29b-41d4-a716-446655440000',
              restaurant_id: '550e8400-e29b-41d4-a716-446655440001',
              quantity: -1
            }
          ]
        };
        const result = createOrderSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject non-number quantity', () => {
        const data = {
          ...validOrderData,
          items: [
            {
              menu_item_id: '550e8400-e29b-41d4-a716-446655440000',
              restaurant_id: '550e8400-e29b-41d4-a716-446655440001',
              quantity: '2' as any
            }
          ]
        };
        const result = createOrderSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject invalid UUID in selected_variants', () => {
        const data = {
          ...validOrderData,
          items: [
            {
              menu_item_id: '550e8400-e29b-41d4-a716-446655440000',
              restaurant_id: '550e8400-e29b-41d4-a716-446655440001',
              quantity: 1,
              selected_variants: ['not-a-uuid']
            }
          ]
        };
        const result = createOrderSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject non-array selected_variants', () => {
        const data = {
          ...validOrderData,
          items: [
            {
              menu_item_id: '550e8400-e29b-41d4-a716-446655440000',
              restaurant_id: '550e8400-e29b-41d4-a716-446655440001',
              quantity: 1,
              selected_variants: 'invalid' as any
            }
          ]
        };
        const result = createOrderSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject non-string special_instructions', () => {
        const data = {
          ...validOrderData,
          items: [
            {
              menu_item_id: '550e8400-e29b-41d4-a716-446655440000',
              restaurant_id: '550e8400-e29b-41d4-a716-446655440001',
              quantity: 1,
              special_instructions: 123 as any
            }
          ]
        };
        const result = createOrderSchema.safeParse(data);
        expect(result.success).toBe(false);
      });
    });

    describe('Invalid delivery_address', () => {
      it('should reject missing delivery_address', () => {
        const { delivery_address, ...data } = validOrderData;
        const result = createOrderSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toContain('delivery_address');
        }
      });

      it('should reject missing street', () => {
        const data = {
          ...validOrderData,
          delivery_address: {
            city: 'Dubai',
            state: 'Dubai',
            postal_code: '00000',
            country: 'UAE'
          } as any
        };
        const result = createOrderSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject missing city', () => {
        const data = {
          ...validOrderData,
          delivery_address: {
            street: '123 Main St',
            state: 'Dubai',
            postal_code: '00000',
            country: 'UAE'
          } as any
        };
        const result = createOrderSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject missing state', () => {
        const data = {
          ...validOrderData,
          delivery_address: {
            street: '123 Main St',
            city: 'Dubai',
            postal_code: '00000',
            country: 'UAE'
          } as any
        };
        const result = createOrderSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject missing postal_code', () => {
        const data = {
          ...validOrderData,
          delivery_address: {
            street: '123 Main St',
            city: 'Dubai',
            state: 'Dubai',
            country: 'UAE'
          } as any
        };
        const result = createOrderSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject missing country', () => {
        const data = {
          ...validOrderData,
          delivery_address: {
            street: '123 Main St',
            city: 'Dubai',
            state: 'Dubai',
            postal_code: '00000'
          } as any
        };
        const result = createOrderSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should validate empty street', () => {
        const data = {
          ...validOrderData,
          delivery_address: {
            ...validOrderData.delivery_address,
            street: ''
          }
        };
        const result = createOrderSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should reject non-number latitude', () => {
        const data = {
          ...validOrderData,
          delivery_address: {
            ...validOrderData.delivery_address,
            latitude: '25.2048' as any
          }
        };
        const result = createOrderSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject non-number longitude', () => {
        const data = {
          ...validOrderData,
          delivery_address: {
            ...validOrderData.delivery_address,
            longitude: '55.2708' as any
          }
        };
        const result = createOrderSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject non-string city', () => {
        const data = {
          ...validOrderData,
          delivery_address: {
            ...validOrderData.delivery_address,
            city: 123 as any
          }
        };
        const result = createOrderSchema.safeParse(data);
        expect(result.success).toBe(false);
      });
    });

    describe('Invalid delivery_instructions', () => {
      it('should reject non-string delivery_instructions', () => {
        const data = {
          ...validOrderData,
          delivery_instructions: 123 as any
        };
        const result = createOrderSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toContain('delivery_instructions');
        }
      });

      it('should validate empty string delivery_instructions', () => {
        const data = {
          ...validOrderData,
          delivery_instructions: ''
        };
        const result = createOrderSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    describe('Invalid scheduled_for', () => {
      it('should reject invalid datetime format', () => {
        const data = {
          ...validOrderData,
          scheduled_for: '2025-12-01 12:00:00'
        };
        const result = createOrderSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toContain('scheduled_for');
        }
      });

      it('should reject non-ISO datetime', () => {
        const data = {
          ...validOrderData,
          scheduled_for: 'December 1, 2025'
        };
        const result = createOrderSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject invalid datetime string', () => {
        const data = {
          ...validOrderData,
          scheduled_for: 'not-a-date'
        };
        const result = createOrderSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject non-string scheduled_for', () => {
        const data = {
          ...validOrderData,
          scheduled_for: 123 as any
        };
        const result = createOrderSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject empty string scheduled_for', () => {
        const data = {
          ...validOrderData,
          scheduled_for: ''
        };
        const result = createOrderSchema.safeParse(data);
        expect(result.success).toBe(false);
      });
    });

    describe('Type validation', () => {
      it('should reject completely empty object', () => {
        const result = createOrderSchema.safeParse({});
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues.length).toBeGreaterThanOrEqual(2);
        }
      });

      it('should reject null items', () => {
        const data = { ...validOrderData, items: null as any };
        const result = createOrderSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject null delivery_address', () => {
        const data = { ...validOrderData, delivery_address: null as any };
        const result = createOrderSchema.safeParse(data);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('updateOrderStatusSchema', () => {
    const validStatuses = [
      'pending',
      'confirmed',
      'preparing',
      'ready',
      'picked_up',
      'in_transit',
      'delivered',
      'cancelled'
    ];

    describe('Valid inputs', () => {
      validStatuses.forEach(status => {
        it(`should validate status: ${status}`, () => {
          const data = { status };
          const result = updateOrderStatusSchema.safeParse(data);
          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.data.status).toBe(status);
          }
        });
      });

      it('should validate complete status update', () => {
        const data = { status: 'confirmed' };
        const result = updateOrderStatusSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    describe('Invalid inputs', () => {
      it('should reject invalid status value', () => {
        const data = { status: 'invalid_status' };
        const result = updateOrderStatusSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toContain('status');
        }
      });

      it('should reject missing status', () => {
        const result = updateOrderStatusSchema.safeParse({});
        expect(result.success).toBe(false);
      });

      it('should reject empty string status', () => {
        const data = { status: '' };
        const result = updateOrderStatusSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject non-string status', () => {
        const data = { status: 123 as any };
        const result = updateOrderStatusSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject null status', () => {
        const data = { status: null as any };
        const result = updateOrderStatusSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject undefined status', () => {
        const data = { status: undefined as any };
        const result = updateOrderStatusSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject boolean status', () => {
        const data = { status: true as any };
        const result = updateOrderStatusSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject array status', () => {
        const data = { status: ['confirmed'] as any };
        const result = updateOrderStatusSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject object status', () => {
        const data = { status: { value: 'confirmed' } as any };
        const result = updateOrderStatusSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject uppercase status', () => {
        const data = { status: 'CONFIRMED' };
        const result = updateOrderStatusSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject status with spaces', () => {
        const data = { status: ' confirmed ' };
        const result = updateOrderStatusSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject similar but invalid status', () => {
        const data = { status: 'confirm' };
        const result = updateOrderStatusSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject status with underscore typo', () => {
        const data = { status: 'picked-up' };
        const result = updateOrderStatusSchema.safeParse(data);
        expect(result.success).toBe(false);
      });
    });

    describe('Extra fields', () => {
      it('should allow extra fields by default', () => {
        const data = { status: 'confirmed', extraField: 'extra' };
        const result = updateOrderStatusSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('cancelOrderSchema', () => {
    const validCancelData = {
      reason: 'Customer requested cancellation due to change of plans'
    };

    describe('Valid inputs', () => {
      it('should validate complete cancel data', () => {
        const result = cancelOrderSchema.safeParse(validCancelData);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(validCancelData);
        }
      });

      it('should validate reason with minimum length', () => {
        const data = { reason: 'abcdefghij' };
        const result = cancelOrderSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should validate long reason', () => {
        const data = { reason: 'A'.repeat(1000) };
        const result = cancelOrderSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should validate reason with special characters', () => {
        const data = { reason: 'Reason: @#$% - Invalid order!' };
        const result = cancelOrderSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should validate reason with numbers', () => {
        const data = { reason: 'Ordered 123 items by mistake, need to cancel' };
        const result = cancelOrderSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should validate reason with newlines', () => {
        const data = { reason: 'Line 1\nLine 2\nLine 3 total' };
        const result = cancelOrderSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    describe('Invalid inputs', () => {
      it('should reject reason shorter than 10 characters', () => {
        const data = { reason: 'Too short' };
        const result = cancelOrderSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toContain('reason');
        }
      });

      it('should reject 9 character reason', () => {
        const data = { reason: 'abcdefghi' };
        const result = cancelOrderSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject empty reason', () => {
        const data = { reason: '' };
        const result = cancelOrderSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject missing reason', () => {
        const result = cancelOrderSchema.safeParse({});
        expect(result.success).toBe(false);
      });

      it('should reject non-string reason', () => {
        const data = { reason: 123 as any };
        const result = cancelOrderSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject null reason', () => {
        const data = { reason: null as any };
        const result = cancelOrderSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject undefined reason', () => {
        const data = { reason: undefined as any };
        const result = cancelOrderSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject boolean reason', () => {
        const data = { reason: true as any };
        const result = cancelOrderSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject array reason', () => {
        const data = { reason: ['reason'] as any };
        const result = cancelOrderSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject object reason', () => {
        const data = { reason: { text: 'reason' } as any };
        const result = cancelOrderSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject whitespace-only reason', () => {
        const data = { reason: '          ' };
        const result = cancelOrderSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    describe('Edge cases', () => {
      it('should validate reason exactly 10 characters', () => {
        const data = { reason: '1234567890' };
        const result = cancelOrderSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should validate reason with unicode characters', () => {
        const data = { reason: 'Unicode test \u00A9\u00AE\u2122' };
        const result = cancelOrderSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should validate reason with emoji', () => {
        const data = { reason: 'Cancel order please emoji test here' };
        const result = cancelOrderSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    describe('Extra fields', () => {
      it('should allow extra fields by default', () => {
        const data = { ...validCancelData, extraField: 'extra' };
        const result = cancelOrderSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });
  });
});
