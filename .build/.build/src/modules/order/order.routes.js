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
const OrderController = __importStar(require("./order.controller"));
const auth_1 = require("../../middleware/auth");
const router = (0, express_1.Router)();
const auth = auth_1.authenticate;
const admin = auth_1.adminOnly;
// ── Cart ─────────────────────────────────────────────────────────────────────
router.get('/user/cart', auth, OrderController.getCart);
router.post('/user/cart', auth, OrderController.addToCart);
router.put('/user/cart/:itemId', auth, OrderController.updateCartItem);
router.delete('/user/cart/:itemId', auth, OrderController.removeCartItem);
router.delete('/user/cart', auth, OrderController.clearCart);
// ── Favorites ────────────────────────────────────────────────────────────────
router.get('/user/favorites', auth, OrderController.getFavorites);
router.post('/user/favorites/:productId', auth, OrderController.toggleFavorite);
// ── Customer Orders ──────────────────────────────────────────────────────────
router.post('/orders', auth, OrderController.placeOrder);
router.get('/user/orders', auth, OrderController.getUserOrders);
router.get('/user/orders/:id', auth, OrderController.getUserOrder);
// ── Admin Orders ──────────────────────────────────────────────────────────────
router.get('/admin/orders', auth, admin, OrderController.adminListOrders);
router.get('/admin/orders/:id', auth, admin, OrderController.getOrderDetail);
router.put('/admin/orders/:id/status', auth, admin, OrderController.updateOrderStatus);
router.put('/admin/orders/:id/tracking', auth, admin, OrderController.updateOrderTracking);
router.get('/admin/orders/:id/invoice', auth, admin, OrderController.getInvoice);
exports.default = router;
