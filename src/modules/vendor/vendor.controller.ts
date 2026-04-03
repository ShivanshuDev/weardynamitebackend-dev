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
    const { name, contactPerson, email, phone, category, address } = req.body;
    if (!name || !contactPerson || !email || !phone || !category) {
      return res.status(400).json({ message: 'Missing mandatory fields for vendor onboarding.' });
    }
    const record = await VendorService.createVendor({ name, contactPerson, email, phone, category, address });
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
    const { date, type, amount, description } = req.body;
    if (!date || !type || amount === undefined || !description) {
      return res.status(400).json({ message: 'Transaction Date, Type, Amount, and Description are mandatory.' });
    }
    const record = await VendorService.addVendorTransaction(req.params.id as string, { date, type, amount, description });
    res.status(201).json(record);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
