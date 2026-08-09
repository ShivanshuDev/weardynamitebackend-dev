import { docClient, MAIN_TABLE } from '../../utils/awsClient';
import { GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

export const createMembership = async (userId: string, data: any) => {
  const now = Date.now();
  
  const { Item: existing } = await docClient.send(new GetCommand({
    TableName: MAIN_TABLE,
    Key: { PK: `USER#${userId}`, SK: 'MEMBERSHIP' }
  }));

  const history = existing?.history || [];
  
  const isGracePeriod = existing && (now - existing.startDate <= 10 * 24 * 60 * 60 * 1000);
  const startDate = isGracePeriod ? existing.startDate : now;
  
  const d = new Date(startDate);
  switch (data.duration) {
    case '1_month': d.setMonth(d.getMonth() + 1); break;
    case '3_months': d.setMonth(d.getMonth() + 3); break;
    case '6_months': d.setMonth(d.getMonth() + 6); break;
    case '1_year': d.setFullYear(d.getFullYear() + 1); break;
    case '3_years': d.setFullYear(d.getFullYear() + 3); break;
    case '6_years': d.setFullYear(d.getFullYear() + 6); break;
  }
  const endDate = d.getTime();

  history.push({
    type: existing ? 'EXTENSION' : 'NEW',
    duration: data.duration,
    pricePaid: data.pricePaid,
    date: now,
    transactionId: data.transactionId || `MEM_${now}`
  });

  const record = {
    PK: `USER#${userId}`,
    SK: 'MEMBERSHIP',
    GSI1PK: 'MEMBERSHIP',
    GSI1SK: `DATE#${startDate}`,
    userId,
    duration: data.duration,
    pricePaid: data.pricePaid,
    receivesBlogs: data.receivesBlogs,
    receivesNotifications: data.receivesNotifications,
    kitDelivery: data.kitDelivery,
    kitAddress: data.kitAddress,
    startDate,
    endDate,
    history,
    status: 'Active',
    createdAt: existing?.createdAt || now,
    updatedAt: now
  };

  await docClient.send(new PutCommand({ TableName: MAIN_TABLE, Item: record }));
  return record;
};

export const listMemberships = async () => {
  const { Items } = await docClient.send(new QueryCommand({
    TableName: MAIN_TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk',
    ExpressionAttributeValues: { ':pk': 'MEMBERSHIP' },
    ScanIndexForward: false
  }));
  
  if (!Items || Items.length === 0) return [];

  const userIds = [...new Set(Items.map(item => item.userId).filter(Boolean))];
  const userMap: Record<string, any> = {};

  for (const userId of userIds) {
    const { Item: user } = await docClient.send(new GetCommand({
      TableName: MAIN_TABLE,
      Key: { PK: `USER#${userId}`, SK: 'PROFILE' }
    }));
    if (user) {
      userMap[userId] = { 
        name: user.name, 
        email: user.email, 
        phone: user.phone, 
        dob: user.dob,
        interests: user.interests 
      };
    }
  }

  return Items.map(item => ({
    ...item,
    user: item.userId ? (userMap[item.userId] || null) : null
  }));
};

export const getMembership = async (userId: string) => {
  const { Item } = await docClient.send(new GetCommand({
    TableName: MAIN_TABLE,
    Key: { PK: `USER#${userId}`, SK: 'MEMBERSHIP' }
  }));
  return Item || null;
};
