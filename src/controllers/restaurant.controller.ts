import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import pool from "../config/database";
import { AppError } from "../middleware/errorHandler";
import { UserRole } from "../types";

export class RestaurantController {
  /**
   * Get all restaurants (with optional filtering)
   */
  static async getAll(req: AuthRequest, res: Response) {
    const { is_active, cuisine_type } = req.query;

    let query = "SELECT * FROM restaurants WHERE 1=1";
    const params: any[] = [];
    let paramCount = 1;

    if (is_active !== undefined) {
      query += ` AND is_active = $${paramCount}`;
      params.push(is_active === "true");
      paramCount++;
    }

    if (cuisine_type) {
      query += ` AND $${paramCount} = ANY(cuisine_type)`;
      params.push(cuisine_type);
      paramCount++;
    }

    query += " ORDER BY created_at DESC";

    const result = await pool.query(query, params);

    res.json({ restaurants: result.rows });
  }

  /**
   * Get restaurants for the logged-in owner
   */
  static async getMyRestaurants(req: AuthRequest, res: Response) {
    const result = await pool.query(
      "SELECT * FROM restaurants WHERE owner_id = $1 ORDER BY created_at DESC",
      [req.user!.userId],
    );

    // Fetch today's stats for each restaurant
    const restaurantsWithStats = await Promise.all(
      result.rows.map(async (restaurant) => {
        const statsResult = await pool.query(
          `SELECT
            COUNT(*) as orders_today,
            COALESCE(SUM(total_amount), 0) as revenue_today
          FROM orders
          WHERE restaurants @> ARRAY[$1]::uuid[]
          AND created_at >= CURRENT_DATE`,
          [restaurant.id],
        );

        const stats = statsResult.rows[0];
        return {
          ...restaurant,
          ordersToday: parseInt(stats.orders_today),
          revenue: `AED ${parseFloat(stats.revenue_today).toFixed(2)}`,
        };
      }),
    );

    res.json({ restaurants: restaurantsWithStats });
  }

  /**
   * Get single restaurant by ID or slug
   */
  static async getById(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const lookupValue = id.startsWith("@") ? id.slice(1) : id;

    // Check if UUID or slug
    const isUUID = lookupValue.includes("-") && lookupValue.length === 36;

    const result = isUUID
      ? await pool.query("SELECT * FROM restaurants WHERE id = $1", [
          lookupValue,
        ])
      : await pool.query("SELECT * FROM restaurants WHERE slug = $1", [
          lookupValue,
        ]);

    const restaurant = result.rows[0];

    if (!restaurant) {
      throw new AppError("Restaurant not found", 404);
    }

    res.json({ restaurant });
  }

  /**
   * Create a new restaurant
   */
  static async create(req: AuthRequest, res: Response) {
    const {
      name,
      description,
      cuisine_type,
      address,
      phone,
      email,
      operating_hours,
      average_prep_time,
    } = req.body;

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    // Check if slug exists
    const existing = await pool.query(
      "SELECT id FROM restaurants WHERE slug = $1",
      [slug],
    );

    if (existing.rows.length > 0) {
      throw new AppError("Restaurant with this name already exists", 400);
    }

    const result = await pool.query(
      `INSERT INTO restaurants
       (owner_id, name, slug, description, cuisine_type, address, phone, email,
        operating_hours, average_prep_time, commission_rate, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 0.15, true, NOW(), NOW())
       RETURNING *`,
      [
        req.user!.userId,
        name,
        slug,
        description,
        cuisine_type,
        JSON.stringify(address),
        phone,
        email,
        JSON.stringify(operating_hours),
        average_prep_time || 30,
      ],
    );

    res.status(201).json({
      message: "Restaurant created successfully",
      restaurant: result.rows[0],
    });
  }

