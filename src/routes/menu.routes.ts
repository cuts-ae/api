import { Router } from 'express';
import { MenuController } from '../controllers/menu.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validation';
import {
  createMenuItemSchema,
  updateMenuItemSchema,
  nutritionInfoSchema
} from '../validators/menu.validators';
import { UserRole } from '../types';

const router = Router();

const asyncHandler = (fn: Function) => (req: any, res: any, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Public routes
router.get('/restaurants/:restaurantId/menu-items', asyncHandler(MenuController.getMenuItems));

// Protected routes
router.post(
  '/restaurants/:restaurantId/menu-items',
  authenticate,
  authorize(UserRole.RESTAURANT_OWNER, UserRole.ADMIN),
  validate(createMenuItemSchema),
  asyncHandler(MenuController.createMenuItem)
);

router.put(
  '/menu-items/:id',
  authenticate,
  authorize(UserRole.RESTAURANT_OWNER, UserRole.ADMIN),
  validate(updateMenuItemSchema),
  asyncHandler(MenuController.updateMenuItem)
);

router.delete(
  '/menu-items/:id',
  authenticate,
  authorize(UserRole.RESTAURANT_OWNER, UserRole.ADMIN),
  asyncHandler(MenuController.deleteMenuItem)
);

router.patch(
  '/menu-items/:id/availability',
  authenticate,
  authorize(UserRole.RESTAURANT_OWNER, UserRole.ADMIN),
  asyncHandler(MenuController.toggleAvailability)
);

router.post(
  '/menu-items/:id/nutrition',
  authenticate,
  authorize(UserRole.RESTAURANT_OWNER, UserRole.ADMIN),
  validate(nutritionInfoSchema),
  asyncHandler(MenuController.addNutrition)
);

export default router;
