import { docClient, MAIN_TABLE } from '../../utils/awsClient';
import { PutCommand, GetCommand, UpdateCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import * as OrderService from '../order/order.service';
import { NotificationService } from '../../utils/notificationService';

const PAYU_KEY = process.env.PAYU_MERCHANT_KEY || 'gtK38P';
const PAYU_SALT = process.env.PAYU_SALT || 'eCwWELxi';
const PAYU_URL = process.env.PAYU_URL || 'https://test.payu.in/_payment';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

export const checkout = async (userId: string, data: { giftType: string, amount: number, recipient: any, productDetails?: any, scheduledDate?: string | number }) => {
    const giftId = uuidv4();
    const txnid = 'GIFT_' + giftId;

    const record = {
        PK: `GIFT#${giftId}`,
        SK: `DETAILS`,
        id: giftId,
        txnid,
        senderId: userId,
        giftType: data.giftType,
        amount: data.amount,
        recipient: data.recipient,
        productDetails: data.productDetails,
        scheduledDate: data.scheduledDate || null,
        status: 'Pending',
        createdAt: Date.now()
    };
    
    await docClient.send(new PutCommand({ TableName: MAIN_TABLE, Item: record }));

    const amountStr = data.amount.toFixed(2);
    const productInfo = `Gift ${data.giftType}`;
    const firstname = data.recipient.name || 'Gift';
    const email = data.recipient.email || 'guest@example.com';
    const phone = data.recipient.phone || '0000000000';

    const hashString = `${PAYU_KEY}|${txnid}|${amountStr}|${productInfo}|${firstname}|${email}|||||||||||${PAYU_SALT}`;
    const hash = crypto.createHash('sha512').update(hashString).digest('hex');

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
}

export const fulfillGift = async (txnid: string, payuId?: string) => {
    const giftId = txnid.replace('GIFT_', '');
    const { Item: gift } = await docClient.send(new GetCommand({
        TableName: MAIN_TABLE,
        Key: { PK: `GIFT#${giftId}`, SK: `DETAILS` }
    }));

    if (!gift) throw new Error('Gift not found');

    const isScheduled = gift.scheduledDate && new Date(gift.scheduledDate).getTime() > Date.now();
    const newStatus = isScheduled ? 'SCHEDULED_PENDING' : 'Paid';

    let updateExpression = 'SET #st = :s, updatedAt = :u, txnid = :txnid';
    let expressionAttributeValues: any = { ':s': newStatus, ':u': Date.now(), ':txnid': txnid };

    if (payuId) {
        updateExpression += ', payuId = :payuId';
        expressionAttributeValues[':payuId'] = payuId;
    }

    // Update status to Paid or SCHEDULED_PENDING
    await docClient.send(new UpdateCommand({
        TableName: MAIN_TABLE,
        Key: { PK: `GIFT#${giftId}`, SK: `DETAILS` },
        UpdateExpression: updateExpression,
        ExpressionAttributeNames: { '#st': 'status' },
        ExpressionAttributeValues: expressionAttributeValues
    }));

    const { Item: buyer } = await docClient.send(new GetCommand({
        TableName: MAIN_TABLE,
        Key: { PK: `USER#${gift.senderId}`, SK: 'PROFILE' }
    }));

    if (gift.giftType === 'product') {
        if (!isScheduled) {
            const orderData = {
                address_id: 'GIFT',
                payment_method: 'Online',
                items: [gift.productDetails],
                customer_details: {
                    name: gift.recipient.name,
                    email: gift.recipient.email,
                    phone: gift.recipient.phone
                },
                shipping_address: {
                    name: gift.recipient.name,
                    email: gift.recipient.email,
                    phone: gift.recipient.phone,
                    ...gift.recipient.address
                }
            };
            await OrderService.placeOrder(gift.senderId, orderData);
        } else {
            await NotificationService.sendGiftPurchaseConfirmation(buyer, gift.recipient.name, 'PRODUCT', gift.amount, gift.recipient.message, gift.scheduledDate);
        }
    } else {
        const voucherId = uuidv4();
        const code = crypto.randomBytes(4).toString('hex').toUpperCase(); // 8 char code
        await docClient.send(new PutCommand({
            TableName: MAIN_TABLE,
            Item: {
                PK: `VOUCHER#${voucherId}`,
                SK: `DETAILS`,
                code,
                giftId,
                amount: gift.amount,
                type: gift.giftType,
                ownerEmail: gift.recipient.email,
                status: 'Active',
                createdAt: Date.now()
            }
        }));
        
        if (isScheduled) {
            await NotificationService.sendGiftPurchaseConfirmation(buyer, gift.recipient.name, code, gift.amount, gift.recipient.message, gift.scheduledDate);
        } else {
            await NotificationService.sendGiftEmail(gift.recipient.email, gift.recipient.name, code, gift.amount, gift.recipient.message, buyer);
        }
    }
}

export const listGifts = async () => {
    const { Items } = await docClient.send(new ScanCommand({
        TableName: MAIN_TABLE,
        FilterExpression: 'begins_with(PK, :pk) AND SK = :sk',
        ExpressionAttributeValues: {
            ':pk': 'GIFT#',
            ':sk': 'DETAILS'
        }
    }));
    
    if (!Items || Items.length === 0) return [];

    const senderIds = [...new Set(Items.map(item => item.senderId).filter(Boolean))];
    const userMap: Record<string, any> = {};

    // Fetch sender profiles
    for (const senderId of senderIds) {
        // Strip USER# prefix if it was saved with it, though usually senderId is just the ID
        const cleanId = senderId.replace('USER#', '');
        const { Item: user } = await docClient.send(new GetCommand({
            TableName: MAIN_TABLE,
            Key: { PK: `USER#${cleanId}`, SK: 'PROFILE' }
        }));
        if (user) {
            userMap[senderId] = { name: user.name, email: user.email, phone: user.phone };
        }
    }

    // Attach sender to each gift
    return Items.map(item => ({
        ...item,
        sender: item.senderId ? (userMap[item.senderId] || { name: 'Unknown', email: 'Unknown' }) : { name: 'Unknown', email: 'Unknown' }
    }));
};
