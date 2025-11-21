import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ValidationError } from './errorHandler';

export const validate = (schema: z.ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync(req.body);
      next();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return next(new ValidationError(error.issues));
      }
      next(error);
    }
  };
};
