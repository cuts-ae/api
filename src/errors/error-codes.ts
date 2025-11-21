/**
 * Centralized Error Code System
 *
 * Netflix-level error code management for the Cuts.ae API.
 * Each error has a unique code, HTTP status, messages, and suggested actions.
 *
 * Error Code Categories:
 * - AUTH_xxx: Authentication errors
 * - PERM_xxx: Permission/authorization errors
 * - RATE_xxx: Rate limiting errors
 * - VAL_xxx: Validation errors
 * - ORD_xxx: Order-related errors
 * - REST_xxx: Restaurant-related errors
 * - MENU_xxx: Menu item errors
 * - USER_xxx: User errors
 * - DB_xxx: Database errors
 * - SYS_xxx: System errors
 *
 * @module errors/error-codes
 */

export interface ErrorCode {
  code: string;
  httpStatus: number;
  message: string;
  internalMessage: string;
  suggestedAction: string;
}

export interface ErrorResponse {
  success: false;
  code: string;
  message: string;
  suggestedAction: string;
  statusCode: number;
  correlationId?: string;
  details?: any;
  stack?: string;
}

/**
 * Authentication Error Codes (AUTH_xxx)
 */
export const AUTH_ERRORS = {
  AUTH_001: {
    code: 'AUTH_001',
    httpStatus: 401,
    message: 'No authentication token provided',
    internalMessage: 'Authorization header missing or does not start with Bearer',
    suggestedAction: 'Please provide a valid authentication token in the Authorization header'
  },
  AUTH_002: {
    code: 'AUTH_002',
    httpStatus: 401,
    message: 'Invalid authentication token',
    internalMessage: 'JWT verification failed',
    suggestedAction: 'Please log in again to obtain a new authentication token'
  },
  AUTH_003: {
    code: 'AUTH_003',
    httpStatus: 401,
    message: 'Authentication token has expired',
    internalMessage: 'JWT token expiration time exceeded',
    suggestedAction: 'Please log in again to refresh your authentication token'
  },
  AUTH_004: {
    code: 'AUTH_004',
    httpStatus: 401,
    message: 'Invalid credentials',
    internalMessage: 'Email or password does not match',
    suggestedAction: 'Please check your email and password and try again'
  },
  AUTH_005: {
    code: 'AUTH_005',
    httpStatus: 401,
    message: 'Account not verified',
    internalMessage: 'User account email not verified',
    suggestedAction: 'Please verify your email address before logging in'
  },
  AUTH_006: {
    code: 'AUTH_006',
    httpStatus: 401,
    message: 'Account has been suspended',
    internalMessage: 'User account status is suspended',
    suggestedAction: 'Please contact support for assistance with your account'
  },
  AUTH_007: {
    code: 'AUTH_007',
    httpStatus: 401,
    message: 'Authentication required',
    internalMessage: 'Protected endpoint accessed without authentication',
    suggestedAction: 'Please log in to access this resource'
  },
  AUTH_008: {
    code: 'AUTH_008',
    httpStatus: 401,
    message: 'Token signature verification failed',
    internalMessage: 'JWT signature invalid or token tampered',
    suggestedAction: 'Your session may have been compromised. Please log in again'
  }
} as const;

/**
 * Permission/Authorization Error Codes (PERM_xxx)
 */
export const PERM_ERRORS = {
  PERM_001: {
    code: 'PERM_001',
    httpStatus: 403,
    message: 'Insufficient permissions to access this resource',
    internalMessage: 'User role does not have access to this endpoint',
    suggestedAction: 'Contact your administrator to request appropriate permissions'
  },
  PERM_002: {
    code: 'PERM_002',
    httpStatus: 403,
    message: 'No permissions defined for this endpoint',
    internalMessage: 'Endpoint exists but has no RBAC permissions configured',
    suggestedAction: 'This endpoint is currently unavailable. Please contact support'
  },
  PERM_003: {
    code: 'PERM_003',
    httpStatus: 403,
    message: 'Access denied: Resource ownership required',
    internalMessage: 'User attempted to access resource owned by another user',
    suggestedAction: 'You can only access your own resources'
  },
  PERM_004: {
    code: 'PERM_004',
    httpStatus: 403,
    message: 'Admin access required',
    internalMessage: 'Endpoint requires ADMIN role',
    suggestedAction: 'This action requires administrator privileges'
  },
  PERM_005: {
    code: 'PERM_005',
    httpStatus: 403,
    message: 'Restaurant owner access required',
    internalMessage: 'Endpoint requires RESTAURANT_OWNER role',
    suggestedAction: 'This action requires restaurant owner privileges'
  },
  PERM_006: {
    code: 'PERM_006',
    httpStatus: 403,
    message: 'Support agent access required',
    internalMessage: 'Endpoint requires SUPPORT_AGENT role',
    suggestedAction: 'This action requires support agent privileges'
  }
} as const;

