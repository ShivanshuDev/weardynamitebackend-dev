import { docClient, MAIN_TABLE } from '../../utils/awsClient';
import { PutCommand, QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { NotificationService } from '../../utils/notificationService';
import { getUsersByGender } from '../user/user.service';
import { adminListUsers } from '../user/user.service';

export interface NotificationCampaign {
  PK: string;
  SK: string;
  entity_type: 'CAMPAIGN';
  title: string;
  message: string;
  imageUrl?: string;
  product?: any;
  targetType: 'all' | 'gender' | 'single';
  targetValue?: string;
  channels: string[];
  status: 'Pending' | 'Sent' | 'Failed';
  sentCount: number;
  results?: any;
  created_at: number;
}

export const createCampaign = async (data: Partial<NotificationCampaign>) => {
  const campaignId = uuidv4();
  const now = Date.now();
  
  const campaign: NotificationCampaign = {
    PK: 'NOTIF#CAMPAIGN',
    SK: `CAMPAIGN#${now}#${campaignId}`,
    entity_type: 'CAMPAIGN',
    title: data.title || 'Broadcast',
    message: data.message || '',
    imageUrl: data.imageUrl,
    product: data.product,
    targetType: data.targetType || 'all',
    targetValue: data.targetValue,
    channels: data.channels || ['push'],
    status: 'Pending',
    sentCount: 0,
    created_at: now
  };

  await docClient.send(new PutCommand({ TableName: MAIN_TABLE, Item: campaign }));
  return campaign;
};

export const listCampaigns = async () => {
  const { Items } = await docClient.send(new QueryCommand({
    TableName: MAIN_TABLE,
    KeyConditionExpression: 'PK = :pk',
    ExpressionAttributeValues: { ':pk': 'NOTIF#CAMPAIGN' },
    ScanIndexForward: false // Newest first
  }));
  return Items || [];
};

export const executeBroadcast = async (campaign: NotificationCampaign) => {
  try {
    let targets: any[] = [];

    // 1. Fetch Target Users
    if (campaign.targetType === 'all') {
      targets = await adminListUsers();
    } else if (campaign.targetType === 'gender' && campaign.targetValue) {
      targets = await getUsersByGender(campaign.targetValue);
    } else if (campaign.targetType === 'single' && campaign.targetValue) {
      // In this setup, we assume single targetValue is a userId
      // For simplicity, we can reuse adminListUsers and filter or fetch single
      const all = await adminListUsers();
      targets = all.filter(u => u.email === campaign.targetValue || u.user_id === campaign.targetValue);
    }

    // 2. Execute via orchestrator
    const results = await NotificationService.broadcastCustomNotification({
      title: campaign.title,
      body: campaign.message,
      image: campaign.imageUrl,
      targetType: campaign.targetType,
      targetValue: campaign.targetValue,
      channels: campaign.channels,
      product: campaign.product
    }, targets);

    // 3. Update Campaign Status
    const totalSent = (results.pushSent || 0) + (results.emailSent || 0);
    const updated = { ...campaign, status: 'Sent' as const, sentCount: totalSent, results };
    
    await docClient.send(new PutCommand({ TableName: MAIN_TABLE, Item: updated }));
    return updated;
  } catch (error) {
    console.error('[BROADCAST EXECUTOR ERROR]', error);
    await docClient.send(new PutCommand({ 
        TableName: MAIN_TABLE, 
        Item: { ...campaign, status: 'Failed' as const } 
    }));
    throw error;
  }
};
