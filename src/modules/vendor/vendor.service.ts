import { docClient, MAIN_TABLE } from '../../utils/awsClient';
import { GetCommand, PutCommand, QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import * as LedgerService from '../ledger/ledger.service';
import { cache } from '../../utils/redisClient';

export const listVendors = async () => {
  const cacheKey = `vendors:list:all`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached as any;
  const { Items } = await docClient.send(new QueryCommand({
    TableName: MAIN_TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk',
    ExpressionAttributeValues: { ':pk': 'VENDOR' }
  }));
  const result = Items || [];
  await cache.set(cacheKey, result, 300);
  return result;
};

/**
 * Fetch all transactions (Bills and Payments) for a specific vendor.
 */
export const listVendorTransactions = async (vendorId: string) => {
  const cacheKey = `vendors:list:transactions:${vendorId}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached as any;
  const { Items } = await docClient.send(new QueryCommand({
    TableName: MAIN_TABLE,
    IndexName: 'GSI2',
    KeyConditionExpression: 'GSI2PK = :pk',
    ExpressionAttributeValues: { ':pk': `VENDOR#${vendorId}` }
  }));
  const result = Items || [];
  await cache.set(cacheKey, result, 300);
  return result;
};

/**
 * Record a financial event for a vendor.
 * This also triggers a double-entry record in the General Ledger.
 */
export const addVendorTransaction = async (vendorId: string, data: { date: number | string; type: 'Bill' | 'Payment'; amount: number; description: string; referenceId?: string }) => {
  const ledgerType = data.type === 'Payment' ? 'Debit' : 'Credit';
  
  // 1. Create the Transaction in Ledger with Vendor GSI mapping
  const record = await LedgerService.addTransaction({
    ...data,
    type: ledgerType,
    category: 'Logistics', // Default vendor category for ledger mapping
    referenceId: data.referenceId || vendorId,
    // Add GSI2 mapping for vendor history
    GSI2PK: `VENDOR#${vendorId}`,
    GSI2SK: `DATE#${data.date}#${Date.now()}`
  } as any);

  await cache.del(`vendor:${vendorId}`);
  await cache.delPattern('vendors:list:*');
  return record;
};

export const createVendor = async (data: Record<string, any>) => {
  const id = uuidv4();
  const record = { PK: `VENDOR#${id}`, SK: 'VENDOR', GSI1PK: 'VENDOR', GSI1SK: `DATE#${Date.now()}`, vendorId: id, status: 'Active', ...data };
  await docClient.send(new PutCommand({ TableName: MAIN_TABLE, Item: record }));

  // Handle Initial Balance Onboarding
  if (data.initialBalance && data.initialBalance > 0) {
    await addVendorTransaction(id, {
      date: Date.now(),
      type: 'Payment', // Always debit for initial balance
      amount: data.initialBalance,
      description: 'Institutional Opening Balance Alignment'
    });
  }

  await cache.delPattern('vendors:list:*');
  return record;
};

export const updateVendor = async (id: string, updates: Record<string, any>) => {
  const { Item } = await docClient.send(new GetCommand({ TableName: MAIN_TABLE, Key: { PK: `VENDOR#${id}`, SK: 'VENDOR' } }));
  if (!Item) throw new Error('Vendor not found');
  const record = { ...Item, ...updates };
  await docClient.send(new PutCommand({ TableName: MAIN_TABLE, Item: record }));
  await cache.del(`vendor:${id}`);
  await cache.delPattern('vendors:list:*');
  return record;
};

export const patchVendorStatus = async (id: string, status: string) => {
  return updateVendor(id, { status });
};

export const deleteVendor = async (id: string) => {
  await docClient.send(new DeleteCommand({ TableName: MAIN_TABLE, Key: { PK: `VENDOR#${id}`, SK: 'VENDOR' } }));
  await cache.del(`vendor:${id}`);
  await cache.delPattern('vendors:list:*');
  return { message: 'Vendor deleted' };
};
