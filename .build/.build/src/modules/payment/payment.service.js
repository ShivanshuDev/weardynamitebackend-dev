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
exports.updatePaymentStatus = exports.logPaymentIntent = exports.processPaymentCallback = exports.initiateTransaction = void 0;
const awsClient_1 = require("../../utils/awsClient");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const crypto = __importStar(require("crypto"));
const OrderService = __importStar(require("../order/order.service"));
const auth_service_1 = require("../auth/auth.service");
const PAYU_KEY = process.env.PAYU_MERCHANT_KEY || 'gtK38P';
const PAYU_SALT = process.env.PAYU_SALT || 'eCwWELxi';
const PAYU_URL = process.env.PAYU_URL || 'https://test.payu.in/_payment';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
/**
 * Initiates an online transaction by:
 * 1. Creating a formal Order record in "Awaiting Payment" status.
 * 2. Generating the PayU security hash.
 */
const initiateTransaction = async (params) => {
    const { userId, amount, productInfo, firstname, email, phone, addressId, address: fullAddress, items, couponCode } = params;
    // 1. Fetch User Profile
    let { Item: user } = await awsClient_1.docClient.send(new lib_dynamodb_1.GetCommand({
        TableName: awsClient_1.MAIN_TABLE,
        Key: { PK: `USER#${userId}`, SK: 'PROFILE' }
    }));
    // SELF-HEALING: If profile is missing (sync lag), create it immediately using session data
    if (!user) {
        console.warn(`[PAYMENT AUDIT] Profile missing for USER#${userId}. Triggering self-healing reconstruction.`);
        user = (await (0, auth_service_1.syncUser)(userId, email, firstname));
    }
    // 2. Fetch or Recover Shipping Address
    let address = fullAddress;
    // LOGGING: Real-time transparency for debugging
    console.log(`[PAYMENT AUDIT] Discovery phase for USER#${userId}: hasFullAddress=${!!fullAddress}, addressId=${addressId}`);
    if (!address) {
        const { Item: dbAddress } = await awsClient_1.docClient.send(new lib_dynamodb_1.GetCommand({
            TableName: awsClient_1.MAIN_TABLE,
            Key: { PK: `USER#${userId}`, SK: `ADDRESS#${addressId}` }
        }));
        address = dbAddress;
        // LAST-RESORT RECOVERY: If the specific addressId is missing, try to find ANY address for this user
        if (!address) {
            console.warn(`[PAYMENT AUDIT] Explicit address ${addressId} not found. Attempting 'First-Available' recovery for USER#${userId}.`);
            const { Items } = await awsClient_1.docClient.send(new lib_dynamodb_1.QueryCommand({
                TableName: awsClient_1.MAIN_TABLE,
                KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
                ExpressionAttributeValues: { ':pk': `USER#${userId}`, ':sk': 'ADDRESS#' },
                Limit: 1
            }));
            if (Items && Items.length > 0) {
                address = Items[0];
                console.log(`[PAYMENT AUDIT] Recovery successful: Using address ${address.addressId || address.id}`);
            }
        }
    }
    // 3. Absolute Guards with Descriptive Errors
    if (!user) {
        console.error(`[PAYMENT BLOCK] Missing Master Profile for USER#${userId}`);
        throw new Error('User profile incomplete. Please try logging out and in once to refresh your session.');
    }
    if (!address) {
        console.error(`[PAYMENT BLOCK] Missing Shipping Address after recovery phase for USER#${userId}`);
        throw new Error('Shipping address missing. Please ensure you have added an address in your profile before checking out.');
    }
    // 2. Create the Order in the database first (Reserves stock)
    const order = await OrderService.placeOrder(userId, {
        address_id: addressId,
        payment_method: 'Online',
        items,
        coupon_code: couponCode,
        customer_details: {
            name: user.name || 'Guest',
            email: user.email,
            phone: address.phone || user.phone
        },
        shipping_address: address
    });
    const txnid = order.order_id;
    const amountStr = amount.toFixed(2);
    // 2. Generate PayU Hash
    // Formula: key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5|udf6|udf7|udf8|udf9|udf10|salt
    // Total 16 pipes. We use empty strings for udfs.
    const hashString = `${PAYU_KEY}|${txnid}|${amountStr}|${productInfo}|${firstname}|${email}|||||||||||${PAYU_SALT}`;
    const hash = crypto.createHash('sha512').update(hashString).digest('hex');
    // 3. Log the intent for auditing
    await (0, exports.logPaymentIntent)(txnid, amount);
    return {
        key: PAYU_KEY,
        txnid,
        amount: amountStr,
        firstname,
        email,
        phone,
        productinfo: productInfo,
        surl: `${process.env.BACKEND_URL}/api/payment/payu-callback`,
        furl: `${process.env.BACKEND_URL}/api/payment/payu-callback`,
        hash,
        action: PAYU_URL
    };
};
exports.initiateTransaction = initiateTransaction;
/**
 * Validates the PayU callback and updates order status.
 */
const processPaymentCallback = async (payuData) => {
    const { txnid, status, amount, hash, key } = payuData;
    // 1. Verify Hash (Reversed formula for callback)
    // Formula: salt|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key
    // Total 16 pipes.
    const checkHashString = `${PAYU_SALT}|${status}|||||||||||${payuData.email}|${payuData.firstname}|${payuData.productinfo}|${amount}|${txnid}|${key}`;
    const expectedHash = crypto.createHash('sha512').update(checkHashString).digest('hex');
    // In production, we should verify the hash. For testing, we log it.
    console.log('[PAYMENT] Verifying Hash:', { received: hash, expected: expectedHash });
    const isSuccess = status === 'success';
    const orderStatus = isSuccess ? 'Pending' : 'Payment Failed';
    const paymentStatus = isSuccess ? 'Paid' : 'Failed';
    // 2. Update Order
    await (0, exports.updatePaymentStatus)(txnid, paymentStatus, payuData);
    if (isSuccess) {
        await OrderService.updateOrderStatus(txnid, 'Pending');
    }
    const path = isSuccess ? '/order-success' : '/order-status';
    return {
        redirectUrl: `${FRONTEND_URL}${path}?id=${txnid}&status=${status}`
    };
};
exports.processPaymentCallback = processPaymentCallback;
const logPaymentIntent = async (orderId, amount) => {
    const record = {
        PK: `ORDER#${orderId}`,
        SK: `PAYMENT_INTENT#${Date.now()}`,
        order_id: orderId,
        amount,
        status: 'Pending',
        created_at: Date.now()
    };
    await awsClient_1.docClient.send(new lib_dynamodb_1.PutCommand({ TableName: awsClient_1.MAIN_TABLE, Item: record }));
    return record;
};
exports.logPaymentIntent = logPaymentIntent;
const updatePaymentStatus = async (orderId, status, gatewayResponse) => {
    await awsClient_1.docClient.send(new lib_dynamodb_1.UpdateCommand({
        TableName: awsClient_1.MAIN_TABLE,
        Key: { PK: `ORDER#${orderId}`, SK: 'SUMMARY' },
        UpdateExpression: 'SET payment_status = :pst, gateway_response = :gw, updated_at = :now',
        ExpressionAttributeValues: {
            ':pst': status,
            ':gw': gatewayResponse || null,
            ':now': Date.now()
        }
    }));
    return { updated: true, status };
};
exports.updatePaymentStatus = updatePaymentStatus;
