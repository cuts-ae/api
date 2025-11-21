import { Request, Response, NextFunction } from 'express';
import sanitizeHtml from 'sanitize-html';
import validator from 'validator';

/**
 * XSS Sanitization Middleware
 *
 * Sanitizes all user input to prevent XSS attacks.
 * - Removes HTML tags from strings
 * - Validates email formats
 * - Strips dangerous JavaScript protocols
 *
 * This middleware should be applied globally to all routes.
 */

/**
 * Recursively sanitize an object's string values
 */
function sanitizeValue(value: any): any {
  if (typeof value === 'string') {
    // Remove all HTML tags - we don't allow any HTML in user input
    return sanitizeHtml(value, {
      allowedTags: [],
      allowedAttributes: {},
      disallowedTagsMode: 'recursiveEscape'
    }).trim();
  }

  if (Array.isArray(value)) {
    return value.map(item => sanitizeValue(item));
  }

  if (value && typeof value === 'object') {
    const sanitized: any = {};
    for (const key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        sanitized[key] = sanitizeValue(value[key]);
      }
    }
    return sanitized;
  }

  return value;
}

/**
 * Validate email fields specifically
 */
function validateEmail(email: string): boolean {
  // Check for valid email format
  if (!validator.isEmail(email)) {
    return false;
  }

  // Additional check: ensure no HTML tags
  const sanitized = sanitizeHtml(email, {
    allowedTags: [],
    allowedAttributes: {}
  });

  // If sanitization changed the email, it contained HTML
  return sanitized === email;
}

/**
 * Sanitization middleware
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Sanitize body
    if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
      req.body = sanitizeValue(req.body);

      // Special validation for email fields
      if (req.body.email && typeof req.body.email === 'string' && !validateEmail(req.body.email)) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Invalid email format'
        });
      }
    }

    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
      const sanitizedQuery: any = {};
      for (const key in req.query) {
        if (Object.prototype.hasOwnProperty.call(req.query, key)) {
          sanitizedQuery[key] = sanitizeValue(req.query[key]);
        }
      }
      req.query = sanitizedQuery;
    }

    // Sanitize route parameters
    if (req.params && typeof req.params === 'object') {
      const sanitizedParams: any = {};
      for (const key in req.params) {
        if (Object.prototype.hasOwnProperty.call(req.params, key)) {
          sanitizedParams[key] = sanitizeValue(req.params[key]);
        }
      }
      req.params = sanitizedParams;
    }

    next();
  } catch (error) {
    // If sanitization fails, log the error and pass request through
    console.error('[Sanitize] Error sanitizing input:', error);
    next();
  }
};

/**
 * Escape HTML entities in output
 * Use this when rendering user content
 */
export function escapeHtml(text: string): string {
  return validator.escape(text);
}

/**
 * Check if a string contains XSS patterns
 */
export function containsXSS(input: string): boolean {
  const xssPatterns = [
    /<script/i,
    /javascript:/i,
    /onerror=/i,
    /onload=/i,
    /<iframe/i,
    /<embed/i,
    /<object/i,
    /onclick=/i,
    /onmouseover=/i,
    /<svg/i,
    /<img.*src.*=/i,
  ];

  return xssPatterns.some(pattern => pattern.test(input));
}
