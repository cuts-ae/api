import { z } from 'zod';
import { MealCategory } from '../types';

export const createMenuItemSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  image_url: z.string().url().optional(),
  base_price: z.number().min(0),
  category: z.nativeEnum(MealCategory),
  is_available: z.boolean().optional().default(true),
  prep_time: z.number().min(0).optional()
});

export const updateMenuItemSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  image_url: z.string().url().optional(),
  base_price: z.number().min(0).optional(),
  category: z.nativeEnum(MealCategory).optional(),
  is_available: z.boolean().optional(),
  prep_time: z.number().min(0).optional()
});

export const nutritionInfoSchema = z.object({
  serving_size: z.string(),
  calories: z.number().min(0),
  protein: z.number().min(0),
  carbohydrates: z.number().min(0),
  fat: z.number().min(0),
  fiber: z.number().min(0).optional(),
  sugar: z.number().min(0).optional(),
  sodium: z.number().min(0).optional(),
  allergens: z.array(z.string()).optional()
});
