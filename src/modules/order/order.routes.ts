import { Router } from 'express';
import * as OrderController from './order.controller';
import { authenticate, adminOnly } from '../../middleware/auth';

const router = Router();
const auth = authenticate as any;
const admin = adminOnly as any;

// ── Cart ─────────────────────────────────────────────────────────────────────
router.get('/user/cart', auth, OrderController.getCart as any);
router.post('/user/cart', auth, OrderController.addToCart as any);
router.put('/user/cart/:itemId', auth, OrderController.updateCartItem as any);
router.delete('/user/cart/:itemId', auth, OrderController.removeCartItem as any);
router.delete('/user/cart', auth, OrderController.clearCart as any);

// ── Favorites ────────────────────────────────────────────────────────────────
router.get('/user/favorites', auth, OrderController.getFavorites as any);
router.post('/user/favorites/:productId', auth, OrderController.toggleFavorite as any);

// ── Customer Orders ──────────────────────────────────────────────────────────
router.post('/orders', auth, OrderController.placeOrder as any);
router.get('/user/orders', auth, OrderController.getUserOrders as any);
router.get('/user/orders/:id', auth, OrderController.getUserOrder as any);

// ── Admin Orders ──────────────────────────────────────────────────────────────
router.get('/admin/orders', auth, admin, OrderController.adminListOrders);
router.get('/admin/orders/:id', auth, admin, OrderController.getOrderDetail);
router.put('/admin/orders/:id/status', auth, admin, OrderController.updateOrderStatus);
router.put('/admin/orders/:id/tracking', auth, admin, OrderController.updateOrderTracking);
router.get('/admin/orders/:id/invoice', auth, admin, OrderController.getInvoice);

export default router;
