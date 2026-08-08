import { docClient, MAIN_TABLE } from '../../utils/awsClient';
import { QueryCommand, UpdateCommand, TransactWriteCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { MailService } from '../../utils/mailService';
import { cache } from '../../utils/redisClient';

export const subscribe = async (data: { email: string; name?: string; phone?: string; identifier?: string }) => {
  const { email, name, phone, identifier } = data;

  // Rate Limit Check: 3 in 90 minutes
  if (identifier) {
    const ninetyMinsAgo = Date.now() - 5400000;
    const { Items: recentSubmits } = await docClient.send(new QueryCommand({
      TableName: MAIN_TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK >= :sk',
      ExpressionAttributeValues: {
        ':pk': `RATE_LIMIT#SUBSCRIPTION#${identifier}`,
        ':sk': `TIME#${ninetyMinsAgo}`
      }
    }));

    if (recentSubmits && recentSubmits.length >= 3) {
      throw new Error('try after some reached limit to subscribe max 3 times in 90 minutes');
    }

    // Log this attempt
    await docClient.send(new PutCommand({
      TableName: MAIN_TABLE,
      Item: {
        PK: `RATE_LIMIT#SUBSCRIPTION#${identifier}`,
        SK: `TIME#${Date.now()}`,
        GSI1PK: `RATE_LIMIT#SUBSCRIPTION#${identifier}`,
        GSI1SK: `TIME#${Date.now()}`,
        type: 'subscription_attempt',
        email,
        ttl: Math.floor(Date.now() / 1000) + (90 * 60) // Expire after 90 mins
      }
    }));
  }

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

  await cache.delPattern('subscribers:list:*');

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
  const cacheKey = 'subscribers:list:all';
  const cached = await cache.get(cacheKey);
  if (cached) return cached as any;

  const { Items } = await docClient.send(new QueryCommand({
    TableName: MAIN_TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk',
    ExpressionAttributeValues: { ':pk': 'SUBSCRIPTION' },
    ScanIndexForward: false
  }));
  
  const result = Items || [];
  await cache.set(cacheKey, result, 300);
  return result;
};
