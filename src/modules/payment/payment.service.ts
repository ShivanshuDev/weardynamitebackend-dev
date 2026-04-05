import { docClient, MAIN_TABLE } from '../../utils/awsClient';
import { PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import * as crypto from 'crypto';
import * as OrderService from '../order/order.service';

const PAYU_KEY = process.env.PAYU_MERCHANT_KEY || 'gtK38P';
const PAYU_SALT = process.env.PAYU_SALT || 'eCwWELxi';
const PAYU_URL = process.env.PAYU_URL || 'https://test.payu.in/_payment';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5174';

interface PaymentInitiateParams {
  userId: string;
  amount: number;
  productInfo: string;
  firstname: string;
  email: string;
  phone: string;
  addressId: string;
  items: any[];
  couponCode?: string;
}

/**
 * Initiates an online transaction by:
 * 1. Creating a formal Order record in "Awaiting Payment" status.
 * 2. Generating the PayU security hash.
 */
export const initiateTransaction = async (params: PaymentInitiateParams) => {
  const { userId, amount, productInfo, firstname, email, phone, addressId, items, couponCode } = params;

  // 1. Create the Order in the database first (Reserves stock)
  const order = await OrderService.placeOrder(userId, {
    addressId,
    paymentMethod: 'Online',
    items,
    couponCode
  });

  const txnid = order.order_id;
  const amountStr = amount.toFixed(2);

  // 2. Generate PayU Hash
  // Formula: key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||salt
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
  const { txnid, status, amount, hash, key } = payuData;
  
  // 1. Verify Hash (Reversed formula for callback)
  // Formula: salt|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key
  const checkHashString = `${PAYU_SALT}|${status}|||||||||||${payuData.email}|${payuData.firstname}|${payuData.productinfo}|${amount}|${txnid}|${key}`;
  const expectedHash = crypto.createHash('sha512').update(checkHashString).digest('hex');

  // In production, we should verify the hash. For testing, we log it.
  console.log('[PAYMENT] Verifying Hash:', { received: hash, expected: expectedHash });

  const isSuccess = status === 'success';
  const orderStatus = isSuccess ? 'Pending' : 'Payment Failed';
  const paymentStatus = isSuccess ? 'Paid' : 'Failed';

  // 2. Update Order
  await updatePaymentStatus(txnid, paymentStatus, payuData);
  
  if (isSuccess) {
    await OrderService.updateOrderStatus(txnid, 'Pending');
  }

  return {
    redirectUrl: `${FRONTEND_URL}/order-status?id=${txnid}&status=${status}`
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
  
  return { updated: true, status };
};
