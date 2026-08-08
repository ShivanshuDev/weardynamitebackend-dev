"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteVendor = exports.patchVendorStatus = exports.updateVendor = exports.createVendor = exports.addVendorTransaction = exports.listVendorTransactions = exports.listVendors = void 0;
const awsClient_1 = require("../../utils/awsClient");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const uuid_1 = require("uuid");
const LedgerService = __importStar(require("../ledger/ledger.service"));
const listVendors = async () => {
    const { Items } = await awsClient_1.docClient.send(new lib_dynamodb_1.QueryCommand({
        TableName: awsClient_1.MAIN_TABLE,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        ExpressionAttributeValues: { ':pk': 'VENDOR' }
    }));
    return Items || [];
};
exports.listVendors = listVendors;
/**
 * Fetch all transactions (Bills and Payments) for a specific vendor.
 */
const listVendorTransactions = async (vendorId) => {
    const { Items } = await awsClient_1.docClient.send(new lib_dynamodb_1.QueryCommand({
        TableName: awsClient_1.MAIN_TABLE,
        IndexName: 'GSI2',
        KeyConditionExpression: 'GSI2PK = :pk',
        ExpressionAttributeValues: { ':pk': `VENDOR#${vendorId}` }
    }));
    return Items || [];
};
exports.listVendorTransactions = listVendorTransactions;
/**
 * Record a financial event for a vendor.
 * This also triggers a double-entry record in the General Ledger.
 */
const addVendorTransaction = async (vendorId, data) => {
    const ledgerType = data.type === 'Payment' ? 'Debit' : 'Credit';
    // 1. Create the Transaction in Ledger with Vendor GSI mapping
    const record = await LedgerService.addTransaction({
        ...data,
        type: ledgerType,
        category: 'Logistics', // Default vendor category for ledger mapping
        referenceId: data.referenceId || vendorId,
        // Add GSI2 mapping for vendor history
        GSI2PK: `VENDOR#${vendorId}`,
        GSI2SK: `DATE#${data.date}#${Date.now()}`
    });
    return record;
};
exports.addVendorTransaction = addVendorTransaction;
const createVendor = async (data) => {
    const id = (0, uuid_1.v4)();
    const record = { PK: `VENDOR#${id}`, SK: 'VENDOR', GSI1PK: 'VENDOR', GSI1SK: `DATE#${Date.now()}`, vendorId: id, status: 'Active', ...data };
    await awsClient_1.docClient.send(new lib_dynamodb_1.PutCommand({ TableName: awsClient_1.MAIN_TABLE, Item: record }));
    // Handle Initial Balance Onboarding
    if (data.initialBalance && data.initialBalance > 0) {
        await (0, exports.addVendorTransaction)(id, {
            date: Date.now(),
            type: 'Payment', // Always debit for initial balance
            amount: data.initialBalance,
            description: 'Institutional Opening Balance Alignment'
        });
    }
    return record;
};
exports.createVendor = createVendor;
const updateVendor = async (id, updates) => {
    const { Item } = await awsClient_1.docClient.send(new lib_dynamodb_1.GetCommand({ TableName: awsClient_1.MAIN_TABLE, Key: { PK: `VENDOR#${id}`, SK: 'VENDOR' } }));
    if (!Item)
        throw new Error('Vendor not found');
    const record = { ...Item, ...updates };
    await awsClient_1.docClient.send(new lib_dynamodb_1.PutCommand({ TableName: awsClient_1.MAIN_TABLE, Item: record }));
    return record;
};
exports.updateVendor = updateVendor;
const patchVendorStatus = async (id, status) => {
    return (0, exports.updateVendor)(id, { status });
};
exports.patchVendorStatus = patchVendorStatus;
const deleteVendor = async (id) => {
    await awsClient_1.docClient.send(new lib_dynamodb_1.DeleteCommand({ TableName: awsClient_1.MAIN_TABLE, Key: { PK: `VENDOR#${id}`, SK: 'VENDOR' } }));
    return { message: 'Vendor deleted' };
};
exports.deleteVendor = deleteVendor;
