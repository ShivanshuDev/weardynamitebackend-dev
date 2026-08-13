import { docClient, MAIN_TABLE } from '../../utils/awsClient';
import { GetCommand, PutCommand, QueryCommand, DeleteCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { cache } from '../../utils/redisClient';

import { getUserOrders } from '../order/order.service';
import { getMembership } from '../membership/membership.service';
import { ScanCommand } from '@aws-sdk/lib-dynamodb';

export const getProfile = async (userId: string) => {
  const cacheKey = `user:${userId}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached as any;

  const { Item } = await docClient.send(new GetCommand({
    TableName: MAIN_TABLE,
    Key: { PK: `USER#${userId}`, SK: 'PROFILE' }
  }));
  if (!Item) throw new Error('User not found');
  const { password, ...safe } = Item;
  
  await cache.set(cacheKey, safe, 900);
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
  await cache.del(`user:${userId}`);
  await cache.delPattern('users:list:*');
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
  await cache.del(`user:${userId}`);
  await cache.delPattern('users:list:*');
  return updated;
};

/**
 * Fetch users by gender without using SCANS (Highly Efficient)
 */
export const getUsersByGender = async (gender: string) => {
  const cacheKey = `users:list:${JSON.stringify({ gender })}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached as any;

  const { Items } = await docClient.send(new QueryCommand({
    TableName: MAIN_TABLE,
    IndexName: 'GSI3',
    KeyConditionExpression: 'GSI3PK = :pk',
    ExpressionAttributeValues: { 
      ':pk': `GENDER#${gender.toUpperCase()}`
    }
  }));
  const result = (Items || []).map(({ password, ...safe }) => safe);
  await cache.set(cacheKey, result, 300);
  return result;
};

export const getAddresses = async (userId: string) => {
  const cacheKey = `users:list:addresses:${userId}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached as any;

  const { Items } = await docClient.send(new QueryCommand({
    TableName: MAIN_TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: { ':pk': `USER#${userId}`, ':sk': 'ADDRESS#' }
  }));
  const result = Items || [];
  await cache.set(cacheKey, result, 300);
  return result;
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
  await cache.del(`user:${userId}`);
  await cache.delPattern('users:list:*');
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
  await cache.del(`user:${userId}`);
  await cache.delPattern('users:list:*');
  return updated;
};

export const deleteAddress = async (userId: string, addressId: string) => {
  await docClient.send(new DeleteCommand({
    TableName: MAIN_TABLE,
    Key: { PK: `USER#${userId}`, SK: `ADDRESS#${addressId}` }
  }));
  await cache.del(`user:${userId}`);
  await cache.delPattern('users:list:*');
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
  await cache.del(`user:${userId}`);
  await cache.delPattern('users:list:*');
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
  await cache.del(`user:${userId}`);
  await cache.delPattern('users:list:*');
  return record;
};

export const listUserNotifications = async (userId: string, limit: number = 20) => {
  const cacheKey = `users:list:notifications:${userId}:${limit}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached as any;

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
  const result = Items || [];
  await cache.set(cacheKey, result, 300);
  return result;
};

export const markNotificationRead = async (userId: string, notifId: string) => {
  // First, find the specific SK since it has a timestamp
  const all = await listUserNotifications(userId, 50);
  const target = all.find((n: any) => n.id === notifId || n.SK.includes(notifId));
  
  if (!target) return null;

  await docClient.send(new UpdateCommand({
    TableName: MAIN_TABLE,
    Key: { PK: target.PK, SK: target.SK },
    UpdateExpression: 'SET isRead = :r, updated_at = :now',
    ExpressionAttributeValues: {
      ':r': true,
      ':now': Date.now()
    }
  }));
  await cache.del(`user:${userId}`);
  await cache.delPattern('users:list:*');
  return { message: 'Notification marked read' };
};

export const markAllNotificationsRead = async (userId: string) => {
  const notifications = await listUserNotifications(userId, 50);
  for (const n of notifications) {
    if (!n.isRead) await markNotificationRead(userId, n.id);
  }
  return { message: 'All notifications marked as read' };
};

export const getPayments = async (userId: string) => {
  const payments: any[] = [];
  
  // 1. Orders
  try {
    const orders = await getUserOrders(userId);
    orders.forEach((o: any) => {
      payments.push({
        transactionId: o.txnid || o.order_id || (o.PK && o.PK.includes('#') ? o.PK.split('#')[1] : 'N/A'),
        paidFor: 'Order',
        amount: o.total_amount || 0,
        date: o.date ? (typeof o.date === 'string' ? new Date(o.date).getTime() : o.date) : (o.createdAt || Date.now()),
        status: o.status,
        type: 'ORDER'
      });
    });
  } catch (e) {}

  // 2. Memberships
  try {
    const membership = await getMembership(userId);
    if (membership && membership.history) {
      membership.history.forEach((h: any) => {
        payments.push({
          transactionId: h.transactionId,
          paidFor: `Membership (${h.duration.replace('_', ' ')})`,
          amount: h.pricePaid,
          date: h.date,
          status: 'Success',
          type: 'MEMBERSHIP'
        });
      });
    }
  } catch(e) {}

  // 3. Gifts
  try {
    const { Items: gifts } = await docClient.send(new ScanCommand({
      TableName: MAIN_TABLE,
      FilterExpression: 'begins_with(PK, :pk) AND SK = :sk AND senderId = :uid',
      ExpressionAttributeValues: {
        ':pk': 'GIFT#',
        ':sk': 'DETAILS',
        ':uid': userId
      }
    }));
    if (gifts) {
      gifts.forEach(g => {
        payments.push({
          transactionId: g.txnid,
          paidFor: `Gift (${g.giftType})`,
          amount: g.amount,
          date: g.createdAt,
          status: g.status,
          type: 'GIFT'
        });
      });
    }
  } catch (e) {}

  return payments.sort((a, b) => b.date - a.date);
};

// ─── Admin Users ─────────────────────────────────────────────────────────────

export const adminListUsers = async () => {
  const cacheKey = `users:list:admin`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached as any;

  const { Items } = await docClient.send(new QueryCommand({
    TableName: MAIN_TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk AND begins_with(GSI1SK, :sk)',
    ExpressionAttributeValues: { 
      ':pk': 'USER',
      ':sk': 'ROLE#'
    }
  }));
  const result = (Items || []).map(({ password, ...safe }) => safe);
  await cache.set(cacheKey, result, 300);
  return result;
};

/**
 * Direct Vault Lookup: Find any user profile by email across all roles.
 */
export const getUserByEmail = async (email: string) => {
  const cacheKey = `user:email:${email}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached as any;

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
  await cache.set(cacheKey, safe, 900);
  return safe;
};