/**
 * Rate Limiting Error Codes (RATE_xxx)
 */
export const RATE_ERRORS = {
  RATE_001: {
    code: 'RATE_001',
    httpStatus: 429,
    message: 'Too many requests',
    internalMessage: 'General rate limit exceeded',
    suggestedAction: 'Please wait before making more requests'
  },
  RATE_002: {
    code: 'RATE_002',
    httpStatus: 429,
    message: 'Too many authentication attempts',
    internalMessage: 'Authentication endpoint rate limit exceeded',
    suggestedAction: 'Please wait 15 minutes before attempting to log in again'
  },
  RATE_003: {
    code: 'RATE_003',
    httpStatus: 429,
    message: 'Too many order creation requests',
    internalMessage: 'Order creation rate limit exceeded',
    suggestedAction: 'Please wait before creating another order'
  },
  RATE_004: {
    code: 'RATE_004',
    httpStatus: 429,
    message: 'Too many API requests from your IP',
    internalMessage: 'IP-based rate limit exceeded',
    suggestedAction: 'Your IP has been rate limited. Please try again later'
  }
} as const;

/**
 * Validation Error Codes (VAL_xxx)
 */
export const VAL_ERRORS = {
  VAL_001: {
    code: 'VAL_001',
    httpStatus: 400,
    message: 'Request validation failed',
    internalMessage: 'Zod schema validation failed',
    suggestedAction: 'Please check the request format and try again'
  },
  VAL_002: {
    code: 'VAL_002',
    httpStatus: 400,
    message: 'Invalid email format',
    internalMessage: 'Email field does not match email pattern',
    suggestedAction: 'Please provide a valid email address'
  },
  VAL_003: {
    code: 'VAL_003',
    httpStatus: 400,
    message: 'Invalid phone number format',
    internalMessage: 'Phone field does not match phone pattern',
    suggestedAction: 'Please provide a valid phone number'
  },
  VAL_004: {
    code: 'VAL_004',
    httpStatus: 400,
    message: 'Required field missing',
    internalMessage: 'Required field not provided in request',
    suggestedAction: 'Please provide all required fields'
  },
  VAL_005: {
    code: 'VAL_005',
    httpStatus: 400,
    message: 'Invalid UUID format',
    internalMessage: 'Field expected UUID but received invalid format',
    suggestedAction: 'Please provide a valid ID'
  },
  VAL_006: {
    code: 'VAL_006',
    httpStatus: 400,
    message: 'Invalid date format',
    internalMessage: 'Date field is not a valid ISO date',
    suggestedAction: 'Please provide a valid date in ISO format'
  },
  VAL_007: {
    code: 'VAL_007',
    httpStatus: 400,
    message: 'Value out of acceptable range',
    internalMessage: 'Numeric value outside min/max constraints',
    suggestedAction: 'Please provide a value within the acceptable range'
  },
  VAL_008: {
    code: 'VAL_008',
    httpStatus: 400,
    message: 'Invalid file type',
    internalMessage: 'Uploaded file type not in allowed types',
    suggestedAction: 'Please upload a file with an allowed file type'
  },
  VAL_009: {
    code: 'VAL_009',
    httpStatus: 400,
    message: 'File size exceeds limit',
    internalMessage: 'Uploaded file size exceeds maximum allowed',
    suggestedAction: 'Please upload a smaller file'
  },
  VAL_010: {
    code: 'VAL_010',
    httpStatus: 400,
    message: 'Password does not meet requirements',
    internalMessage: 'Password does not meet complexity requirements',
    suggestedAction: 'Password must be at least 8 characters with uppercase, lowercase, and numbers'
  }
} as const;

