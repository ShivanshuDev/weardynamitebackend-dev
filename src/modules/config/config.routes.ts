import { Router } from 'express';
import * as ConfigController from './config.controller';
import { authenticate, adminOnly } from '../../middleware/auth';

const router = Router();
const auth = authenticate as any;
const admin = adminOnly as any;

router.get('/membership-pricing', ConfigController.getMembershipPricing);
router.put('/membership-pricing', auth, admin, ConfigController.updateMembershipPricing);

export default router;
