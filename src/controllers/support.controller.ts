import { Request, Response } from "express";
import pool from "../config/database";
import chatService from "../services/chat.service";

// Get all support tickets with optional filtering
export const getTickets = async (req: Request, res: Response) => {
  try {
    const { status, priority, order_id } = req.query;

    let query = `
      SELECT
        t.*,
        u.first_name || ' ' || u.last_name as created_by_name,
        u.email as created_by_email,
        COUNT(sm.id) as reply_count,
        MAX(sm.created_at) as last_reply_at
      FROM support_tickets t
      LEFT JOIN users u ON t.created_by = u.id
      LEFT JOIN support_messages sm ON t.id = sm.ticket_id
      WHERE 1=1
    `;

    const queryParams: any[] = [];
    let paramIndex = 1;

    if (status) {
      query += ` AND t.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }

    if (priority) {
      query += ` AND t.priority = $${paramIndex}`;
      queryParams.push(priority);
      paramIndex++;
    }

    if (order_id) {
      query += ` AND t.order_id = $${paramIndex}`;
      queryParams.push(order_id);
      paramIndex++;
    }

    query += `
      GROUP BY t.id, u.first_name, u.last_name, u.email
      ORDER BY
        CASE t.priority
          WHEN 'urgent' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
        END,
        t.created_at DESC
    `;

    const result = await pool.query(query, queryParams);

    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error("Error fetching tickets:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch support tickets"
    });
  }
};

// Get ticket details with all replies
export const getTicketById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Get ticket details
    const ticketQuery = `
      SELECT
        t.*,
        u.first_name || ' ' || u.last_name as created_by_name,
        u.email as created_by_email,
        u.phone as created_by_phone
      FROM support_tickets t
      LEFT JOIN users u ON t.created_by = u.id
      WHERE t.id = $1
    `;

    const ticketResult = await pool.query(ticketQuery, [id]);

    if (ticketResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Ticket not found"
      });
    }

    // Get all messages/replies
    const messagesQuery = `
      SELECT
        m.*,
        u.first_name || ' ' || u.last_name as author_name,
        u.email as author_email
      FROM support_messages m
      LEFT JOIN users u ON m.user_id = u.id
      WHERE m.ticket_id = $1
      ORDER BY m.created_at ASC
    `;

    const messagesResult = await pool.query(messagesQuery, [id]);

    res.json({
      success: true,
      data: {
        ...ticketResult.rows[0],
        messages: messagesResult.rows
      }
    });
  } catch (error) {
    console.error("Error fetching ticket:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch ticket details"
    });
  }
};

// Create a new support ticket
export const createTicket = async (req: Request, res: Response) => {
  try {
    const {
      subject,
      message,
      priority = "medium",
      category = "other",
      order_id,
      created_by
    } = req.body;

    if (!subject) {
      return res.status(400).json({
        success: false,
        error: "Subject is required"
      });
    }

    // Generate unique ticket number (e.g., TICK-12345678)
    const ticketNumber = `TICK-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

    const query = `
      INSERT INTO support_tickets (
        ticket_number,
        subject,
        priority,
        status,
        category,
        order_id,
        created_by,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING *
    `;

    const result = await pool.query(query, [
      ticketNumber,
      subject,
      priority,
      "open",
      category,
      order_id || null,
      created_by || null
    ]);

    const ticket = result.rows[0];

    // If a message was provided, add it as the first message
    if (message && ticket.id) {
      const messageQuery = `
        INSERT INTO support_messages (
          ticket_id,
          user_id,
          message,
          is_internal,
          created_at
        ) VALUES ($1, $2, $3, $4, NOW())
      `;

      await pool.query(messageQuery, [
        ticket.id,
        created_by || null,
        message,
        false
      ]);
    }

    res.status(201).json({
      success: true,
      data: ticket
    });
  } catch (error) {
    console.error("Error creating ticket:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create support ticket"
    });
  }
};

// Add a reply to a ticket
export const addReply = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { message, is_internal = false } = req.body;
    const userId = (req as any).user?.id;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: "Message is required"
      });
    }

    // Check if ticket exists
    const ticketCheck = await pool.query(
      "SELECT id FROM support_tickets WHERE id = $1",
      [id]
    );

    if (ticketCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Ticket not found"
      });
    }

    // Add reply
    const replyQuery = `
      INSERT INTO ticket_replies (
        ticket_id,
        user_id,
        message,
        is_internal,
        created_at
      ) VALUES ($1, $2, $3, $4, NOW())
      RETURNING *
    `;

    const replyResult = await pool.query(replyQuery, [
      id,
      userId,
      message,
      is_internal
    ]);

    // Update ticket's updated_at timestamp and status if it was closed
    await pool.query(
      `UPDATE support_tickets
       SET updated_at = NOW(),
           status = CASE WHEN status = 'closed' THEN 'open' ELSE status END
       WHERE id = $1`,
      [id]
    );

    res.status(201).json({
      success: true,
      data: replyResult.rows[0]
    });
  } catch (error) {
    console.error("Error adding reply:", error);
    res.status(500).json({
      success: false,
      error: "Failed to add reply"
    });
  }
};

// Update ticket status
export const updateTicketStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["open", "in_progress", "closed", "pending"];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: "Valid status is required (open, in_progress, closed, pending)"
      });
    }

    const query = `
      UPDATE support_tickets
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;

    const result = await pool.query(query, [status, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Ticket not found"
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error("Error updating ticket status:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update ticket status"
    });
  }
};

// Update ticket priority
export const updateTicketPriority = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { priority } = req.body;

    const validPriorities = ["low", "medium", "high", "urgent"];

    if (!priority || !validPriorities.includes(priority)) {
      return res.status(400).json({
        success: false,
        error: "Valid priority is required (low, medium, high, urgent)"
      });
    }

    const query = `
      UPDATE support_tickets
      SET priority = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;

    const result = await pool.query(query, [priority, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Ticket not found"
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error("Error updating ticket priority:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update ticket priority"
    });
  }
};

// Create a chat session from a support ticket
export const createChatFromTicket = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    // Check if ticket exists
    const ticketQuery = `
      SELECT t.*, r.name as restaurant_name
      FROM support_tickets t
      LEFT JOIN restaurants r ON t.restaurant_id = r.id
      WHERE t.id = $1
    `;

    const ticketResult = await pool.query(ticketQuery, [id]);

    if (ticketResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Ticket not found"
      });
    }

    const ticket = ticketResult.rows[0];

    // Check if a chat session already exists for this ticket
    const existingChatQuery = `
      SELECT id FROM chat_sessions WHERE ticket_id = $1
    `;

    const existingChatResult = await pool.query(existingChatQuery, [id]);

    if (existingChatResult.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: "Chat session already exists for this ticket",
        data: { session_id: existingChatResult.rows[0].id }
      });
    }

    // Create chat session linked to the ticket
    const chatSession = await chatService.createChatSession(
      {
        subject: ticket.subject,
        category: ticket.category,
        priority: ticket.priority,
        restaurant_id: ticket.restaurant_id,
        initial_message: ticket.message
      },
      userId
    );

    // Link the chat session to the ticket
    await pool.query(
      "UPDATE chat_sessions SET ticket_id = $1 WHERE id = $2",
      [id, chatSession.id]
    );

    res.status(201).json({
      success: true,
      data: {
        session_id: chatSession.id,
        ticket_id: id
      }
    });
  } catch (error) {
    console.error("Error creating chat from ticket:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create chat session from ticket"
    });
  }
};
