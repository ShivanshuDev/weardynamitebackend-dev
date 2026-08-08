"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listSubscribers = exports.subscribe = void 0;
const awsClient_1 = require("../../utils/awsClient");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const mailService_1 = require("../../utils/mailService");
const subscribe = async (data) => {
    const { email, name, phone, identifier } = data;
    // Rate Limit Check: 3 in 90 minutes
    if (identifier) {
        const ninetyMinsAgo = Date.now() - 5400000;
        const { Items: recentSubmits } = await awsClient_1.docClient.send(new lib_dynamodb_1.QueryCommand({
            TableName: awsClient_1.MAIN_TABLE,
            IndexName: 'GSI1',
            KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK >= :sk',
            ExpressionAttributeValues: {
                ':pk': `RATE_LIMIT#SUBSCRIPTION#${identifier}`,
                ':sk': `TIME#${ninetyMinsAgo}`
            }
        }));
        if (recentSubmits && recentSubmits.length >= 3) {
            throw new Error('try after some reached limit to subscribe max 3 times in 90 minutes');
        }
        // Log this attempt
        await awsClient_1.docClient.send(new lib_dynamodb_1.PutCommand({
            TableName: awsClient_1.MAIN_TABLE,
            Item: {
                PK: `RATE_LIMIT#SUBSCRIPTION#${identifier}`,
                SK: `TIME#${Date.now()}`,
                GSI1PK: `RATE_LIMIT#SUBSCRIPTION#${identifier}`,
                GSI1SK: `TIME#${Date.now()}`,
                type: 'subscription_attempt',
                email,
                ttl: Math.floor(Date.now() / 1000) + (90 * 60) // Expire after 90 mins
            }
        }));
    }
    const now = Date.now();
    const dateStr = new Date().toISOString().split('T')[0];
    const finalName = name || email.split('@')[0];
    const mainRecord = {
        PK: `SUBSCRIPTION#${email}`,
        SK: 'METADATA',
        GSI1PK: 'SUBSCRIPTION',
        GSI1SK: `DATE#${now}`,
        email,
        name: finalName,
        phone: phone || 'N/A',
        status: 'Active',
        emailStatus: 'Pending',
        subscribedDate: dateStr,
        lastActive: dateStr,
        createdAt: now,
        interests: [],
        source: 'Desktop Web Footer'
    };
    const transactItems = [
        {
            Put: {
                TableName: awsClient_1.MAIN_TABLE,
                Item: mainRecord,
                ConditionExpression: 'attribute_not_exists(PK)'
            }
        }
    ];
    if (phone && phone !== 'N/A' && phone.trim() !== '') {
        transactItems.push({
            Put: {
                TableName: awsClient_1.MAIN_TABLE,
                Item: {
                    PK: `SUBSCRIPTION_PHONE#${phone}`,
                    SK: 'METADATA',
                    email: email
                },
                ConditionExpression: 'attribute_not_exists(PK)'
            }
        });
    }
    await awsClient_1.docClient.send(new lib_dynamodb_1.TransactWriteCommand({
        TransactItems: transactItems
    }));
    // Asynchronous Email Dispatch
    (async () => {
        try {
            const result = await mailService_1.MailService.sendSubscriptionConfirmation(email, finalName);
            await awsClient_1.docClient.send(new lib_dynamodb_1.UpdateCommand({
                TableName: awsClient_1.MAIN_TABLE,
                Key: { PK: `SUBSCRIPTION#${email}`, SK: 'METADATA' },
                UpdateExpression: 'SET emailStatus = :status, deliveryError = :err',
                ExpressionAttributeValues: {
                    ':status': result.success ? 'Sent' : 'Failed',
                    ':err': result.error || null
                }
            }));
        }
        catch (err) {
            console.error('[SUBSCRIPTION EMAIL ERROR]', err);
        }
    })();
    return mainRecord;
};
exports.subscribe = subscribe;
const listSubscribers = async () => {
    const { Items } = await awsClient_1.docClient.send(new lib_dynamodb_1.QueryCommand({
        TableName: awsClient_1.MAIN_TABLE,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        ExpressionAttributeValues: { ':pk': 'SUBSCRIPTION' },
        ScanIndexForward: false
    }));
    return Items || [];
};
exports.listSubscribers = listSubscribers;
