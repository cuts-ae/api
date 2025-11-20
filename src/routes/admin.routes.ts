import { Router } from "express";
import {
  getAnalytics,
  getRestaurants,
  approveRestaurant,
  getDrivers,
  approveDriver,
  getInvoices,
  getInvoiceDetails,
  generateInvoice,
  getUsers,
  getOrders,
  getOrderDetails,
} from "../controllers/admin.controller";

const router = Router();

// All admin routes require admin role (authentication is handled globally, RBAC checks authorization)

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
router.get("/invoices/:id", getInvoiceDetails);
router.post("/invoices/generate", generateInvoice);

// Users
router.get("/users", getUsers);

// Orders
router.get("/orders", getOrders);
router.get("/orders/:id", getOrderDetails);

export default router;
