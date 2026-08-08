"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const awsClient_1 = require("../utils/awsClient");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
async function dump() {
    const { Items } = await awsClient_1.docClient.send(new lib_dynamodb_1.ScanCommand({ TableName: awsClient_1.MAIN_TABLE, Limit: 10 }));
    console.log(JSON.stringify(Items, null, 2));
}
dump().catch(console.error);
