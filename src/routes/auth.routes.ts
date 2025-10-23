import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validate } from '../middleware/validation';
import { registerSchema, loginSchema } from '../validators/auth.validators';
import { authenticate } from '../middleware/auth';

const router = Router();

// Wrap async controllers with error handling
const asyncHandler = (fn: Function) => (req: any, res: any, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

router.post('/register', validate(registerSchema), asyncHandler(AuthController.register));
router.post('/login', validate(loginSchema), asyncHandler(AuthController.login));
router.get('/me', authenticate, asyncHandler(AuthController.me));

export default router;
