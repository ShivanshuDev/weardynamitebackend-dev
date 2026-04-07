import { docClient, MAIN_TABLE } from '../../utils/awsClient';
import { QueryCommand, UpdateCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { MailService } from '../../utils/mailService';

export const subscribe = async (data: { email: string; name?: string; phone?: string }) => {
  const { email, name, phone } = data;
  const now = Date.now();
  const dateStr = new Date().toISOString().split('T')[0];
  const finalName = name || email.split('@')[0];

  const mainRecord = {
    PK: `SUBSCRIPTION#${email}`,
    SK: 'METADATA',
    GSI1PK: 'SUBSCRIPTION',
    GSI1SK: `DATE#${now}`,
    email,
    name: finalName, 
    phone: phone || 'N/A',
    status: 'Active',
    emailStatus: 'Pending',
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

  if (phone && phone !== 'N/A' && phone.trim() !== '') {
    transactItems.push({
      Put: {
        TableName: MAIN_TABLE,
        Item: {
          PK: `SUBSCRIPTION_PHONE#${phone}`,
          SK: 'METADATA',
          email: email
        },
        ConditionExpression: 'attribute_not_exists(PK)'
      }
    });
  }

  await docClient.send(new TransactWriteCommand({
    TransactItems: transactItems
  }));

  // Asynchronous Email Dispatch
  (async () => {
    try {
      const result = await MailService.sendSubscriptionConfirmation(email, finalName);
      
      await docClient.send(new UpdateCommand({
        TableName: MAIN_TABLE,
        Key: { PK: `SUBSCRIPTION#${email}`, SK: 'METADATA' },
        UpdateExpression: 'SET emailStatus = :status, deliveryError = :err',
        ExpressionAttributeValues: {
          ':status': result.success ? 'Sent' : 'Failed',
          ':err': result.error || null
        }
      }));
    } catch (err) {
      console.error('[SUBSCRIPTION EMAIL ERROR]', err);
    }
  })();

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
