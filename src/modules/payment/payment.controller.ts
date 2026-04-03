import { Request, Response } from 'express';
import * as paymentService from './payment.service';

/**
 * Initiates a payment process.
 * 1. Creates a pending order.
 * 2. Generates PayU hash.
 * 3. Returns payment parameters to the frontend.
 */
export const initiatePayment = async (req: Request, res: Response) => {
  try {
    const { amount, productInfo, firstname, email, phone, addressId, items } = req.body;
    const userId = (req as any).user?.id; // Assuming auth middleware provides this

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const paymentData = await paymentService.initiateTransaction({
      userId,
      amount,
      productInfo,
      firstname,
      email,
      phone,
      addressId,
      items,
    });

    res.json(paymentData);
  } catch (error: any) {
    console.error('Payment Initiation Error:', error);
    const status = error.message.includes('Insufficient stock') ? 422 : 500;
    res.status(status).json({ message: error.message });
  }
};

/**
 * Handles the callback from PayU (Success / Failure).
 * PayU sends a POST request with the transaction details.
 */
export const handlePayUCallback = async (req: Request, res: Response) => {
  try {
    console.log('PayU Callback Received:', req.body);
    
    // PayU sends data in req.body for POST callbacks
    const result = await paymentService.processPaymentCallback(req.body);

    // Redirect the user back to the frontend status page
    res.redirect(result.redirectUrl);
  } catch (error: any) {
    console.error('Payment Callback Error:', error);
    // Even if verification fails, we should redirect to a failure page on frontend
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/order-status?error=payment_failed`);
  }
};
