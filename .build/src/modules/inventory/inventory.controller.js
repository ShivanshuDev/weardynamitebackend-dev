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
exports.bulkUpdateItems = exports.updateItemStatus = exports.updateStatus = exports.listAllItems = exports.getLineItem = exports.getActiveItemsAPI = exports.searchInvoicesAPI = exports.searchProductsAPI = exports.getInventoryByDateRange = exports.getAllInvoices = exports.getInvoiceItemsPaginated = exports.getInvoiceInfo = exports.addInventory = void 0;
const InventoryService = __importStar(require("./inventory.service"));
const addInventory = async (req, res) => {
    try {
        console.log('--- INVENTORY ADD REQUEST ---');
        console.log('Payload:', JSON.stringify(req.body, null, 2));
        const result = await InventoryService.addInventoryItem(req.body);
        res.status(201).json(result);
    }
    catch (e) {
        console.error('Add Inventory Error:', e.message);
        res.status(400).json({ message: e.message });
    }
};
exports.addInventory = addInventory;
const getInvoiceInfo = async (req, res) => {
    try {
        const summary = await InventoryService.getInvoiceSummary(req.params.invoiceNumber);
        if (!summary) {
            return res.status(404).json({ message: 'Invoice not found' });
        }
        // Default fetch for items together with summary
        const itemsData = await InventoryService.getInvoiceItems(req.params.invoiceNumber, 50);
        res.json({
            summary,
            items: itemsData.items,
            lastEvaluatedKey: itemsData.lastEvaluatedKey
        });
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.getInvoiceInfo = getInvoiceInfo;
const getInvoiceItemsPaginated = async (req, res) => {
    try {
        const { limit, lastKey } = req.query;
        const itemsData = await InventoryService.getInvoiceItems(req.params.invoiceNumber, Number(limit) || 50, lastKey);
        res.json(itemsData);
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.getInvoiceItemsPaginated = getInvoiceItemsPaginated;
const getAllInvoices = async (req, res) => {
    try {
        const { limit, lastKey } = req.query;
        const result = await InventoryService.getAllInvoices(Number(limit) || 20, lastKey);
        res.json(result);
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.getAllInvoices = getAllInvoices;
const getInventoryByDateRange = async (req, res) => {
    try {
        const { start, end, limit, lastKey } = req.query;
        if (!start || !end) {
            return res.status(400).json({ message: 'Start and end dates are required' });
        }
        const result = await InventoryService.getInventoryByDateRange(start, end, Number(limit) || 50, lastKey);
        res.json(result);
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.getInventoryByDateRange = getInventoryByDateRange;
const searchProductsAPI = async (req, res) => {
    try {
        const { q, limit, lastKey } = req.query;
        if (!q) {
            return res.status(400).json({ message: 'Query parameter q is required' });
        }
        const result = await InventoryService.searchProducts(q, Number(limit) || 20, lastKey);
        res.json(result);
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.searchProductsAPI = searchProductsAPI;
const searchInvoicesAPI = async (req, res) => {
    try {
        const { q, limit, lastKey } = req.query;
        if (!q) {
            return res.status(400).json({ message: 'Query parameter q is required' });
        }
        const result = await InventoryService.searchInvoices(q, Number(limit) || 20, lastKey);
        res.json(result);
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.searchInvoicesAPI = searchInvoicesAPI;
const getActiveItemsAPI = async (req, res) => {
    try {
        const { q, limit, lastKey } = req.query;
        const result = await InventoryService.getActiveInventoryItems(q, Number(limit) || 50, lastKey);
        res.json(result);
    }
    catch (e) {
        console.error('Get Active Items Error:', e.message);
        res.status(400).json({ message: e.message });
    }
};
exports.getActiveItemsAPI = getActiveItemsAPI;
const getLineItem = async (req, res) => {
    try {
        const { invoiceNumber, itemId } = req.params;
        const result = await InventoryService.getItemById(invoiceNumber, itemId);
        if (!result)
            return res.status(404).json({ message: 'Item not found' });
        res.json(result);
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.getLineItem = getLineItem;
const listAllItems = async (req, res) => {
    try {
        const { limit, lastKey, status, sku, name, startDate, endDate } = req.query;
        const filters = { status, sku, name, startDate, endDate };
        const result = await InventoryService.listAllInventoryItems(filters, Number(limit) || 20, lastKey);
        res.json(result);
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.listAllItems = listAllItems;
const updateStatus = async (req, res) => {
    try {
        const { invoiceNumber } = req.params;
        const { status } = req.body;
        if (!status)
            return res.status(400).json({ message: 'Status is required' });
        const result = await InventoryService.updateInvoiceStatus(invoiceNumber, status);
        res.json(result);
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.updateStatus = updateStatus;
const updateItemStatus = async (req, res) => {
    try {
        const { invoiceNumber, inventoryId } = req.params;
        const { status } = req.body;
        if (!status)
            return res.status(400).json({ message: 'Status is required' });
        const result = await InventoryService.updateInventoryItemStatus(invoiceNumber, inventoryId, status);
        res.json(result);
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.updateItemStatus = updateItemStatus;
const bulkUpdateItems = async (req, res) => {
    try {
        const { updates } = req.body; // Array of { invoiceNumber, inventoryId, status }
        if (!updates || !Array.isArray(updates)) {
            return res.status(400).json({ message: 'Updates array is required' });
        }
        const result = await InventoryService.bulkUpdateInventoryItemStatus(updates);
        res.json(result);
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.bulkUpdateItems = bulkUpdateItems;
