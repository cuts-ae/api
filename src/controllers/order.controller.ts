import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import pool from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { OrderStatus, PaymentStatus, UserRole } from '../types';

export class OrderController {
  /**
   * Create a new order
   */
  static async create(req: AuthRequest, res: Response) {
    const { items, delivery_address, delivery_instructions, scheduled_for } = req.body;

    // Fetch all menu items in one query (PERFORMANCE OPTIMIZED)
    const menuItemIds = items.map((item: any) => item.menu_item_id);
    const menuResult = await pool.query(
      `SELECT mi.id, mi.base_price, mi.restaurant_id, mi.is_available,
              json_agg(json_build_object(
                'calories', ni.calories,
                'protein', ni.protein,
                'carbohydrates', ni.carbohydrates,
                'fat', ni.fat
              )) FILTER (WHERE ni.id IS NOT NULL) as nutritional_info
       FROM menu_items mi
       LEFT JOIN nutritional_info ni ON mi.id = ni.menu_item_id
       WHERE mi.id = ANY($1)
       GROUP BY mi.id`,
      [menuItemIds]
    );

    if (menuResult.rows.length !== items.length) {
      throw new AppError('ORD_010');
    }

    // Create lookup map
    const menuItemMap = new Map(menuResult.rows.map(item => [item.id, item]));

    // Validate and calculate totals
    let subtotal = 0;
    const restaurants = new Set<string>();

    for (const item of items) {
      const menuItem = menuItemMap.get(item.menu_item_id);

      if (!menuItem || !menuItem.is_available) {
        throw new AppError('ORD_003', { menuItemId: item.menu_item_id });
      }

      restaurants.add(menuItem.restaurant_id);
      subtotal += menuItem.base_price * item.quantity;
    }

    if (restaurants.size > 2) {
      throw new AppError('ORD_002', { restaurantCount: restaurants.size });
    }

    // Calculate fees
    const deliveryFee = 10;
    const serviceFee = subtotal * 0.05;
    const totalAmount = subtotal + deliveryFee + serviceFee;

    // Generate order number (8 characters: alphanumeric)
    const orderNumber = Math.random().toString(36).substring(2, 10).toUpperCase();

    // Create order
    const orderResult = await pool.query(
      `INSERT INTO orders
       (order_number, customer_id, restaurants, status, delivery_address, delivery_instructions,
        scheduled_for, subtotal, delivery_fee, service_fee, total_amount, payment_status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
       RETURNING *`,
      [
        orderNumber,
        req.user!.userId,
        Array.from(restaurants),
        OrderStatus.PENDING,
        JSON.stringify(delivery_address),
        delivery_instructions,
        scheduled_for ? new Date(scheduled_for).toISOString() : null,
        subtotal,
        deliveryFee,
        serviceFee,
        totalAmount,
        PaymentStatus.PENDING
      ]
    );

    const order = orderResult.rows[0];

    // Create all order items in batch (PERFORMANCE OPTIMIZED)
    const orderItemsValues = items.map((item: any) => {
      const menuItem = menuItemMap.get(item.menu_item_id);
      const nutrition = menuItem?.nutritional_info?.[0];
      const nutritionalSummary = nutrition
        ? {
            calories: nutrition.calories * item.quantity,
            protein: nutrition.protein * item.quantity,
            carbohydrates: nutrition.carbohydrates * item.quantity,
            fat: nutrition.fat * item.quantity
          }
        : null;

      return `('${order.id}', '${item.menu_item_id}', '${item.restaurant_id}', ${item.quantity}, ${menuItem.base_price}, '{}', ${menuItem.base_price * item.quantity}, ${item.special_instructions ? `'${item.special_instructions}'` : 'NULL'}, '${JSON.stringify(nutritionalSummary)}', NOW())`;
    }).join(',');

    await pool.query(
      `INSERT INTO order_items
       (order_id, menu_item_id, restaurant_id, quantity, base_price, selected_variants,
        item_total, special_instructions, nutritional_summary, created_at)
       VALUES ${orderItemsValues}`
    );

    // Fetch complete order with items
    const completeOrderResult = await pool.query(
      `SELECT o.*,
              json_agg(json_build_object(
                'id', oi.id,
                'menu_item_id', oi.menu_item_id,
                'quantity', oi.quantity,
                'base_price', oi.base_price,
                'item_total', oi.item_total,
                'special_instructions', oi.special_instructions,
                'menu_items', json_build_object(
                  'name', mi.name,
                  'image_url', mi.image_url
                )
              )) as order_items
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
       WHERE o.id = $1
       GROUP BY o.id`,
      [order.id]
    );

    res.status(201).json({
      message: 'Order created successfully',
      order: completeOrderResult.rows[0]
    });
  }

