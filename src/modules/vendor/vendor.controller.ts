import { Request, Response } from 'express';
import * as VendorService from './vendor.service';

/**
 * List all vendors for admin.
 */
export const listVendors = async (req: Request, res: Response) => {
  try {
    res.json(await VendorService.listVendors());
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

/**
 * Handle new vendor onboarding.
 */
export const createVendor = async (req: Request, res: Response) => {
  try {
    const { name, email, category } = req.body;
    if (!name || !email || !category) {
      return res.status(400).json({ message: 'Missing mandatory fields for vendor onboarding.' });
    }
    const record = await VendorService.createVendor(req.body);
    res.status(201).json(record);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

/**
 * Handle vendor profile updates.
 */
export const updateVendor = async (req: Request, res: Response) => {
  try {
    const record = await VendorService.updateVendor(req.params.id as string, req.body);
    res.json(record);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

/**
 * Fetch detailed ledger for a specific vendor.
 */
export const listVendorTransactions = async (req: Request, res: Response) => {
  try {
    res.json(await VendorService.listVendorTransactions(req.params.id as string));
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

/**
 * Record a financial event (Bill or Payment) for a vendor.
 */
export const addVendorTransaction = async (req: Request, res: Response) => {
  try {
    const { type, amount, description } = req.body;
    if (!type || amount === undefined || !description) {
      return res.status(400).json({ message: 'Transaction Type, Amount, and Description are mandatory.' });
    }
    const date = req.body.date || Date.now();
    const record = await VendorService.addVendorTransaction(req.params.id as string, { ...req.body, date });
    res.status(201).json(record);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
