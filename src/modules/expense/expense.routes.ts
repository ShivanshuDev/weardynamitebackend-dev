import { Router } from 'express';
import * as ExpenseController from './expense.controller';
import { authenticate, adminOnly } from '../../middleware/auth';

const router = Router();
const auth = authenticate as any;
const admin = adminOnly as any;

/**
 * Administrative endpoints for expense management.
 */
router.get('/admin/expenses', auth, admin, ExpenseController.listExpenses);
router.post('/admin/expenses', auth, admin, ExpenseController.createExpense);
router.delete('/admin/expenses/:id', auth, admin, ExpenseController.deleteExpense);

export default router;
