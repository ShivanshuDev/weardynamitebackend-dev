import { Request, Response } from 'express';
import * as ProductService from './product.service';
import * as InventoryService from './inventory.service';

export const listProducts = async (req: Request, res: Response) => {
  try {
    const { category, subCategory, sort, page, limit, status, color, fit, neckType, occasion } = req.query as any;
    
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
  } catch (e: any) { res.status(400).json({ message: e.message }); }
};

export const searchProducts = async (req: Request, res: Response) => {
  try { res.json(await ProductService.searchProducts(req.query.q as string || '')); }
  catch (e: any) { res.status(400).json({ message: e.message }); }
};

export const getProduct = async (req: Request, res: Response) => {
  try {
    const product = await ProductService.getProduct(req.params.id as string);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    // Block non-active products for public store
    if (!req.originalUrl.includes('/admin/') && product.status !== 'Active') {
      return res.status(403).json({ message: 'This product is not currently available for public purchase.' });
    }

    res.json(product);
  }
  catch (e: any) { res.status(404).json({ message: e.message }); }
};

export const getRelatedProducts = async (req: Request, res: Response) => {
  try { res.json(await ProductService.getRelatedProducts(req.params.id as string)); }
  catch (e: any) { res.status(400).json({ message: e.message }); }
};

export const getNewArrivals = async (_req: Request, res: Response) => res.json(await ProductService.getNewArrivals());
export const getBestSellers = async (_req: Request, res: Response) => res.json(await ProductService.getBestSellers());

export const createProduct = async (req: Request, res: Response) => {
  try { res.status(201).json(await ProductService.createProduct(req.body)); }
  catch (e: any) { res.status(400).json({ message: e.message }); }
};

export const updateProduct = async (req: Request, res: Response) => {
  try { res.json(await ProductService.updateProduct(req.params.id as string, req.body)); }
  catch (e: any) { res.status(400).json({ message: e.message }); }
};

export const patchProductStatus = async (req: Request, res: Response) => {
  try { res.json(await ProductService.patchProductStatus(req.params.id as string, req.body.status as any)); }
  catch (e: any) { res.status(400).json({ message: e.message }); }
};

export const bulkUpdateProductStatus = async (req: Request, res: Response) => {
  try {
    const { productIds, status } = req.body;
    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ message: 'productIds must be a non-empty array' });
    }
    if (productIds.length > 50) {
      return res.status(400).json({ message: 'Maximum 50 products can be updated at a time' });
    }
    res.json(await ProductService.bulkUpdateProductStatus(productIds, status));
  } catch (e: any) { res.status(400).json({ message: e.message }); }
};

export const deleteProduct = async (req: Request, res: Response) => {
  try { res.json(await ProductService.deleteProduct(req.params.id as string)); }
  catch (e: any) { res.status(400).json({ message: e.message }); }
};

// ─── Inventory Invoices ───────────────────────────────────────────────────────
export const listInventoryInvoices = async (req: Request, res: Response) => {
  try { res.json(await InventoryService.getInvoice(req.query.vendorId as string)); } catch (e: any) { res.status(400).json({ message: e.message }); }
};

export const createInventoryInvoice = async (req: Request, res: Response) => {
  try { res.status(201).json(await InventoryService.createInventoryInvoice(req.body)); } catch (e: any) { res.status(400).json({ message: e.message }); }
};

export const updateInventoryInvoice = async (req: Request, res: Response) => {
  try { res.json(await InventoryService.addInventory(req.body)); } catch (e: any) { res.status(400).json({ message: e.message }); }
};

export const deleteInventoryInvoice = async (req: Request, res: Response) => {
  try { res.json(await InventoryService.getInvoice(req.params.id as string)); } catch (e: any) { res.status(400).json({ message: e.message }); }
};

export const getInventoryReport = async (_req: Request, res: Response) => {
  try { res.json(await InventoryService.getInventoryReport()); } catch (e: any) { res.status(500).json({ message: e.message }); }
};

export const updateInventory = async (req: Request, res: Response) => {
  try {
    res.json(await ProductService.updateProduct(req.params.id as string, req.body));
  } catch (e: any) { res.status(400).json({ message: e.message }); }
};
