import { Router } from 'express';
import * as QuotationController from './quotation.controller';
import { authenticate, adminOnly } from '../../middleware/auth';

const router = Router();
const auth = authenticate as any;
const admin = adminOnly as any;

/**
 * Administrative endpoints for Quotation Management
 */
router.post('/admin/quotations', auth, admin, QuotationController.createQuotation);
router.get('/admin/quotations', auth, admin, QuotationController.listQuotations);
router.get('/admin/quotations/:id', auth, admin, QuotationController.getQuotation);
router.put('/admin/quotations/:id', auth, admin, QuotationController.updateQuotation);
router.patch('/admin/quotations/:id/status', auth, admin, QuotationController.updateQuotationStatus);
router.post('/admin/quotations/:id/convert', auth, admin, QuotationController.convertToOrder);
router.post('/admin/quotations/:id/send', auth, admin, QuotationController.sendQuotation);

export default router;
