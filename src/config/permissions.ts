import { UserRole } from '../types';

export type RolePermission = UserRole | '*';

export interface EndpointPermissions {
  [endpoint: string]: RolePermission[];
}

/**
 * RBAC Permissions Configuration
 *
 * This file defines role-based access control for all API endpoints.
 *
 * Roles:
 * - '*': Public access (no authentication required)
 * - ADMIN: System administrators with full access
 * - CUSTOMER: End users who place orders
 * - RESTAURANT_OWNER: Restaurant management staff
 * - DRIVER: Delivery drivers
 * - SUPPORT: Customer support agents
 *
 * Pattern matching:
 * - Use ':param' for dynamic route parameters (e.g., '/api/v1/orders/:id')
 * - Use '*' for wildcard matching (e.g., '/uploads/*')
 * - Exact matches take precedence over pattern matches
 */
export const ENDPOINT_PERMISSIONS: EndpointPermissions = {
  // ========================================
  // PUBLIC ENDPOINTS (No Authentication Required)
  // ========================================

  // Health and status checks
  'GET /': ['*'],
  'GET /health': ['*'],

  // Static file serving
  'GET /uploads/*': ['*'],

  // Seed endpoint (protected by secret key in body)
  'POST /api/v1/seed/massive': ['*'],

  // ========================================
  // AUTHENTICATION ENDPOINTS
  // ========================================

  // Public authentication
  'POST /api/v1/auth/register': ['*'],
  'POST /api/v1/auth/login': ['*'],

  // Protected authentication (requires valid token)
  'GET /api/v1/auth/me': [UserRole.ADMIN, UserRole.CUSTOMER, UserRole.RESTAURANT_OWNER, UserRole.DRIVER, UserRole.SUPPORT],
  'PUT /api/v1/auth/profile': [UserRole.ADMIN, UserRole.CUSTOMER, UserRole.RESTAURANT_OWNER, UserRole.DRIVER, UserRole.SUPPORT],

  // ========================================
  // RESTAURANT ENDPOINTS
  // ========================================

  // Public restaurant browsing
  'GET /api/v1/restaurants': ['*'],
  'GET /api/v1/restaurants/:id': ['*'],

  // Restaurant management (owners and admins only)
  'GET /api/v1/restaurants/my/restaurants': [UserRole.RESTAURANT_OWNER, UserRole.ADMIN],
  'POST /api/v1/restaurants': [UserRole.RESTAURANT_OWNER, UserRole.ADMIN],
  'PUT /api/v1/restaurants/:id': [UserRole.RESTAURANT_OWNER, UserRole.ADMIN],
  'DELETE /api/v1/restaurants/:id': [UserRole.RESTAURANT_OWNER, UserRole.ADMIN],
  'PATCH /api/v1/restaurants/:id/operating-status': [UserRole.RESTAURANT_OWNER, UserRole.ADMIN],
  'GET /api/v1/restaurants/:id/analytics': [UserRole.RESTAURANT_OWNER, UserRole.ADMIN],

  // ========================================
  // MENU ITEM ENDPOINTS
  // ========================================

  // Public menu browsing
  'GET /api/v1/restaurants/:restaurantId/menu-items': ['*'],

  // Menu management (restaurant owners and admins only)
  'POST /api/v1/restaurants/:restaurantId/menu-items': [UserRole.RESTAURANT_OWNER, UserRole.ADMIN],
  'PUT /api/v1/menu-items/:id': [UserRole.RESTAURANT_OWNER, UserRole.ADMIN],
  'DELETE /api/v1/menu-items/:id': [UserRole.RESTAURANT_OWNER, UserRole.ADMIN],
  'PATCH /api/v1/menu-items/:id/availability': [UserRole.RESTAURANT_OWNER, UserRole.ADMIN],
  'POST /api/v1/menu-items/:id/nutrition': [UserRole.RESTAURANT_OWNER, UserRole.ADMIN],

  // ========================================
  // ORDER ENDPOINTS
  // ========================================

  // Order creation (customers and admins only)
  'POST /api/v1/orders': [UserRole.CUSTOMER, UserRole.ADMIN],

  // Order retrieval (all authenticated users can view orders relevant to them)
  'GET /api/v1/orders': [UserRole.ADMIN, UserRole.CUSTOMER, UserRole.RESTAURANT_OWNER, UserRole.DRIVER],
  'GET /api/v1/orders/:id': [UserRole.ADMIN, UserRole.CUSTOMER, UserRole.RESTAURANT_OWNER, UserRole.DRIVER],

  // Order status updates (restaurant staff, drivers, and admins)
  'PATCH /api/v1/orders/:id/status': [UserRole.ADMIN, UserRole.RESTAURANT_OWNER, UserRole.DRIVER],

  // Order cancellation (customers and admins only)
  'POST /api/v1/orders/:id/cancel': [UserRole.ADMIN, UserRole.CUSTOMER],
  'PUT /api/v1/orders/:id/cancel': [UserRole.ADMIN, UserRole.CUSTOMER],

  // ========================================
  // ADMIN ENDPOINTS (Admin Only)
  // ========================================

  // Platform analytics and reporting
  'GET /api/v1/admin/analytics': [UserRole.ADMIN],

  // Restaurant management
  'GET /api/v1/admin/restaurants': [UserRole.ADMIN],
  'POST /api/v1/admin/restaurants/:id/approve': [UserRole.ADMIN],

  // Driver management
  'GET /api/v1/admin/drivers': [UserRole.ADMIN],
  'POST /api/v1/admin/drivers/:id/approve': [UserRole.ADMIN],

  // Invoice management
  'GET /api/v1/admin/invoices': [UserRole.ADMIN],
  'GET /api/v1/admin/invoices/:id': [UserRole.ADMIN],
  'POST /api/v1/admin/invoices/generate': [UserRole.ADMIN],

  // User management
  'GET /api/v1/admin/users': [UserRole.ADMIN],

  // Order oversight
  'GET /api/v1/admin/orders': [UserRole.ADMIN],

  // ========================================
  // SUPPORT TICKET ENDPOINTS
  // ========================================

  // Support authentication
  'POST /api/v1/support/auth/login': ['*'],
  'GET /api/v1/support/auth/me': [UserRole.SUPPORT, UserRole.ADMIN],

  // Public ticket creation (anyone can create a support ticket)
  'POST /api/v1/support/tickets': ['*'],

  // Ticket retrieval (authenticated users can view their tickets, support/admin can view all)
  'GET /api/v1/support/tickets': [UserRole.ADMIN, UserRole.SUPPORT, UserRole.CUSTOMER, UserRole.RESTAURANT_OWNER, UserRole.DRIVER],
  'GET /api/v1/support/tickets/:id': [UserRole.ADMIN, UserRole.SUPPORT, UserRole.CUSTOMER, UserRole.RESTAURANT_OWNER, UserRole.DRIVER],

  // Ticket communication (all authenticated users can reply to tickets)
  'POST /api/v1/support/tickets/:id/replies': [UserRole.ADMIN, UserRole.SUPPORT, UserRole.CUSTOMER, UserRole.RESTAURANT_OWNER, UserRole.DRIVER],

  // Ticket management (support staff and admins only)
  'PATCH /api/v1/support/tickets/:id/status': [UserRole.ADMIN, UserRole.SUPPORT],
  'PATCH /api/v1/support/tickets/:id/priority': [UserRole.ADMIN, UserRole.SUPPORT],

  // Convert ticket to chat session (support staff and admins only)
  'POST /api/v1/support/tickets/:id/chat': [UserRole.ADMIN, UserRole.SUPPORT],

  // ========================================
  // CHAT ENDPOINTS
  // ========================================

  // Session management
  'POST /api/v1/chat/sessions': [UserRole.ADMIN, UserRole.CUSTOMER, UserRole.RESTAURANT_OWNER, UserRole.DRIVER, UserRole.SUPPORT],

  // Session retrieval
  'GET /api/v1/chat/sessions': [UserRole.ADMIN, UserRole.SUPPORT], // All active sessions (admin/support only)
  'GET /api/v1/chat/sessions/my': [UserRole.ADMIN, UserRole.CUSTOMER, UserRole.RESTAURANT_OWNER, UserRole.DRIVER, UserRole.SUPPORT], // User's own sessions
  'GET /api/v1/chat/sessions/:sessionId': [UserRole.ADMIN, UserRole.CUSTOMER, UserRole.RESTAURANT_OWNER, UserRole.DRIVER, UserRole.SUPPORT],

  // Message operations
  'GET /api/v1/chat/sessions/:sessionId/messages': [UserRole.ADMIN, UserRole.CUSTOMER, UserRole.RESTAURANT_OWNER, UserRole.DRIVER, UserRole.SUPPORT],
  'POST /api/v1/chat/sessions/:sessionId/messages': [UserRole.ADMIN, UserRole.CUSTOMER, UserRole.RESTAURANT_OWNER, UserRole.DRIVER, UserRole.SUPPORT],
  'POST /api/v1/chat/sessions/:sessionId/read': [UserRole.ADMIN, UserRole.CUSTOMER, UserRole.RESTAURANT_OWNER, UserRole.DRIVER, UserRole.SUPPORT],

  // File uploads
  'POST /api/v1/chat/upload': [UserRole.ADMIN, UserRole.CUSTOMER, UserRole.RESTAURANT_OWNER, UserRole.DRIVER, UserRole.SUPPORT],

  // Session management (support/admin only)
  'POST /api/v1/chat/sessions/:sessionId/assign': [UserRole.ADMIN, UserRole.SUPPORT],
  'PATCH /api/v1/chat/sessions/:sessionId/status': [UserRole.ADMIN, UserRole.SUPPORT],
};

