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
}) => {
  const current = await getProfile(userId);
  
  // No-Scan Indexing logic
  let birthdayIndex = {};
  if (updates.dob) {
    const dobDate = new Date(updates.dob);
    const mm = String(dobDate.getMonth() + 1).padStart(2, '0');
    const dd = String(dobDate.getDate()).padStart(2, '0');
    birthdayIndex = {
      birthday_mm_dd: `${mm}-${dd}`,
      GSI5PK: 'BIRTHDAY',
      GSI5SK: `${mm}-${dd}`
    };
  }

  const updated = { ...current, ...updates, ...birthdayIndex };
  await docClient.send(new PutCommand({
    TableName: MAIN_TABLE, 
    Item: { ...updated, PK: `USER#${userId}`, SK: 'PROFILE' }
  }));
  return updated;
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

// ─── Admin Users ─────────────────────────────────────────────────────────────

export const adminListUsers = async () => {
  const { Items } = await docClient.send(new QueryCommand({
    TableName: MAIN_TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk AND begins_with(GSI1SK, :sk)',
    ExpressionAttributeValues: { 
      ':pk': 'USER',
      ':sk': 'ROLE#customer'
    }
  }));
  return (Items || []).map(({ password, ...safe }) => safe);
};
