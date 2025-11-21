/**
 * Error Handling Exports
 *
 * Central export point for all error-related functionality
 */

export {
  // Error Code Types
  ErrorCode,
  ErrorResponse,
  ErrorCodeKey,

  // Error Code Constants
  ERROR_CODES,
  AUTH_ERRORS,
  PERM_ERRORS,
  RATE_ERRORS,
  VAL_ERRORS,
  ORD_ERRORS,
  REST_ERRORS,
  MENU_ERRORS,
  USER_ERRORS,
  DB_ERRORS,
  SYS_ERRORS,

  // Helper Functions
  getErrorByCode,
  createErrorResponse,
  isValidErrorCode
} from './error-codes';

export {
  // Error Classes
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  DatabaseError,

  // Error Handler Middleware
  errorHandler,
  asyncHandler,
  notFoundHandler
} from '../middleware/errorHandler';