export function getAllowedRolesForEndpoint(method: string, path: string): RolePermission[] | undefined {
  const key = `${method.toUpperCase()} ${path}`;

  if (ENDPOINT_PERMISSIONS[key]) {
    return ENDPOINT_PERMISSIONS[key];
  }

  for (const pattern in ENDPOINT_PERMISSIONS) {
    const regex = patternToRegex(pattern);
    if (regex.test(key)) {
      return ENDPOINT_PERMISSIONS[pattern];
    }
  }

  return undefined;
}

function patternToRegex(pattern: string): RegExp {
  const escapedPattern = pattern
    .replace(/\//g, '\\/')
    .replace(/:\w+/g, '[^/]+')
    .replace(/\*/g, '.*');

  return new RegExp(`^${escapedPattern}$`);
}

export function isPublicEndpoint(method: string, path: string): boolean {
  const allowedRoles = getAllowedRolesForEndpoint(method, path);
  return allowedRoles?.includes('*') || false;
}

export function hasPermission(userRole: UserRole, method: string, path: string): boolean {
  const allowedRoles = getAllowedRolesForEndpoint(method, path);

  if (!allowedRoles) {
    return false;
  }

  if (allowedRoles.includes('*')) {
    return true;
  }

  return allowedRoles.includes(userRole);
}
