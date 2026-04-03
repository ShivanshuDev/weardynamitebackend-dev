import { DynamoDBClient, CreateTableCommand } from "@aws-sdk/client-dynamodb";
import dotenv from "dotenv";
import path from "path";

// Load backend .env
dotenv.config({ path: path.join(__dirname, ".env") });

const REGION = process.env.AWS_REGION || "ap-southeast-1";
const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || "weardynamite-dev";

const client = new DynamoDBClient({ region: REGION });

async function createTable() {
  console.log(`🚀 Starting creation of table: ${TABLE_NAME} in ${REGION}...`);

  const params = {
    TableName: TABLE_NAME,
    KeySchema: [
      { AttributeName: "PK", KeyType: "HASH" as const }, // Partition Key
      { AttributeName: "SK", KeyType: "RANGE" as const }, // Sort Key
    ],
    AttributeDefinitions: [
      { AttributeName: "PK", AttributeType: "S" as const },
      { AttributeName: "SK", AttributeType: "S" as const },
      { AttributeName: "GSI1PK", AttributeType: "S" as const },
      { AttributeName: "GSI1SK", AttributeType: "S" as const },
      { AttributeName: "GSI2PK", AttributeType: "S" as const },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "GSI1",
        KeySchema: [
          { AttributeName: "GSI1PK", KeyType: "HASH" as const },
          { AttributeName: "GSI1SK", KeyType: "RANGE" as const },
        ],
        Projection: { ProjectionType: "ALL" as const },
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5,
        },
      },
      {
        IndexName: "GSI2",
        KeySchema: [
          { AttributeName: "GSI2PK", KeyType: "HASH" as const },
          { AttributeName: "GSI2SK", KeyType: "RANGE" as const },
        ],
        Projection: { ProjectionType: "ALL" as const },
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5,
        },
      },
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5,
    },
  };

  try {
    const data = await client.send(new CreateTableCommand(params));
    console.log("✅ Table Created Successfully!", data.TableDescription?.TableArn);
    console.log("\nStatus: CREATING (It may take 1-2 minutes to become ACTIVE)");
  } catch (err: any) {
    if (err.name === 'ResourceInUseException') {
      console.log("❌ Table already exists.");
    } else {
      console.error("❌ Error creating table:", err.message);
    }
  }
}

createTable();
