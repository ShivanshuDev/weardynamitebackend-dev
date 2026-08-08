"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserByEmail = exports.adminListUsers = exports.markAllNotificationsRead = exports.markNotificationRead = exports.listUserNotifications = exports.saveUserNotification = exports.updatePreferences = exports.setDefaultAddress = exports.deleteAddress = exports.updateAddress = exports.addAddress = exports.getAddresses = exports.getUsersByGender = exports.updateProfile = exports.updateFcmToken = exports.getProfile = void 0;
const awsClient_1 = require("../../utils/awsClient");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const uuid_1 = require("uuid");
const getProfile = async (userId) => {
    const { Item } = await awsClient_1.docClient.send(new lib_dynamodb_1.GetCommand({
        TableName: awsClient_1.MAIN_TABLE,
        Key: { PK: `USER#${userId}`, SK: 'PROFILE' }
    }));
    if (!Item)
        throw new Error('User not found');
    const { password, ...safe } = Item;
    return safe;
};
exports.getProfile = getProfile;
/**
 * Update user's FCM device token for push notifications
 */
const updateFcmToken = async (userId, token) => {
    const current = await (0, exports.getProfile)(userId);
    await awsClient_1.docClient.send(new lib_dynamodb_1.PutCommand({
        TableName: awsClient_1.MAIN_TABLE,
        Item: { ...current, fcmToken: token, PK: `USER#${userId}`, SK: 'PROFILE' }
    }));
    return { success: true };
};
exports.updateFcmToken = updateFcmToken;
const updateProfile = async (userId, updates) => {
    const current = await (0, exports.getProfile)(userId);
    // No-Scan Indexing logic
    let indexing = {};
    // 1. Birthday Indexing (GSI5)
    if (updates.dob) {
        const dobDate = new Date(updates.dob);
        const mm = String(dobDate.getMonth() + 1).padStart(2, '0');
        const dd = String(dobDate.getDate()).padStart(2, '0');
        indexing = {
            ...indexing,
            birthday_mm_dd: `${mm}-${dd}`,
            GSI5PK: 'BIRTHDAY',
            GSI5SK: `${mm}-${dd}`
        };
    }
    // 2. Gender Indexing (GSI3 - NEW)
    if (updates.gender) {
        indexing = {
            ...indexing,
            GSI3PK: `GENDER#${updates.gender.toUpperCase()}`,
            GSI3SK: `USER#${userId}`
        };
    }
    const updated = { ...current, ...updates, ...indexing };
    await awsClient_1.docClient.send(new lib_dynamodb_1.PutCommand({
        TableName: awsClient_1.MAIN_TABLE,
        Item: { ...updated, PK: `USER#${userId}`, SK: 'PROFILE' }
    }));
    return updated;
};
exports.updateProfile = updateProfile;
/**
 * Fetch users by gender without using SCANS (Highly Efficient)
 */