/**
 * Order Error Codes (ORD_xxx)
 */
export const ORD_ERRORS = {
  ORD_001: {
    code: 'ORD_001',
    httpStatus: 404,
    message: 'Order not found',
    internalMessage: 'Order ID does not exist in database',
    suggestedAction: 'Please check the order ID and try again'
  },
  ORD_002: {
    code: 'ORD_002',
    httpStatus: 400,
    message: 'Cannot order from more than 2 restaurants',
    internalMessage: 'Order contains items from more than 2 restaurants',
    suggestedAction: 'Please limit your order to items from up to 2 restaurants'
  },
  ORD_003: {
    code: 'ORD_003',
    httpStatus: 400,
    message: 'Menu item not available',
    internalMessage: 'One or more menu items marked as unavailable',
    suggestedAction: 'Please remove unavailable items and try again'
  },
  ORD_004: {
    code: 'ORD_004',
    httpStatus: 400,
    message: 'Cannot cancel order at this stage',
    internalMessage: 'Order status does not allow cancellation',
    suggestedAction: 'Order is too far in the delivery process to cancel'
  },
  ORD_005: {
    code: 'ORD_005',
    httpStatus: 400,
    message: 'Invalid order status transition',
    internalMessage: 'Attempted status change is not allowed',
    suggestedAction: 'This order status change is not permitted'
  },
  ORD_006: {
    code: 'ORD_006',
    httpStatus: 400,
    message: 'Minimum order amount not met',
    internalMessage: 'Order total below restaurant minimum',
    suggestedAction: 'Please add more items to meet the minimum order amount'
  },
  ORD_007: {
    code: 'ORD_007',
    httpStatus: 400,
    message: 'Delivery address outside service area',
    internalMessage: 'Delivery address coordinates outside restaurant service radius',
    suggestedAction: 'This restaurant does not deliver to your address'
  },
  ORD_008: {
    code: 'ORD_008',
    httpStatus: 400,
    message: 'Restaurant is currently closed',
    internalMessage: 'Order attempted outside restaurant operating hours',
    suggestedAction: 'Please order during restaurant operating hours'
  },
  ORD_009: {
    code: 'ORD_009',
    httpStatus: 400,
    message: 'Payment processing failed',
    internalMessage: 'Payment gateway returned error',
    suggestedAction: 'Please check your payment method and try again'
  },
  ORD_010: {
    code: 'ORD_010',
    httpStatus: 400,
    message: 'Order items not found',
    internalMessage: 'One or more menu items in order do not exist',
    suggestedAction: 'One or more items in your cart are no longer available'
  }
} as const;

/**
 * Restaurant Error Codes (REST_xxx)
 */
export const REST_ERRORS = {
  REST_001: {
    code: 'REST_001',
    httpStatus: 404,
    message: 'Restaurant not found',
    internalMessage: 'Restaurant ID does not exist in database',
    suggestedAction: 'Please check the restaurant ID and try again'
  },
  REST_002: {
    code: 'REST_002',
    httpStatus: 409,
    message: 'Restaurant already exists',
    internalMessage: 'Restaurant with same name and location already exists',
    suggestedAction: 'A restaurant with this name already exists at this location'
  },
  REST_003: {
    code: 'REST_003',
    httpStatus: 400,
    message: 'Restaurant is inactive',
    internalMessage: 'Restaurant status is not active',
    suggestedAction: 'This restaurant is currently not accepting orders'
  },
  REST_004: {
    code: 'REST_004',
    httpStatus: 400,
    message: 'Invalid operating hours',
    internalMessage: 'Operating hours format or values are invalid',
    suggestedAction: 'Please provide valid operating hours'
  },
  REST_005: {
    code: 'REST_005',
    httpStatus: 400,
    message: 'Invalid cuisine type',
    internalMessage: 'Provided cuisine type not in allowed list',
    suggestedAction: 'Please select a valid cuisine type'
  },
  REST_006: {
    code: 'REST_006',
    httpStatus: 403,
    message: 'Not the owner of this restaurant',
    internalMessage: 'User ID does not match restaurant owner ID',
    suggestedAction: 'You can only modify restaurants that you own'
  }
} as const;

