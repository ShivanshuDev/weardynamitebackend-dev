import { Request, Response } from 'express';
import * as LedgerService from './ledger.service';

export const listTransactions = (req: Request, res: Response) => {
  try { res.json(LedgerService.listTransactions(req.query as any)); } catch (e: any) { res.status(400).json({ message: e.message }); }
};
export const addTransaction = (req: Request, res: Response) => {
  try { res.status(201).json(LedgerService.addTransaction(req.body)); } catch (e: any) { res.status(400).json({ message: e.message }); }
};
export const getLedgerSummary = (_req: Request, res: Response) => {
  try { res.json(LedgerService.getLedgerSummary()); } catch (e: any) { res.status(400).json({ message: e.message }); }
};
export const getDailyLedger = (req: Request, res: Response) => {
  try {
    const date = (req.params.date as string) || new Date().toISOString().split('T')[0];
    res.json(LedgerService.getDailySummary(date));
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};
export const exportLedger = (_req: Request, res: Response) => {
  try {
    const csv = LedgerService.exportLedgerCSV();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=ledger.csv');
    res.send(csv);
  } catch (e: any) { res.status(400).json({ message: e.message }); }
};

// Dashboard
export const getDashboardStats = (_req: Request, res: Response) => {
  try { res.json(LedgerService.getDashboardStats()); } catch (e: any) { res.status(400).json({ message: e.message }); }
};
export const getRevenueChart = (req: Request, res: Response) => {
  try { res.json(LedgerService.getRevenueChart(req.query.period as string || '30d')); } catch (e: any) { res.status(400).json({ message: e.message }); }
};
export const getTopProducts = (_req: Request, res: Response) => {
  try { res.json(LedgerService.getTopProducts()); } catch (e: any) { res.status(400).json({ message: e.message }); }
};
