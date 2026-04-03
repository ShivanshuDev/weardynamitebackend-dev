import { docClient, MAIN_TABLE } from '../../utils/awsClient';
import { GetCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

export const logPaymentIntent = async (orderId: string, amount: number) => {
  const record = {
    PK: `ORDER#${orderId}`,
    SK: `PAYMENT#INTENT#${Date.now()}`,
    orderId,
    amount,
    status: 'Pending',
    createdAt: Date.now()
  };
  await docClient.send(new PutCommand({ TableName: MAIN_TABLE, Item: record }));
  return record;
};

export const updatePaymentStatus = async (orderId: string, status: string, gatewayResponse?: any) => {
  // We use the Order record to update payment status
  const { Items } = await docClient.send(new QueryCommand({
    TableName: MAIN_TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk',
    FilterExpression: 'orderId = :oid',
    ExpressionAttributeValues: { ':pk': 'ORDER', ':oid': orderId }
  }));
  
  const existing = (Items || [])[0];
  if (!existing) throw new Error('Order not found for payment update');

  await docClient.send(new UpdateCommand({
    TableName: MAIN_TABLE,
    Key: { PK: existing.PK, SK: existing.SK },
    UpdateExpression: 'SET paymentStatus = :pst, gatewayResponse = :gw',
    ExpressionAttributeValues: { ':pst': status, ':gw': gatewayResponse || null }
  }));
  
  return { updated: true, status };
};
