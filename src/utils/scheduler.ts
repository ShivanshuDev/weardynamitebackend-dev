import cron from 'node-cron';
import { docClient, MAIN_TABLE } from './awsClient';
import { QueryCommand, ScanCommand, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { NotificationService } from './notificationService';
import * as OrderService from '../modules/order/order.service';

/**
 * Scheduler: Handles periodic background tasks (Birthdays, etc.)
 */
export const initScheduler = () => {
    console.log('[SCHEDULER] Initializing Daily Birthday Tasks (9:00 AM)...');

    // Run every day at 09:00 AM
    cron.schedule('0 9 * * *', async () => {
        console.log('[SCHEDULER] Executing daily birthday check...');
        await sendBirthdayWishes();
    });

    console.log('[SCHEDULER] Initializing Scheduled Gifts Check (Hourly)...');
    
    // Run every hour
    cron.schedule('0 * * * *', async () => {
        console.log('[SCHEDULER] Executing scheduled gifts check...');
        await processScheduledGifts();
    });
};

/**
 * Queries users with a birthday today using GSI5 (No-Scan)
 */
export const sendBirthdayWishes = async () => {
    try {
        const today = new Date();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const birthdayKey = `${mm}-${dd}`;

        console.log(`[SCHEDULER] Searching for birthdays on: ${birthdayKey}`);

        // 🚀 HIGH PERFORMANCE QUERY (NO SCAN)
        // We query GSI5 which index users by birthday_mm_dd
        const { Items } = await docClient.send(new QueryCommand({
            TableName: MAIN_TABLE,
            IndexName: 'GSI5',
            KeyConditionExpression: 'GSI5PK = :pk AND GSI5SK = :sk',
            ExpressionAttributeValues: {
                ':pk': 'BIRTHDAY',
                ':sk': birthdayKey
            }
        }));

        if (!Items || Items.length === 0) {
            console.log('[SCHEDULER] No birthdays found today.');
            return;
        }

        console.log(`[SCHEDULER] Found ${Items.length} birthdays. Sending wishes...`);

        // Send notifications in parallel (with settling to ensure one failure doesn't stop others)
        const promises = Items.map(user => NotificationService.sendBirthdayWish(user));
        await Promise.allSettled(promises);

        console.log('[SCHEDULER] Birthday wishes cycle complete.');
    } catch (error) {
        console.error('[SCHEDULER ERROR] Failed to execute birthday wishes:', error);
    }
};

export const processScheduledGifts = async () => {
    try {
        console.log(`[SCHEDULER] Searching for scheduled gifts...`);
        const { Items } = await docClient.send(new ScanCommand({
            TableName: MAIN_TABLE,
            FilterExpression: '#st = :status',
            ExpressionAttributeNames: { '#st': 'status' },
            ExpressionAttributeValues: {
                ':status': 'SCHEDULED_PENDING'
            }
        }));

        const pendingGifts = (Items || []).filter(gift => {
            if (!gift.scheduledDate) return false;
            return new Date(gift.scheduledDate).getTime() <= Date.now();
        });

        if (pendingGifts.length === 0) {
            console.log('[SCHEDULER] No scheduled gifts to deliver.');
            return;
        }

        console.log(`[SCHEDULER] Found ${pendingGifts.length} scheduled gifts. Delivering...`);

        for (const gift of pendingGifts) {
            try {
                // Update status to DELIVERED
                await docClient.send(new UpdateCommand({
                    TableName: MAIN_TABLE,
                    Key: { PK: gift.PK, SK: gift.SK },
                    UpdateExpression: 'SET #st = :s, updatedAt = :u',
                    ExpressionAttributeNames: { '#st': 'status' },
                    ExpressionAttributeValues: { ':s': 'DELIVERED', ':u': Date.now() }
                }));

                const { Item: buyer } = await docClient.send(new GetCommand({
                    TableName: MAIN_TABLE,
                    Key: { PK: `USER#${gift.senderId}`, SK: 'PROFILE' }
                }));

                if (gift.giftType === 'product') {
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
                    const { Items: vouchers } = await docClient.send(new ScanCommand({
                        TableName: MAIN_TABLE,
                        FilterExpression: 'giftId = :gid',
                        ExpressionAttributeValues: { ':gid': gift.id }
                    }));
                    const voucher = vouchers?.[0];
                    if (voucher) {
                        await NotificationService.sendGiftEmail(gift.recipient.email, gift.recipient.name, voucher.code, gift.amount, gift.recipient.message, buyer);
                    }
                }
            } catch (err) {
                console.error(`[SCHEDULER ERROR] Failed to deliver gift ${gift.id}:`, err);
            }
        }
    } catch (error) {
        console.error('[SCHEDULER ERROR] Failed to execute scheduled gifts check:', error);
    }
};
