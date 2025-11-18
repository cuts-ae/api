import { Request, Response } from "express";
import pool from "../config/database";

// Get platform analytics
export const getAnalytics = async (req: Request, res: Response) => {
  try {
    // Get total revenue
    const revenueResult = await pool.query(
      "SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE status = 'delivered'"
    );

    // Get active orders
    const activeOrdersResult = await pool.query(
      "SELECT COUNT(*) as count FROM orders WHERE status IN ('pending', 'preparing', 'ready', 'in_transit')"
    );

    // Get total users
    const usersResult = await pool.query("SELECT COUNT(*) as count FROM users");

    // Get active restaurants
    const restaurantsResult = await pool.query(
      "SELECT COUNT(*) as count FROM restaurants WHERE is_active = true"
    );

    // Get recent orders
    const recentOrdersResult = await pool.query(`
      SELECT
        o.id,
        o.total_amount,
        o.status,
        COALESCE(
          (SELECT name FROM restaurants WHERE id = o.restaurants[1]),
          'Multiple'
        ) as restaurant
      FROM orders o
      ORDER BY o.created_at DESC
      LIMIT 5
    `);

    // Get top restaurants
    const topRestaurantsResult = await pool.query(`
      SELECT
        r.id,
        r.name,
        COUNT(DISTINCT CASE WHEN o.status = 'delivered' THEN oi.order_id END) as orders,
        COALESCE(SUM(CASE WHEN o.status = 'delivered' THEN oi.item_total ELSE 0 END), 0) as revenue
      FROM restaurants r
      LEFT JOIN order_items oi ON r.id = oi.restaurant_id
      LEFT JOIN orders o ON oi.order_id = o.id
      GROUP BY r.id, r.name
      ORDER BY revenue DESC
      LIMIT 5
    `);

    res.json({
      success: true,
      data: {
        totalRevenue: `$${parseFloat(revenueResult.rows[0].total).toFixed(2)}`,
        activeOrders: activeOrdersResult.rows[0].count,
        totalUsers: usersResult.rows[0].count,
        activeRestaurants: restaurantsResult.rows[0].count,
        recentOrders: recentOrdersResult.rows.map((order) => ({
          id: order.id,
          total: parseFloat(order.total_amount).toFixed(2),
          status: order.status,
          restaurant: order.restaurant,
        })),
        topRestaurants: topRestaurantsResult.rows.map((restaurant) => ({
          id: restaurant.id,
          name: restaurant.name,
          orders: restaurant.orders,
          revenue: parseFloat(restaurant.revenue).toFixed(2),
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    res.status(500).json({ success: false, error: "Failed to fetch analytics" });
  }
};

// Get all restaurants
export const getRestaurants = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT
        r.*,
        u.email,
        u.phone
      FROM restaurants r
      JOIN users u ON r.owner_id = u.id
      ORDER BY r.created_at DESC
    `);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Error fetching restaurants:", error);
    res.status(500).json({ success: false, error: "Failed to fetch restaurants" });
  }
};

// Approve restaurant
export const approveRestaurant = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "UPDATE restaurants SET is_active = true WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Restaurant not found" });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: "Restaurant approved successfully",
    });
  } catch (error) {
    console.error("Error approving restaurant:", error);
    res.status(500).json({ success: false, error: "Failed to approve restaurant" });
  }
};

// Get all drivers
export const getDrivers = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM users
      WHERE role = 'driver'
      ORDER BY created_at DESC
    `);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Error fetching drivers:", error);
    res.status(500).json({ success: false, error: "Failed to fetch drivers" });
  }
};

// Approve driver
export const approveDriver = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "UPDATE users SET status = 'active' WHERE id = $1 AND role = 'driver' RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Driver not found" });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: "Driver approved successfully",
    });
  } catch (error) {
    console.error("Error approving driver:", error);
    res.status(500).json({ success: false, error: "Failed to approve driver" });
  }
};

