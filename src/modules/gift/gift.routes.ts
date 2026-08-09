import { Router } from 'express';
import { checkout, listGifts } from './gift.controller';
import { authenticate, adminOnly } from '../../middleware/auth';

const router = Router();
router.post('/checkout', authenticate, checkout);
router.get('/admin/list', authenticate, adminOnly, listGifts);
export default router;
