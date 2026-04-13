import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { S3Client } from '@aws-sdk/client-s3';
import { SESv2Client } from '@aws-sdk/client-sesv2';

const REGION = process.env.SES_REGION || process.env.AWS_REGION || 'ap-southeast-2';

const dbClient = new DynamoDBClient({
  region: REGION,
});

export const s3Client = new S3Client({
  region: REGION,
});

export const sesClient = new SESv2Client({
  region: REGION,
});

// Configure DynamoDBDocumentClient for automatic marshalling/unmarshalling of JSON
const marshallOptions = {
  convertEmptyValues: false, 
  removeUndefinedValues: true, 
  convertClassInstanceToMap: false,
};

const unmarshallOptions = {
  wrapNumbers: false,
};

const translateConfig = { marshallOptions, unmarshallOptions };

export const docClient = DynamoDBDocumentClient.from(dbClient, translateConfig);

export const INVENTORY_TABLE = process.env.DYNAMODB_TABLE_NAME;
export const MAIN_TABLE = INVENTORY_TABLE;

