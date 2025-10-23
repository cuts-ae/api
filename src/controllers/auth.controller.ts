import { Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../middleware/auth';
import supabase from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { JWTPayload, UserRole } from '../types';

export class AuthController {
  /**
   * Register a new user
   */
  static async register(req: AuthRequest, res: Response) {
    const { email, password, first_name, last_name, phone, role } = req.body;

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      throw new AppError('Email already registered', 400);
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Create user
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        email,
        password_hash,
        first_name,
        last_name,
        phone,
        role,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw new AppError('Failed to create user', 500);
    }

    // Generate JWT
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role
      } as JWTPayload,
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role
      },
      token
    });
  }

  /**
   * Login user
   */
  static async login(req: AuthRequest, res: Response) {
    const { email, password } = req.body;

    // Find user
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      throw new AppError('Invalid credentials', 401);
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      throw new AppError('Invalid credentials', 401);
    }

    // Update last login
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id);

    // Generate JWT
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role
      } as JWTPayload,
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role
      },
      token
    });
  }

  /**
   * Get current user
   */
  static async me(req: AuthRequest, res: Response) {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, role, phone, created_at')
      .eq('id', req.user!.userId)
      .single();

    if (error) {
      throw new AppError('User not found', 404);
    }

    res.json({ user });
  }
}
