import { Router } from 'express';
import * as UserController from './user.controller';
import { authenticate, adminOnly } from '../../middleware/auth';

const router = Router();
const auth = authenticate as any;
const admin = adminOnly as any;

router.get('/profile', auth, UserController.getProfile as any);
router.put('/profile', auth, UserController.updateProfile as any);
router.patch('/profile', auth, UserController.updateProfile as any);
router.put('/preferences', auth, UserController.updatePreferences as any);
router.post('/fcm-token', auth, UserController.updateFcmToken as any);
router.get('/payments', auth, UserController.getPayments as any);

router.get('/addresses', auth, UserController.getAddresses as any);
router.post('/addresses', auth, UserController.addAddress as any);
router.put('/addresses/:id', auth, UserController.updateAddress as any);
router.delete('/addresses/:id', auth, UserController.deleteAddress as any);
router.patch('/addresses/:id/default', auth, UserController.setDefaultAddress as any);

router.get('/notifications', auth, UserController.getNotifications as any);
router.patch('/notifications/:id/read', auth, UserController.markNotificationRead as any);
router.post('/notifications/read-all', auth, UserController.markAllNotificationsRead as any);

// ─── Admin ───────────────────────────────────────────────────────────────────
router.get('/admin/users', auth, admin, UserController.adminListUsers as any);

export default router;
