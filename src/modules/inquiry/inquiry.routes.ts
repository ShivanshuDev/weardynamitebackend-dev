import { Router } from 'express';
import * as IC from './inquiry.controller';
import { authenticate, adminOnly } from '../../middleware/auth';

const router = Router();
const auth = authenticate as any;
const admin = adminOnly as any;

// Public
router.post('/inquiries', IC.submitInquiry);
// Admin
router.get('/admin/inquiries', auth, admin, IC.listInquiries);
router.get('/admin/inquiries/:id', auth, admin, IC.getInquiryDetail);
router.patch('/admin/inquiries/:id/status', auth, admin, IC.updateInquiryStatus);
router.delete('/admin/inquiries/:id', auth, admin, IC.deleteInquiry);

export default router;
