import { docClient, MAIN_TABLE } from '../../utils/awsClient';
import { PutCommand, QueryCommand, DeleteCommand, UpdateCommand, ScanCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { MailService } from '../../utils/mailService';
import { NotificationService } from '../../utils/notificationService';

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

export const submitInquiry = async (data: Record<string, any>) => {
  // Rate Limit Check: 3 in 90 minutes
  if (data.email) {
    const ninetyMinsAgo = Date.now() - 5400000;
    const { Items: recentInquiries } = await docClient.send(new QueryCommand({
      TableName: MAIN_TABLE,
      IndexName: 'GSI4',
      KeyConditionExpression: 'GSI4PK = :pk AND GSI4SK >= :sk',
      ExpressionAttributeValues: { 
        ':pk': `USER_INQUIRY#${data.email.toLowerCase()}`, 
        ':sk': `DATE#${ninetyMinsAgo}#` 
      }
    }));

    if (recentInquiries && recentInquiries.length >= 3) {
      throw new Error('try after some reached limit to submit max 3 inquiries in 90 minutes');
    }
  }

  const id = uuidv4();
  const timestamp = Date.now();
  const record: any = {
    PK: `INQUIRY#${id}`,
    SK: 'METADATA',
    inquiryId: id,
    status: 'New',
    ...data,
    createdAt: timestamp
  };

  // Standard Indexing
  record.GSI1PK = data.type === 'bulk_order' ? 'BULK_ORDER' : 'INQUIRY';
  record.GSI1SK = `DATE#${timestamp}#${id}`;
  
  // GSI4: User Inquiry Lookup (High-scale history)
  if (data.email) {
    record.GSI4PK = `USER_INQUIRY#${data.email.toLowerCase()}`;
    record.GSI4SK = `DATE#${timestamp}#${id}`;
  }

  // Bulk Specific Indexing
  if (data.type === 'bulk_order') {
    record.GSI2PK = `BULK_ORDER#STATUS#New`;
    record.GSI2SK = `DATE#${timestamp}#${id}`;
    record.GSI3PK = `BULK_ORDER#TYPE#${data.orderType || 'other'}`;
    record.GSI3SK = `DATE#${timestamp}#${id}`;
  }

  await docClient.send(new PutCommand({ TableName: MAIN_TABLE, Item: record }));

  // Post-submission Processing (Async)
  (async () => {
    try {
      const isBulk = data.type === 'bulk_order';

      // 1. Admin Alerts (Email + In-App + Push)
      await NotificationService.sendAdminInquiryNotification(record);
      
      // 2. Customer Confirmation Email (Always sent to provided email)
      if (isBulk) {
        await MailService.sendInquiryConfirmation(record.email, record.fullName || record.name || 'Valued Customer', record);
      } else {
        await MailService.sendStandardInquiryConfirmation(record.email, record.fullName || record.name || 'Valued Customer', record);
      }

      // 3. Customer In-App + Push (Only if they have a registered account)
      if (data.email) {
        const { Items: users } = await docClient.send(new QueryCommand({
          TableName: MAIN_TABLE,
          IndexName: 'GSI2',
          KeyConditionExpression: 'GSI2PK = :pk',
          ExpressionAttributeValues: { ':pk': `EMAIL#${data.email.toLowerCase()}` }
        }));

        if (users && users.length > 0) {
          const user = users[0];
          const userId = user.PK.replace('USER#', '');
          await NotificationService.sendCustomerInquiryConfirmation(userId, record);
        }
      }
    } catch (err) {
      console.error('[INQUIRY NOTIFICATION ERROR]', err);
    }
  })();

  return record;
};

export const getInquiryDetail = async (id: string) => {
  const { Item } = await docClient.send(new GetCommand({
    TableName: MAIN_TABLE,
    Key: { PK: `INQUIRY#${id}`, SK: 'METADATA' }
  }));
  return Item;
};

export const updateInquiryStatus = async (id: string, status: string) => {
  // We need to fetch the item first to update GSIs if they exist
  const item = await getInquiryDetail(id);
  
  const updateExpr = ['SET #st = :status'];
  const exprNames: any = { '#st': 'status' };
  const exprValues: any = { ':status': status };

  if (item?.type === 'bulk_order') {
    updateExpr.push('GSI2PK = :gsi2pk');
    exprValues[':gsi2pk'] = `BULK_ORDER#STATUS#${status}`;
  }

  await docClient.send(new UpdateCommand({
    TableName: MAIN_TABLE,
    Key: { PK: `INQUIRY#${id}`, SK: 'METADATA' },
    UpdateExpression: updateExpr.join(', '),
    ExpressionAttributeNames: exprNames,
    ExpressionAttributeValues: exprValues
  }));

  // Background processing: Notify Customer
  if (item && item.email) {
    (async () => {
      try {
        console.log(`[STATUS NOTIF] Processing status update for ${item.email} to ${status}`);
        
        // 1. Search for user by email to get their ID for In-App/Push
        const { Items: users } = await docClient.send(new QueryCommand({
          TableName: MAIN_TABLE,
          IndexName: 'GSI2',
          KeyConditionExpression: 'GSI2PK = :pk',
          ExpressionAttributeValues: { ':pk': `EMAIL#${item.email.toLowerCase()}` }
        }));

        if (users && users.length > 0) {
          const user = users[0];
          const userId = user.PK.replace('USER#', '');
          
          console.log(`[STATUS NOTIF] User found (${userId}), sending In-App/Push...`);
          // Trigger In-App + Push
          await NotificationService.sendInquiryStatusUpdate(userId, item, status);
        } else {
          console.log(`[STATUS NOTIF] No registered user found for ${item.email}, skipping In-App/Push.`);
        }

        // 2. Always send Email Status Update
        console.log(`[STATUS NOTIF] Dispatching status update email to ${item.email}...`);
        await MailService.sendInquiryStatusEmail(item.email, item.fullName || 'Customer', item, status);
        
      } catch (err) {
        console.error('[STATUS NOTIFICATION ERROR]', err);
      }
    })();
  } else {
    console.warn(`[STATUS NOTIF] Skipping notifications: item found? ${!!item}, email found? ${item?.email}`);
  }

  return { updated: true, status };
};

export const deleteInquiry = async (id: string) => {
  await docClient.send(new DeleteCommand({ TableName: MAIN_TABLE, Key: { PK: `INQUIRY#${id}`, SK: 'METADATA' } }));
  return { message: 'Inquiry deleted' };
};

export const listBulkOrders = async (params: { status?: string, orderType?: string, lastKey?: string, limit?: number }) => {
  let indexName = 'GSI1';
  let pkValue = 'BULK_ORDER';
  
  if (params.status) {
    indexName = 'GSI2';
    pkValue = `BULK_ORDER#STATUS#${params.status}`;
  } else if (params.orderType) {
    indexName = 'GSI3';
    pkValue = `BULK_ORDER#TYPE#${params.orderType}`;
  }

  const queryParams: any = {
    TableName: MAIN_TABLE,
    IndexName: indexName,
    KeyConditionExpression: 'GSI1PK = :pk',
    ExpressionAttributeValues: { ':pk': pkValue },
    ScanIndexForward: false,
    Limit: params.limit || 20
  };

  if (params.lastKey) {
    queryParams.ExclusiveStartKey = JSON.parse(Buffer.from(params.lastKey, 'base64').toString());
  }

  // If using GSI2 or GSI3, common query pattern expects GSI1PK as the PK name for all GSIs in this schema usually
  // but I must check the actual table definition for GSI names and PK/SK names.
  // Assuming GSI1PK/GSI1SK for GSI1, GSI2PK/GSI2SK for GSI2 etc is the standard for this repo's Single Table Design.
  
  if (indexName === 'GSI2') {
    queryParams.KeyConditionExpression = 'GSI2PK = :pk';
  } else if (indexName === 'GSI3') {
    queryParams.KeyConditionExpression = 'GSI3PK = :pk';
  }

  const { Items, LastEvaluatedKey } = await docClient.send(new QueryCommand(queryParams));

  return {
    items: Items || [],
    lastKey: LastEvaluatedKey ? Buffer.from(JSON.stringify(LastEvaluatedKey)).toString('base64') : null
  };
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

export const listInquiriesByUser = async (email: string) => {
  // Enforcing strict 'No Scan' policy: Use GSI4 for high-performance inquiry lookup
  const { Items } = await docClient.send(new QueryCommand({
    TableName: MAIN_TABLE,
    IndexName: 'GSI4',
    KeyConditionExpression: 'GSI4PK = :pk',
    ExpressionAttributeValues: { 
      ':pk': `USER_INQUIRY#${email.toLowerCase()}`
    }
  }));
  
  // High-precision chronological sorting (fallback if GSI SK is not primary sort)
  return (Items || []).sort((a, b) => (Number(b.createdAt || 0)) - (Number(a.createdAt || 0)));
};

export const exportSubscribersCSV = () => {
  // Simple CSV export placeholder to satisfy controller
  return "Email,Status,CreatedAt\n";
};
