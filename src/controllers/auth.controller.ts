import { Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../middleware/auth';
import pool from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { JWTPayload, UserRole } from '../types';

export class AuthController {
  /**
   * Register a new user
   */
  static async register(req: AuthRequest, res: Response) {
    const { email, password, first_name, last_name, phone, role } = req.body;

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      throw new AppError('Email already registered', 400);
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Create user
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, phone, role, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING id, email, first_name, last_name, role`,
      [email, password_hash, first_name, last_name, phone, role]
    );

    const user = result.rows[0];

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
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    const user = result.rows[0];

    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      throw new AppError('Invalid credentials', 401);
    }

    // Update last login
    await pool.query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );

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
    const result = await pool.query(
      'SELECT id, email, first_name, last_name, role, phone, created_at FROM users WHERE id = $1',
      [req.user!.userId]
    );

    const user = result.rows[0];

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.json({ user });
  }
}