  /**
   * Get order by ID
   */
  static async getById(req: AuthRequest, res: Response) {
    const { id } = req.params;

    const orderResult = await pool.query(
      `SELECT o.*,
              json_agg(json_build_object(
                'id', oi.id,
                'menu_item_id', oi.menu_item_id,
                'quantity', oi.quantity,
                'base_price', oi.base_price,
                'item_total', oi.item_total,
                'menu_items', json_build_object(
                  'name', mi.name,
                  'image_url', mi.image_url,
                  'restaurants', json_build_object(
                    'name', r.name
                  )
                )
              )) FILTER (WHERE oi.id IS NOT NULL) as order_items
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
       LEFT JOIN restaurants r ON mi.restaurant_id = r.id
       WHERE o.id = $1
       GROUP BY o.id`,
      [id]
    );

    if (orderResult.rows.length === 0) {
      throw new AppError('ORD_001');
    }

    const order = orderResult.rows[0];

    // Check authorization
    if (
      order.customer_id !== req.user!.userId &&
      req.user!.role !== UserRole.ADMIN
    ) {
      // Check if user is restaurant owner
      const restaurantCheck = await pool.query(
        'SELECT id FROM restaurants WHERE owner_id = $1 AND id = ANY($2)',
        [req.user!.userId, order.restaurants]
      );

      if (restaurantCheck.rows.length === 0) {
        throw new AppError('PERM_003', { orderId: id });
      }
    }

    res.json({ order });
  }

  /**
   * Get orders (role-based filtering) - OPTIMIZED
   */
  static async getOrders(req: AuthRequest, res: Response) {
    const { status, restaurant_id } = req.query;

    const params: any[] = [];
    let paramCount = 1;
    let restaurantIds: string[] = [];

    // Get restaurant IDs if user is restaurant owner (single query)
    if (req.user!.role === UserRole.RESTAURANT_OWNER) {
      const restaurantsResult = await pool.query(
        'SELECT id FROM restaurants WHERE owner_id = $1',
        [req.user!.userId]
      );

      restaurantIds = restaurantsResult.rows.map(r => r.id);

      if (restaurantIds.length === 0) {
        return res.json({ orders: [] });
      }
    }

    // Optimized query with indexes
    let query = `
      SELECT o.id, o.order_number, o.status, o.total_amount, o.delivery_fee,
             o.service_fee, o.created_at, o.updated_at, o.delivery_address,
             json_build_object(
               'first_name', u.first_name,
               'last_name', u.last_name,
               'email', u.email,
               'phone', u.phone
             ) as users,
             json_agg(json_build_object(
               'id', oi.id,
               'menu_item_id', oi.menu_item_id,
               'quantity', oi.quantity,
               'base_price', oi.base_price,
               'item_total', oi.item_total,
               'special_instructions', oi.special_instructions,
               'menu_items', json_build_object(
                 'name', mi.name,
                 'image_url', mi.image_url
               )
             )) FILTER (WHERE oi.id IS NOT NULL) as order_items
      FROM orders o
      INNER JOIN users u ON o.customer_id = u.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
      WHERE 1=1
    `;

    // Filter based on user role
    if (req.user!.role === UserRole.CUSTOMER) {
      query += ` AND o.customer_id = $${paramCount}`;
      params.push(req.user!.userId);
      paramCount++;
    } else if (req.user!.role === UserRole.RESTAURANT_OWNER) {
      query += ` AND o.restaurants && $${paramCount}`;
      params.push(restaurantIds);
      paramCount++;
    }

    if (status) {
      query += ` AND o.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (restaurant_id) {
      query += ` AND $${paramCount} = ANY(o.restaurants)`;
      params.push(restaurant_id);
      paramCount++;
    }

    // Use index on created_at with DESC
    query += ` GROUP BY o.id, u.id ORDER BY o.created_at DESC LIMIT 100`;

    const result = await pool.query(query, params);

    res.json({ orders: result.rows });
  }

  /**
   * Update order status
   */
  static async updateStatus(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const { status } = req.body;

    const orderResult = await pool.query(
      'SELECT restaurants FROM orders WHERE id = $1',
      [id]
    );

    if (orderResult.rows.length === 0) {
      throw new AppError('ORD_001');
    }

    const order = orderResult.rows[0];

    // Verify authorization - Admin and Driver can update any order
    if (req.user!.role !== UserRole.ADMIN && req.user!.role !== UserRole.DRIVER) {
      // Restaurant owners can only update orders for their restaurants
      const restaurantCheck = await pool.query(
        'SELECT id FROM restaurants WHERE owner_id = $1 AND id = ANY($2)',
        [req.user!.userId, order.restaurants]
      );

      if (restaurantCheck.rows.length === 0) {
        throw new AppError('PERM_003', { orderId: id });
      }
    }

    const updateResult = await pool.query(
      'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, id]
    );

    res.json({
      message: 'Order status updated successfully',
      order: updateResult.rows[0]
    });
  }

  /**
   * Cancel order
   */
  static async cancel(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const { reason } = req.body;

    const orderResult = await pool.query(
      'SELECT customer_id, status FROM orders WHERE id = $1',
      [id]
    );

    if (orderResult.rows.length === 0) {
      throw new AppError('ORD_001');
    }

    const order = orderResult.rows[0];

    // Only customer or admin can cancel
    if (
      order.customer_id !== req.user!.userId &&
      req.user!.role !== UserRole.ADMIN
    ) {
      throw new AppError('PERM_003', { orderId: id });
    }

    // Cannot cancel if already picked up or delivered
    if ([OrderStatus.PICKED_UP, OrderStatus.IN_TRANSIT, OrderStatus.DELIVERED].includes(order.status)) {
      throw new AppError('ORD_004', { currentStatus: order.status });
    }

    const updateResult = await pool.query(
      'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [OrderStatus.CANCELLED, id]
    );

    res.json({
      message: 'Order cancelled successfully',
      order: updateResult.rows[0]
    });
  }
}
