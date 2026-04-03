import { docClient, MAIN_TABLE } from '../../utils/awsClient';
import { GetCommand, PutCommand, QueryCommand, DeleteCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

export const listBlogs = async (adminMode = false) => {
  if (adminMode) {
    // Admin gets all blogs
    const { Items } = await docClient.send(new QueryCommand({
      TableName: MAIN_TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: { ':pk': 'BLOG' },
      ScanIndexForward: false
    }));
    return Items || [];
  } else {
    // Public only gets Published blogs instantly via GSI2
    const { Items } = await docClient.send(new QueryCommand({
      TableName: MAIN_TABLE,
      IndexName: 'GSI2',
      KeyConditionExpression: 'GSI2PK = :pk',
      ExpressionAttributeValues: { ':pk': 'STATUS#Published' },
      ScanIndexForward: false
    }));
    return Items || [];
  }
};

export const getBlog = async (id: string) => {
  const { Item } = await docClient.send(new GetCommand({
    TableName: MAIN_TABLE,
    Key: { PK: `BLOG#${id}`, SK: 'BLOG' }
  }));
  if (!Item) throw new Error('Blog not found');
  return Item;
};

export const createBlog = async (data: Record<string, any>) => {
  const id = uuidv4();
  const now = Date.now();
  
  const record = {
    PK: `BLOG#${id}`,
    SK: 'BLOG',
    GSI1PK: 'BLOG',
    GSI1SK: `DATE#${now}`,
    GSI2PK: `STATUS#Draft`, // GSI2 tracks publishing state
    GSI2SK: `DATE#${now}`,
    blogId: id,
    status: 'Draft',
    ...data,
    createdAt: now
  };

  await docClient.send(new PutCommand({ TableName: MAIN_TABLE, Item: record }));
  return record;
};

export const updateBlog = async (id: string, updates: Record<string, any>) => {
  const existing = await getBlog(id);
  const updated = { ...existing, ...updates };
  
  await docClient.send(new PutCommand({ TableName: MAIN_TABLE, Item: updated }));
  return updated;
};

export const patchBlogStatus = async (id: string, status: string) => {
  const { Attributes } = await docClient.send(new UpdateCommand({
    TableName: MAIN_TABLE,
    Key: { PK: `BLOG#${id}`, SK: 'BLOG' },
    UpdateExpression: 'SET #st = :status, GSI2PK = :gsi',
    ExpressionAttributeNames: { '#st': 'status' },
    ExpressionAttributeValues: { ':status': status, ':gsi': `STATUS#${status}` },
    ReturnValues: 'ALL_NEW'
  }));
  return Attributes;
};

export const deleteBlog = async (id: string) => {
  await docClient.send(new DeleteCommand({ TableName: MAIN_TABLE, Key: { PK: `BLOG#${id}`, SK: 'BLOG' } }));
  return { message: 'Blog deleted' };
};
