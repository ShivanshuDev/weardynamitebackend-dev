import { Request, Response } from 'express';
import * as LedgerService from './ledger.service';

export const listTransactions = async (req: Request, res: Response) => {
  try { res.json(await LedgerService.listTransactions(req.query as any)); } catch (e: any) { res.status(400).json({ message: e.message }); }
};
export const addTransaction = async (req: Request, res: Response) => {
  try { res.status(201).json(await LedgerService.addTransaction(req.body)); } catch (e: any) { res.status(400).json({ message: e.message }); }
};
export const getLedgerSummary = async (_req: Request, res: Response) => {
  try { res.json(await LedgerService.getLedgerSummary()); } catch (e: any) { res.status(400).json({ message: e.message }); }
};
export const getDailyLedger = async (req: Request, res: Response) => {
  try {
    const date = (req.params.date as string) || new Date().toISOString().split('T')[0];
    res.json(await LedgerService.getDailySummary(date));
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};
export const exportLedger = async (_req: Request, res: Response) => {
  try {
    const csv = await LedgerService.exportLedgerCSV();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=ledger.csv');
    res.send(csv);
  } catch (e: any) { res.status(400).json({ message: e.message }); }
};

// Dashboard
export const getDashboardStats = async (_req: Request, res: Response) => {
  try { res.json(await LedgerService.getDashboardStats()); } catch (e: any) { res.status(400).json({ message: e.message }); }
};
export const getRevenueChart = async (req: Request, res: Response) => {
  try { res.json(await LedgerService.getRevenueChart(req.query.period as string || '30d')); } catch (e: any) { res.status(400).json({ message: e.message }); }
};
export const getTopProducts = async (_req: Request, res: Response) => {
  try { res.json(await LedgerService.getTopProducts()); } catch (e: any) { res.status(400).json({ message: e.message }); }
};
