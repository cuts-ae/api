import { z } from 'zod';
import { UserRole } from '../types';

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  first_name: z.string().min(2),
  last_name: z.string().min(2),
  phone: z.string().optional(),
  role: z.nativeEnum(UserRole)
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required')
});
