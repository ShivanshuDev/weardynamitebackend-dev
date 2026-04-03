import { Router } from 'express';
import * as AuthController from './auth.controller';
import { authenticate, adminOnly } from '../../middleware/auth';

const router = Router();

// Endpoint where Frontend syncs its Firebase user to DynamoDB
router.post('/sync', authenticate, AuthController.sync);

// Internal tools to grant admin privileges to a user
router.post('/admin/grant', authenticate, adminOnly, AuthController.assignAdmin);

// Create a new Administrator strictly. No open registration.
router.post('/admin/create', authenticate, adminOnly, AuthController.createAdmin);

export default router;
