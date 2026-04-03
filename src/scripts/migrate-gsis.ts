import 'dotenv/config';
import { docClient, MAIN_TABLE } from '../utils/awsClient';
import { ScanCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

async function migrate() {
  console.log('Starting Migration...');
  
  // 1. Fetch all items
  const { Items } = await docClient.send(new ScanCommand({ TableName: MAIN_TABLE }));
  if (!Items) return console.log('No items found.');

  for (const item of Items) {
    let updated = false;

    // Fix Product GSIs
    if (item.PK.startsWith('PRODUCT#')) {
      console.log(`Migrating Product: ${item.PK}`, JSON.stringify(item));
      item.GSI1PK = 'PRODUCT';
      item.GSI1SK = `CATEGORY#${item.category || 'Uncategorized'}#ID#${item.productId || item.PK.split('#')[1]}`;
      item.GSI2PK = `STATUS#${item.status || 'Active'}`;
      item.GSI2SK = `STOCK#${item.totalStock || 0}`;
      console.log('After migration:', JSON.stringify(item));
      updated = true;
    }

    // Fix User GSIs
    if (item.PK.startsWith('USER#')) {
      console.log(`Migrating User: ${item.PK}`);
      const userId = item.id || item.PK.split('#')[1];
      item.GSI1PK = 'USER';
      // Safety: Ensure we don't double-prefix if already migrated
      if (!item.GSI1SK.includes('#ID#')) {
        item.GSI1SK = `ROLE#${item.role || 'customer'}#ID#${userId}`;
      }
      updated = true;
    }

    // Fix Invoices (if needed, though already mostly fine)
    if (item.PK.startsWith('INVOICE#') && item.GSI1PK === 'INVOICE') {
      // Already follows the pattern GSI1PK=INVOICE, GSI1SK=DATE#...
    }

    if (updated) {
      await docClient.send(new PutCommand({
        TableName: MAIN_TABLE,
        Item: item
      }));
      console.log(`Updated ${item.PK}`);
    }
  }

  console.log('Migration Complete.');
}

migrate().catch(console.error);
