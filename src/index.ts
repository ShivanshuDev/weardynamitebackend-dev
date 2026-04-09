import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

// ─── Route Imports ────────────────────────────────────────────────────────────
import authRoutes from './modules/auth/auth.routes';
import userRoutes from './modules/user/user.routes';
import productRoutes from './modules/product/product.routes';
import inventoryRoutes from './modules/inventory/inventory.routes';
import orderRoutes from './modules/order/order.routes';
import employeeRoutes from './modules/employee/employee.routes';
import cmsRoutes from './modules/cms/cms.routes';
import blogRoutes from './modules/blog/blog.routes';
import inquiryRoutes from './modules/inquiry/inquiry.routes';
import ledgerRoutes from './modules/ledger/ledger.routes';
import vendorRoutes from './modules/vendor/vendor.routes';
import expenseRoutes from './modules/expense/expense.routes';
import uploadRoutes from './modules/upload/upload.routes';
import customizationRoutes from './modules/customization/customization.routes';
import paymentRoutes from './modules/payment/payment.routes';
import notificationRoutes from './modules/notification/notification.routes';
import subscriptionRoutes from './modules/subscription/subscription.routes';

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5177', 'http://localhost:3000', "https://weardynamite.com", "http://www.weardynamite.com", "weardynamite.com"],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);         // POST /api/auth/login etc.
app.use('/api/user', userRoutes);         // GET /api/user/profile etc.
app.use('/api/products', productRoutes);  // GET /api/products etc.
app.use('/api/inventory', inventoryRoutes); // Inventory Management
app.use('/api', orderRoutes);             // /api/orders, /api/user/cart, /api/admin/orders
app.use('/api/admin', employeeRoutes);    // /api/admin/employees, /api/admin/attendance
app.use('/api/admin/cms', cmsRoutes);     // /api/admin/cms/home/carousel etc.
app.use('/api/blogs', blogRoutes);        // GET /api/blogs, POST /api/blogs/admin
app.use('/api', inquiryRoutes);           // /api/inquiries, /api/subscribers, /api/admin/*
app.use('/api', ledgerRoutes);            // /api/admin/ledger, /api/admin/dashboard
app.use('/api', vendorRoutes);            // /api/admin/vendors
app.use('/api', expenseRoutes);           // /api/admin/expenses
app.use('/api', uploadRoutes);            // /api/admin/upload/presigned-url
app.use('/api', customizationRoutes);     // /api/customization/print etc.
app.use('/api/payment', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/subscriptions', subscriptionRoutes);

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[ERROR]', err.stack || err.message);
  res.status(500).json({
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong.'
  });
});

// ─── Server Listener ──────────────────────────────────────────────────────────
// Skip listening if we are in a serverless environment (Lambda or Serverless Offline)
if (!process.env.LAMBDA_TASK_ROOT && !process.env.IS_OFFLINE) {
  app.listen(PORT, () => {
    console.log(`\n🚀 weardynamite API running at http://localhost:${PORT}`);
    console.log(`📋 Health check: http://localhost:${PORT}/api/health\n`);
  });
}

export default app;


