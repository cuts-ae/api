import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../config/database';

export const supportLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        error: 'Email and password are required',
      });
      return;
    }

    const result = await pool.query(
      `SELECT id, email, first_name, last_name, role, password_hash
       FROM users
       WHERE email = $1 AND role = 'support'`,
      [email]
    );

    const user = result.rows[0];

    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Invalid credentials or not a support agent',
      });
      return;
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
      return;
    }

    await pool.query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name,
      },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      agent: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Error in support login:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to login',
    });
  }
};

export const getSupportAgentProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;

    const result = await pool.query(
      `SELECT id, email, first_name, last_name, role, created_at
       FROM users
       WHERE id = $1 AND role = 'support'`,
      [userId]
    );

    const user = result.rows[0];

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'Support agent not found',
      });
      return;
    }

    res.json({
      success: true,
      agent: user,
    });
  } catch (error) {
    console.error('Error getting support agent profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get profile',
    });
  }
};
