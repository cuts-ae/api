import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { getAllowedRolesForEndpoint, isPublicEndpoint, hasPermission } from '../config/permissions';
import { UserRole } from '../types';

/**
 * RBAC Middleware
 *
 * Implements Role-Based Access Control for all API endpoints.
 * This middleware should be applied globally after authentication middleware.
 *
 * Security Features:
 * - Validates user permissions based on role and endpoint
 * - Logs all access attempts (granted and denied)
 * - Provides detailed error messages for debugging
 * - Fails secure (denies access if no permissions defined)
 * - Supports public endpoints (no authentication required)
 *
 * @param req - Express request object (extended with AuthRequest)
 * @param res - Express response object
 * @param next - Express next function
 */
export const rbacMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const method = req.method;
  const path = req.path;
  const timestamp = new Date().toISOString();

  // Check if endpoint is public
  if (isPublicEndpoint(method, path)) {
    console.log(`[RBAC] ${timestamp} - Public endpoint accessed: ${method} ${path}`);
    return next();
  }

  // Get allowed roles for this endpoint
  const allowedRoles = getAllowedRolesForEndpoint(method, path);

  // If no permissions defined for this endpoint, deny access (fail-secure)
  if (!allowedRoles) {
    console.error(
      `[RBAC] ${timestamp} - SECURITY WARNING: No permissions defined for ${method} ${path}. ` +
      `IP: ${req.ip}, User-Agent: ${req.get('user-agent')}`
    );
    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      message: 'No permissions defined for this endpoint'
    });
  }

  // If endpoint requires authentication but user is not authenticated
  if (!req.user) {
    console.warn(
      `[RBAC] ${timestamp} - Unauthenticated access attempt to ${method} ${path}. ` +
      `IP: ${req.ip}, User-Agent: ${req.get('user-agent')}`
    );
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Authentication required'
    });
  }

  // Check if user has permission
  const userRole = req.user.role as UserRole;
  const userId = req.user.userId;
  const userEmail = req.user.email;

  if (!hasPermission(userRole, method, path)) {
    console.warn(
      `[RBAC] ${timestamp} - Permission denied: ` +
      `User ID: ${userId}, Email: ${userEmail}, Role: ${userRole} ` +
      `attempted to access ${method} ${path}. ` +
      `Allowed roles: ${allowedRoles.join(', ')}. ` +
      `IP: ${req.ip}`
    );

    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      message: `You do not have permission to access this resource. Required roles: ${allowedRoles.join(', ')}`
    });
  }

  // Permission granted - log for audit trail
  console.log(
    `[RBAC] ${timestamp} - Permission granted: ` +
    `User ID: ${userId}, Email: ${userEmail}, Role: ${userRole} ` +
    `accessing ${method} ${path}`
  );

  next();
};

/**
 * Role-specific middleware factory
 * Creates middleware that checks if user has one of the specified roles
 *
 * @param roles - Array of allowed roles
 * @returns Express middleware function
 *
 * @example
 * router.get('/admin/dashboard', requireRole([UserRole.ADMIN]), handler);
 */
export const requireRole = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    const userRole = req.user.role as UserRole;

    if (!roles.includes(userRole)) {
      console.warn(
        `[RBAC] Role check failed: User ${req.user.email} (${userRole}) ` +
        `attempted to access restricted resource. Required roles: ${roles.join(', ')}`
      );

      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: `Insufficient permissions. Required roles: ${roles.join(', ')}`
      });
    }

    next();
  };
};

/**
 * Admin-only middleware
 * Shorthand for requireRole(UserRole.ADMIN)
 */
export const requireAdmin = requireRole(UserRole.ADMIN);

/**
 * Resource ownership validation middleware factory
 * Validates that the authenticated user owns the requested resource
 *
 * @param resourceIdParam - Name of the route parameter containing the resource ID
 * @param userIdField - Field in req.user containing the user's ID (default: 'userId')
 * @returns Express middleware function
 *
 * @example
 * router.get('/orders/:id', requireOwnership('id'), handler);
 */
export const requireOwnership = (resourceIdParam: string, userIdField: string = 'userId') => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    const resourceId = req.params[resourceIdParam];
    const userId = req.user[userIdField as keyof typeof req.user];

    // Admins bypass ownership checks
    if (req.user.role === UserRole.ADMIN) {
      return next();
    }

    if (resourceId !== userId) {
      console.warn(
        `[RBAC] Ownership validation failed: User ${req.user.email} ` +
        `attempted to access resource ${resourceId} owned by different user`
      );

      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You do not have permission to access this resource'
      });
    }

    next();
  };
};
