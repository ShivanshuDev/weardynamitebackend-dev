"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load environment variables
dotenv_1.default.config({ path: path_1.default.join(__dirname, "..", "..", ".env") });
const REGION = process.env.AWS_REGION || 'ap-south-1';
const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME;
const client = new client_dynamodb_1.DynamoDBClient({ region: REGION });
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
        await client.send(new client_dynamodb_1.UpdateTimeToLiveCommand(params));
        console.log("✅ TTL enabled successfully on attribute: expires_at");
        console.log("Note: It may take up to an hour for this change to be fully effective in the AWS Console.");
    }
    catch (err) {
        if (err.name === 'ValidationException' && err.message?.includes('already enabled')) {
            console.log("ℹ️ TTL is already enabled on this table.");
        }
        else {
            console.error("❌ Error enabling TTL:", err.message);
        }
    }
}
enableTTL();
