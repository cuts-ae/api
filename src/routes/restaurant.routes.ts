import { Router } from 'express';
import { RestaurantController } from '../controllers/restaurant.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validation';
import {
  createRestaurantSchema,
  updateRestaurantSchema
} from '../validators/restaurant.validators';
import { UserRole } from '../types';

const router = Router();

const asyncHandler = (fn: Function) => (req: any, res: any, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Public routes
router.get('/', asyncHandler(RestaurantController.getAll));
router.get('/:id', asyncHandler(RestaurantController.getById));

// Protected routes (restaurant owner only)
router.get(
  '/my/restaurants',
  authenticate,
  authorize(UserRole.RESTAURANT_OWNER, UserRole.ADMIN),
  asyncHandler(RestaurantController.getMyRestaurants)
);

router.post(
  '/',
  authenticate,
  authorize(UserRole.RESTAURANT_OWNER, UserRole.ADMIN),
  validate(createRestaurantSchema),
  asyncHandler(RestaurantController.create)
);

router.put(
  '/:id',
  authenticate,
  authorize(UserRole.RESTAURANT_OWNER, UserRole.ADMIN),
  validate(updateRestaurantSchema),
  asyncHandler(RestaurantController.update)
);

router.get(
  '/:id/analytics',
  authenticate,
  authorize(UserRole.RESTAURANT_OWNER, UserRole.ADMIN),
  asyncHandler(RestaurantController.getAnalytics)
);

router.patch(
  '/:id/operating-status',
  authenticate,
  authorize(UserRole.RESTAURANT_OWNER, UserRole.ADMIN),
  asyncHandler(RestaurantController.updateOperatingStatus)
);

export default router;
