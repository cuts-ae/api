import { Router } from 'express';
import { OrderController } from '../controllers/order.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import {
  createOrderSchema,
  updateOrderStatusSchema,
  cancelOrderSchema
} from '../validators/order.validators';

const router = Router();

const asyncHandler = (fn: Function) => (req: any, res: any, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// All order routes require authentication
router.use(authenticate);

router.post('/', validate(createOrderSchema), asyncHandler(OrderController.create));
router.get('/', asyncHandler(OrderController.getOrders));
router.get('/:id', asyncHandler(OrderController.getById));
router.patch(
  '/:id/status',
  validate(updateOrderStatusSchema),
  asyncHandler(OrderController.updateStatus)
);
router.post(
  '/:id/cancel',
  validate(cancelOrderSchema),
  asyncHandler(OrderController.cancel)
);

export default router;
