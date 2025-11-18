import express, { Request, Response } from "express";
import { createServer } from "http";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import authRoutes from "./routes/auth.routes";
import restaurantRoutes from "./routes/restaurant.routes";
import menuRoutes from "./routes/menu.routes";
import orderRoutes from "./routes/order.routes";
import adminRoutes from "./routes/admin.routes";
import supportRoutes from "./routes/support.routes";
import chatRoutes from "./routes/chat.routes";
import { errorHandler } from "./middleware/errorHandler";
import { ChatSocketServer } from "./socket/chat.socket";
import { rbacMiddleware } from "./middleware/rbac";

// Load environment variables from root .env file
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 45000;

// Middleware
const allowedOrigins = [
  "http://localhost:45001",
  "http://localhost:45002",
  "http://localhost:45003",
  "http://localhost:45004",
  "http://84.8.146.121:45001",
  "https://restaurant.trylassen.com",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);

// JSON parsing with error handling
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Catch JSON parsing errors and return 400 instead of 500
app.use((err: any, req: Request, res: Response, next: any) => {
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({
      success: false,
      error: "Invalid JSON",
      message: "Request body contains invalid JSON syntax"
    });
  }
  next(err);
});

// Health check
app.get("/", (req: Request, res: Response) => {
  res.json({
    message: "UAE Health-Focused Catering Platform API",
    version: "1.0.0",
    status: "running",
  });
});

app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// Static file serving for uploads
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Apply authentication middleware globally (sets req.user if token is present)
import { authenticate } from "./middleware/auth";
app.use((req, res, next) => {
  // Try to authenticate, but don't fail if token is missing
  // RBAC will handle authorization
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authenticate(req as any, res, next);
  }
  next();
});

// Apply RBAC middleware to all routes
app.use(rbacMiddleware);

// API Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/restaurants", restaurantRoutes);
app.use("/api/v1", menuRoutes);
app.use("/api/v1/orders", orderRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/support", supportRoutes);
app.use("/api/v1/chat", chatRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: "Route not found" });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Initialize WebSocket server
const chatSocketServer = new ChatSocketServer(httpServer);

httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Base URL: http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`API: http://localhost:${PORT}/api/v1`);
  console.log(`WebSocket: ws://localhost:${PORT}`);
});

export default app;