// Get invoice details by ID
export const getInvoiceDetails = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Mock implementation - return invoice details based on ID
    const invoiceResult = await pool.query(`
      SELECT
        oi.restaurant_id,
        r.name as restaurant_name,
        DATE_TRUNC('month', o.created_at) as period_start,
        DATE_TRUNC('month', o.created_at) + INTERVAL '1 month' as period_end,
        SUM(oi.item_total) as amount,
        'paid' as status,
        MIN(o.created_at) as created_at,
        json_agg(json_build_object(
          'order_id', o.id,
          'order_number', o.order_number,
          'amount', oi.item_total,
          'date', o.created_at
        )) as orders
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN restaurants r ON oi.restaurant_id = r.id
      WHERE o.status = 'delivered'
      GROUP BY oi.restaurant_id, r.name, DATE_TRUNC('month', o.created_at)
      ORDER BY period_start DESC
      LIMIT 1 OFFSET $1
    `, [parseInt(id) - 1]);

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Invoice not found" });
    }

    const invoice = invoiceResult.rows[0];

    res.json({
      success: true,
      data: {
        id: parseInt(id),
        restaurant_id: invoice.restaurant_id,
        restaurant_name: invoice.restaurant_name,
        amount: parseFloat(invoice.amount),
        status: invoice.status,
        period_start: invoice.period_start,
        period_end: invoice.period_end,
        created_at: invoice.created_at,
        orders: invoice.orders
      },
    });
  } catch (error) {
    console.error("Error fetching invoice details:", error);
    res.status(500).json({ success: false, error: "Failed to fetch invoice details" });
  }
};

// Get all invoices
export const getInvoices = async (req: Request, res: Response) => {
  try {
    // For now, generate mock invoices based on orders
    const result = await pool.query(`
      SELECT
        oi.restaurant_id,
        r.name as restaurant_name,
        DATE_TRUNC('month', o.created_at) as period_start,
        DATE_TRUNC('month', o.created_at) + INTERVAL '1 month' as period_end,
        SUM(oi.item_total) as amount,
        'paid' as status,
        MIN(o.created_at) as created_at
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN restaurants r ON oi.restaurant_id = r.id
      WHERE o.status = 'delivered'
      GROUP BY oi.restaurant_id, r.name, DATE_TRUNC('month', o.created_at)
      ORDER BY period_start DESC
    `);

    const invoices = result.rows.map((row, index) => ({
      id: index + 1,
      restaurant_id: row.restaurant_id,
      restaurant_name: row.restaurant_name,
      amount: parseFloat(row.amount),
      status: row.status,
      period_start: row.period_start,
      period_end: row.period_end,
      created_at: row.created_at,
    }));

    res.json({
      success: true,
      data: invoices,
    });
  } catch (error) {
    console.error("Error fetching invoices:", error);
    res.status(500).json({ success: false, error: "Failed to fetch invoices" });
  }
};

// Generate invoice
export const generateInvoice = async (req: Request, res: Response) => {
  try {
    // This would typically create invoice records in a dedicated table
    // For now, just return success
    res.json({
      success: true,
      message: "Invoice generated successfully",
    });
  } catch (error) {
    console.error("Error generating invoice:", error);
    res.status(500).json({ success: false, error: "Failed to generate invoice" });
  }
};

// Get all users
export const getUsers = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        first_name || ' ' || last_name as name,
        first_name,
        last_name,
        email,
        phone,
        role,
        status,
        created_at,
        updated_at
      FROM users
      ORDER BY created_at DESC
    `);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ success: false, error: "Failed to fetch users" });
  }
};

// Get all orders
export const getOrders = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT
        o.*,
        COALESCE(
          (SELECT name FROM restaurants WHERE id = o.restaurants[1]),
          'Multiple'
        ) as restaurant_name,
        CONCAT(u.first_name, ' ', u.last_name) as customer_name,
        u.email as customer_email
      FROM orders o
      JOIN users u ON o.customer_id = u.id
      ORDER BY o.created_at DESC
    `);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ success: false, error: "Failed to fetch orders" });
  }
};
