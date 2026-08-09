import { Router } from 'express';
import * as ProductController from './product.controller';
import * as ReviewController from '../review/review.controller';
import { authenticate, adminOnly } from '../../middleware/auth';

const router = Router();

// ── Public routes ────────────────────────────────────────────────────────────
router.get('/', ProductController.listProducts);
router.get('/search', ProductController.searchProducts);
router.get('/new-arrivals', ProductController.getNewArrivals);
router.get('/best-sellers', ProductController.getBestSellers);
router.get('/:id', ProductController.getProduct);
router.get('/:id/related', ProductController.getRelatedProducts);
router.get('/:id/reviews', ReviewController.getReviews);
router.post('/:id/reviews', authenticate as any, ReviewController.submitReview as any);

// ── Admin routes ─────────────────────────────────────────────────────────────
router.post('/admin/products', authenticate as any, adminOnly as any, ProductController.createProduct);
router.get('/admin/products', authenticate as any, adminOnly as any, ProductController.listProducts);
router.get('/admin/products/:id', authenticate as any, adminOnly as any, ProductController.getProduct);
router.put('/admin/products/:id', authenticate as any, adminOnly as any, ProductController.updateProduct);
router.patch('/admin/products/bulk-status', authenticate as any, adminOnly as any, ProductController.bulkUpdateProductStatus);
router.patch('/admin/products/:id/status', authenticate as any, adminOnly as any, ProductController.patchProductStatus);
router.delete('/admin/products/:id', authenticate as any, adminOnly as any, ProductController.deleteProduct);
router.get('/admin/inventory/report', authenticate as any, adminOnly as any, ProductController.getInventoryReport);
router.patch('/admin/inventory/:id', authenticate as any, adminOnly as any, ProductController.updateInventory);
router.get('/admin/inventory/invoices', authenticate as any, adminOnly as any, ProductController.listInventoryInvoices);
router.post('/admin/inventory/invoices', authenticate as any, adminOnly as any, ProductController.createInventoryInvoice);
router.put('/admin/inventory/invoices/:id', authenticate as any, adminOnly as any, ProductController.updateInventoryInvoice);
router.delete('/admin/inventory/invoices/:id', authenticate as any, adminOnly as any, ProductController.deleteInventoryInvoice);

export default router;