const getUsersByGender = async (gender) => {
    const { Items } = await awsClient_1.docClient.send(new lib_dynamodb_1.QueryCommand({
        TableName: awsClient_1.MAIN_TABLE,
        IndexName: 'GSI3',
        KeyConditionExpression: 'GSI3PK = :pk',
        ExpressionAttributeValues: {
            ':pk': `GENDER#${gender.toUpperCase()}`
        }
    }));
    return (Items || []).map(({ password, ...safe }) => safe);
};
exports.getUsersByGender = getUsersByGender;
const getAddresses = async (userId) => {
    const { Items } = await awsClient_1.docClient.send(new lib_dynamodb_1.QueryCommand({
        TableName: awsClient_1.MAIN_TABLE,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: { ':pk': `USER#${userId}`, ':sk': 'ADDRESS#' }
    }));
    return Items || [];
};
exports.getAddresses = getAddresses;
const addAddress = async (userId, address) => {
    const existing = await (0, exports.getAddresses)(userId);
    const id = (0, uuid_1.v4)();
    const record = {
        PK: `USER#${userId}`,
        SK: `ADDRESS#${id}`,
        ownerId: userId,
        addressId: id,
        ...address,
        isDefault: existing.length === 0 ? true : (address.isDefault || false)
    };
    await awsClient_1.docClient.send(new lib_dynamodb_1.PutCommand({ TableName: awsClient_1.MAIN_TABLE, Item: record }));
    return record;
};
exports.addAddress = addAddress;
const updateAddress = async (userId, addressId, updates) => {
    // Simple Read/Modify/Write
    const { Item } = await awsClient_1.docClient.send(new lib_dynamodb_1.GetCommand({
        TableName: awsClient_1.MAIN_TABLE,
        Key: { PK: `USER#${userId}`, SK: `ADDRESS#${addressId}` }
    }));
    if (!Item)
        throw new Error('Address not found');
    const updated = { ...Item, ...updates };
    await awsClient_1.docClient.send(new lib_dynamodb_1.PutCommand({ TableName: awsClient_1.MAIN_TABLE, Item: updated }));
    return updated;
};
exports.updateAddress = updateAddress;
const deleteAddress = async (userId, addressId) => {
    await awsClient_1.docClient.send(new lib_dynamodb_1.DeleteCommand({
        TableName: awsClient_1.MAIN_TABLE,
        Key: { PK: `USER#${userId}`, SK: `ADDRESS#${addressId}` }
    }));
    return { message: 'Address removed' };
};
exports.deleteAddress = deleteAddress;
const setDefaultAddress = async (userId, addressId) => {
    const all = await (0, exports.getAddresses)(userId);
    for (const a of all) {
        if (a.SK) {
            await (0, exports.updateAddress)(userId, a.SK.replace('ADDRESS#', ''), { isDefault: false });
        }
    }
    return await (0, exports.updateAddress)(userId, addressId, { isDefault: true });
};
exports.setDefaultAddress = setDefaultAddress;
const updatePreferences = async (userId, prefs) => {
    const current = await (0, exports.getProfile)(userId);
    const updated = { ...current, preferences: prefs };
    await awsClient_1.docClient.send(new lib_dynamodb_1.PutCommand({
        TableName: awsClient_1.MAIN_TABLE,
        Item: { ...updated, PK: `USER#${userId}`, SK: 'PROFILE' }
    }));
    return updated;
};
exports.updatePreferences = updatePreferences;
// ─── Notification Inbox ──────────────────────────────────────────────────────
const saveUserNotification = async (userId, payload) => {
    const notifId = (0, uuid_1.v4)();
    const now = Date.now();
    const record = {
        PK: `USER#${userId}`,
        SK: `NOTIF#${now}#${notifId}`,
        entity_type: 'USER_NOTIF',
        id: notifId,
        ...payload,
        isRead: false,
        created_at: now,
        expires_at: Math.floor((now + 10 * 24 * 60 * 60 * 1000) / 1000) // 10 days
    };
    await awsClient_1.docClient.send(new lib_dynamodb_1.PutCommand({ TableName: awsClient_1.MAIN_TABLE, Item: record }));
    return record;
};
exports.saveUserNotification = saveUserNotification;
const listUserNotifications = async (userId, limit = 20) => {
    const { Items } = await awsClient_1.docClient.send(new lib_dynamodb_1.QueryCommand({
        TableName: awsClient_1.MAIN_TABLE,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
            ':pk': `USER#${userId}`,
            ':sk': 'NOTIF#'
        },
        ScanIndexForward: false, // Descending (Newest first)
        Limit: limit
    }));
    return Items || [];
};
exports.listUserNotifications = listUserNotifications;
const markNotificationRead = async (userId, notifId) => {
    // First, find the specific SK since it has a timestamp
    const all = await (0, exports.listUserNotifications)(userId, 50);
    const target = all.find(n => n.id === notifId || n.SK.includes(notifId));
    if (!target)
        return null;
    await awsClient_1.docClient.send(new lib_dynamodb_1.UpdateCommand({
        TableName: awsClient_1.MAIN_TABLE,
        Key: { PK: `USER#${userId}`, SK: target.SK },
        UpdateExpression: 'SET isRead = :val, expires_at = :exp',
        ExpressionAttributeValues: {
            ':val': true,
            ':exp': Math.floor((target.created_at + 7 * 24 * 60 * 60 * 1000) / 1000) // 7 days from creation
        }
    }));
    return { ...target, isRead: true };
};
exports.markNotificationRead = markNotificationRead;
const markAllNotificationsRead = async (userId) => {
    const all = await (0, exports.listUserNotifications)(userId, 50);
    const unread = all.filter(n => !n.isRead);
    const promises = unread.map(n => awsClient_1.docClient.send(new lib_dynamodb_1.UpdateCommand({
        TableName: awsClient_1.MAIN_TABLE,
        Key: { PK: `USER#${userId}`, SK: n.SK },
        UpdateExpression: 'SET isRead = :val, expires_at = :exp',
        ExpressionAttributeValues: {
            ':val': true,
            ':exp': Math.floor((n.created_at + 7 * 24 * 60 * 60 * 1000) / 1000)
        }
    })));
    await Promise.allSettled(promises);
    return { success: true };
};
exports.markAllNotificationsRead = markAllNotificationsRead;
// ─── Admin Users ─────────────────────────────────────────────────────────────
const adminListUsers = async () => {
    const { Items } = await awsClient_1.docClient.send(new lib_dynamodb_1.QueryCommand({
        TableName: awsClient_1.MAIN_TABLE,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk AND begins_with(GSI1SK, :sk)',
        ExpressionAttributeValues: {
            ':pk': 'USER',
            ':sk': 'ROLE#'
        }
    }));
    return (Items || []).map(({ password, ...safe }) => safe);
};
exports.adminListUsers = adminListUsers;
/**
 * Direct Vault Lookup: Find any user profile by email across all roles.
 */
const getUserByEmail = async (email) => {
    const { Items } = await awsClient_1.docClient.send(new lib_dynamodb_1.QueryCommand({
        TableName: awsClient_1.MAIN_TABLE,
        IndexName: 'GSI2',
        KeyConditionExpression: 'GSI2PK = :pk',
        ExpressionAttributeValues: {
            ':pk': `EMAIL#${email.toLowerCase().trim()}`
        }
    }));
    if (!Items || Items.length === 0)
        return null;
    const { password, ...safe } = Items[0];
    return safe;
};
exports.getUserByEmail = getUserByEmail;