/**
 * Menu Error Codes (MENU_xxx)
 */
export const MENU_ERRORS = {
  MENU_001: {
    code: 'MENU_001',
    httpStatus: 404,
    message: 'Menu item not found',
    internalMessage: 'Menu item ID does not exist in database',
    suggestedAction: 'Please check the menu item ID and try again'
  },
  MENU_002: {
    code: 'MENU_002',
    httpStatus: 409,
    message: 'Menu item already exists',
    internalMessage: 'Menu item with same name exists in restaurant',
    suggestedAction: 'A menu item with this name already exists'
  },
  MENU_003: {
    code: 'MENU_003',
    httpStatus: 400,
    message: 'Invalid price',
    internalMessage: 'Price must be greater than zero',
    suggestedAction: 'Please provide a valid price greater than zero'
  },
  MENU_004: {
    code: 'MENU_004',
    httpStatus: 400,
    message: 'Invalid category',
    internalMessage: 'Menu category not in allowed categories',
    suggestedAction: 'Please select a valid menu category'
  },
  MENU_005: {
    code: 'MENU_005',
    httpStatus: 400,
    message: 'Menu item is not available',
    internalMessage: 'Menu item availability flag is false',
    suggestedAction: 'This menu item is currently unavailable'
  },
  MENU_006: {
    code: 'MENU_006',
    httpStatus: 400,
    message: 'Invalid nutritional information',
    internalMessage: 'Nutritional values are negative or exceed reasonable limits',
    suggestedAction: 'Please provide valid nutritional information'
  }
} as const;

/**
 * User Error Codes (USER_xxx)
 */
export const USER_ERRORS = {
  USER_001: {
    code: 'USER_001',
    httpStatus: 404,
    message: 'User not found',
    internalMessage: 'User ID does not exist in database',
    suggestedAction: 'Please check the user ID and try again'
  },
  USER_002: {
    code: 'USER_002',
    httpStatus: 409,
    message: 'User already exists',
    internalMessage: 'User with this email already registered',
    suggestedAction: 'An account with this email already exists. Try logging in instead'
  },
  USER_003: {
    code: 'USER_003',
    httpStatus: 400,
    message: 'Invalid user role',
    internalMessage: 'Provided role is not a valid user role',
    suggestedAction: 'Please provide a valid user role'
  },
  USER_004: {
    code: 'USER_004',
    httpStatus: 400,
    message: 'Cannot change user role',
    internalMessage: 'Role change not allowed for this user type',
    suggestedAction: 'User role cannot be changed'
  },
  USER_005: {
    code: 'USER_005',
    httpStatus: 400,
    message: 'Invalid profile update',
    internalMessage: 'Profile update contains invalid or restricted fields',
    suggestedAction: 'Please check your profile information and try again'
  },
  USER_006: {
    code: 'USER_006',
    httpStatus: 400,
    message: 'Email already in use',
    internalMessage: 'Email address is already registered to another account',
    suggestedAction: 'This email is already in use. Please use a different email'
  }
} as const;

/**
 * Database Error Codes (DB_xxx)
 */
export const DB_ERRORS = {
  DB_001: {
    code: 'DB_001',
    httpStatus: 500,
    message: 'Database connection failed',
    internalMessage: 'Unable to establish connection to database',
    suggestedAction: 'Please try again later. If the problem persists, contact support'
  },
  DB_002: {
    code: 'DB_002',
    httpStatus: 500,
    message: 'Database query failed',
    internalMessage: 'SQL query execution failed',
    suggestedAction: 'An error occurred while processing your request. Please try again'
  },
  DB_003: {
    code: 'DB_003',
    httpStatus: 500,
    message: 'Database constraint violation',
    internalMessage: 'Database constraint check failed',
    suggestedAction: 'The operation violates data integrity rules'
  },
  DB_004: {
    code: 'DB_004',
    httpStatus: 500,
    message: 'Database transaction failed',
    internalMessage: 'Database transaction could not be completed',
    suggestedAction: 'The operation could not be completed. Please try again'
  },
  DB_005: {
    code: 'DB_005',
    httpStatus: 500,
    message: 'Database timeout',
    internalMessage: 'Database query exceeded maximum execution time',
    suggestedAction: 'The request is taking too long. Please try again'
  }
} as const;

