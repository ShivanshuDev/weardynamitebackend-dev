import { Router } from 'express';
import * as MembershipController from './membership.controller';
import { authenticate, adminOnly } from '../../middleware/auth';

const router = Router();
const auth = authenticate as any;
const admin = adminOnly as any;

router.post('/', auth, MembershipController.createMembership);
router.get('/me', auth, MembershipController.getMyMembership);
router.get('/admin/list', auth, admin, MembershipController.listMemberships);
router.get('/admin/:userId', auth, admin, MembershipController.getMembership);

export default router;
