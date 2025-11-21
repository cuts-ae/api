import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWTPayload, UserRole } from '../types';
import { AuthenticationError, AuthorizationError } from './errorHandler';

export interface AuthRequest extends Request {
  user?: JWTPayload;
}

export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('AUTH_001');
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;

    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return next(error);
    }

    // Handle JWT-specific errors
    // Check TokenExpiredError first (it extends JsonWebTokenError)
    if (error instanceof jwt.TokenExpiredError) {
      return next(new AuthenticationError('AUTH_003'));
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return next(new AuthenticationError('AUTH_002'));
    }

    // Unknown error
    return next(error);
  }
};

export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AuthenticationError('AUTH_007'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      const errorDetails = {
        userRole: req.user.role,
        requiredRoles: allowedRoles
      };
      return next(new AuthorizationError('PERM_001', errorDetails));
    }

    next();
  };
};
