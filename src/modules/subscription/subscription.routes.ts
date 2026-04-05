import { Router } from 'express';
import * as SC from './subscription.controller';
import { authenticate, adminOnly } from '../../middleware/auth';

const router = Router();
const auth = authenticate as any;
const admin = adminOnly as any;

// Public
router.post('/subscribe', SC.handleSubscribe);

// Admin
router.get('/admin/subscribers', auth, admin, SC.handleList);

export default router;
