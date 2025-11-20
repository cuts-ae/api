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

    const invoiceResult = await pool.query(`
      SELECT
        i.id,
        i.order_id,
        i.invoice_number,
        i.invoice_type,
        i.amount,
        i.status,
        i.notes,
        i.created_at,
        o.order_number,
        o.total_amount,
        o.payment_status,
        COALESCE(
          (SELECT name FROM restaurants WHERE id = o.restaurants[1]),
          'Multiple'
        ) as restaurant_name,
        CONCAT(u.first_name, ' ', u.last_name) as customer_name,
        u.email as customer_email,
        u.phone as customer_phone
      FROM customer_invoices i
      JOIN orders o ON i.order_id = o.id
      JOIN users u ON o.customer_id = u.id
      WHERE i.id = $1
    `, [id]);

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Invoice not found" });
    }

    // Get order items for this invoice
    const orderItemsResult = await pool.query(`
      SELECT
        oi.id,
        oi.quantity,
        oi.base_price,
        oi.item_total,
        oi.special_instructions,
        mi.name as item_name,
        mi.description as item_description
      FROM order_items oi
      LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
      WHERE oi.order_id = $1
      ORDER BY oi.created_at
    `, [invoiceResult.rows[0].order_id]);

    res.json({
      success: true,
      data: {
        ...invoiceResult.rows[0],
        items: orderItemsResult.rows,
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
    const result = await pool.query(`
      SELECT
        i.id,
        i.order_id,
        i.invoice_number,
        i.invoice_type,
        i.amount,
        i.status,
        i.created_at,
        o.order_number,
        COALESCE(
          (SELECT name FROM restaurants WHERE id = o.restaurants[1]),
          'Multiple'
        ) as restaurant_name,
        CONCAT(u.first_name, ' ', u.last_name) as customer_name,
        u.email as customer_email
      FROM customer_invoices i
      JOIN orders o ON i.order_id = o.id
      JOIN users u ON o.customer_id = u.id
      ORDER BY i.created_at DESC
    `);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Error fetching invoices:", error);
    res.status(500).json({ success: false, error: "Failed to fetch invoices" });
  }
};

// Generate invoice
export const generateInvoice = async (req: Request, res: Response) => {
  try {
    const { order_id, invoice_type = 'standard', amount, notes } = req.body;

    if (!order_id) {
      return res.status(400).json({ success: false, error: "order_id is required" });
    }

    // Get the next invoice number for this order
    const invoiceCountResult = await pool.query(
      'SELECT COALESCE(MAX(invoice_number), 0) as max_invoice_number FROM customer_invoices WHERE order_id = $1',
      [order_id]
    );
    const nextInvoiceNumber = invoiceCountResult.rows[0].max_invoice_number + 1;

    // Get order details
    const orderResult = await pool.query('SELECT total_amount, payment_status FROM orders WHERE id = $1', [order_id]);
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    const order = orderResult.rows[0];
    const invoiceAmount = amount || order.total_amount;
    const invoiceStatus = order.payment_status || 'pending';

    // Create the invoice
    const result = await pool.query(`
      INSERT INTO customer_invoices (order_id, invoice_number, invoice_type, amount, status, notes)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [order_id, nextInvoiceNumber, invoice_type, invoiceAmount, invoiceStatus, notes || null]);

    res.json({
      success: true,
      data: result.rows[0],
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

// Get order details by ID
export const getOrderDetails = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT
        o.*,
        COALESCE(
          (SELECT name FROM restaurants WHERE id = o.restaurants[1]),
          'Multiple'
        ) as restaurant_name,
        CONCAT(u.first_name, ' ', u.last_name) as customer_name,
        u.email as customer_email,
        u.phone as customer_phone
      FROM orders o
      JOIN users u ON o.customer_id = u.id
      WHERE o.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error fetching order details:", error);
    res.status(500).json({ success: false, error: "Failed to fetch order details" });
  }
};
