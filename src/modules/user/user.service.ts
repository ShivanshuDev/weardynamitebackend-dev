import { docClient, MAIN_TABLE } from '../../utils/awsClient';
import { GetCommand, PutCommand, QueryCommand, DeleteCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

export const getProfile = async (userId: string) => {
  const { Item } = await docClient.send(new GetCommand({
    TableName: MAIN_TABLE,
    Key: { PK: `USER#${userId}`, SK: 'PROFILE' }
  }));
  if (!Item) throw new Error('User not found');
  const { password, ...safe } = Item;
  return safe;
};

/**
 * Update user's FCM device token for push notifications
 */
export const updateFcmToken = async (userId: string, token: string) => {
  const current = await getProfile(userId);
  await docClient.send(new PutCommand({
    TableName: MAIN_TABLE,
    Item: { ...current, fcmToken: token, PK: `USER#${userId}`, SK: 'PROFILE' }
  }));
  return { success: true };
};

export const updateProfile = async (userId: string, updates: { 
  name?: string; 
  phone?: string;
  phoneSecondary?: string;
  dob?: string;
  interests?: string;
  gender?: string;
}) => {
  const current = await getProfile(userId);
  
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
  await docClient.send(new PutCommand({
    TableName: MAIN_TABLE, 
    Item: { ...updated, PK: `USER#${userId}`, SK: 'PROFILE' }
  }));
  return updated;
};

/**
 * Fetch users by gender without using SCANS (Highly Efficient)
 */
export const getUsersByGender = async (gender: string) => {
  const { Items } = await docClient.send(new QueryCommand({
    TableName: MAIN_TABLE,
    IndexName: 'GSI3',
    KeyConditionExpression: 'GSI3PK = :pk',
    ExpressionAttributeValues: { 
      ':pk': `GENDER#${gender.toUpperCase()}`
    }
  }));
  return (Items || []).map(({ password, ...safe }) => safe);
};

export const getAddresses = async (userId: string) => {
  const { Items } = await docClient.send(new QueryCommand({
    TableName: MAIN_TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: { ':pk': `USER#${userId}`, ':sk': 'ADDRESS#' }
  }));
  return Items || [];
};

export const addAddress = async (userId: string, address: Record<string, any>) => {
  const existing = await getAddresses(userId);
  const id = uuidv4();
  const record = {
    PK: `USER#${userId}`,
    SK: `ADDRESS#${id}`,
    ownerId: userId,
    addressId: id,
    ...address,
    isDefault: existing.length === 0 ? true : (address.isDefault || false)
  };
  await docClient.send(new PutCommand({ TableName: MAIN_TABLE, Item: record }));
  return record;
};

export const updateAddress = async (userId: string, addressId: string, updates: Record<string, any>) => {
  // Simple Read/Modify/Write
  const { Item } = await docClient.send(new GetCommand({
    TableName: MAIN_TABLE,
    Key: { PK: `USER#${userId}`, SK: `ADDRESS#${addressId}` }
  }));
  if (!Item) throw new Error('Address not found');
  
  const updated = { ...Item, ...updates };
  await docClient.send(new PutCommand({ TableName: MAIN_TABLE, Item: updated }));
  return updated;
};

export const deleteAddress = async (userId: string, addressId: string) => {
  await docClient.send(new DeleteCommand({
    TableName: MAIN_TABLE,
    Key: { PK: `USER#${userId}`, SK: `ADDRESS#${addressId}` }
  }));
  return { message: 'Address removed' };
};

export const setDefaultAddress = async (userId: string, addressId: string) => {
  const all = await getAddresses(userId);
  for (const a of all) {
    if (a.SK) {
      await updateAddress(userId, a.SK.replace('ADDRESS#', ''), { isDefault: false });
    }
  }
  return await updateAddress(userId, addressId, { isDefault: true });
};

export const updatePreferences = async (userId: string, prefs: { currency?: string }) => {
  const current = await getProfile(userId);
  const updated = { ...current, preferences: prefs };
  await docClient.send(new PutCommand({
    TableName: MAIN_TABLE,
    Item: { ...updated, PK: `USER#${userId}`, SK: 'PROFILE' }
  }));
  return updated;
};

// ─── Notification Inbox ──────────────────────────────────────────────────────

export const saveUserNotification = async (userId: string, payload: {
  title: string;
  message: string;
  type: string;
  image?: string;
  link?: string;
  metadata?: any;
}) => {
  const notifId = uuidv4();
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

  await docClient.send(new PutCommand({ TableName: MAIN_TABLE, Item: record }));
  return record;
};

export const listUserNotifications = async (userId: string, limit: number = 20) => {
  const { Items } = await docClient.send(new QueryCommand({
    TableName: MAIN_TABLE,
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

export const markNotificationRead = async (userId: string, notifId: string) => {
  // First, find the specific SK since it has a timestamp
  const all = await listUserNotifications(userId, 50);
  const target = all.find(n => n.id === notifId || n.SK.includes(notifId));
  
  if (!target) return null;

  await docClient.send(new UpdateCommand({
    TableName: MAIN_TABLE,
    Key: { PK: `USER#${userId}`, SK: target.SK },
    UpdateExpression: 'SET isRead = :val, expires_at = :exp',
    ExpressionAttributeValues: { 
      ':val': true,
      ':exp': Math.floor((target.created_at + 7 * 24 * 60 * 60 * 1000) / 1000) // 7 days from creation
    }
  }));
  
  return { ...target, isRead: true };
};

export const markAllNotificationsRead = async (userId: string) => {
  const all = await listUserNotifications(userId, 50);
  const unread = all.filter(n => !n.isRead);
  
  const promises = unread.map(n => 
    docClient.send(new UpdateCommand({
      TableName: MAIN_TABLE,
      Key: { PK: `USER#${userId}`, SK: n.SK },
      UpdateExpression: 'SET isRead = :val, expires_at = :exp',
      ExpressionAttributeValues: { 
        ':val': true,
        ':exp': Math.floor((n.created_at + 7 * 24 * 60 * 60 * 1000) / 1000)
      }
    }))
  );
  
  await Promise.allSettled(promises);
  return { success: true };
};

// ─── Admin Users ─────────────────────────────────────────────────────────────

export const adminListUsers = async () => {
  const { Items } = await docClient.send(new QueryCommand({
    TableName: MAIN_TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk AND begins_with(GSI1SK, :sk)',
    ExpressionAttributeValues: { 
      ':pk': 'USER',
      ':sk': 'ROLE#'
    }
  }));
  return (Items || []).map(({ password, ...safe }) => safe);
};

/**
 * Direct Vault Lookup: Find any user profile by email across all roles.
 */
export const getUserByEmail = async (email: string) => {
  const { Items } = await docClient.send(new QueryCommand({
    TableName: MAIN_TABLE,
    IndexName: 'GSI2',
    KeyConditionExpression: 'GSI2PK = :pk',
    ExpressionAttributeValues: { 
      ':pk': `EMAIL#${email.toLowerCase().trim()}`
    }
  }));
  
  if (!Items || Items.length === 0) return null;
  const { password, ...safe } = Items[0];
  return safe;
};
