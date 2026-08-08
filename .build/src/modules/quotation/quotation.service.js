"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertToOrder = exports.updateQuotationStatus = exports.updateQuotation = exports.listQuotations = exports.getQuotation = exports.createQuotation = void 0;
const awsClient_1 = require("../../utils/awsClient");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const uuid_1 = require("uuid");
const createQuotation = async (data) => {
    const quotationId = `QT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = Date.now();
    const status = data.status || 'Draft';
    const customerEmail = data.customerEmail?.toLowerCase() || '';
    const quotation = {
        PK: `QUOTATION#${quotationId}`,
        SK: 'METADATA',
        entity_type: 'QUOTATION',
        quotationId,
        inquiryId: data.inquiryId,
        customerName: data.customerName || 'Walk-in Customer',
        customerEmail,
        customerPhone: data.customerPhone,
        companyName: data.companyName,
        billingAddress: data.billingAddress || {},
        shippingAddress: data.shippingAddress || {},
        status,
        isEmailed: data.isEmailed || false,
        items: data.items || [],
        subtotal: Number(data.subtotal) || 0,
        discountTotal: Number(data.discountTotal) || 0,
        taxTotal: Number(data.taxTotal) || 0,
        shippingCharges: Number(data.shippingCharges) || 0,
        grandTotal: Number(data.grandTotal) || 0,
        paymentTerms: data.paymentTerms,
        deliveryTimeline: data.deliveryTimeline,
        termsConditions: data.termsConditions,
        adminNotes: data.adminNotes,
        expiryDate: data.expiryDate || (now + 15 * 24 * 60 * 60 * 1000), // Default 15 days
        revisionNumber: 1,
        createdAt: now,
        updatedAt: now,
        createdBy: data.user_info || 'admin',
        // GSIs
        GSI1PK: 'QUOTATION',
        GSI1SK: `DATE#${now}#${quotationId}`,
        GSI2PK: `CUSTOMER_EMAIL#${customerEmail}`,
        GSI2SK: `QUOTATION#${quotationId}`,
        GSI3PK: `QUOTATION#STATUS#${status}`,
        GSI3SK: `DATE#${now}#${quotationId}`
    };
    await awsClient_1.docClient.send(new lib_dynamodb_1.PutCommand({
        TableName: awsClient_1.MAIN_TABLE,
        Item: quotation
    }));
    return quotation;
};
exports.createQuotation = createQuotation;
const getQuotation = async (quotationId) => {
    const { Item } = await awsClient_1.docClient.send(new lib_dynamodb_1.GetCommand({
        TableName: awsClient_1.MAIN_TABLE,
        Key: {
            PK: `QUOTATION#${quotationId}`,
            SK: 'METADATA'
        }
    }));
    if (!Item) {
        throw new Error(`Quotation ${quotationId} not found`);
    }
    return Item;
};
exports.getQuotation = getQuotation;
const listQuotations = async (query) => {
    const limit = query.limit ? Number(query.limit) : 20;
    let KeyConditionExpression = '';
    let ExpressionAttributeValues = {};
    let IndexName = 'GSI1';
    if (query.status) {
        IndexName = 'GSI3';
        KeyConditionExpression = 'GSI3PK = :pk';
        ExpressionAttributeValues = { ':pk': `QUOTATION#STATUS#${query.status}` };
    }
    else if (query.email) {
        IndexName = 'GSI2';
        KeyConditionExpression = 'GSI2PK = :pk';
        ExpressionAttributeValues = { ':pk': `CUSTOMER_EMAIL#${query.email.toLowerCase()}` };
    }
    else {
        KeyConditionExpression = 'GSI1PK = :pk';
        ExpressionAttributeValues = { ':pk': 'QUOTATION' };
    }
    const { Items, LastEvaluatedKey } = await awsClient_1.docClient.send(new lib_dynamodb_1.QueryCommand({
        TableName: awsClient_1.MAIN_TABLE,
        IndexName,
        KeyConditionExpression,
        ExpressionAttributeValues,
        ScanIndexForward: false,
        Limit: limit,
        ExclusiveStartKey: query.lastKey
    }));
    return {
        items: Items || [],
        lastKey: LastEvaluatedKey
    };
};
exports.listQuotations = listQuotations;
const updateQuotation = async (quotationId, data) => {
    const existing = await (0, exports.getQuotation)(quotationId);
    const now = Date.now();
    const newStatus = data.status || existing.status;
    const updatedItem = {
        ...existing,
        ...data,
        status: newStatus,
        updatedAt: now,
        revisionNumber: (existing.revisionNumber || 1) + 1,
        GSI3PK: `QUOTATION#STATUS#${newStatus}`,
        GSI3SK: `DATE#${existing.createdAt}#${quotationId}`
    };
    await awsClient_1.docClient.send(new lib_dynamodb_1.PutCommand({
        TableName: awsClient_1.MAIN_TABLE,
        Item: updatedItem
    }));
    return updatedItem;
};
exports.updateQuotation = updateQuotation;
const updateQuotationStatus = async (quotationId, status) => {
    const existing = await (0, exports.getQuotation)(quotationId);
    const now = Date.now();
    const { Attributes } = await awsClient_1.docClient.send(new lib_dynamodb_1.UpdateCommand({
        TableName: awsClient_1.MAIN_TABLE,
        Key: { PK: `QUOTATION#${quotationId}`, SK: 'METADATA' },
        UpdateExpression: 'SET #status = :status, GSI3PK = :gsi3pk, updatedAt = :now',
        ExpressionAttributeNames: {
            '#status': 'status'
        },
        ExpressionAttributeValues: {
            ':status': status,
            ':gsi3pk': `QUOTATION#STATUS#${status}`,
            ':now': now
        },
        ReturnValues: 'ALL_NEW'
    }));
    return Attributes;
};
exports.updateQuotationStatus = updateQuotationStatus;
const convertToOrder = async (quotationId) => {
    const quotation = await (0, exports.getQuotation)(quotationId);
    if (quotation.status !== 'Approved') {
        throw new Error('Only approved quotations can be converted to an order');
    }
    const orderId = `WDT${Math.floor(10000000 + Math.random() * 90000000)}`;
    const now = Date.now();
    const transactItems = [];
    const processedItems = [];
    // Generate order item records
    for (const item of quotation.items) {
        const itemRecordId = (0, uuid_1.v4)();
        const itemRecord = {
            PK: `ORDER#${orderId}`,
            SK: `ITEM#${itemRecordId}`,
            order_id: orderId,
            product_id: item.productId || 'custom-item',
            product_name: item.productName,
            price: item.unitPrice,
            quantity: item.quantity,
            total_price: item.total,
            color: item.color || 'Custom',
            size: item.size || 'Custom',
            customization: item.customizationDetails,
            created_at: now
        };
        processedItems.push(itemRecord);
        transactItems.push({
            Put: {
                TableName: awsClient_1.MAIN_TABLE,
                Item: itemRecord
            }
        });
    }
    // Create Order Summary
    const orderSummary = {
        PK: `ORDER#${orderId}`,
        SK: `SUMMARY`,
        order_id: orderId,
        order_number: orderId,
        user_id: `CUSTOMER_EMAIL#${quotation.customerEmail}`,
        customer_details: {
            name: quotation.customerName,
            email: quotation.customerEmail,
            phone: quotation.customerPhone
        },
        shipping_address: quotation.shippingAddress,
        billing_address: quotation.billingAddress,
        payment_method: 'UPI/Manual (Quotation)',
        status: 'Pending',
        created_at: now,
        updated_at: now,
        items: processedItems.map(i => ({
            product_id: i.product_id,
            product_name: i.product_name,
            price: i.price,
            quantity: i.quantity,
            total_price: i.total_price,
            color: i.color,
            size: i.size
        })),
        subtotal: quotation.subtotal,
        discount_amount: quotation.discountTotal,
        tax_amount: quotation.taxTotal,
        shipping_charges: quotation.shippingCharges,
        total_amount: quotation.grandTotal,
        sourceQuotationId: quotationId,
        // GSIs for Orders listing
        GSI1PK: `USER#CUSTOMER_EMAIL#${quotation.customerEmail}`,
        GSI1SK: `DATE#${now}#${orderId}`,
        GSI2PK: `ORDER#STATUS#Pending`,
        GSI2SK: `DATE#${now}#${orderId}`,
        GSI4PK: `ORDER`,
        GSI4SK: `DATE#${now}#${orderId}`
    };
    transactItems.push({
        Put: {
            TableName: awsClient_1.MAIN_TABLE,
            Item: orderSummary
        }
    });
    // Mark quotation as Converted
    transactItems.push({
        Update: {
            TableName: awsClient_1.MAIN_TABLE,
            Key: { PK: `QUOTATION#${quotationId}`, SK: 'METADATA' },
            UpdateExpression: 'SET #status = :status, GSI3PK = :gsi3pk, updatedAt = :now',
            ExpressionAttributeNames: {
                '#status': 'status'
            },
            ExpressionAttributeValues: {
                ':status': 'Converted',
                ':gsi3pk': `QUOTATION#STATUS#Converted`,
                ':now': now
            }
        }
    });
    await awsClient_1.docClient.send(new lib_dynamodb_1.TransactWriteCommand({
        TransactItems: transactItems
    }));
    return { orderId, orderNumber: orderId };
};
exports.convertToOrder = convertToOrder;
