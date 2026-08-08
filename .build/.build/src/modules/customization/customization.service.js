"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCustomizationStatus = exports.createCustomization = exports.listCustomizations = void 0;
const awsClient_1 = require("../../utils/awsClient");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const uuid_1 = require("uuid");
const listCustomizations = async () => {
    const { Items } = await awsClient_1.docClient.send(new lib_dynamodb_1.QueryCommand({
        TableName: awsClient_1.MAIN_TABLE,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        ExpressionAttributeValues: { ':pk': 'CUSTOMIZATION' },
        ScanIndexForward: false
    }));
    return Items || [];
};
exports.listCustomizations = listCustomizations;
const createCustomization = async (data) => {
    const id = (0, uuid_1.v4)();
    const record = {
        PK: `CUSTOMIZATION#${id}`,
        SK: 'CUSTOMIZATION',
        GSI1PK: 'CUSTOMIZATION',
        GSI1SK: `DATE#${Date.now()}`,
        customizationId: id,
        status: 'Pending',
        ...data,
        createdAt: Date.now()
    };
    await awsClient_1.docClient.send(new lib_dynamodb_1.PutCommand({ TableName: awsClient_1.MAIN_TABLE, Item: record }));
    return record;
};
exports.createCustomization = createCustomization;
const updateCustomizationStatus = async (id, status) => {
    await awsClient_1.docClient.send(new lib_dynamodb_1.UpdateCommand({
        TableName: awsClient_1.MAIN_TABLE,
        Key: { PK: `CUSTOMIZATION#${id}`, SK: 'CUSTOMIZATION' },
        UpdateExpression: 'SET #st = :status',
        ExpressionAttributeNames: { '#st': 'status' },
        ExpressionAttributeValues: { ':status': status }
    }));
    return { updated: true, status };
};
exports.updateCustomizationStatus = updateCustomizationStatus;
