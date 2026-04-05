import { docClient, MAIN_TABLE } from '../../utils/awsClient';
import { PutCommand, QueryCommand, DeleteCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

export const listInquiries = async () => {
  const { Items } = await docClient.send(new QueryCommand({
    TableName: MAIN_TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk',
    ExpressionAttributeValues: { ':pk': 'INQUIRY' },
    ScanIndexForward: false
  }));
  return Items || [];
};

export const createInquiry = async (data: Record<string, any>) => {
  const id = uuidv4();
  const record = {
    PK: `INQUIRY#${id}`,
    SK: 'INQUIRY',
    GSI1PK: 'INQUIRY',
    GSI1SK: `DATE#${Date.now()}`,
    inquiryId: id,
    status: 'New',
    ...data,
    createdAt: Date.now()
  };
  await docClient.send(new PutCommand({ TableName: MAIN_TABLE, Item: record }));
  return record;
};

export const updateInquiryStatus = async (id: string, status: string) => {
  await docClient.send(new UpdateCommand({
    TableName: MAIN_TABLE,
    Key: { PK: `INQUIRY#${id}`, SK: 'INQUIRY' },
    UpdateExpression: 'SET #st = :status',
    ExpressionAttributeNames: { '#st': 'status' },
    ExpressionAttributeValues: { ':status': status }
  }));
  return { updated: true, status };
};

export const deleteInquiry = async (id: string) => {
  await docClient.send(new DeleteCommand({ TableName: MAIN_TABLE, Key: { PK: `INQUIRY#${id}`, SK: 'INQUIRY' } }));
  return { message: 'Inquiry deleted' };
};

// Subscribers
export const listSubscribers = async () => {
  const { Items } = await docClient.send(new QueryCommand({
    TableName: MAIN_TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk',
    ExpressionAttributeValues: { ':pk': 'SUBSCRIBER' }
  }));
  return Items || [];
};

export const subscribe = async (email: string) => {
  const record = {
    PK: `SUBSCRIBER#${email}`,
    SK: 'METADATA',
    GSI1PK: 'SUBSCRIBER',
    GSI1SK: `DATE#${Date.now()}`,
    email,
    status: 'Subscribed',
    createdAt: Date.now()
  };
  await docClient.send(new PutCommand({ TableName: MAIN_TABLE, Item: record }));
  return record;
};

export const unsubscribe = async (email: string) => {
  await docClient.send(new DeleteCommand({
    TableName: MAIN_TABLE,
    Key: { PK: `SUBSCRIBER#${email}`, SK: 'METADATA' }
  }));
  return { message: 'Unsubscribed' };
};
