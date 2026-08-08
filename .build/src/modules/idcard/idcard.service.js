"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listStudents = exports.deleteStudent = exports.saveStudent = exports.saveConfig = exports.getConfig = void 0;
const awsClient_1 = require("../../utils/awsClient");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const uuid_1 = require("uuid");
/**
 * Get school configuration from DynamoDB
 */
const getConfig = async (schoolId) => {
    const { Item } = await awsClient_1.docClient.send(new lib_dynamodb_1.GetCommand({
        TableName: awsClient_1.MAIN_TABLE,
        Key: { PK: `SCHOOL#${schoolId}`, SK: 'CONFIG' }
    }));
    return Item || null;
};
exports.getConfig = getConfig;
/**
 * Save school configuration to DynamoDB
 */
const saveConfig = async (schoolId, config) => {
    const now = Date.now();
    const record = {
        ...config,
        PK: `SCHOOL#${schoolId}`,
        SK: 'CONFIG',
        schoolId,
        entity_type: 'IDCARD_CONFIG',
        updatedAt: now
    };
    await awsClient_1.docClient.send(new lib_dynamodb_1.PutCommand({
        TableName: awsClient_1.MAIN_TABLE,
        Item: record
    }));
    return record;
};
exports.saveConfig = saveConfig;
/**
 * Save a student record (handles create and update)
 */
const saveStudent = async (schoolId, studentData) => {
    const studentId = studentData.studentId || (0, uuid_1.v4)();
    const now = Date.now();
    const record = {
        ...studentData,
        PK: `SCHOOL#${schoolId}`,
        SK: `STUDENT#${studentId}`,
        schoolId,
        studentId,
        entity_type: 'IDCARD_STUDENT',
        createdAt: studentData.createdAt || now,
        updatedAt: now,
        // GSIs
        GSI1PK: `SCHOOL#${schoolId}#CLASS#${studentData.class}`,
        GSI1SK: `SEC#${(studentData.section || 'N/A').toUpperCase().trim()}#SR_NO#${studentData.srNo}`,
        GSI2PK: `SCHOOL#${schoolId}#SEARCH#NAME`,
        GSI2SK: `${(studentData.name || '').toLowerCase().trim()}#${studentId}`,
        GSI3PK: `PHONE#${studentData.phone}`,
        GSI3SK: `SCHOOL#${schoolId}#STUDENT#${studentId}`,
        GSI4PK: `SCHOOL#${schoolId}#SEARCH#FATHER`,
        GSI4SK: `${(studentData.fatherName || '').toLowerCase().trim()}#${studentId}`
    };
    await awsClient_1.docClient.send(new lib_dynamodb_1.PutCommand({
        TableName: awsClient_1.MAIN_TABLE,
        Item: record
    }));
    return record;
};
exports.saveStudent = saveStudent;
/**
 * Delete a student record
 */
const deleteStudent = async (schoolId, studentId) => {
    await awsClient_1.docClient.send(new lib_dynamodb_1.DeleteCommand({
        TableName: awsClient_1.MAIN_TABLE,
        Key: { PK: `SCHOOL#${schoolId}`, SK: `STUDENT#${studentId}` }
    }));
    return { success: true };
};
exports.deleteStudent = deleteStudent;
/**
 * List/query student records based on search filters (No Scans used)
 */
const listStudents = async (filters) => {
    const { schoolId, class: cls, section, name, phone, fatherName } = filters;
    if (!schoolId) {
        throw new Error('schoolId is required');
    }
    // 1. Phone Lookup (GSI3)
    if (phone && phone.trim()) {
        const { Items } = await awsClient_1.docClient.send(new lib_dynamodb_1.QueryCommand({
            TableName: awsClient_1.MAIN_TABLE,
            IndexName: 'GSI3',
            KeyConditionExpression: 'GSI3PK = :pk',
            ExpressionAttributeValues: { ':pk': `PHONE#${phone.trim()}` }
        }));
        const list = Items || [];
        // Filter globally matched phone results by schoolId
        return list.filter(item => item.schoolId === schoolId);
    }
    // 2. Name Search (GSI2)
    if (name && name.trim()) {
        const { Items } = await awsClient_1.docClient.send(new lib_dynamodb_1.QueryCommand({
            TableName: awsClient_1.MAIN_TABLE,
            IndexName: 'GSI2',
            KeyConditionExpression: 'GSI2PK = :pk AND begins_with(GSI2SK, :sk)',
            ExpressionAttributeValues: {
                ':pk': `SCHOOL#${schoolId}#SEARCH#NAME`,
                ':sk': name.toLowerCase().trim()
            }
        }));
        return Items || [];
    }
    // 3. Father's Name Search (GSI4)
    if (fatherName && fatherName.trim()) {
        const { Items } = await awsClient_1.docClient.send(new lib_dynamodb_1.QueryCommand({
            TableName: awsClient_1.MAIN_TABLE,
            IndexName: 'GSI4',
            KeyConditionExpression: 'GSI4PK = :pk AND begins_with(GSI4SK, :sk)',
            ExpressionAttributeValues: {
                ':pk': `SCHOOL#${schoolId}#SEARCH#FATHER`,
                ':sk': fatherName.toLowerCase().trim()
            }
        }));
        return Items || [];
    }
    // 4. Class (and optionally Section) Lookup (GSI1)
    if (cls && cls.trim()) {
        const gsi1pk = `SCHOOL#${schoolId}#CLASS#${cls.trim()}`;
        let keyExpression = 'GSI1PK = :pk';
        const values = { ':pk': gsi1pk };
        if (section && section.trim()) {
            keyExpression += ' AND begins_with(GSI1SK, :sk)';
            values[':sk'] = `SEC#${section.toUpperCase().trim()}#`;
        }
        const { Items } = await awsClient_1.docClient.send(new lib_dynamodb_1.QueryCommand({
            TableName: awsClient_1.MAIN_TABLE,
            IndexName: 'GSI1',
            KeyConditionExpression: keyExpression,
            ExpressionAttributeValues: values
        }));
        return Items || [];
    }
    // 5. Default school-wide listing (Base Table query)
    const { Items } = await awsClient_1.docClient.send(new lib_dynamodb_1.QueryCommand({
        TableName: awsClient_1.MAIN_TABLE,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
            ':pk': `SCHOOL#${schoolId}`,
            ':sk': 'STUDENT#'
        }
    }));
    return Items || [];
};
exports.listStudents = listStudents;
