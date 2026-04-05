import { Router } from 'express';
import * as InventoryController from './inventory.controller';

const router = Router();

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

export default router;
