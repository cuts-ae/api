/**
 * Order Workflow Combinations - Combinatorial Testing
 *
 * Tests all combinations of:
 * - Order statuses (PENDING, CONFIRMED, PREPARING, READY, PICKED_UP, IN_TRANSIT, DELIVERED, CANCELLED)
 * - User roles (CUSTOMER, DRIVER, RESTAURANT_OWNER, ADMIN)
 * - Payment methods (CARD, CASH)
 * - Delivery types (STANDARD, EXPRESS)
 * - Order operations (VIEW, UPDATE_STATUS, CANCEL)
 *
 * Uses pairwise testing to efficiently test state transitions
 */

import request from 'supertest';
import express, { Express } from 'express';
import pairwise from 'pairwise';
import jwt from 'jsonwebtoken';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { UserRole, OrderStatus, PaymentStatus } from '../../types';
import { errorHandler } from '../../middleware/errorHandler';

describe('Order Workflow Combinations - Combinatorial Testing', () => {
  let app: Express;
  const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

  // Define test parameters
  const orderStatuses = [
    OrderStatus.PENDING,
    OrderStatus.CONFIRMED,
    OrderStatus.PREPARING,
    OrderStatus.READY,
    OrderStatus.PICKED_UP,
    OrderStatus.IN_TRANSIT,
    OrderStatus.DELIVERED,
    OrderStatus.CANCELLED
  ];

  const userRoles = [
    UserRole.CUSTOMER,
    UserRole.DRIVER,
    UserRole.RESTAURANT_OWNER,
    UserRole.ADMIN
  ];

  const paymentMethods = ['CARD', 'CASH'];
  const deliveryTypes = ['STANDARD', 'EXPRESS'];
  const operations = ['VIEW', 'UPDATE_STATUS', 'CANCEL'];

  // Mock order database
  const mockOrders: Map<string, any> = new Map();

  beforeEach(() => {
    mockOrders.clear();

    app = express();
    app.use(express.json());

    // View order
    app.get('/orders/:id', authenticate, (req, res) => {
      const order = mockOrders.get(req.params.id);
      if (!order) {
        return res.status(404).json({
          success: false,
          code: 'ORD_001',
          message: 'Order not found',
          statusCode: 404
        });
      }

      const user = (req as any).user;

      // Check if user can view this order
      if (user.role === UserRole.CUSTOMER && order.customerId !== user.userId) {
        return res.status(403).json({
          success: false,
          code: 'PERM_003',
          message: 'Access denied: Resource ownership required',
          statusCode: 403
        });
      }

      if (user.role === UserRole.RESTAURANT_OWNER && !order.restaurants.includes(user.restaurantId || 'none')) {
        return res.status(403).json({
          success: false,
          code: 'PERM_003',
          message: 'Access denied: Resource ownership required',
          statusCode: 403
        });
      }

      if (user.role === UserRole.DRIVER && order.driverId !== user.userId) {
        return res.status(403).json({
          success: false,
          code: 'PERM_003',
          message: 'Access denied: Resource ownership required',
          statusCode: 403
        });
      }

      res.json({ success: true, order });
    });

    // Update order status
    app.patch('/orders/:id/status', authenticate, (req, res) => {
      const order = mockOrders.get(req.params.id);
      if (!order) {
        return res.status(404).json({
          success: false,
          code: 'ORD_001',
          message: 'Order not found',
          statusCode: 404
        });
      }

      const user = (req as any).user;
      const newStatus = req.body.status;

      // Validate status transition
      const validTransitions = getValidTransitions(order.status, user.role);
      if (!validTransitions.includes(newStatus)) {
        return res.status(400).json({
          success: false,
          code: 'ORD_005',
          message: 'Invalid order status transition',
          statusCode: 400
        });
      }

      order.status = newStatus;
      res.json({ success: true, order });
    });

    // Cancel order
    app.post('/orders/:id/cancel', authenticate, (req, res) => {
      const order = mockOrders.get(req.params.id);
      if (!order) {
        return res.status(404).json({
          success: false,
          code: 'ORD_001',
          message: 'Order not found',
          statusCode: 404
        });
      }

      const user = (req as any).user;

      // Check if order can be cancelled
      const cancellableStatuses = [OrderStatus.PENDING, OrderStatus.CONFIRMED];
      if (!cancellableStatuses.includes(order.status)) {
        return res.status(400).json({
          success: false,
          code: 'ORD_004',
          message: 'Cannot cancel order at this stage',
          statusCode: 400
        });
      }

      // Check if user can cancel
      if (user.role === UserRole.CUSTOMER && order.customerId !== user.userId) {
        return res.status(403).json({
          success: false,
          code: 'PERM_003',
          message: 'Access denied: Resource ownership required',
          statusCode: 403
        });
      }

      order.status = OrderStatus.CANCELLED;
      res.json({ success: true, order });
    });

    app.use(errorHandler);
  });

  // Helper: Get valid status transitions based on current status and role
  function getValidTransitions(currentStatus: OrderStatus, role: UserRole): OrderStatus[] {
    const transitions: Record<OrderStatus, Partial<Record<UserRole, OrderStatus[]>>> = {
      [OrderStatus.PENDING]: {
        [UserRole.RESTAURANT_OWNER]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
        [UserRole.ADMIN]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED]
      },
      [OrderStatus.CONFIRMED]: {
        [UserRole.RESTAURANT_OWNER]: [OrderStatus.PREPARING],
        [UserRole.ADMIN]: [OrderStatus.PREPARING, OrderStatus.CANCELLED]
      },
      [OrderStatus.PREPARING]: {
        [UserRole.RESTAURANT_OWNER]: [OrderStatus.READY],
        [UserRole.ADMIN]: [OrderStatus.READY]
      },
      [OrderStatus.READY]: {
        [UserRole.DRIVER]: [OrderStatus.PICKED_UP],
        [UserRole.ADMIN]: [OrderStatus.PICKED_UP]
      },
      [OrderStatus.PICKED_UP]: {
        [UserRole.DRIVER]: [OrderStatus.IN_TRANSIT],
        [UserRole.ADMIN]: [OrderStatus.IN_TRANSIT]
      },
      [OrderStatus.IN_TRANSIT]: {
        [UserRole.DRIVER]: [OrderStatus.DELIVERED],
        [UserRole.ADMIN]: [OrderStatus.DELIVERED]
      },
      [OrderStatus.DELIVERED]: {},
      [OrderStatus.CANCELLED]: {}
    };

    return transitions[currentStatus]?.[role] || [];
  }

  // Helper: Create token for user
  function createToken(role: UserRole, userId: string = '123e4567-e89b-12d3-a456-426614174000'): string {
    return jwt.sign(
      {
        userId,
        email: 'test@cuts.ae',
        role,
        restaurantId: role === UserRole.RESTAURANT_OWNER ? 'rest-123' : undefined
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
  }

  // Helper: Create mock order
  function createMockOrder(
    orderId: string,
    status: OrderStatus,
    customerId: string,
    paymentMethod: string,
    deliveryType: string,
    driverId?: string
  ) {
    const order = {
      id: orderId,
      orderNumber: `ORD-${Date.now()}`,
      customerId,
      restaurants: ['rest-123'],
      status,
      paymentMethod,
      paymentStatus: paymentMethod === 'CARD' ? PaymentStatus.PAID : PaymentStatus.PENDING,
      deliveryType,
      driverId: driverId || (status === OrderStatus.PICKED_UP || status === OrderStatus.IN_TRANSIT || status === OrderStatus.DELIVERED ? 'driver-123' : undefined),
      deliveryAddress: { street: '123 Main St', city: 'Dubai', country: 'UAE' },
      subtotal: 100,
      deliveryFee: deliveryType === 'EXPRESS' ? 20 : 10,
      total: deliveryType === 'EXPRESS' ? 120 : 110,
      createdAt: new Date()
    };

    mockOrders.set(orderId, order);
    return order;
  }

  describe('Pairwise Combinations: Status x Role x Payment x Delivery x Operation', () => {
    const combinations = pairwise([
      orderStatuses,
      userRoles,
      paymentMethods,
      deliveryTypes,
      operations
    ]);

    combinations.forEach((combo, index) => {
      // Pairwise returns nested arrays, flatten them
      const flatCombo = Array.isArray(combo[0]) ? combo.flat() : combo;
      const status = flatCombo[0] as OrderStatus;
      const role = flatCombo[1] as UserRole;
      const paymentMethod = flatCombo[2] as string;
      const deliveryType = flatCombo[3] as string;
      const operation = flatCombo[4] as string;

      // Skip if any value is undefined
      if (!status || !role || !paymentMethod || !deliveryType || !operation) {
        return;
      }

      it(`Combination ${index + 1}: ${status} + ${role} + ${paymentMethod} + ${deliveryType} + ${operation}`, async () => {
        const orderId = `order-${index}`;
        const customerId = '123e4567-e89b-12d3-a456-426614174000';
        const driverId = 'driver-123';

        createMockOrder(orderId, status, customerId, paymentMethod, deliveryType, driverId);

        let token: string;
        let expectedStatus: number;

        if (operation === 'VIEW') {
          // For VIEW operation, user should be able to view their own order
          if (role === UserRole.CUSTOMER) {
            token = createToken(role, customerId);
            expectedStatus = 200;
          } else if (role === UserRole.DRIVER) {
            token = createToken(role, driverId);
            expectedStatus = 200;
          } else if (role === UserRole.RESTAURANT_OWNER) {
            token = createToken(role, 'rest-owner-123');
            expectedStatus = 200;
          } else if (role === UserRole.ADMIN) {
            token = createToken(role);
            expectedStatus = 200;
          } else {
            token = createToken(role);
            expectedStatus = 403;
          }

          const response = await request(app)
            .get(`/orders/${orderId}`)
            .set('Authorization', `Bearer ${token}`);

          expect(response.status).toBe(expectedStatus);

          if (expectedStatus === 200) {
            expect(response.body.success).toBe(true);
            expect(response.body.order.status).toBe(status);
          }
        } else if (operation === 'UPDATE_STATUS') {
          token = createToken(role);
          const validTransitions = getValidTransitions(status, role);

          if (validTransitions.length > 0) {
            const newStatus = validTransitions[0];
            const response = await request(app)
              .patch(`/orders/${orderId}/status`)
              .set('Authorization', `Bearer ${token}`)
              .send({ status: newStatus });

            expect(response.status).toBe(200);
            expect(response.body.order.status).toBe(newStatus);
          } else {
            // Try invalid transition
            const invalidStatus = OrderStatus.DELIVERED;
            const response = await request(app)
              .patch(`/orders/${orderId}/status`)
              .set('Authorization', `Bearer ${token}`)
              .send({ status: invalidStatus });

            expect(response.status).toBe(400);
            expect(response.body.code).toBe('ORD_005');
          }
        } else if (operation === 'CANCEL') {
          token = createToken(role, customerId);
          const cancellableStatuses = [OrderStatus.PENDING, OrderStatus.CONFIRMED];

          const response = await request(app)
            .post(`/orders/${orderId}/cancel`)
            .set('Authorization', `Bearer ${token}`);

          if (cancellableStatuses.includes(status)) {
            expect(response.status).toBe(200);
            expect(response.body.order.status).toBe(OrderStatus.CANCELLED);
          } else {
            expect(response.status).toBe(400);
            expect(response.body.code).toBe('ORD_004');
          }
        }
      });
    });
  });

  describe('State Transition Testing', () => {
    it('should allow valid PENDING -> CONFIRMED transition by RESTAURANT_OWNER', async () => {
      const orderId = 'order-transition-1';
      createMockOrder(orderId, OrderStatus.PENDING, 'customer-123', 'CARD', 'STANDARD');

      const token = createToken(UserRole.RESTAURANT_OWNER, 'rest-owner-123');
      const response = await request(app)
        .patch(`/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: OrderStatus.CONFIRMED });

      expect(response.status).toBe(200);
      expect(response.body.order.status).toBe(OrderStatus.CONFIRMED);
    });

    it('should reject invalid PENDING -> DELIVERED transition', async () => {
      const orderId = 'order-transition-2';
      createMockOrder(orderId, OrderStatus.PENDING, 'customer-123', 'CARD', 'STANDARD');

      const token = createToken(UserRole.ADMIN);
      const response = await request(app)
        .patch(`/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: OrderStatus.DELIVERED });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('ORD_005');
    });

    it('should allow CUSTOMER to cancel PENDING order', async () => {
      const customerId = 'customer-123';
      const orderId = 'order-cancel-1';
      createMockOrder(orderId, OrderStatus.PENDING, customerId, 'CASH', 'STANDARD');

      const token = createToken(UserRole.CUSTOMER, customerId);
      const response = await request(app)
        .post(`/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.order.status).toBe(OrderStatus.CANCELLED);
    });

    it('should reject CUSTOMER cancelling PREPARING order', async () => {
      const customerId = 'customer-123';
      const orderId = 'order-cancel-2';
      createMockOrder(orderId, OrderStatus.PREPARING, customerId, 'CARD', 'EXPRESS');

      const token = createToken(UserRole.CUSTOMER, customerId);
      const response = await request(app)
        .post(`/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('ORD_004');
    });

    it('should allow DRIVER to update READY -> PICKED_UP', async () => {
      const driverId = 'driver-123';
      const orderId = 'order-driver-1';
      createMockOrder(orderId, OrderStatus.READY, 'customer-123', 'CARD', 'STANDARD', driverId);

      const token = createToken(UserRole.DRIVER, driverId);
      const response = await request(app)
        .patch(`/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: OrderStatus.PICKED_UP });

      expect(response.status).toBe(200);
      expect(response.body.order.status).toBe(OrderStatus.PICKED_UP);
    });

    it('should reject RESTAURANT_OWNER updating READY -> DELIVERED', async () => {
      const orderId = 'order-owner-1';
      createMockOrder(orderId, OrderStatus.READY, 'customer-123', 'CARD', 'STANDARD');

      const token = createToken(UserRole.RESTAURANT_OWNER);
      const response = await request(app)
        .patch(`/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: OrderStatus.DELIVERED });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('ORD_005');
    });
  });

  describe('Payment Method Combinations', () => {
    it('should handle CARD payment with PENDING status', async () => {
      const orderId = 'order-card-1';
      createMockOrder(orderId, OrderStatus.PENDING, 'customer-123', 'CARD', 'STANDARD');

      const token = createToken(UserRole.CUSTOMER, 'customer-123');
      const response = await request(app)
        .get(`/orders/${orderId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.order.paymentMethod).toBe('CARD');
      expect(response.body.order.paymentStatus).toBe(PaymentStatus.PAID);
    });

    it('should handle CASH payment with DELIVERED status', async () => {
      const orderId = 'order-cash-1';
      createMockOrder(orderId, OrderStatus.DELIVERED, 'customer-123', 'CASH', 'EXPRESS');

      const token = createToken(UserRole.ADMIN);
      const response = await request(app)
        .get(`/orders/${orderId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.order.paymentMethod).toBe('CASH');
      expect(response.body.order.deliveryType).toBe('EXPRESS');
    });
  });

  describe('Delivery Type Combinations', () => {
    it('should apply higher delivery fee for EXPRESS orders', async () => {
      const orderId = 'order-express-1';
      createMockOrder(orderId, OrderStatus.CONFIRMED, 'customer-123', 'CARD', 'EXPRESS');

      const token = createToken(UserRole.CUSTOMER, 'customer-123');
      const response = await request(app)
        .get(`/orders/${orderId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.order.deliveryFee).toBe(20);
      expect(response.body.order.total).toBe(120);
    });

    it('should apply standard delivery fee for STANDARD orders', async () => {
      const orderId = 'order-standard-1';
      createMockOrder(orderId, OrderStatus.PREPARING, 'customer-123', 'CASH', 'STANDARD');

      const token = createToken(UserRole.RESTAURANT_OWNER);
      const response = await request(app)
        .get(`/orders/${orderId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.order.deliveryFee).toBe(10);
      expect(response.body.order.total).toBe(110);
    });
  });

  // Log summary
  afterAll(() => {
    const totalCombinations = pairwise([
      orderStatuses,
      userRoles,
      paymentMethods,
      deliveryTypes,
      operations
    ]).length;

    console.log(`\nOrder Workflow Combinations Test Summary:`);
    console.log(`- Total pairwise combinations tested: ${totalCombinations}`);
    console.log(`- Order statuses: ${orderStatuses.length}`);
    console.log(`- User roles: ${userRoles.length}`);
    console.log(`- Payment methods: ${paymentMethods.length}`);
    console.log(`- Delivery types: ${deliveryTypes.length}`);
    console.log(`- Operations: ${operations.length}`);
    console.log(`- Theoretical full combination: ${orderStatuses.length * userRoles.length * paymentMethods.length * deliveryTypes.length * operations.length} (reduced to ${totalCombinations} via pairwise)`);
  });
});
