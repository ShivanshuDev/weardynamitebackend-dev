import { Request, Response } from 'express';
import * as InventoryService from './inventory.service';

export const addInventory = async (req: Request, res: Response) => {
  try {
    console.log('--- INVENTORY ADD REQUEST ---');
    console.log('Payload:', JSON.stringify(req.body, null, 2));
    
    const result = await InventoryService.addInventoryItem(req.body);
    res.status(201).json(result);
  } catch (e: any) {
    console.error('Add Inventory Error:', e.message);
    res.status(400).json({ message: e.message });
  }
};

export const getInvoiceInfo = async (req: Request, res: Response) => {
  try {
    const summary = await InventoryService.getInvoiceSummary(req.params.invoiceNumber as string);
    if (!summary) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    
    // Default fetch for items together with summary
    const itemsData = await InventoryService.getInvoiceItems(req.params.invoiceNumber as string, 50);
    res.json({
      summary,
      items: itemsData.items,
      lastEvaluatedKey: itemsData.lastEvaluatedKey
    });
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};

export const getInvoiceItemsPaginated = async (req: Request, res: Response) => {
  try {
    const { limit, lastKey } = req.query;
    const itemsData = await InventoryService.getInvoiceItems(
      req.params.invoiceNumber as string, 
      Number(limit) || 50, 
      lastKey as string | undefined
    );
    res.json(itemsData);
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};

export const getAllInvoices = async (req: Request, res: Response) => {
  try {
    const { limit, lastKey } = req.query;
    const result = await InventoryService.getAllInvoices(
      Number(limit) || 20, 
      lastKey as string | undefined
    );
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};

export const getInventoryByDateRange = async (req: Request, res: Response) => {
  try {
    const { start, end, limit, lastKey } = req.query;
    if (!start || !end) {
      return res.status(400).json({ message: 'Start and end dates are required' });
    }
    const result = await InventoryService.getInventoryByDateRange(
      start as string, 
      end as string, 
      Number(limit) || 50, 
      lastKey as string | undefined
    );
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};

export const searchProductsAPI = async (req: Request, res: Response) => {
  try {
    const { q, limit, lastKey } = req.query;
    if (!q) {
      return res.status(400).json({ message: 'Query parameter q is required' });
    }
    const result = await InventoryService.searchProducts(
      q as string, 
      Number(limit) || 20, 
      lastKey as string | undefined
    );
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};

export const searchInvoicesAPI = async (req: Request, res: Response) => {
  try {
    const { q, limit, lastKey } = req.query;
    if (!q) {
      return res.status(400).json({ message: 'Query parameter q is required' });
    }
    const result = await InventoryService.searchInvoices(
      q as string, 
      Number(limit) || 20, 
      lastKey as string | undefined
    );
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};

export const getActiveItemsAPI = async (req: Request, res: Response) => {
  try {
    const { q, limit, lastKey } = req.query;
    const result = await InventoryService.getActiveInventoryItems(
      q as string | undefined,
      Number(limit) || 50,
      lastKey as string | undefined
    );
    res.json(result);
  } catch (e: any) {
    console.error('Get Active Items Error:', e.message);
    res.status(400).json({ message: e.message });
  }
};

export const getLineItem = async (req: Request, res: Response) => {
  try {
    const { invoiceNumber, itemId } = req.params;
    const result = await InventoryService.getItemById(invoiceNumber as string, itemId as string);
    if (!result) return res.status(404).json({ message: 'Item not found' });
    res.json(result);
  } catch(e: any) {
    res.status(400).json({ message: e.message });
  }
};

export const listAllItems = async (req: Request, res: Response) => {
  try {
    const { limit, lastKey, status, sku, name, startDate, endDate } = req.query;
    const filters = { status, sku, name, startDate, endDate };
    
    const result = await InventoryService.listAllInventoryItems(
      filters,
      Number(limit) || 20, 
      lastKey as string | undefined
    );
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};

export const updateStatus = async (req: Request, res: Response) => {
  try {
    const { invoiceNumber } = req.params;
    const { status } = req.body;
    if (!status) return res.status(400).json({ message: 'Status is required' });
    
    const result = await InventoryService.updateInvoiceStatus(invoiceNumber as string, status);
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};

export const updateItemStatus = async (req: Request, res: Response) => {
  try {
    const { invoiceNumber, inventoryId } = req.params;
    const { status } = req.body;
    if (!status) return res.status(400).json({ message: 'Status is required' });
    
    const result = await InventoryService.updateInventoryItemStatus(invoiceNumber as string, inventoryId as string, status);
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};

export const bulkUpdateItems = async (req: Request, res: Response) => {
  try {
    const { updates } = req.body; // Array of { invoiceNumber, inventoryId, status }
    if (!updates || !Array.isArray(updates)) {
      return res.status(400).json({ message: 'Updates array is required' });
    }
    
    const result = await InventoryService.bulkUpdateInventoryItemStatus(updates);
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};
