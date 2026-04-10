import { Router } from 'express';
import * as NotificationController from './notification.controller';
import { authenticate, adminOnly } from '../../middleware/auth';

const router = Router();

// Public route to request notification
router.post('/', NotificationController.createRequest);

// Admin route to list notification requests
router.get('/admin', authenticate as any, adminOnly as any, NotificationController.getRequests);

// ─── Broadcast Management (Admin) ──────────────────────────────────────────

router.post('/admin/broadcast', authenticate as any, adminOnly as any, NotificationController.createAndSendBroadcast);
router.get('/admin/broadcast', authenticate as any, adminOnly as any, NotificationController.getBroadcastHistory);

export default router;
