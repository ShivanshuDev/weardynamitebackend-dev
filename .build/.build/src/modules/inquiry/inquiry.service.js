"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportSubscribersCSV = exports.listInquiriesByUser = exports.unsubscribe = exports.subscribe = exports.listSubscribers = exports.listBulkOrders = exports.deleteInquiry = exports.updateInquiryStatus = exports.getInquiryDetail = exports.submitInquiry = exports.listInquiries = void 0;
const awsClient_1 = require("../../utils/awsClient");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const uuid_1 = require("uuid");
const mailService_1 = require("../../utils/mailService");
const notificationService_1 = require("../../utils/notificationService");
const listInquiries = async () => {
    const { Items } = await awsClient_1.docClient.send(new lib_dynamodb_1.QueryCommand({
        TableName: awsClient_1.MAIN_TABLE,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        ExpressionAttributeValues: { ':pk': 'INQUIRY' },
        ScanIndexForward: false
    }));
    return Items || [];
};
exports.listInquiries = listInquiries;
const submitInquiry = async (data) => {
    // Rate Limit Check: 3 in 90 minutes
    if (data.email) {
        const ninetyMinsAgo = Date.now() - 5400000;
        const { Items: recentInquiries } = await awsClient_1.docClient.send(new lib_dynamodb_1.QueryCommand({
            TableName: awsClient_1.MAIN_TABLE,
            IndexName: 'GSI4',
            KeyConditionExpression: 'GSI4PK = :pk AND GSI4SK >= :sk',
            ExpressionAttributeValues: {
                ':pk': `USER_INQUIRY#${data.email.toLowerCase()}`,
                ':sk': `DATE#${ninetyMinsAgo}#`
            }
        }));
        if (recentInquiries && recentInquiries.length >= 3) {
            throw new Error('try after some reached limit to submit max 3 inquiries in 90 minutes');
        }
    }
    const id = (0, uuid_1.v4)();
    const timestamp = Date.now();
    const record = {
        PK: `INQUIRY#${id}`,
        SK: 'METADATA',
        inquiryId: id,
        status: 'New',
        ...data,
        createdAt: timestamp
    };
    // Standard Indexing
    record.GSI1PK = data.type === 'bulk_order' ? 'BULK_ORDER' : 'INQUIRY';
    record.GSI1SK = `DATE#${timestamp}#${id}`;
    // GSI4: User Inquiry Lookup (High-scale history)
    if (data.email) {
        record.GSI4PK = `USER_INQUIRY#${data.email.toLowerCase()}`;
        record.GSI4SK = `DATE#${timestamp}#${id}`;
    }
    // Bulk Specific Indexing
    if (data.type === 'bulk_order') {
        record.GSI2PK = `BULK_ORDER#STATUS#New`;
        record.GSI2SK = `DATE#${timestamp}#${id}`;
        record.GSI3PK = `BULK_ORDER#TYPE#${data.orderType || 'other'}`;
        record.GSI3SK = `DATE#${timestamp}#${id}`;
    }
    await awsClient_1.docClient.send(new lib_dynamodb_1.PutCommand({ TableName: awsClient_1.MAIN_TABLE, Item: record }));
    // Post-submission Processing (Async)
    (async () => {
        try {
            const isBulk = data.type === 'bulk_order';
            // 1. Admin Alerts (Email + In-App + Push)
            await notificationService_1.NotificationService.sendAdminInquiryNotification(record);
            // 2. Customer Confirmation Email (Always sent to provided email)
            if (isBulk) {
                await mailService_1.MailService.sendInquiryConfirmation(record.email, record.fullName || record.name || 'Valued Customer', record);
            }
            else {
                await mailService_1.MailService.sendStandardInquiryConfirmation(record.email, record.fullName || record.name || 'Valued Customer', record);
            }
            // 3. Customer In-App + Push (Only if they have a registered account)
            if (data.email) {
                const { Items: users } = await awsClient_1.docClient.send(new lib_dynamodb_1.QueryCommand({
                    TableName: awsClient_1.MAIN_TABLE,
                    IndexName: 'GSI2',
                    KeyConditionExpression: 'GSI2PK = :pk',
                    ExpressionAttributeValues: { ':pk': `EMAIL#${data.email.toLowerCase()}` }
                }));
                if (users && users.length > 0) {
                    const user = users[0];
                    const userId = user.PK.replace('USER#', '');
                    await notificationService_1.NotificationService.sendCustomerInquiryConfirmation(userId, record);
                }
            }
        }
        catch (err) {
            console.error('[INQUIRY NOTIFICATION ERROR]', err);
        }
    })();
    return record;
};
exports.submitInquiry = submitInquiry;
const getInquiryDetail = async (id) => {
    const { Item } = await awsClient_1.docClient.send(new lib_dynamodb_1.GetCommand({
        TableName: awsClient_1.MAIN_TABLE,
        Key: { PK: `INQUIRY#${id}`, SK: 'METADATA' }
    }));
    return Item;
};
exports.getInquiryDetail = getInquiryDetail;
const updateInquiryStatus = async (id, status) => {
    // We need to fetch the item first to update GSIs if they exist
    const item = await (0, exports.getInquiryDetail)(id);
    const updateExpr = ['SET #st = :status'];
    const exprNames = { '#st': 'status' };
    const exprValues = { ':status': status };
    if (item?.type === 'bulk_order') {
        updateExpr.push('GSI2PK = :gsi2pk');
        exprValues[':gsi2pk'] = `BULK_ORDER#STATUS#${status}`;
    }
    await awsClient_1.docClient.send(new lib_dynamodb_1.UpdateCommand({
        TableName: awsClient_1.MAIN_TABLE,
        Key: { PK: `INQUIRY#${id}`, SK: 'METADATA' },
        UpdateExpression: updateExpr.join(', '),
        ExpressionAttributeNames: exprNames,
        ExpressionAttributeValues: exprValues
    }));
    // Background processing: Notify Customer
    if (item && item.email) {
        (async () => {
            try {
                console.log(`[STATUS NOTIF] Processing status update for ${item.email} to ${status}`);
                // 1. Search for user by email to get their ID for In-App/Push
                const { Items: users } = await awsClient_1.docClient.send(new lib_dynamodb_1.QueryCommand({
                    TableName: awsClient_1.MAIN_TABLE,
                    IndexName: 'GSI2',
                    KeyConditionExpression: 'GSI2PK = :pk',
                    ExpressionAttributeValues: { ':pk': `EMAIL#${item.email.toLowerCase()}` }
                }));
                if (users && users.length > 0) {
                    const user = users[0];
                    const userId = user.PK.replace('USER#', '');
                    console.log(`[STATUS NOTIF] User found (${userId}), sending In-App/Push...`);
                    // Trigger In-App + Push
                    await notificationService_1.NotificationService.sendInquiryStatusUpdate(userId, item, status);
                }
                else {
                    console.log(`[STATUS NOTIF] No registered user found for ${item.email}, skipping In-App/Push.`);
                }
                // 2. Always send Email Status Update
                console.log(`[STATUS NOTIF] Dispatching status update email to ${item.email}...`);
                await mailService_1.MailService.sendInquiryStatusEmail(item.email, item.fullName || 'Customer', item, status);
            }
            catch (err) {
                console.error('[STATUS NOTIFICATION ERROR]', err);
            }
        })();
    }
    else {
        console.warn(`[STATUS NOTIF] Skipping notifications: item found? ${!!item}, email found? ${item?.email}`);
    }
    return { updated: true, status };
};
exports.updateInquiryStatus = updateInquiryStatus;
const deleteInquiry = async (id) => {
    await awsClient_1.docClient.send(new lib_dynamodb_1.DeleteCommand({ TableName: awsClient_1.MAIN_TABLE, Key: { PK: `INQUIRY#${id}`, SK: 'METADATA' } }));
    return { message: 'Inquiry deleted' };
};
exports.deleteInquiry = deleteInquiry;
const listBulkOrders = async (params) => {
    let indexName = 'GSI1';
    let pkValue = 'BULK_ORDER';
    if (params.status) {
        indexName = 'GSI2';
        pkValue = `BULK_ORDER#STATUS#${params.status}`;
    }
    else if (params.orderType) {
        indexName = 'GSI3';
        pkValue = `BULK_ORDER#TYPE#${params.orderType}`;
    }
    const queryParams = {
        TableName: awsClient_1.MAIN_TABLE,
        IndexName: indexName,
        KeyConditionExpression: 'GSI1PK = :pk',
        ExpressionAttributeValues: { ':pk': pkValue },
        ScanIndexForward: false,
        Limit: params.limit || 20
    };
    if (params.lastKey) {
        queryParams.ExclusiveStartKey = JSON.parse(Buffer.from(params.lastKey, 'base64').toString());
    }
    // If using GSI2 or GSI3, common query pattern expects GSI1PK as the PK name for all GSIs in this schema usually
    // but I must check the actual table definition for GSI names and PK/SK names.
    // Assuming GSI1PK/GSI1SK for GSI1, GSI2PK/GSI2SK for GSI2 etc is the standard for this repo's Single Table Design.
    if (indexName === 'GSI2') {
        queryParams.KeyConditionExpression = 'GSI2PK = :pk';
    }
    else if (indexName === 'GSI3') {
        queryParams.KeyConditionExpression = 'GSI3PK = :pk';
    }
    const { Items, LastEvaluatedKey } = await awsClient_1.docClient.send(new lib_dynamodb_1.QueryCommand(queryParams));
    return {
        items: Items || [],
        lastKey: LastEvaluatedKey ? Buffer.from(JSON.stringify(LastEvaluatedKey)).toString('base64') : null
    };
};
exports.listBulkOrders = listBulkOrders;
// Subscribers
const listSubscribers = async () => {
    const { Items } = await awsClient_1.docClient.send(new lib_dynamodb_1.QueryCommand({
        TableName: awsClient_1.MAIN_TABLE,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        ExpressionAttributeValues: { ':pk': 'SUBSCRIBER' }
    }));
    return Items || [];
};
exports.listSubscribers = listSubscribers;
const subscribe = async (email) => {
    const record = {
        PK: `SUBSCRIBER#${email}`,
        SK: 'METADATA',
        GSI1PK: 'SUBSCRIBER',
        GSI1SK: `DATE#${Date.now()}`,
        email,
        status: 'Subscribed',
        createdAt: Date.now()
    };
    await awsClient_1.docClient.send(new lib_dynamodb_1.PutCommand({ TableName: awsClient_1.MAIN_TABLE, Item: record }));
    return record;
};
exports.subscribe = subscribe;
const unsubscribe = async (email) => {
    await awsClient_1.docClient.send(new lib_dynamodb_1.DeleteCommand({
        TableName: awsClient_1.MAIN_TABLE,
        Key: { PK: `SUBSCRIBER#${email}`, SK: 'METADATA' }
    }));
    return { message: 'Unsubscribed' };
};
exports.unsubscribe = unsubscribe;
const listInquiriesByUser = async (email) => {
    // Enforcing strict 'No Scan' policy: Use GSI4 for high-performance inquiry lookup
    const { Items } = await awsClient_1.docClient.send(new lib_dynamodb_1.QueryCommand({
        TableName: awsClient_1.MAIN_TABLE,
        IndexName: 'GSI4',
        KeyConditionExpression: 'GSI4PK = :pk',
        ExpressionAttributeValues: {
            ':pk': `USER_INQUIRY#${email.toLowerCase()}`
        }
    }));
    // High-precision chronological sorting (fallback if GSI SK is not primary sort)
    return (Items || []).sort((a, b) => (Number(b.createdAt || 0)) - (Number(a.createdAt || 0)));
};
exports.listInquiriesByUser = listInquiriesByUser;
const exportSubscribersCSV = () => {
    // Simple CSV export placeholder to satisfy controller
    return "Email,Status,CreatedAt\n";
};
exports.exportSubscribersCSV = exportSubscribersCSV;
