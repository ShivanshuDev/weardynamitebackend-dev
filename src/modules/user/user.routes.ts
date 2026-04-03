import { Router } from 'express';
import * as UserController from './user.controller';
import { authenticate, adminOnly } from '../../middleware/auth';

const router = Router();
const auth = authenticate as any;
const admin = adminOnly as any;

router.get('/profile', auth, UserController.getProfile as any);
router.put('/profile', auth, UserController.updateProfile as any);
router.put('/preferences', auth, UserController.updatePreferences as any);

router.get('/addresses', auth, UserController.getAddresses as any);
router.post('/addresses', auth, UserController.addAddress as any);
router.put('/addresses/:id', auth, UserController.updateAddress as any);
router.delete('/addresses/:id', auth, UserController.deleteAddress as any);
router.patch('/addresses/:id/default', auth, UserController.setDefaultAddress as any);

// ─── Admin ───────────────────────────────────────────────────────────────────
router.get('/admin/users', auth, admin, UserController.adminListUsers as any);

export default router;
