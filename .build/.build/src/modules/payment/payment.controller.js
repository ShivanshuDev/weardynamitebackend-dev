"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.handlePayUCallback = exports.initiatePayment = void 0;
const paymentService = __importStar(require("./payment.service"));
/**
 * Initiates a payment process.
 * 1. Creates a pending order.
 * 2. Generates PayU hash.
 * 3. Returns payment parameters to the frontend.
 */
const initiatePayment = async (req, res) => {
    try {
        const { amount, productInfo, firstname, email, phone, addressId, address, items, couponCode } = req.body;
        const userId = req.user?.id; // Assuming auth middleware provides this
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
            address, // Pass the full address object if provided
            items,
            couponCode
        });
        res.json(paymentData);
    }
    catch (error) {
        console.error('Payment Initiation Error:', error);
        let status = 500;
        if (error.message.includes('reached limit'))
            status = 429;
        else if (error.message.includes('Insufficient stock'))
            status = 422;
        res.status(status).json({ message: error.message });
    }
};
exports.initiatePayment = initiatePayment;
/**
 * Handles the callback from PayU (Success / Failure).
 * PayU sends a POST request with the transaction details.
 */
const handlePayUCallback = async (req, res) => {
    try {
        console.log('PayU Callback Received:', req.body);
        // PayU sends data in req.body for POST callbacks
        const result = await paymentService.processPaymentCallback(req.body);
        // Redirect the user back to the frontend status page
        res.redirect(result.redirectUrl);
    }
    catch (error) {
        console.error('Payment Callback Error:', error);
        // Even if verification fails, we should redirect to a failure page on frontend
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        res.redirect(`${frontendUrl}/order-status?error=payment_failed`);
    }
};
exports.handlePayUCallback = handlePayUCallback;
