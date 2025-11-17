import { Router } from "express";
import {
  getAnalytics,
  getRestaurants,
  approveRestaurant,
  getDrivers,
  approveDriver,
  getInvoices,
  generateInvoice,
  getUsers,
  getOrders,
} from "../controllers/admin.controller";
import { authenticate } from "../middleware/auth";

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticate);

// Analytics
router.get("/analytics", getAnalytics);

// Restaurants
router.get("/restaurants", getRestaurants);
router.post("/restaurants/:id/approve", approveRestaurant);

// Drivers
router.get("/drivers", getDrivers);
router.post("/drivers/:id/approve", approveDriver);

// Invoices
router.get("/invoices", getInvoices);
router.post("/invoices/generate", generateInvoice);

// Users
router.get("/users", getUsers);

// Orders
router.get("/orders", getOrders);

export default router;
