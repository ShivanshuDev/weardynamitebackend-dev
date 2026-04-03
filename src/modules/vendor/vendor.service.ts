import { docClient, MAIN_TABLE } from '../../utils/awsClient';
import { GetCommand, PutCommand, QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

export const listVendors = async () => {
  const { Items } = await docClient.send(new QueryCommand({
    TableName: MAIN_TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk',
    ExpressionAttributeValues: { ':pk': 'VENDOR' }
  }));
  return Items || [];
};

export const createVendor = async (data: Record<string, any>) => {
  const id = uuidv4();
  const record = { PK: `VENDOR#${id}`, SK: 'VENDOR', GSI1PK: 'VENDOR', GSI1SK: `DATE#${Date.now()}`, vendorId: id, status: 'Active', ...data };
  await docClient.send(new PutCommand({ TableName: MAIN_TABLE, Item: record }));
  return record;
};

export const updateVendor = async (id: string, updates: Record<string, any>) => {
  const { Item } = await docClient.send(new GetCommand({ TableName: MAIN_TABLE, Key: { PK: `VENDOR#${id}`, SK: 'VENDOR' } }));
  if (!Item) throw new Error('Vendor not found');
  const record = { ...Item, ...updates };
  await docClient.send(new PutCommand({ TableName: MAIN_TABLE, Item: record }));
  return record;
};

export const patchVendorStatus = async (id: string, status: string) => {
  return updateVendor(id, { status });
};

export const deleteVendor = async (id: string) => {
  await docClient.send(new DeleteCommand({ TableName: MAIN_TABLE, Key: { PK: `VENDOR#${id}`, SK: 'VENDOR' } }));
  return { message: 'Vendor deleted' };
};
