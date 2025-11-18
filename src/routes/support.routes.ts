import { Router } from "express";
import {
  getTickets,
  getTicketById,
  createTicket,
  addReply,
  updateTicketStatus,
  updateTicketPriority,
  createChatFromTicket,
} from "../controllers/support.controller";
import { authenticate } from "../middleware/auth";
import supportAuthRoutes from "./support-auth.routes";

const router = Router();

// Support auth routes (login, profile)
router.use("/auth", supportAuthRoutes);

// Public route - create ticket
router.post("/tickets", createTicket);

// Protected routes - require authentication
router.use(authenticate);

// Get all tickets with optional filtering
router.get("/tickets", getTickets);

// Get ticket details
router.get("/tickets/:id", getTicketById);

// Add reply to ticket
router.post("/tickets/:id/replies", addReply);

// Update ticket status
router.patch("/tickets/:id/status", updateTicketStatus);

// Update ticket priority
router.patch("/tickets/:id/priority", updateTicketPriority);

// Create chat session from ticket
router.post("/tickets/:id/chat", createChatFromTicket);

export default router;
