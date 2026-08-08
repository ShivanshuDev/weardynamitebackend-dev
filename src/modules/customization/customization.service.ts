import { docClient, MAIN_TABLE } from '../../utils/awsClient';
import { PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { cache } from '../../utils/redisClient';

export const listCustomizations = async () => {
  const cacheKey = 'customizations:list:all';
  const cached = await cache.get(cacheKey);
  if (cached) return cached as any;

  const { Items } = await docClient.send(new QueryCommand({
    TableName: MAIN_TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk',
    ExpressionAttributeValues: { ':pk': 'CUSTOMIZATION' },
    ScanIndexForward: false
  }));
  
  const result = Items || [];
  await cache.set(cacheKey, result, 300);
  return result;
};

export const createCustomization = async (data: Record<string, any>) => {
  const id = uuidv4();
  const record = {
    PK: `CUSTOMIZATION#${id}`,
    SK: 'CUSTOMIZATION',
    GSI1PK: 'CUSTOMIZATION',
    GSI1SK: `DATE#${Date.now()}`,
    customizationId: id,
    status: 'Pending',
    ...data,
    createdAt: Date.now()
  };
  await docClient.send(new PutCommand({ TableName: MAIN_TABLE, Item: record }));
  await cache.delPattern('customizations:list:*');
  return record;
};

export const updateCustomizationStatus = async (id: string, status: string) => {
  await docClient.send(new UpdateCommand({
    TableName: MAIN_TABLE,
    Key: { PK: `CUSTOMIZATION#${id}`, SK: 'CUSTOMIZATION' },
    UpdateExpression: 'SET #st = :status',
    ExpressionAttributeNames: { '#st': 'status' },
    ExpressionAttributeValues: { ':status': status }
  }));
  await cache.delPattern('customizations:list:*');
  return { updated: true, status };
};
