"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeBroadcast = exports.listCampaigns = exports.createCampaign = void 0;
const awsClient_1 = require("../../utils/awsClient");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const uuid_1 = require("uuid");
const notificationService_1 = require("../../utils/notificationService");
const user_service_1 = require("../user/user.service");
const employee_service_1 = require("../employee/employee.service");
const createCampaign = async (data) => {
    const campaignId = (0, uuid_1.v4)();
    const now = Date.now();
    const campaign = {
        PK: 'NOTIF#CAMPAIGN',
        SK: `CAMPAIGN#${now}#${campaignId}`,
        entity_type: 'CAMPAIGN',
        title: data.title || 'Broadcast',
        message: data.message || '',
        imageUrl: data.imageUrl,
        product: data.product,
        targetType: data.targetType || 'all',
        targetValue: data.targetValue,
        channels: data.channels || ['push'],
        status: 'Pending',
        sentCount: 0,
        created_at: now
    };
    await awsClient_1.docClient.send(new lib_dynamodb_1.PutCommand({ TableName: awsClient_1.MAIN_TABLE, Item: campaign }));
    return campaign;
};
exports.createCampaign = createCampaign;
const listCampaigns = async () => {
    const { Items } = await awsClient_1.docClient.send(new lib_dynamodb_1.QueryCommand({
        TableName: awsClient_1.MAIN_TABLE,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: { ':pk': 'NOTIF#CAMPAIGN' },
        ScanIndexForward: false // Newest first
    }));
    return Items || [];
};
exports.listCampaigns = listCampaigns;
const executeBroadcast = async (campaign) => {
    try {
        let targets = [];
        // 1. Fetch Target Users
        if (campaign.targetType === 'all') {
            targets = await (0, user_service_1.adminListUsers)();
        }
        else if (campaign.targetType === 'gender' && campaign.targetValue) {
            targets = await (0, user_service_1.getUsersByGender)(campaign.targetValue);
        }
        else if (campaign.targetType === 'employee') {
            targets = await (0, employee_service_1.listEmployees)();
        }
        else if (campaign.targetType === 'single' && campaign.targetValue) {
            // Direct Vault Lookup: Resolve any user by email or ID bypassing traditional role filters
            if (campaign.targetValue.includes('@')) {
                const u = await (0, user_service_1.getUserByEmail)(campaign.targetValue);
                if (u)
                    targets = [u];
            }
            else {
                const u = await (0, user_service_1.getProfile)(campaign.targetValue).catch(() => null);
                if (u)
                    targets = [u];
            }
        }
        // 2. Execute via orchestrator
        const results = await notificationService_1.NotificationService.broadcastCustomNotification({
            title: campaign.title,
            body: campaign.message,
            image: campaign.imageUrl,
            targetType: campaign.targetType,
            targetValue: campaign.targetValue,
            channels: campaign.channels,
            product: campaign.product
        }, targets);
        // 3. Update Campaign Status
        const totalSent = (results.pushSent || 0) + (results.emailSent || 0);
        const updated = { ...campaign, status: 'Sent', sentCount: totalSent, results };
        await awsClient_1.docClient.send(new lib_dynamodb_1.PutCommand({ TableName: awsClient_1.MAIN_TABLE, Item: updated }));
        return updated;
    }
    catch (error) {
        console.error('[BROADCAST EXECUTOR ERROR]', error);
        await awsClient_1.docClient.send(new lib_dynamodb_1.PutCommand({
            TableName: awsClient_1.MAIN_TABLE,
            Item: { ...campaign, status: 'Failed' }
        }));
        throw error;
    }
};
exports.executeBroadcast = executeBroadcast;
