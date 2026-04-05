import { docClient, MAIN_TABLE } from '../../utils/awsClient';
import { QueryCommand, GetCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';

export const subscribe = async (data: { email: string; name?: string; phone?: string }) => {
  const { email, name, phone } = data;
  const now = Date.now();
  const dateStr = new Date().toISOString().split('T')[0];

  const mainRecord = {
    PK: `SUBSCRIPTION#${email}`,
    SK: 'METADATA',
    GSI1PK: 'SUBSCRIPTION',
    GSI1SK: `DATE#${now}`,
    email,
    name: name || email.split('@')[0], 
    phone: phone || 'N/A',
    status: 'Active',
    subscribedDate: dateStr,
    lastActive: dateStr,
    createdAt: now,
    interests: [],
    source: 'Desktop Web Footer'
  };

  const transactItems: any[] = [
    {
      Put: {
        TableName: MAIN_TABLE,
        Item: mainRecord,
        ConditionExpression: 'attribute_not_exists(PK)'
      }
    }
  ];

  // If phone is provided, add the constraint record to the transaction
  if (phone && phone !== 'N/A' && phone.trim() !== '') {
    transactItems.push({
      Put: {
        TableName: MAIN_TABLE,
        Item: {
          PK: `SUBSCRIPTION_PHONE#${phone}`,
          SK: 'METADATA',
          email: email // Reference back
        },
        ConditionExpression: 'attribute_not_exists(PK)'
      }
    });
  }

  await docClient.send(new TransactWriteCommand({
    TransactItems: transactItems
  }));

  return mainRecord;
};

export const listSubscribers = async () => {
  const { Items } = await docClient.send(new QueryCommand({
    TableName: MAIN_TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk',
    ExpressionAttributeValues: { ':pk': 'SUBSCRIPTION' },
    ScanIndexForward: false
  }));
  return Items || [];
};
