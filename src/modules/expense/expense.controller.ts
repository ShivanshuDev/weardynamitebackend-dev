import { Request, Response } from 'express';
import * as ExpenseService from './expense.service';

/**
 * List all expenses for admin.
 */
export const listExpenses = (req: Request, res: Response) => {
  try {
    const filters = {
      category: req.query.category as string,
      dateFrom: req.query.dateFrom as string,
      dateTo: req.query.dateTo as string
    };
    res.json(ExpenseService.listExpenses(filters));
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

/**
 * Handle new expense creation.
 */
export const createExpense = (req: Request, res: Response) => {
  try {
    const { description, category, amount, date } = req.body;
    if (!description || !category || amount === undefined) {
      return res.status(400).json({ message: 'Description, Category, and Amount are mandatory fields.' });
    }
    const record = ExpenseService.createExpense({ description, category, amount, date });
    res.status(201).json(record);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

/**
 * Handle expense deletion.
 */
export const deleteExpense = (req: Request, res: Response) => {
  try {
    const success = ExpenseService.deleteExpense(req.params.id as string);
    if (!success) return res.status(404).json({ message: 'Expense record not found.' });
    res.json({ message: 'Expense record successfully purged from manifest.' });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