/**
 * System Error Codes (SYS_xxx)
 */
export const SYS_ERRORS = {
  SYS_001: {
    code: 'SYS_001',
    httpStatus: 500,
    message: 'Internal server error',
    internalMessage: 'Unexpected error occurred',
    suggestedAction: 'An unexpected error occurred. Please try again later'
  },
  SYS_002: {
    code: 'SYS_002',
    httpStatus: 503,
    message: 'Service temporarily unavailable',
    internalMessage: 'Service is in maintenance mode or overloaded',
    suggestedAction: 'The service is temporarily unavailable. Please try again later'
  },
  SYS_003: {
    code: 'SYS_003',
    httpStatus: 500,
    message: 'Configuration error',
    internalMessage: 'Server configuration is invalid or missing',
    suggestedAction: 'A configuration error occurred. Please contact support'
  },
  SYS_004: {
    code: 'SYS_004',
    httpStatus: 404,
    message: 'Resource not found',
    internalMessage: 'Requested resource does not exist',
    suggestedAction: 'The requested resource was not found'
  },
  SYS_005: {
    code: 'SYS_005',
    httpStatus: 404,
    message: 'Route not found',
    internalMessage: 'API endpoint does not exist',
    suggestedAction: 'The requested API endpoint does not exist'
  },
  SYS_006: {
    code: 'SYS_006',
    httpStatus: 405,
    message: 'Method not allowed',
    internalMessage: 'HTTP method not supported for this endpoint',
    suggestedAction: 'This HTTP method is not allowed for this endpoint'
  },
  SYS_007: {
    code: 'SYS_007',
    httpStatus: 413,
    message: 'Request payload too large',
    internalMessage: 'Request body exceeds maximum allowed size',
    suggestedAction: 'The request is too large. Please reduce the payload size'
  },
  SYS_008: {
    code: 'SYS_008',
    httpStatus: 415,
    message: 'Unsupported media type',
    internalMessage: 'Content-Type header not supported',
    suggestedAction: 'The media type is not supported. Please use application/json'
  },
  SYS_009: {
    code: 'SYS_009',
    httpStatus: 500,
    message: 'External service error',
    internalMessage: 'External API or service call failed',
    suggestedAction: 'An external service is unavailable. Please try again later'
  },
  SYS_010: {
    code: 'SYS_010',
    httpStatus: 408,
    message: 'Request timeout',
    internalMessage: 'Request processing exceeded timeout limit',
    suggestedAction: 'The request took too long to process. Please try again'
  }
} as const;

/**
 * All error codes combined
 */
export const ERROR_CODES = {
  ...AUTH_ERRORS,
  ...PERM_ERRORS,
  ...RATE_ERRORS,
  ...VAL_ERRORS,
  ...ORD_ERRORS,
  ...REST_ERRORS,
  ...MENU_ERRORS,
  ...USER_ERRORS,
  ...DB_ERRORS,
  ...SYS_ERRORS
} as const;

/**
 * Type for all error code keys
 */
export type ErrorCodeKey = keyof typeof ERROR_CODES;

/**
 * Helper function to get error by code
 */
export function getErrorByCode(code: ErrorCodeKey): ErrorCode {
  return ERROR_CODES[code];
}

/**
 * Helper function to create error response
 */
export function createErrorResponse(
  code: ErrorCodeKey,
  correlationId?: string,
  details?: any
): ErrorResponse {
  const error = ERROR_CODES[code];
  return {
    success: false,
    code: error.code,
    message: error.message,
    suggestedAction: error.suggestedAction,
    statusCode: error.httpStatus,
    correlationId,
    details
  };
}

/**
 * Helper function to check if error code exists
 */
export function isValidErrorCode(code: string): code is ErrorCodeKey {
  return code in ERROR_CODES;
}
