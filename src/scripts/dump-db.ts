import 'dotenv/config';
import { docClient, MAIN_TABLE } from '../utils/awsClient';
import { ScanCommand } from '@aws-sdk/lib-dynamodb';

async function dump() {
  const { Items } = await docClient.send(new ScanCommand({ TableName: MAIN_TABLE, Limit: 10 }));
  console.log(JSON.stringify(Items, null, 2));
}

dump().catch(console.error);
