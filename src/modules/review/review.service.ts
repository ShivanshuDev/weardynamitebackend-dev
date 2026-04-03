import { docClient, MAIN_TABLE } from '../../utils/awsClient';
import { GetCommand, PutCommand, QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

export const listReviews = async () => {
  const { Items } = await docClient.send(new QueryCommand({
    TableName: MAIN_TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk',
    ExpressionAttributeValues: { ':pk': 'REVIEW' },
    ScanIndexForward: false
  }));
  return Items || [];
};

export const getReviewsByProduct = async (productId: string) => {
  const { Items } = await docClient.send(new QueryCommand({
    TableName: MAIN_TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: { ':pk': `PRODUCT#${productId}`, ':sk': 'REVIEW#' },
    ScanIndexForward: false
  }));
  return (Items || []).filter(r => r.status === 'Approved');
};

export const addReview = async (userId: string, productId: string, data: { rating: number; title: string; comment: string; name: string }) => {
  const id = uuidv4();
  const record = {
    PK: `PRODUCT#${productId}`,
    SK: `REVIEW#${id}`,
    GSI1PK: 'REVIEW',
    GSI1SK: `DATE#${Date.now()}`,
    reviewId: id,
    userId,
    productId,
    ...data,
    status: 'Pending',
    createdAt: Date.now()
  };
  await docClient.send(new PutCommand({ TableName: MAIN_TABLE, Item: record }));
  return record;
};

export const updateReviewStatus = async (reviewId: string, status: string) => {
  // Since we don't know the exact productId to form the exact PK for a specific review quickly,
  // we fetch via GSI1 to locate the record first:
  const { Items } = await docClient.send(new QueryCommand({
    TableName: MAIN_TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk',
    FilterExpression: 'reviewId = :rid',
    ExpressionAttributeValues: { ':pk': 'REVIEW', ':rid': reviewId }
  }));
  
  const existing = (Items || [])[0];
  if (!existing) throw new Error('Review not found');

  const record = { ...existing, status };
  await docClient.send(new PutCommand({ TableName: MAIN_TABLE, Item: record }));
  return record;
};

export const deleteReview = async (reviewId: string) => {
  const { Items } = await docClient.send(new QueryCommand({
    TableName: MAIN_TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk',
    FilterExpression: 'reviewId = :rid',
    ExpressionAttributeValues: { ':pk': 'REVIEW', ':rid': reviewId }
  }));
  
  const existing = (Items || [])[0];
  if (!existing) throw new Error('Review not found');

  await docClient.send(new DeleteCommand({ TableName: MAIN_TABLE, Key: { PK: existing.PK, SK: existing.SK } }));
  return { message: 'Review deleted' };
};
