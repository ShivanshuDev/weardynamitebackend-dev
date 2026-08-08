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
exports.getInvoice = exports.updateOrderTracking = exports.updateOrderStatus = exports.getOrderDetail = exports.adminListOrders = exports.getUserOrder = exports.getUserOrders = exports.placeOrder = exports.toggleFavorite = exports.getFavorites = exports.clearCart = exports.removeCartItem = exports.updateCartItem = exports.addToCart = exports.getCart = void 0;
const OrderService = __importStar(require("./order.service"));
// ─── Cart ────────────────────────────────────────────────────────────────────
const getCart = async (req, res) => {
    try {
        const userId = req.user.id;
        const cart = await OrderService.getCart(userId);
        res.json(cart);
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.getCart = getCart;
const addToCart = async (req, res) => {
    try {
        const userId = req.user.id;
        const item = await OrderService.addToCart(userId, req.body);
        res.status(201).json(item);
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.addToCart = addToCart;
const updateCartItem = async (req, res) => {
    try {
        const userId = req.user.id;
        const { itemId } = req.params;
        const { quantity } = req.body;
        const updated = await OrderService.updateCartItem(userId, itemId, quantity);
        res.json(updated);
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.updateCartItem = updateCartItem;
const removeCartItem = async (req, res) => {
    try {
        const userId = req.user.id;
        const { itemId } = req.params;
        const result = await OrderService.removeCartItem(userId, itemId);
        res.json(result);
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.removeCartItem = removeCartItem;
const clearCart = async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await OrderService.clearCart(userId);
        res.json(result);
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.clearCart = clearCart;
// ─── Favorites ────────────────────────────────────────────────────────────────
const getFavorites = async (req, res) => {
    try {
        const userId = req.user.id;
        const favorites = await OrderService.getFavorites(userId);
        res.json(favorites);
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.getFavorites = getFavorites;
const toggleFavorite = async (req, res) => {
    try {
        const userId = req.user.id;
        const { productId } = req.params;
        const result = await OrderService.toggleFavorite(userId, productId);
        res.json(result);
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.toggleFavorite = toggleFavorite;
// ─── Customer Orders ──────────────────────────────────────────────────────────
const placeOrder = async (req, res) => {
    try {
        const userId = req.user.id;
        const order = await OrderService.placeOrder(userId, req.body);
        res.status(201).json(order);
    }
    catch (e) {
        const status = e.message.includes('reached limit') ? 429 : 400;
        res.status(status).json({ message: e.message });
    }
};
exports.placeOrder = placeOrder;
const getUserOrders = async (req, res) => {
    try {
        const userId = req.user.id;
        const orders = await OrderService.getUserOrders(userId);
        res.json(orders);
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.getUserOrders = getUserOrders;
const getUserOrder = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const order = await OrderService.getUserOrder(userId, id);
        res.json(order);
    }
    catch (e) {
        res.status(404).json({ message: e.message });
    }
};
exports.getUserOrder = getUserOrder;
// ─── Admin Orders ──────────────────────────────────────────────────────────────
const adminListOrders = async (req, res) => {
    try {
        const orders = await OrderService.adminListOrders(req.query);
        res.json(orders);
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.adminListOrders = adminListOrders;
const getOrderDetail = async (req, res) => {
    try {
        const order = await OrderService.getOrderDetail(req.params.id);
        res.json(order);
    }
    catch (e) {
        res.status(404).json({ message: e.message });
    }
};
exports.getOrderDetail = getOrderDetail;
const updateOrderStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const result = await OrderService.updateOrderStatus(req.params.id, status);
        res.json(result);
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.updateOrderStatus = updateOrderStatus;
const updateOrderTracking = async (req, res) => {
    try {
        const { trackingNumber, courier } = req.body;
        const result = await OrderService.updateOrderTracking(req.params.id, trackingNumber, courier);
        res.json(result);
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.updateOrderTracking = updateOrderTracking;
const getInvoice = async (req, res) => {
    try {
        const invoiceData = await OrderService.getOrderDetail(req.params.id);
        res.json({ invoice: invoiceData });
    }
    catch (e) {
        res.status(404).json({ message: e.message });
    }
};
exports.getInvoice = getInvoice;
