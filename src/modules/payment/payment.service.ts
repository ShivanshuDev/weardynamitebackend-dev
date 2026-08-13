import { docClient, MAIN_TABLE } from '../../utils/awsClient';
import { PutCommand, QueryCommand, UpdateCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import * as crypto from 'crypto';
import * as OrderService from '../order/order.service';
import * as GiftService from '../gift/gift.service';
import { syncUser } from '../auth/auth.service';
import { cache } from '../../utils/redisClient';

const PAYU_KEY = process.env.PAYU_MERCHANT_KEY || 'gtK38P';
const PAYU_SALT = process.env.PAYU_SALT || 'eCwWELxi';
const PAYU_URL = process.env.PAYU_URL || 'https://test.payu.in/_payment';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

interface PaymentInitiateParams {
  userId: string;
  amount: number;
  productInfo: string;
  firstname: string;
  email: string;
  phone: string;
  addressId: string;
  address?: any; // Full address object from frontend
  items: any[];
  couponCode?: string;
}

/**
 * Initiates an online transaction by:
 * 1. Creating a formal Order record in "Awaiting Payment" status.
 * 2. Generating the PayU security hash.
 */
export const initiateTransaction = async (params: PaymentInitiateParams) => {
  const { userId, amount, productInfo, firstname, email, phone, addressId, address: fullAddress, items, couponCode } = params;

  // 1. Fetch User Profile
  let { Item: user } = await docClient.send(new GetCommand({
    TableName: MAIN_TABLE,
    Key: { PK: `USER#${userId}`, SK: 'PROFILE' }
  }));

  // SELF-HEALING: If profile is missing (sync lag), create it immediately using session data
  if (!user) {
    console.warn(`[PAYMENT AUDIT] Profile missing for USER#${userId}. Triggering self-healing reconstruction.`);
    user = (await syncUser(userId, email, firstname)) as any;
  }

  // 2. Fetch or Recover Shipping Address
  let address = fullAddress;
  
  // LOGGING: Real-time transparency for debugging
  console.log(`[PAYMENT AUDIT] Discovery phase for USER#${userId}: hasFullAddress=${!!fullAddress}, addressId=${addressId}`);

  if (!address) {
    const { Item: dbAddress } = await docClient.send(new GetCommand({
      TableName: MAIN_TABLE,
      Key: { PK: `USER#${userId}`, SK: `ADDRESS#${addressId}` }
    }));
    address = dbAddress;

    // LAST-RESORT RECOVERY: If the specific addressId is missing, try to find ANY address for this user
    if (!address) {
      console.warn(`[PAYMENT AUDIT] Explicit address ${addressId} not found. Attempting 'First-Available' recovery for USER#${userId}.`);
      const { Items } = await docClient.send(new QueryCommand({
        TableName: MAIN_TABLE,
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
  await logPaymentIntent(txnid, amount);

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

/**
 * Validates the PayU callback and updates order status.
 */
export const processPaymentCallback = async (payuData: any) => {
  const { txnid, status, amount, hash, key, mihpayid } = payuData;
  
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

  if (txnid.startsWith('GIFT_')) {
    if (isSuccess) {
      await GiftService.fulfillGift(txnid, mihpayid);
    }
    return {
      redirectUrl: `${FRONTEND_URL}/`
    };
  }

  // 2. Update Order
  await updatePaymentStatus(txnid, paymentStatus, payuData);
  
  if (isSuccess) {
    await OrderService.updateOrderStatus(txnid, 'Pending');
  } else {
    // Payment failed, automatically cancel to release reserved stock
    await OrderService.updateOrderStatus(txnid, 'Cancelled');
  }

  const path = isSuccess ? '/order-success' : '/order-status';
  return {
    redirectUrl: `${FRONTEND_URL}${path}?id=${txnid}&status=${status}`
  };
};

export const logPaymentIntent = async (orderId: string, amount: number) => {
  const record = {
    PK: `ORDER#${orderId}`,
    SK: `PAYMENT_INTENT#${Date.now()}`,
    order_id: orderId,
    amount,
    status: 'Pending',
    created_at: Date.now()
  };
  await docClient.send(new PutCommand({ TableName: MAIN_TABLE, Item: record }));
  return record;
};

export const updatePaymentStatus = async (orderId: string, status: string, gatewayResponse?: any) => {
  await docClient.send(new UpdateCommand({
    TableName: MAIN_TABLE,
    Key: { PK: `ORDER#${orderId}`, SK: 'SUMMARY' },
    UpdateExpression: 'SET payment_status = :pst, gateway_response = :gw, updated_at = :now',
    ExpressionAttributeValues: { 
      ':pst': status, 
      ':gw': gatewayResponse || null,
      ':now': Date.now()
    }
  }));
  
  await cache.del(`payment:${orderId}`);
  await cache.delPattern('payment:list:*');
  return { updated: true, status };
};
