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
exports.updateInventory = exports.getInventoryReport = exports.deleteInventoryInvoice = exports.updateInventoryInvoice = exports.createInventoryInvoice = exports.listInventoryInvoices = exports.deleteProduct = exports.bulkUpdateProductStatus = exports.patchProductStatus = exports.updateProduct = exports.createProduct = exports.getBestSellers = exports.getNewArrivals = exports.getProduct = exports.searchProducts = exports.listProducts = void 0;
const ProductService = __importStar(require("./product.service"));
const InventoryService = __importStar(require("./inventory.service"));
const listProducts = async (req, res) => {
    try {
        const { category, subCategory, sort, page, limit, status, color, fit, neckType, occasion } = req.query;
        // Default status to 'Active' for public store if not specified
        let targetStatus = status;
        if (!targetStatus && !req.originalUrl.includes('/admin/')) {
            targetStatus = 'Active';
        }
        res.json(await ProductService.listProducts({
            category,
            subCategory,
            sort,
            page: Number(page) || 1,
            limit: Number(limit) || 50,
            status: targetStatus,
            color,
            fit,
            neckType,
            occasion
        }));
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.listProducts = listProducts;
const searchProducts = async (req, res) => {
    try {
        res.json(await ProductService.searchProducts(req.query.q || ''));
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.searchProducts = searchProducts;
const getProduct = async (req, res) => {
    try {
        const product = await ProductService.getProduct(req.params.id);
        if (!product)
            return res.status(404).json({ message: 'Product not found' });
        // Block non-active products for public store
        if (!req.originalUrl.includes('/admin/') && product.status !== 'Active') {
            return res.status(403).json({ message: 'This product is not currently available for public purchase.' });
        }
        res.json(product);
    }
    catch (e) {
        res.status(404).json({ message: e.message });
    }
};
exports.getProduct = getProduct;
const getNewArrivals = async (_req, res) => res.json(await ProductService.getNewArrivals());
exports.getNewArrivals = getNewArrivals;
const getBestSellers = async (_req, res) => res.json(await ProductService.getBestSellers());
exports.getBestSellers = getBestSellers;
const createProduct = async (req, res) => {
    try {
        res.status(201).json(await ProductService.createProduct(req.body));
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.createProduct = createProduct;
const updateProduct = async (req, res) => {
    try {
        res.json(await ProductService.updateProduct(req.params.id, req.body));
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.updateProduct = updateProduct;
const patchProductStatus = async (req, res) => {
    try {
        res.json(await ProductService.patchProductStatus(req.params.id, req.body.status));
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.patchProductStatus = patchProductStatus;
const bulkUpdateProductStatus = async (req, res) => {
    try {
        const { productIds, status } = req.body;
        if (!Array.isArray(productIds) || productIds.length === 0) {
            return res.status(400).json({ message: 'productIds must be a non-empty array' });
        }
        if (productIds.length > 50) {
            return res.status(400).json({ message: 'Maximum 50 products can be updated at a time' });
        }
        res.json(await ProductService.bulkUpdateProductStatus(productIds, status));
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.bulkUpdateProductStatus = bulkUpdateProductStatus;
const deleteProduct = async (req, res) => {
    try {
        res.json(await ProductService.deleteProduct(req.params.id));
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.deleteProduct = deleteProduct;
// ─── Inventory Invoices ───────────────────────────────────────────────────────
const listInventoryInvoices = async (req, res) => {
    try {
        res.json(await InventoryService.getInvoice(req.query.vendorId));
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.listInventoryInvoices = listInventoryInvoices;
const createInventoryInvoice = async (req, res) => {
    try {
        res.status(201).json(await InventoryService.createInventoryInvoice(req.body));
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.createInventoryInvoice = createInventoryInvoice;
const updateInventoryInvoice = async (req, res) => {
    try {
        res.json(await InventoryService.addInventory(req.body));
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.updateInventoryInvoice = updateInventoryInvoice;
const deleteInventoryInvoice = async (req, res) => {
    try {
        res.json(await InventoryService.getInvoice(req.params.id));
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.deleteInventoryInvoice = deleteInventoryInvoice;
const getInventoryReport = async (_req, res) => {
    try {
        res.json(await InventoryService.getInventoryReport());
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
};
exports.getInventoryReport = getInventoryReport;
const updateInventory = async (req, res) => {
    try {
        res.json(await ProductService.updateProduct(req.params.id, req.body));
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.updateInventory = updateInventory;
