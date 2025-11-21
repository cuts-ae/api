import { Request, Response, NextFunction } from 'express';
import { RateLimitError } from './errorHandler';
import { ErrorCodeKey } from '../errors/error-codes';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

export interface RateLimitConfig {
  windowMs: number;
  max: number;
  errorCode?: ErrorCodeKey;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: Request) => string;
}

const store: RateLimitStore = {};

export function createRateLimiter(config: RateLimitConfig) {
  const {
    windowMs,
    max,
    errorCode = 'RATE_001',
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    keyGenerator = (req: Request) => req.ip || 'unknown'
  } = config;

  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator(req);
    const now = Date.now();

    if (!store[key] || store[key].resetTime < now) {
      store[key] = {
        count: 0,
        resetTime: now + windowMs
      };
    }

    const record = store[key];

    if (record.count >= max) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      res.set('Retry-After', String(retryAfter));
      res.set('X-RateLimit-Limit', String(max));
      res.set('X-RateLimit-Remaining', '0');
      res.set('X-RateLimit-Reset', String(record.resetTime));

      const error = new RateLimitError(errorCode, { retryAfter });
      return next(error);
    }

    record.count++;

    res.set('X-RateLimit-Limit', String(max));
    res.set('X-RateLimit-Remaining', String(Math.max(0, max - record.count)));
    res.set('X-RateLimit-Reset', String(record.resetTime));

    if (skipSuccessfulRequests || skipFailedRequests) {
      const originalSend = res.send;
      res.send = function (data) {
        const statusCode = res.statusCode;

        if (skipSuccessfulRequests && statusCode < 400) {
          record.count--;
        } else if (skipFailedRequests && statusCode >= 400) {
          record.count--;
        }

        return originalSend.call(this, data);
      };
    }

    next();
  };
}

export function resetRateLimitStore() {
  for (const key in store) {
    delete store[key];
  }
}

export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  errorCode: 'RATE_002',
  keyGenerator: (req) => `auth:${req.ip || 'unknown'}`
});

export const generalRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 100,
  errorCode: 'RATE_001',
  keyGenerator: (req) => `general:${req.ip || 'unknown'}`
});
