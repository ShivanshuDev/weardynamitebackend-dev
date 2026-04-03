import { Router } from 'express';
import * as IC from './inquiry.controller';
import { authenticate, adminOnly } from '../../middleware/auth';

const router = Router();
const auth = authenticate as any;
const admin = adminOnly as any;

// Public
router.post('/inquiries', IC.submitInquiry);
router.post('/subscribers', IC.subscribe);
router.delete('/subscribers', IC.unsubscribe);

// Admin
router.get('/admin/inquiries', auth, admin, IC.listInquiries);
router.get('/admin/inquiries/:id', auth, admin, IC.getInquiryDetail);
router.patch('/admin/inquiries/:id/status', auth, admin, IC.updateInquiryStatus);
router.delete('/admin/inquiries/:id', auth, admin, IC.deleteInquiry);
router.get('/admin/subscribers', auth, admin, IC.listSubscribers);
router.get('/admin/subscribers/export', auth, admin, IC.exportSubscribers);

export default router;
