"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendBirthdayWishes = exports.initScheduler = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const awsClient_1 = require("./awsClient");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const notificationService_1 = require("./notificationService");
/**
 * Scheduler: Handles periodic background tasks (Birthdays, etc.)
 */
const initScheduler = () => {
    console.log('[SCHEDULER] Initializing Daily Birthday Tasks (9:00 AM)...');
    // Run every day at 09:00 AM
    node_cron_1.default.schedule('0 9 * * *', async () => {
        console.log('[SCHEDULER] Executing daily birthday check...');
        await (0, exports.sendBirthdayWishes)();
    });
};
exports.initScheduler = initScheduler;
/**
 * Queries users with a birthday today using GSI5 (No-Scan)
 */
const sendBirthdayWishes = async () => {
    try {
        const today = new Date();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const birthdayKey = `${mm}-${dd}`;
        console.log(`[SCHEDULER] Searching for birthdays on: ${birthdayKey}`);
        // 🚀 HIGH PERFORMANCE QUERY (NO SCAN)
        // We query GSI5 which index users by birthday_mm_dd
        const { Items } = await awsClient_1.docClient.send(new lib_dynamodb_1.QueryCommand({
            TableName: awsClient_1.MAIN_TABLE,
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
        const promises = Items.map(user => notificationService_1.NotificationService.sendBirthdayWish(user));
        await Promise.allSettled(promises);
        console.log('[SCHEDULER] Birthday wishes cycle complete.');
    }
    catch (error) {
        console.error('[SCHEDULER ERROR] Failed to execute birthday wishes:', error);
    }
};
exports.sendBirthdayWishes = sendBirthdayWishes;
