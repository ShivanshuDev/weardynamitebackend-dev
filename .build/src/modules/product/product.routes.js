"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ProductController = __importStar(require("./product.controller"));
const ReviewController = __importStar(require("../review/review.controller"));
const auth_1 = require("../../middleware/auth");
const router = (0, express_1.Router)();
// ── Public routes ────────────────────────────────────────────────────────────
router.get('/', ProductController.listProducts);
router.get('/search', ProductController.searchProducts);
router.get('/new-arrivals', ProductController.getNewArrivals);
router.get('/best-sellers', ProductController.getBestSellers);
router.get('/:id', ProductController.getProduct);
router.get('/:id/reviews', ReviewController.getReviews);
router.post('/:id/reviews', auth_1.authenticate, ReviewController.submitReview);
// ── Admin routes ─────────────────────────────────────────────────────────────
router.post('/admin/products', auth_1.authenticate, auth_1.adminOnly, ProductController.createProduct);
router.get('/admin/products', auth_1.authenticate, auth_1.adminOnly, ProductController.listProducts);
router.get('/admin/products/:id', auth_1.authenticate, auth_1.adminOnly, ProductController.getProduct);
router.put('/admin/products/:id', auth_1.authenticate, auth_1.adminOnly, ProductController.updateProduct);
router.patch('/admin/products/bulk-status', auth_1.authenticate, auth_1.adminOnly, ProductController.bulkUpdateProductStatus);
router.patch('/admin/products/:id/status', auth_1.authenticate, auth_1.adminOnly, ProductController.patchProductStatus);
router.delete('/admin/products/:id', auth_1.authenticate, auth_1.adminOnly, ProductController.deleteProduct);
router.get('/admin/inventory/report', auth_1.authenticate, auth_1.adminOnly, ProductController.getInventoryReport);
router.patch('/admin/inventory/:id', auth_1.authenticate, auth_1.adminOnly, ProductController.updateInventory);
router.get('/admin/inventory/invoices', auth_1.authenticate, auth_1.adminOnly, ProductController.listInventoryInvoices);
router.post('/admin/inventory/invoices', auth_1.authenticate, auth_1.adminOnly, ProductController.createInventoryInvoice);
router.put('/admin/inventory/invoices/:id', auth_1.authenticate, auth_1.adminOnly, ProductController.updateInventoryInvoice);
router.delete('/admin/inventory/invoices/:id', auth_1.authenticate, auth_1.adminOnly, ProductController.deleteInventoryInvoice);
exports.default = router;
