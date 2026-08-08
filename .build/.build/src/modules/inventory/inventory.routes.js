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
const InventoryController = __importStar(require("./inventory.controller"));
const router = (0, express_1.Router)();
// Add Inventory API (Invoice Line Item)
router.post('/add', InventoryController.addInventory);
// List All Invoices
router.get('/invoices', InventoryController.getAllInvoices);
// List All Inventory Items (Raw Feed)
router.get('/items', InventoryController.listAllItems);
// Get Invoice Summary + First Page of Items
router.get('/invoice/:invoiceNumber', InventoryController.getInvoiceInfo);
// Get Paginated Invoice Items
router.get('/invoice/:invoiceNumber/items', InventoryController.getInvoiceItemsPaginated);
// Get Inventory by Date Range
router.get('/range', InventoryController.getInventoryByDateRange);
// Search Products (Line Items)
router.get('/search/products', InventoryController.searchProductsAPI);
// Search Active Inventory Items (Linkable Items)
router.get('/active-items', InventoryController.getActiveItemsAPI);
// Search Invoices
router.get('/search/invoices', InventoryController.searchInvoicesAPI);
// Get specific line item
router.get('/invoice/:invoiceNumber/item/:itemId', InventoryController.getLineItem);
// Update Invoice Workflow Status
router.patch('/invoice/:invoiceNumber/status', InventoryController.updateStatus);
// Update Individual Item Workflow Status
router.patch('/invoice/:invoiceNumber/item/:inventoryId/status', InventoryController.updateItemStatus);
// Bulk Update Items Status
router.patch('/bulk-status', InventoryController.bulkUpdateItems);
exports.default = router;
