import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import supabase from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { OrderStatus, PaymentStatus, UserRole } from '../types';

export class OrderController {
  /**
   * Create a new order
   */
  static async create(req: AuthRequest, res: Response) {
    const { items, delivery_address, delivery_instructions, scheduled_for } =
      req.body;

    // Validate items and calculate totals
    let subtotal = 0;
    const restaurants = new Set<string>();

    for (const item of items) {
      const { data: menuItem } = await supabase
        .from('menu_items')
        .select('base_price, restaurant_id, is_available')
        .eq('id', item.menu_item_id)
        .single();

      if (!menuItem || !menuItem.is_available) {
        throw new AppError(`Menu item ${item.menu_item_id} is not available`, 400);
      }

      restaurants.add(menuItem.restaurant_id);
      subtotal += menuItem.base_price * item.quantity;
    }

    // Validate max 2 restaurants
    if (restaurants.size > 2) {
      throw new AppError('Cannot order from more than 2 restaurants', 400);
    }

    // Calculate fees
    const deliveryFee = 10; // AED 10 flat delivery fee
    const serviceFee = subtotal * 0.05; // 5% service fee
    const totalAmount = subtotal + deliveryFee + serviceFee;

    // Generate order number
    const orderNumber = `ORD-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        customer_id: req.user!.userId,
        restaurants: Array.from(restaurants),
        status: OrderStatus.PENDING,
        delivery_address,
        delivery_instructions,
        scheduled_for: scheduled_for ? new Date(scheduled_for).toISOString() : null,
        subtotal,
        delivery_fee: deliveryFee,
        service_fee: serviceFee,
        total_amount: totalAmount,
        payment_status: PaymentStatus.PENDING,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (orderError) {
      console.error('Order creation error:', orderError);
      throw new AppError('Failed to create order', 500);
    }

    // Create order items with nutritional summary
    for (const item of items) {
      const { data: menuItem } = await supabase
        .from('menu_items')
        .select('base_price, restaurant_id, nutritional_info(*)')
        .eq('id', item.menu_item_id)
        .single();

      const nutrition = menuItem?.nutritional_info?.[0];
      const nutritionalSummary = nutrition
        ? {
            calories: nutrition.calories * item.quantity,
            protein: nutrition.protein * item.quantity,
            carbohydrates: nutrition.carbohydrates * item.quantity,
            fat: nutrition.fat * item.quantity
          }
        : null;

      await supabase.from('order_items').insert({
        order_id: order.id,
        menu_item_id: item.menu_item_id,
        restaurant_id: item.restaurant_id,
        quantity: item.quantity,
        base_price: menuItem!.base_price,
        selected_variants: item.selected_variants || [],
        item_total: menuItem!.base_price * item.quantity,
        special_instructions: item.special_instructions,
        nutritional_summary: nutritionalSummary,
        created_at: new Date().toISOString()
      });
    }

    // Fetch complete order with items
    const { data: completeOrder } = await supabase
      .from('orders')
      .select('*, order_items(*, menu_items(name, image_url))')
      .eq('id', order.id)
      .single();

    res.status(201).json({
      message: 'Order created successfully',
      order: completeOrder
    });
  }

  /**
   * Get order by ID
   */
  static async getById(req: AuthRequest, res: Response) {
    const { id } = req.params;

    const { data: order, error } = await supabase
      .from('orders')
      .select('*, order_items(*, menu_items(name, image_url, restaurants(name)))')
      .eq('id', id)
      .single();

    if (error || !order) {
      throw new AppError('Order not found', 404);
    }

    // Check authorization
    if (
      order.customer_id !== req.user!.userId &&
      req.user!.role !== UserRole.ADMIN
    ) {
      // Check if user is restaurant owner
      const restaurantIds = order.restaurants;
      const { data: restaurants } = await supabase
        .from('restaurants')
        .select('id')
        .eq('owner_id', req.user!.userId)
        .in('id', restaurantIds);

      if (!restaurants || restaurants.length === 0) {
        throw new AppError('Forbidden', 403);
      }
    }

    res.json({ order });
  }

  /**
   * Get orders (role-based filtering)
   */
  static async getOrders(req: AuthRequest, res: Response) {
    const { status, restaurant_id } = req.query;

    let query = supabase
      .from('orders')
      .select('*, order_items(*, menu_items(name, image_url))');

    // Filter based on user role
    if (req.user!.role === UserRole.CUSTOMER) {
      query = query.eq('customer_id', req.user!.userId);
    } else if (req.user!.role === UserRole.RESTAURANT_OWNER) {
      // Get owner's restaurants
      const { data: restaurants } = await supabase
        .from('restaurants')
        .select('id')
        .eq('owner_id', req.user!.userId);

      const restaurantIds = restaurants?.map((r) => r.id) || [];
      query = query.overlaps('restaurants', restaurantIds);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (restaurant_id) {
      query = query.contains('restaurants', [restaurant_id]);
    }

    const { data: orders, error } = await query.order('created_at', {
      ascending: false
    });

    if (error) {
      throw new AppError('Failed to fetch orders', 500);
    }

    res.json({ orders });
  }

  /**
   * Update order status
   */
  static async updateStatus(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const { status } = req.body;

    const { data: order } = await supabase
      .from('orders')
      .select('restaurants')
      .eq('id', id)
      .single();

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    // Verify authorization (restaurant owner or admin)
    if (req.user!.role !== UserRole.ADMIN) {
      const { data: restaurants } = await supabase
        .from('restaurants')
        .select('id')
        .eq('owner_id', req.user!.userId)
        .in('id', order.restaurants);

      if (!restaurants || restaurants.length === 0) {
        throw new AppError('Forbidden', 403);
      }
    }

    const { data: updated, error } = await supabase
      .from('orders')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new AppError('Failed to update order status', 500);
    }

    res.json({
      message: 'Order status updated successfully',
      order: updated
    });
  }

  /**
   * Cancel order
   */
  static async cancel(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const { reason } = req.body;

    const { data: order } = await supabase
      .from('orders')
      .select('customer_id, status')
      .eq('id', id)
      .single();

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    // Only customer or admin can cancel
    if (
      order.customer_id !== req.user!.userId &&
      req.user!.role !== UserRole.ADMIN
    ) {
      throw new AppError('Forbidden', 403);
    }

    // Can't cancel if already picked up or delivered
    if ([OrderStatus.PICKED_UP, OrderStatus.IN_TRANSIT, OrderStatus.DELIVERED].includes(order.status)) {
      throw new AppError('Cannot cancel order at this stage', 400);
    }

    const { data: updated, error } = await supabase
      .from('orders')
      .update({
        status: OrderStatus.CANCELLED,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new AppError('Failed to cancel order', 500);
    }

    res.json({
      message: 'Order cancelled successfully',
      order: updated
    });
  }
}
