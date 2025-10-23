import { z } from 'zod';

export const createOrderSchema = z.object({
  items: z.array(z.object({
    menu_item_id: z.string().uuid(),
    restaurant_id: z.string().uuid(),
    quantity: z.number().min(1),
    selected_variants: z.array(z.string().uuid()).optional(),
    special_instructions: z.string().optional()
  })).min(1),
  delivery_address: z.object({
    street: z.string(),
    city: z.string(),
    state: z.string(),
    postal_code: z.string(),
    country: z.string(),
    latitude: z.number().optional(),
    longitude: z.number().optional()
  }),
  delivery_instructions: z.string().optional(),
  scheduled_for: z.string().datetime().optional()
});

export const updateOrderStatusSchema = z.object({
  status: z.enum([
    'pending',
    'confirmed',
    'preparing',
    'ready',
    'picked_up',
    'in_transit',
    'delivered',
    'cancelled'
  ])
});

export const cancelOrderSchema = z.object({
  reason: z.string().min(10)
});
