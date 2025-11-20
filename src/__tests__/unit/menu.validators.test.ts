import { z } from 'zod';
import {
  createMenuItemSchema,
  updateMenuItemSchema,
  nutritionInfoSchema
} from '../../validators/menu.validators';
import { MealCategory } from '../../types';

describe('Menu Validators', () => {
  describe('createMenuItemSchema', () => {
    const validMenuItemData = {
      name: 'Grilled Chicken',
      description: 'Delicious grilled chicken breast with herbs',
      image_url: 'https://example.com/chicken.jpg',
      base_price: 15.99,
      category: MealCategory.LUNCH,
      is_available: true,
      prep_time: 20
    };

    describe('Valid inputs', () => {
      it('should validate complete menu item data', () => {
        const result = createMenuItemSchema.safeParse(validMenuItemData);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(validMenuItemData);
        }
      });

      it('should validate without optional description', () => {
        const { description, ...data } = validMenuItemData;
        const result = createMenuItemSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should validate without optional image_url', () => {
        const { image_url, ...data } = validMenuItemData;
        const result = createMenuItemSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should validate without optional prep_time', () => {
        const { prep_time, ...data } = validMenuItemData;
        const result = createMenuItemSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should default is_available to true when not provided', () => {
        const { is_available, ...data } = validMenuItemData;
        const result = createMenuItemSchema.safeParse(data);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.is_available).toBe(true);
        }
      });

      it('should validate with minimum name length', () => {
        const data = { ...validMenuItemData, name: 'AB' };
        const result = createMenuItemSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should validate with zero base_price', () => {
        const data = { ...validMenuItemData, base_price: 0 };
        const result = createMenuItemSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should validate with zero prep_time', () => {
        const data = { ...validMenuItemData, prep_time: 0 };
        const result = createMenuItemSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should validate all meal categories', () => {
        const categories = [
          MealCategory.BREAKFAST,
          MealCategory.LUNCH,
          MealCategory.DINNER,
          MealCategory.SNACKS,
          MealCategory.BEVERAGES
        ];

        categories.forEach(category => {
          const data = { ...validMenuItemData, category };
          const result = createMenuItemSchema.safeParse(data);
          expect(result.success).toBe(true);
        });
      });

      it('should validate with is_available false', () => {
        const data = { ...validMenuItemData, is_available: false };
        const result = createMenuItemSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should validate with large base_price', () => {
        const data = { ...validMenuItemData, base_price: 999.99 };
        const result = createMenuItemSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should validate with decimal base_price', () => {
        const data = { ...validMenuItemData, base_price: 12.345 };
        const result = createMenuItemSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should validate with long name', () => {
        const data = { ...validMenuItemData, name: 'A'.repeat(200) };
        const result = createMenuItemSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should validate with https URL', () => {
        const data = { ...validMenuItemData, image_url: 'https://example.com/image.png' };
        const result = createMenuItemSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should validate with http URL', () => {
        const data = { ...validMenuItemData, image_url: 'http://example.com/image.png' };
        const result = createMenuItemSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    describe('Invalid name', () => {
      it('should reject name shorter than 2 characters', () => {
        const data = { ...validMenuItemData, name: 'A' };
        const result = createMenuItemSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toContain('name');
        }
      });

      it('should reject empty name', () => {
        const data = { ...validMenuItemData, name: '' };
        const result = createMenuItemSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject missing name', () => {
        const { name, ...data } = validMenuItemData;
        const result = createMenuItemSchema.safeParse(data);
        expect(result.success).toBe(false);
      });
    });

    describe('Invalid image_url', () => {
      it('should reject invalid URL format', () => {
        const data = { ...validMenuItemData, image_url: 'not-a-url' };
        const result = createMenuItemSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toContain('image_url');
        }
      });

      it('should reject URL without protocol', () => {
        const data = { ...validMenuItemData, image_url: 'example.com/image.png' };
        const result = createMenuItemSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject empty URL', () => {
        const data = { ...validMenuItemData, image_url: '' };
        const result = createMenuItemSchema.safeParse(data);
        expect(result.success).toBe(false);
      });
    });

    describe('Invalid base_price', () => {
      it('should reject negative base_price', () => {
        const data = { ...validMenuItemData, base_price: -1 };
        const result = createMenuItemSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toContain('base_price');
        }
      });

      it('should reject missing base_price', () => {
        const { base_price, ...data } = validMenuItemData;
        const result = createMenuItemSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject non-number base_price', () => {
        const data = { ...validMenuItemData, base_price: '15.99' as any };
        const result = createMenuItemSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject string as base_price', () => {
        const data = { ...validMenuItemData, base_price: 'fifteen' as any };
        const result = createMenuItemSchema.safeParse(data);
        expect(result.success).toBe(false);
      });
    });

    describe('Invalid category', () => {
      it('should reject invalid category value', () => {
        const data = { ...validMenuItemData, category: 'invalid_category' as any };
        const result = createMenuItemSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toContain('category');
        }
      });

      it('should reject missing category', () => {
        const { category, ...data } = validMenuItemData;
        const result = createMenuItemSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject empty string as category', () => {
        const data = { ...validMenuItemData, category: '' as any };
        const result = createMenuItemSchema.safeParse(data);
        expect(result.success).toBe(false);
      });
    });

    describe('Invalid is_available', () => {
      it('should reject non-boolean is_available', () => {
        const data = { ...validMenuItemData, is_available: 'true' as any };
        const result = createMenuItemSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toContain('is_available');
        }
      });

      it('should reject number as is_available', () => {
        const data = { ...validMenuItemData, is_available: 1 as any };
        const result = createMenuItemSchema.safeParse(data);
        expect(result.success).toBe(false);
      });
    });

    describe('Invalid prep_time', () => {
      it('should reject negative prep_time', () => {
        const data = { ...validMenuItemData, prep_time: -1 };
        const result = createMenuItemSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toContain('prep_time');
        }
      });

      it('should reject non-number prep_time', () => {
        const data = { ...validMenuItemData, prep_time: '20' as any };
        const result = createMenuItemSchema.safeParse(data);
        expect(result.success).toBe(false);
      });
    });

    describe('Type validation', () => {
      it('should reject non-string name', () => {
        const data = { ...validMenuItemData, name: 123 as any };
        const result = createMenuItemSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject non-string description', () => {
        const data = { ...validMenuItemData, description: 123 as any };
        const result = createMenuItemSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject null values', () => {
        const data = { ...validMenuItemData, name: null as any };
        const result = createMenuItemSchema.safeParse(data);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('updateMenuItemSchema', () => {
    const validUpdateData = {
      name: 'Updated Chicken',
      description: 'Updated description',
      image_url: 'https://example.com/updated.jpg',
      base_price: 19.99,
      category: MealCategory.DINNER,
      is_available: false,
      prep_time: 25
    };

    describe('Valid inputs', () => {
      it('should validate complete update data', () => {
        const result = updateMenuItemSchema.safeParse(validUpdateData);
        expect(result.success).toBe(true);
      });

      it('should validate with only name', () => {
        const data = { name: 'Updated Name' };
        const result = updateMenuItemSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should validate with only description', () => {
        const data = { description: 'Updated description' };
        const result = updateMenuItemSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should validate with only image_url', () => {
        const data = { image_url: 'https://example.com/new.jpg' };
        const result = updateMenuItemSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should validate with only base_price', () => {
        const data = { base_price: 25.99 };
        const result = updateMenuItemSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should validate with only category', () => {
        const data = { category: MealCategory.BREAKFAST };
        const result = updateMenuItemSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should validate with only is_available', () => {
        const data = { is_available: true };
        const result = updateMenuItemSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should validate with only prep_time', () => {
        const data = { prep_time: 30 };
        const result = updateMenuItemSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should validate empty object', () => {
        const result = updateMenuItemSchema.safeParse({});
        expect(result.success).toBe(true);
      });

      it('should validate partial update with multiple fields', () => {
        const data = { name: 'New Name', base_price: 29.99 };
        const result = updateMenuItemSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should validate with undefined description', () => {
        const data = { description: undefined };
        const result = updateMenuItemSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should validate with undefined image_url', () => {
        const data = { image_url: undefined };
        const result = updateMenuItemSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    describe('Invalid name when provided', () => {
      it('should reject name shorter than 2 characters', () => {
        const data = { name: 'A' };
        const result = updateMenuItemSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toContain('name');
        }
      });

      it('should reject empty name', () => {
        const data = { name: '' };
        const result = updateMenuItemSchema.safeParse(data);
        expect(result.success).toBe(false);
      });
    });

    describe('Invalid image_url when provided', () => {
      it('should reject invalid URL format', () => {
        const data = { image_url: 'not-a-url' };
        const result = updateMenuItemSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toContain('image_url');
        }
      });

      it('should reject empty URL', () => {
        const data = { image_url: '' };
        const result = updateMenuItemSchema.safeParse(data);
        expect(result.success).toBe(false);
      });
    });

    describe('Invalid base_price when provided', () => {
      it('should reject negative base_price', () => {
        const data = { base_price: -1 };
        const result = updateMenuItemSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toContain('base_price');
        }
      });

      it('should reject string as base_price', () => {
        const data = { base_price: '15.99' as any };
        const result = updateMenuItemSchema.safeParse(data);
        expect(result.success).toBe(false);
      });
    });

    describe('Invalid category when provided', () => {
      it('should reject invalid category value', () => {
        const data = { category: 'invalid_category' as any };
        const result = updateMenuItemSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toContain('category');
        }
      });
    });

    describe('Invalid is_available when provided', () => {
      it('should reject non-boolean is_available', () => {
        const data = { is_available: 'true' as any };
        const result = updateMenuItemSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toContain('is_available');
        }
      });
    });

    describe('Invalid prep_time when provided', () => {
      it('should reject negative prep_time', () => {
        const data = { prep_time: -1 };
        const result = updateMenuItemSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toContain('prep_time');
        }
      });

      it('should reject string as prep_time', () => {
        const data = { prep_time: '20' as any };
        const result = updateMenuItemSchema.safeParse(data);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('nutritionInfoSchema', () => {
    const validNutritionData = {
      serving_size: '100g',
      calories: 250,
      protein: 30,
      carbohydrates: 20,
      fat: 10,
      fiber: 5,
      sugar: 3,
      sodium: 500,
      allergens: ['nuts', 'dairy']
    };

    describe('Valid inputs', () => {
      it('should validate complete nutrition data', () => {
        const result = nutritionInfoSchema.safeParse(validNutritionData);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(validNutritionData);
        }
      });

      it('should validate without optional fiber', () => {
        const { fiber, ...data } = validNutritionData;
        const result = nutritionInfoSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should validate without optional sugar', () => {
        const { sugar, ...data } = validNutritionData;
        const result = nutritionInfoSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should validate without optional sodium', () => {
        const { sodium, ...data } = validNutritionData;
        const result = nutritionInfoSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should validate without optional allergens', () => {
        const { allergens, ...data } = validNutritionData;
        const result = nutritionInfoSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should validate with zero values', () => {
        const data = {
          serving_size: '100g',
          calories: 0,
          protein: 0,
          carbohydrates: 0,
          fat: 0,
          fiber: 0,
          sugar: 0,
          sodium: 0
        };
        const result = nutritionInfoSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should validate with empty allergens array', () => {
        const data = { ...validNutritionData, allergens: [] };
        const result = nutritionInfoSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should validate with single allergen', () => {
        const data = { ...validNutritionData, allergens: ['gluten'] };
        const result = nutritionInfoSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should validate with multiple allergens', () => {
        const data = { ...validNutritionData, allergens: ['nuts', 'dairy', 'eggs', 'soy'] };
        const result = nutritionInfoSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should validate with decimal values', () => {
        const data = {
          ...validNutritionData,
          calories: 250.5,
          protein: 30.25,
          carbohydrates: 20.75,
          fat: 10.5
        };
        const result = nutritionInfoSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should validate with large numbers', () => {
        const data = {
          ...validNutritionData,
          calories: 9999,
          protein: 999,
          carbohydrates: 999,
          fat: 999
        };
        const result = nutritionInfoSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    describe('Invalid serving_size', () => {
      it('should reject missing serving_size', () => {
        const { serving_size, ...data } = validNutritionData;
        const result = nutritionInfoSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toContain('serving_size');
        }
      });

      it('should reject non-string serving_size', () => {
        const data = { ...validNutritionData, serving_size: 100 as any };
        const result = nutritionInfoSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should validate empty string serving_size', () => {
        const data = { ...validNutritionData, serving_size: '' };
        const result = nutritionInfoSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    describe('Invalid calories', () => {
      it('should reject negative calories', () => {
        const data = { ...validNutritionData, calories: -1 };
        const result = nutritionInfoSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toContain('calories');
        }
      });

      it('should reject missing calories', () => {
        const { calories, ...data } = validNutritionData;
        const result = nutritionInfoSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject non-number calories', () => {
        const data = { ...validNutritionData, calories: '250' as any };
        const result = nutritionInfoSchema.safeParse(data);
        expect(result.success).toBe(false);
      });
    });

    describe('Invalid protein', () => {
      it('should reject negative protein', () => {
        const data = { ...validNutritionData, protein: -1 };
        const result = nutritionInfoSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toContain('protein');
        }
      });

      it('should reject missing protein', () => {
        const { protein, ...data } = validNutritionData;
        const result = nutritionInfoSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject non-number protein', () => {
        const data = { ...validNutritionData, protein: '30' as any };
        const result = nutritionInfoSchema.safeParse(data);
        expect(result.success).toBe(false);
      });
    });

    describe('Invalid carbohydrates', () => {
      it('should reject negative carbohydrates', () => {
        const data = { ...validNutritionData, carbohydrates: -1 };
        const result = nutritionInfoSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toContain('carbohydrates');
        }
      });

      it('should reject missing carbohydrates', () => {
        const { carbohydrates, ...data } = validNutritionData;
        const result = nutritionInfoSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject non-number carbohydrates', () => {
        const data = { ...validNutritionData, carbohydrates: '20' as any };
        const result = nutritionInfoSchema.safeParse(data);
        expect(result.success).toBe(false);
      });
    });

    describe('Invalid fat', () => {
      it('should reject negative fat', () => {
        const data = { ...validNutritionData, fat: -1 };
        const result = nutritionInfoSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toContain('fat');
        }
      });

      it('should reject missing fat', () => {
        const { fat, ...data } = validNutritionData;
        const result = nutritionInfoSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject non-number fat', () => {
        const data = { ...validNutritionData, fat: '10' as any };
        const result = nutritionInfoSchema.safeParse(data);
        expect(result.success).toBe(false);
      });
    });

    describe('Invalid fiber when provided', () => {
      it('should reject negative fiber', () => {
        const data = { ...validNutritionData, fiber: -1 };
        const result = nutritionInfoSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toContain('fiber');
        }
      });

      it('should reject non-number fiber', () => {
        const data = { ...validNutritionData, fiber: '5' as any };
        const result = nutritionInfoSchema.safeParse(data);
        expect(result.success).toBe(false);
      });
    });

    describe('Invalid sugar when provided', () => {
      it('should reject negative sugar', () => {
        const data = { ...validNutritionData, sugar: -1 };
        const result = nutritionInfoSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toContain('sugar');
        }
      });

      it('should reject non-number sugar', () => {
        const data = { ...validNutritionData, sugar: '3' as any };
        const result = nutritionInfoSchema.safeParse(data);
        expect(result.success).toBe(false);
      });
    });

    describe('Invalid sodium when provided', () => {
      it('should reject negative sodium', () => {
        const data = { ...validNutritionData, sodium: -1 };
        const result = nutritionInfoSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toContain('sodium');
        }
      });

      it('should reject non-number sodium', () => {
        const data = { ...validNutritionData, sodium: '500' as any };
        const result = nutritionInfoSchema.safeParse(data);
        expect(result.success).toBe(false);
      });
    });

    describe('Invalid allergens when provided', () => {
      it('should reject non-array allergens', () => {
        const data = { ...validNutritionData, allergens: 'nuts' as any };
        const result = nutritionInfoSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toContain('allergens');
        }
      });

      it('should reject array with non-string elements', () => {
        const data = { ...validNutritionData, allergens: [1, 2, 3] as any };
        const result = nutritionInfoSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject array with mixed types', () => {
        const data = { ...validNutritionData, allergens: ['nuts', 123, true] as any };
        const result = nutritionInfoSchema.safeParse(data);
        expect(result.success).toBe(false);
      });
    });

    describe('Type validation', () => {
      it('should reject null values for required fields', () => {
        const data = { ...validNutritionData, calories: null as any };
        const result = nutritionInfoSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject undefined values for required fields', () => {
        const data = { ...validNutritionData, protein: undefined as any };
        const result = nutritionInfoSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject boolean values', () => {
        const data = { ...validNutritionData, carbohydrates: true as any };
        const result = nutritionInfoSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject object values', () => {
        const data = { ...validNutritionData, fat: {} as any };
        const result = nutritionInfoSchema.safeParse(data);
        expect(result.success).toBe(false);
      });
    });

    describe('Multiple validation errors', () => {
      it('should report all validation errors', () => {
        const invalidData = {
          serving_size: 123,
          calories: -1,
          protein: -1,
          carbohydrates: 'invalid',
          fat: null
        };
        const result = nutritionInfoSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues.length).toBeGreaterThan(1);
        }
      });
    });
  });
});
