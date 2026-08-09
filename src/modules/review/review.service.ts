import { docClient, MAIN_TABLE } from '../../utils/awsClient';
import { GetCommand, PutCommand, QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { getOrderDetail } from '../order/order.service';
import { cache } from '../../utils/redisClient';

export const listReviews = async () => {
  const cacheKey = 'reviews:list:all';
  const cached = await cache.get(cacheKey);
  if (cached) return cached as any;

  const { Items } = await docClient.send(new QueryCommand({
    TableName: MAIN_TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk',
    ExpressionAttributeValues: { ':pk': 'REVIEW' },
    ScanIndexForward: false
  }));
  
  const result = Items || [];
  await cache.set(cacheKey, result, 300);
  return result;
};

export const getReviewsByProduct = async (productId: string) => {
  const cacheKey = `reviews:list:${productId}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached as any;

  const { Items } = await docClient.send(new QueryCommand({
    TableName: MAIN_TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: { ':pk': `PRODUCT#${productId}`, ':sk': 'REVIEW#' },
    ScanIndexForward: false
  }));
  
  const result = (Items || []).filter(r => r.status === 'Approved');
  await cache.set(cacheKey, result, 300);
  return result;
};

export const addReview = async (userId: string, productId: string, orderId: string, data: { rating: number; title?: string; comment: string; name: string; imageUrls?: string[] }) => {
  // 1. Verify Order
  const order = await getOrderDetail(orderId);
  if (!order) throw new Error('Order not found');
  if (order.user_id !== userId) throw new Error('Unauthorized: Order does not belong to user');

  // 2. Verify Product is in Order
  const hasProduct = order.items?.some((i: any) => i.product_id === productId);
  if (!hasProduct) throw new Error('Product not found in this order');

  const id = uuidv4();
  const record = {
    PK: `PRODUCT#${productId}`,
    SK: `REVIEW#${id}`,
    GSI1PK: 'REVIEW',
    GSI1SK: `DATE#${Date.now()}`,
    reviewId: id,
    userId,
    productId,
    orderId,
    ...data,
    status: 'Approved',
    createdAt: Date.now()
  };
  await docClient.send(new PutCommand({ TableName: MAIN_TABLE, Item: record }));
  await cache.delPattern('reviews:list:*');
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
  await cache.delPattern('reviews:list:*');
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
  await cache.delPattern('reviews:list:*');
  return { message: 'Review deleted' };
};
