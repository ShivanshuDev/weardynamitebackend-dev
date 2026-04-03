import { Router } from 'express';
import * as paymentController from './payment.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

// Endpoint to start the payment process
// Needs authentication to identify the user
router.post('/initiate', authenticate as any, paymentController.initiatePayment);

// Callback endpoint for PayU (Success/Failure)
// Does NOT need authentication as PayU calls it externally
router.post('/payu-callback', paymentController.handlePayUCallback);

export default router;