  /**
   * Update restaurant
   */
  static async update(req: AuthRequest, res: Response) {
    const { id } = req.params;

    // Verify ownership
    const ownerCheck = await pool.query(
      "SELECT owner_id FROM restaurants WHERE id = $1",
      [id],
    );

    if (ownerCheck.rows.length === 0) {
      throw new AppError("Restaurant not found", 404);
    }

    const restaurant = ownerCheck.rows[0];

    if (
      restaurant.owner_id !== req.user!.userId &&
      req.user!.role !== UserRole.ADMIN
    ) {
      throw new AppError("Forbidden", 403);
    }

    // Build update query dynamically
    const fields = Object.keys(req.body);
    const values = Object.values(req.body);
    const setClause = fields
      .map((field, i) => `${field} = $${i + 2}`)
      .join(", ");

    const result = await pool.query(
      `UPDATE restaurants SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values],
    );

    res.json({
      message: "Restaurant updated successfully",
      restaurant: result.rows[0],
    });
  }

  /**
   * Update restaurant operating status
   */
  static async updateOperatingStatus(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const { operating_status } = req.body;

    // Validate status
    const validStatuses = ['open', 'not_accepting_orders', 'closed'];
    if (!validStatuses.includes(operating_status)) {
      throw new AppError('Invalid operating status', 400);
    }

    // Verify ownership
    const ownerCheck = await pool.query(
      "SELECT owner_id FROM restaurants WHERE id = $1",
      [id],
    );

    if (ownerCheck.rows.length === 0) {
      throw new AppError("Restaurant not found", 404);
    }

    const restaurant = ownerCheck.rows[0];

    if (
      restaurant.owner_id !== req.user!.userId &&
      req.user!.role !== UserRole.ADMIN
    ) {
      throw new AppError("Forbidden", 403);
    }

    // Update operating status
    const result = await pool.query(
      `UPDATE restaurants
       SET operating_status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [operating_status, id],
    );

    res.json({
      message: "Operating status updated successfully",
      restaurant: result.rows[0],
    });
  }

  /**
   * Get analytics for a restaurant
   */
  static async getAnalytics(req: AuthRequest, res: Response) {
    const { id } = req.params;

    // Verify ownership
    const ownerCheck = await pool.query(
      "SELECT owner_id FROM restaurants WHERE id = $1",
      [id],
    );

    if (ownerCheck.rows.length === 0) {
      throw new AppError("Restaurant not found", 404);
    }

    const restaurant = ownerCheck.rows[0];

    if (
      restaurant.owner_id !== req.user!.userId &&
      req.user!.role !== UserRole.ADMIN
    ) {
      throw new AppError("Forbidden", 403);
    }

    // Get today's orders
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    const ordersResult = await pool.query(
      `SELECT oi.quantity, oi.item_total, o.created_at, o.status
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       WHERE oi.restaurant_id = $1
       AND o.created_at >= $2
       AND o.created_at < $3`,
      [id, todayStart.toISOString(), tomorrowStart.toISOString()],
    );

    const totalOrders = ordersResult.rows.length;
    const totalRevenue = ordersResult.rows.reduce(
      (sum, row) => sum + parseFloat(row.item_total),
      0,
    );

    // Get top items (last 7 days)
    const weekAgo = new Date(todayStart);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const topItemsResult = await pool.query(
      `SELECT oi.menu_item_id, mi.name, SUM(oi.quantity) as count
       FROM order_items oi
       JOIN menu_items mi ON oi.menu_item_id = mi.id
       WHERE oi.restaurant_id = $1
       AND oi.created_at >= $2
       GROUP BY oi.menu_item_id, mi.name
       ORDER BY count DESC
       LIMIT 5`,
      [id, weekAgo.toISOString()],
    );

    // Get revenue by day (last 7 days)
    const revenueByDayResult = await pool.query(
      `SELECT
         DATE(o.created_at) as date,
         COUNT(DISTINCT o.id) as orders,
         SUM(oi.item_total) as revenue
       FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       WHERE oi.restaurant_id = $1
       AND o.created_at >= $2
       GROUP BY DATE(o.created_at)
       ORDER BY date ASC`,
      [id, weekAgo.toISOString()],
    );

    // Get orders by status
    const ordersByStatusResult = await pool.query(
      `SELECT
         o.status,
         COUNT(*) as count
       FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       WHERE oi.restaurant_id = $1
       AND o.created_at >= $2
       GROUP BY o.status`,
      [id, weekAgo.toISOString()],
    );

    // Get peak hours (last 7 days)
    const peakHoursResult = await pool.query(
      `SELECT
         EXTRACT(HOUR FROM o.created_at) as hour,
         COUNT(DISTINCT o.id) as orders
       FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       WHERE oi.restaurant_id = $1
       AND o.created_at >= $2
       GROUP BY EXTRACT(HOUR FROM o.created_at)
       ORDER BY hour ASC`,
      [id, weekAgo.toISOString()],
    );

    res.json({
      analytics: {
        today: {
          orders: totalOrders,
          revenue: totalRevenue,
        },
        topItems: topItemsResult.rows,
        revenueByDay: revenueByDayResult.rows.map((row) => ({
          date: row.date,
          orders: parseInt(row.orders),
          revenue: parseFloat(row.revenue),
        })),
        ordersByStatus: ordersByStatusResult.rows.map((row) => ({
          status: row.status,
          count: parseInt(row.count),
        })),
        peakHours: peakHoursResult.rows.map((row) => ({
          hour: parseInt(row.hour),
          orders: parseInt(row.orders),
        })),
      },
    });
  }
}
