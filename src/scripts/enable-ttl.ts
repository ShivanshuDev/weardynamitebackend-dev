import { DynamoDBClient, UpdateTimeToLiveCommand } from "@aws-sdk/client-dynamodb";
import dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config({ path: path.join(__dirname, "..", "..", ".env") });

const REGION = process.env.AWS_REGION || 'ap-south-1';
const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME;

const client = new DynamoDBClient({ region: REGION });

async function enableTTL() {
  if (!TABLE_NAME) {
    console.error("❌ DYNAMODB_TABLE_NAME not found in .env");
    return;
  }

  console.log(`🚀 Enabling TTL for table: ${TABLE_NAME}...`);

  const params = {
    TableName: TABLE_NAME,
    TimeToLiveSpecification: {
      AttributeName: "expires_at",
      Enabled: true,
    },
  };

  try {
    await client.send(new UpdateTimeToLiveCommand(params));
    console.log("✅ TTL enabled successfully on attribute: expires_at");
    console.log("Note: It may take up to an hour for this change to be fully effective in the AWS Console.");
  } catch (err: any) {
    if (err.name === 'ValidationException' && err.message?.includes('already enabled')) {
      console.log("ℹ️ TTL is already enabled on this table.");
    } else {
      console.error("❌ Error enabling TTL:", err.message);
    }
  }
}

enableTTL();
