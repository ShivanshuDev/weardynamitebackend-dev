import { Router } from 'express';
import * as NotificationController from './notification.controller';
import { authenticate, adminOnly } from '../../middleware/auth';

const router = Router();

// Public route to request notification
router.post('/', NotificationController.createRequest);

// Admin route to list notification requests
router.get('/admin', authenticate as any, adminOnly as any, NotificationController.getRequests);

export default router;
