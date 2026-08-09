import { docClient, MAIN_TABLE } from '../../utils/awsClient';
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

export const getMembershipPricing = async () => {
  const { Item } = await docClient.send(new GetCommand({
    TableName: MAIN_TABLE,
    Key: { PK: 'CONFIG', SK: 'MEMBERSHIP_PRICING' }
  }));
  return Item || { pricing: {} };
};

export const updateMembershipPricing = async (pricingData: Record<string, number>) => {
  const record = {
    PK: 'CONFIG',
    SK: 'MEMBERSHIP_PRICING',
    pricing: pricingData,
    updatedAt: Date.now()
  };

  await docClient.send(new PutCommand({
    TableName: MAIN_TABLE,
    Item: record
  }));

  return record;
};
