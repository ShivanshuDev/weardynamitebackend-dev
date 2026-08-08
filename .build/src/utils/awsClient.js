"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAIN_TABLE = exports.INVENTORY_TABLE = exports.docClient = exports.sesClient = exports.s3Client = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const client_s3_1 = require("@aws-sdk/client-s3");
const client_sesv2_1 = require("@aws-sdk/client-sesv2");
const REGION = process.env.SES_REGION || process.env.AWS_REGION || 'ap-southeast-2';
const dbClient = new client_dynamodb_1.DynamoDBClient({
    region: REGION,
});
exports.s3Client = new client_s3_1.S3Client({
    region: REGION,
});
exports.sesClient = new client_sesv2_1.SESv2Client({
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
exports.docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(dbClient, translateConfig);
exports.INVENTORY_TABLE = process.env.DYNAMODB_TABLE_NAME;
exports.MAIN_TABLE = exports.INVENTORY_TABLE;
