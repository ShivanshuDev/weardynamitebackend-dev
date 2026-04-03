const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
require('dotenv').config();

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});
const docClient = DynamoDBDocumentClient.from(client);
const TableName = process.env.DYNAMODB_TABLE_NAME || 'weardynamite-dev';

async function check() {
  console.log('Scanning table:', TableName);
  try {
    const { Items: invoices } = await docClient.send(new QueryCommand({
      TableName,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: { ':pk': 'INVOICES' }
    }));
    console.log('GSI1 (Invoices):', invoices?.length, invoices);

    const { Items: allItems } = await docClient.send(new ScanCommand({
      TableName,
      Limit: 5
    }));
    console.log('Scan first 5 items:', allItems.map(i => ({ PK: i.PK, SK: i.SK, GSI1PK: i.GSI1PK, status: i.status })));
  } catch (e) {
    console.error('Error:', e.message);
  }
}
check();
