import { z } from 'zod';

export const createRestaurantSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  cuisine_type: z.array(z.string()),
  address: z.object({
    street: z.string(),
    city: z.string(),
    state: z.string(),
    postal_code: z.string(),
    country: z.string()
  }),
  phone: z.string(),
  email: z.string().email(),
  operating_hours: z.record(z.string(), z.object({
    open: z.string(),
    close: z.string(),
    is_closed: z.boolean().optional()
  })),
  average_prep_time: z.number().min(0).optional()
});

export const updateRestaurantSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  cuisine_type: z.array(z.string()).optional(),
  address: z.object({
    street: z.string(),
    city: z.string(),
    state: z.string(),
    postal_code: z.string(),
    country: z.string()
  }).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  operating_hours: z.record(z.string(), z.object({
    open: z.string(),
    close: z.string(),
    is_closed: z.boolean().optional()
  })).optional(),
  average_prep_time: z.number().min(0).optional(),
  is_active: z.boolean().optional()
});
