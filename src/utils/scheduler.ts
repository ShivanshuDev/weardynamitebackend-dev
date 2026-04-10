import cron from 'node-cron';
import { docClient, MAIN_TABLE } from './awsClient';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { NotificationService } from './notificationService';

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
