import { Router } from 'express';
import * as LC from './ledger.controller';
import { authenticate, adminOnly } from '../../middleware/auth';

const router = Router();
const auth = authenticate as any;
const admin = adminOnly as any;

// Dashboard
router.get('/admin/dashboard/stats', auth, admin, LC.getDashboardStats);
router.get('/admin/dashboard/revenue-chart', auth, admin, LC.getRevenueChart);
router.get('/admin/dashboard/top-products', auth, admin, LC.getTopProducts);

// Ledger
router.get('/admin/ledger', auth, admin, LC.listTransactions);
router.post('/admin/ledger', auth, admin, LC.addTransaction);
router.get('/admin/ledger/summary', auth, admin, LC.getLedgerSummary);
router.get('/admin/ledger/daily', auth, admin, LC.getDailyLedger);
router.get('/admin/ledger/daily/:date', auth, admin, LC.getDailyLedger);
router.get('/admin/ledger/export', auth, admin, LC.exportLedger);

export default router;
