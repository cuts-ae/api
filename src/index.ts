import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import restaurantRoutes from './routes/restaurant.routes';
import menuRoutes from './routes/menu.routes';
import orderRoutes from './routes/order.routes';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 45000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:45001',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'UAE Health-Focused Catering Platform API',
    version: '1.0.0',
    status: 'running'
  });
});

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/restaurants', restaurantRoutes);
app.use('/api/v1', menuRoutes);
app.use('/api/v1/orders', orderRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`=� Server is running on port ${PORT}`);
  console.log(`=� Base URL: http://localhost:${PORT}`);
  console.log(`<� Health check: http://localhost:${PORT}/health`);
  console.log(`=� API: http://localhost:${PORT}/api/v1`);
});

export default app;
