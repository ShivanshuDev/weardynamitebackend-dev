"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// ─── Route Imports ────────────────────────────────────────────────────────────
const auth_routes_1 = __importDefault(require("./modules/auth/auth.routes"));
const user_routes_1 = __importDefault(require("./modules/user/user.routes"));
const product_routes_1 = __importDefault(require("./modules/product/product.routes"));
const inventory_routes_1 = __importDefault(require("./modules/inventory/inventory.routes"));
const order_routes_1 = __importDefault(require("./modules/order/order.routes"));
const employee_routes_1 = __importDefault(require("./modules/employee/employee.routes"));
const cms_routes_1 = __importDefault(require("./modules/cms/cms.routes"));
const blog_routes_1 = __importDefault(require("./modules/blog/blog.routes"));
const inquiry_routes_1 = __importDefault(require("./modules/inquiry/inquiry.routes"));
const ledger_routes_1 = __importDefault(require("./modules/ledger/ledger.routes"));
const vendor_routes_1 = __importDefault(require("./modules/vendor/vendor.routes"));
const expense_routes_1 = __importDefault(require("./modules/expense/expense.routes"));
const upload_routes_1 = __importDefault(require("./modules/upload/upload.routes"));
const customization_routes_1 = __importDefault(require("./modules/customization/customization.routes"));
const payment_routes_1 = __importDefault(require("./modules/payment/payment.routes"));
const notification_routes_1 = __importDefault(require("./modules/notification/notification.routes"));
const subscription_routes_1 = __importDefault(require("./modules/subscription/subscription.routes"));
const quotation_routes_1 = __importDefault(require("./modules/quotation/quotation.routes"));
const idcard_routes_1 = __importDefault(require("./modules/idcard/idcard.routes"));
const scheduler_1 = require("./utils/scheduler");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// ─── Middleware ────────────────────────────────────────────────────────────────
app.use((0, cors_1.default)({
    origin: true,
    credentials: true,
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});
// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', auth_routes_1.default); // POST /api/auth/login etc.
app.use('/api/user', user_routes_1.default); // GET /api/user/profile etc.
app.use('/api/products', product_routes_1.default); // GET /api/products etc.
app.use('/api/inventory', inventory_routes_1.default); // Inventory Management
app.use('/api', order_routes_1.default); // /api/orders, /api/user/cart, /api/admin/orders
app.use('/api/admin', employee_routes_1.default); // /api/admin/employees, /api/admin/attendance
app.use('/api/admin/cms', cms_routes_1.default); // /api/admin/cms/home/carousel etc.
app.use('/api/blogs', blog_routes_1.default); // GET /api/blogs, POST /api/blogs/admin
app.use('/api', inquiry_routes_1.default); // /api/inquiries, /api/subscribers, /api/admin/*
app.use('/api', ledger_routes_1.default); // /api/admin/ledger, /api/admin/dashboard
app.use('/api', vendor_routes_1.default); // /api/admin/vendors
app.use('/api', expense_routes_1.default); // /api/admin/expenses
app.use('/api', upload_routes_1.default); // /api/admin/upload/presigned-url
app.use('/api', customization_routes_1.default); // /api/customization/print etc.
app.use('/api/payment', payment_routes_1.default);
app.use('/api/notifications', notification_routes_1.default);
app.use('/api/subscriptions', subscription_routes_1.default);
app.use('/api', quotation_routes_1.default);
app.use('/api', idcard_routes_1.default);
// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((_req, res) => {
    res.status(404).json({ message: 'Route not found' });
});
// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
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
        (0, scheduler_1.initScheduler)();
    });
}
exports.default = app;
