"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteExpense = exports.createExpense = exports.listExpenses = void 0;
const awsClient_1 = require("../../utils/awsClient");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const uuid_1 = require("uuid");
const ledger_service_1 = require("../ledger/ledger.service");
/**
 * List all expenses for admin.
 */
const listExpenses = async (filters) => {
    let cmd = {
        TableName: awsClient_1.MAIN_TABLE,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        ExpressionAttributeValues: { ':pk': 'EXPENSE' },
        ScanIndexForward: false // Newest first
    };
    if (filters.dateFrom && filters.dateTo) {
        cmd.KeyConditionExpression = 'GSI1PK = :pk AND GSI1SK BETWEEN :d1 AND :d2';
        cmd.ExpressionAttributeValues[':d1'] = `DATE#${filters.dateFrom}`;
        cmd.ExpressionAttributeValues[':d2'] = `DATE#${filters.dateTo}\uf8ff`; // \uf8ff ensures it captures all timestamps for that day
    }
    const { Items } = await awsClient_1.docClient.send(new lib_dynamodb_1.QueryCommand(cmd));
    let items = Items || [];
    if (filters.category) {
        items = items.filter(i => i.category?.toLowerCase() === filters.category.toLowerCase());
    }
    return items;
};
exports.listExpenses = listExpenses;
/**
 * Create a new expense and trigger a Ledger entry.
 */
const createExpense = async (data) => {
    const id = (0, uuid_1.v4)();
    const now = new Date();
    // High-Precision Hybrid Timing: DATE#YYYY-MM-DD#TIMESTAMP
    // This maintains backward compatibility with legacy YYYY-MM-DD queries
    // while ensuring reverse-chronological sorting within the same day.
    const dateStr = data.date || now.toISOString().split('T')[0];
    const timestamp = now.getTime();
    const gsi1sk = `DATE#${dateStr}#${timestamp}`;
    const record = {
        PK: `EXPENSE#${id}`,
        SK: 'EXPENSE',
        GSI1PK: 'EXPENSE',
        GSI1SK: gsi1sk,
        GSI2PK: `CATEGORY#${data.category}`,
        GSI2SK: gsi1sk,
        expenseId: id,
        ...data,
        date: timestamp, // Store numeric timestamp for easy frontend formatting
        status: 'Paid',
        createdAt: timestamp
    };
    await awsClient_1.docClient.send(new lib_dynamodb_1.PutCommand({
        TableName: awsClient_1.MAIN_TABLE,
        Item: record
    }));
    // High-Performance Event: Atomic Dashboard increment (Burn)
    await (0, ledger_service_1.updateDashboardStats)({ burn: Number(data.amount) });
    // Automated Financial Propagation: Trigger Ledger Debit
    await (0, ledger_service_1.addTransaction)({
        description: `Operational Outflow: ${data.description} (${data.category})`,
        type: 'Debit',
        category: data.category,
        amount: Number(data.amount),
        date: expenseDateTs,
        referenceId: id
    });
    return record;
};
exports.createExpense = createExpense;
/**
 * Delete an expense record.
 * Note: Decided not to reverse ledger entries for audit compliance (manual adjustment preferred).
 */
const deleteExpense = async (id) => {
    await awsClient_1.docClient.send(new lib_dynamodb_1.DeleteCommand({
        TableName: awsClient_1.MAIN_TABLE,
        Key: { PK: `EXPENSE#${id}`, SK: 'EXPENSE' }
    }));
    return { message: 'Expense record deleted' };
};
exports.deleteExpense = deleteExpense;
