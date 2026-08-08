"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bulkUpdateInventoryItemStatus = exports.updateInventoryItemStatus = exports.updateInvoiceStatus = exports.getItemById = exports.getAllInventoryItems = exports.searchInvoices = exports.getActiveInventoryItems = exports.listAllInventoryItems = exports.searchProducts = exports.getInventoryByDateRange = exports.getInvoiceItems = exports.getInvoiceSummary = exports.getAllInvoices = exports.addInventoryItem = void 0;
const awsClient_1 = require("../../utils/awsClient");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const uuid_1 = require("uuid");
const ledger_service_1 = require("../ledger/ledger.service");
// Helper to decode Base64 LEK
const decodeLEK = (base64Str) => {
    if (!base64Str)
        return undefined;
    try {
        return JSON.parse(Buffer.from(base64Str, 'base64').toString('utf-8'));
    }
    catch (e) {
        return undefined;
    }
};
// Helper to encode LEK to Base64
const encodeLEK = (lek) => {
    if (!lek)
        return undefined;
    return Buffer.from(JSON.stringify(lek)).toString('base64');
};
const addInventoryItem = async (invoiceData) => {
    const { invoiceNumber, invoiceDate, vendorName, addedBy, items } = invoiceData;
    const now = Date.now();
    // Handle empty or invalid data
    if (!items) {
        throw new Error('Invoice payload is missing "items" field');
    }
    if (!Array.isArray(items)) {
        throw new Error('Invoice "items" must be an array');
    }
    if (items.length === 0) {
        throw new Error('Invoice must contain at least one item');
    }
    // Parse invoice date to epoch
    const epochInvoiceDate = invoiceDate ? new Date(invoiceDate).getTime() : now;
    const transactItems = [];
    let aggregateQuantity = 0;
    let aggregateAmount = 0;
    let variantRecordsCount = 0;
    // Process each line item and its variants
    for (const item of items) {
        for (const variant of (item.variants || [])) {
            // If no colors specified, still record the variant block
            const colors = (variant.colors && variant.colors.length > 0) ? variant.colors : ['N/A'];
            for (const color of colors) {
                // Stop if we reach DynamoDB transaction limit of 100
                if (transactItems.length >= 99)
                    break;
                const inventoryId = (0, uuid_1.v4)();
                const quantity = Number(variant.quantity || 0);
                const lineTotalCost = Number(item.price || 0) * quantity;
                aggregateQuantity += quantity;
                aggregateAmount += lineTotalCost;
                variantRecordsCount += 1;
                // Construct a descriptive product name for the stock view
                const descriptiveName = `${item.productName || 'Unknown'} (${variant.size || 'N/A'} / ${color})`;
                const searchProductName = descriptiveName.toLowerCase().trim();
                transactItems.push({
                    Put: {
                        TableName: awsClient_1.INVENTORY_TABLE,
                        Item: {
                            PK: `INVOICE#${invoiceNumber}`,
                            SK: `ITEM#${inventoryId}`,
                            inventory_id: inventoryId,
                            invoice_number: invoiceNumber,
                            invoice_date: epochInvoiceDate,
                            vendor_name: vendorName,
                            product_name: descriptiveName,
                            base_product_name: item.productName || 'Unknown',
                            size: variant.size || 'N/A',
                            color: color,
                            category: item.category,
                            sub_category: item.subCategory,
                            fabric: item.fabric,
                            gender: item.gender,
                            occasion: item.occasion,
                            quantity: quantity,
                            cost_price: Number(item.price || 0),
                            total_cost: lineTotalCost,
                            order_id: item.orderId,
                            order_date: item.orderDate ? new Date(item.orderDate).getTime() : undefined,
                            images: item.images || [],
                            description: item.description || '',
                            created_at: now,
                            created_by: addedBy || 'system',
                            updated_at: now,
                            updated_by: addedBy || 'system',
                            // GSIs
                            GSI2PK: 'PRODUCT_SEARCH',
                            GSI2SK: `${searchProductName}#${inventoryId}`,
                            GSI3PK: 'INVENTORY_ITEMS',
                            GSI3SK: `${epochInvoiceDate}#${inventoryId}`
                        }
                    }
                });
            }
            if (transactItems.length >= 99)
                break;
        }
        if (transactItems.length >= 99)
            break;
    }
    // Add the SUMMARY update to the transaction
    const searchInvoiceNumber = (invoiceNumber || '').toLowerCase().trim();
    transactItems.push({
        Update: {
            TableName: awsClient_1.INVENTORY_TABLE,
            Key: { PK: `INVOICE#${invoiceNumber}`, SK: 'SUMMARY' },
            UpdateExpression: 'SET invoice_number = :inv, invoice_date = :idate, vendor_name = :vname, total_items_count = if_not_exists(total_items_count, :zero) + :one, total_quantity = if_not_exists(total_quantity, :zero) + :qty, total_amount = if_not_exists(total_amount, :zero) + :amt, #status = if_not_exists(#status, :status), created_at = if_not_exists(created_at, :now), created_by = if_not_exists(created_by, :user), updated_at = :now, updated_by = :user, GSI1PK = :gsi1pk, GSI1SK = :gsi1sk, GSI4PK = :gsi4pk, GSI4SK = :gsi4sk',
            ExpressionAttributeNames: { '#status': 'status' },
            ExpressionAttributeValues: {
                ':inv': invoiceNumber,
                ':idate': epochInvoiceDate,
                ':vname': vendorName,
                ':zero': 0,
                ':one': variantRecordsCount,
                ':qty': aggregateQuantity,
                ':amt': aggregateAmount,
                ':now': now,
                ':user': addedBy || 'system',
                ':status': 'Draft',
                ':gsi1pk': 'INVOICE',
                ':gsi1sk': `${epochInvoiceDate}#${invoiceNumber}`,
                ':gsi4pk': 'INVOICE_SEARCH',
                ':gsi4sk': searchInvoiceNumber
            }
        }
    });
    await awsClient_1.docClient.send(new lib_dynamodb_1.TransactWriteCommand({ TransactItems: transactItems }));
    // Record to Financial Ledger
    (0, ledger_service_1.addTransaction)({
        description: `Inventory Procurement: Invoice #${invoiceNumber} (${vendorName})`,
        type: 'Debit',
        category: 'COGS',
        amount: aggregateAmount,
        referenceId: `INV-${invoiceNumber}`,
        date: now
    });
    return { success: true, invoiceNumber, recordsAdded: variantRecordsCount };
};
exports.addInventoryItem = addInventoryItem;
const getAllInvoices = async (limit = 20, lastKey) => {
    const exclusiveStartKey = decodeLEK(lastKey);
    const { Items, LastEvaluatedKey } = await awsClient_1.docClient.send(new lib_dynamodb_1.QueryCommand({
        TableName: awsClient_1.INVENTORY_TABLE,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        ExpressionAttributeValues: { ':pk': 'INVOICE' },
        ScanIndexForward: false, // newest first
        Limit: limit,
        ExclusiveStartKey: exclusiveStartKey
    }));
    const finalItems = (Items || []).filter(i => i.SK === 'SUMMARY' || i.SK === 'HEADER');
    return {
        items: finalItems,
        lastEvaluatedKey: encodeLEK(LastEvaluatedKey)
    };
};
exports.getAllInvoices = getAllInvoices;
const getInvoiceSummary = async (invoice_number) => {
    const { Item } = await awsClient_1.docClient.send(new lib_dynamodb_1.GetCommand({
        TableName: awsClient_1.INVENTORY_TABLE,
        Key: {
            PK: `INVOICE#${invoice_number}`,
            SK: 'SUMMARY'
        }
    }));
    return Item;
};
exports.getInvoiceSummary = getInvoiceSummary;
const getInvoiceItems = async (invoice_number, limit = 50, lastKey) => {
    const exclusiveStartKey = decodeLEK(lastKey);
    const { Items, LastEvaluatedKey } = await awsClient_1.docClient.send(new lib_dynamodb_1.QueryCommand({
        TableName: awsClient_1.INVENTORY_TABLE,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk_prefix)',
        ExpressionAttributeValues: {
            ':pk': `INVOICE#${invoice_number}`,
            ':sk_prefix': 'ITEM#'
        },
        Limit: limit,
        ExclusiveStartKey: exclusiveStartKey
    }));
    return {
        items: Items || [],
        lastEvaluatedKey: encodeLEK(LastEvaluatedKey)
    };
};
exports.getInvoiceItems = getInvoiceItems;
const getInventoryByDateRange = async (startDate, endDate, limit = 50, lastKey) => {
    const exclusiveStartKey = decodeLEK(lastKey);
    const startEpoch = new Date(startDate).getTime();
    const endEpoch = new Date(endDate).getTime();
    const { Items, LastEvaluatedKey } = await awsClient_1.docClient.send(new lib_dynamodb_1.QueryCommand({
        TableName: awsClient_1.INVENTORY_TABLE,
        IndexName: 'GSI3',
        KeyConditionExpression: 'GSI3PK = :pk AND GSI3SK BETWEEN :start AND :end',
        ExpressionAttributeValues: {
            ':pk': 'INVENTORY_ITEMS',
            ':start': `${startEpoch}#`,
            ':end': `${endEpoch}#\uFFFF`
        },
        Limit: limit,
        ScanIndexForward: false,
        ExclusiveStartKey: exclusiveStartKey
    }));
    return {
        items: Items || [],
        lastEvaluatedKey: encodeLEK(LastEvaluatedKey)
    };
};
exports.getInventoryByDateRange = getInventoryByDateRange;
const searchProducts = async (query, limit = 20, lastKey) => {
    const exclusiveStartKey = decodeLEK(lastKey);
    const search_query = query.toLowerCase().trim();
    const { Items, LastEvaluatedKey } = await awsClient_1.docClient.send(new lib_dynamodb_1.QueryCommand({
        TableName: awsClient_1.INVENTORY_TABLE,
        IndexName: 'GSI2',
        KeyConditionExpression: 'GSI2PK = :pk AND begins_with(GSI2SK, :query)',
        ExpressionAttributeValues: {
            ':pk': 'PRODUCT_SEARCH',
            ':query': search_query
        },
        Limit: limit,
        ExclusiveStartKey: exclusiveStartKey
    }));
    return {
        items: Items || [],
        lastEvaluatedKey: encodeLEK(LastEvaluatedKey)
    };
};
exports.searchProducts = searchProducts;
const listAllInventoryItems = async (filters = {}, limit = 20, lastKey) => {
    const exclusiveStartKey = decodeLEK(lastKey);
    const { sku, name, status, startDate, endDate } = filters;
    const expressionAttributeValues = {
        ':pk': 'INVENTORY_ITEMS'
    };
    const expressionAttributeNames = {};
    let keyConditionExpression = 'GSI3PK = :pk';
    // Efficient date range filtering if provided
    if (startDate || endDate) {
        const start = startDate ? `${startDate}#` : '0#';
        const end = endDate ? `${endDate}#\uFFFF` : '9999999999999#\uFFFF';
        keyConditionExpression += ' AND GSI3SK BETWEEN :start AND :end';
        expressionAttributeValues[':start'] = start;
        expressionAttributeValues[':end'] = end;
    }
    const filterParts = [];
    if (sku) {
        filterParts.push('contains(inventory_id, :sku)');
        expressionAttributeValues[':sku'] = sku;
    }
    if (name) {
        filterParts.push('(contains(product_name, :name) OR contains(base_product_name, :name))');
        expressionAttributeValues[':name'] = name.toLowerCase();
    }
    if (status && status !== 'All') {
        filterParts.push('#status = :status');
        expressionAttributeNames['#status'] = 'status';
        expressionAttributeValues[':status'] = status;
    }
    const { Items, LastEvaluatedKey } = await awsClient_1.docClient.send(new lib_dynamodb_1.QueryCommand({
        TableName: awsClient_1.INVENTORY_TABLE,
        IndexName: 'GSI3',
        KeyConditionExpression: keyConditionExpression,
        FilterExpression: filterParts.length > 0 ? filterParts.join(' AND ') : undefined,
        ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
        ExpressionAttributeValues: expressionAttributeValues,
        Limit: limit,
        ScanIndexForward: false, // newest first
        ExclusiveStartKey: exclusiveStartKey
    }));
    return {
        items: Items || [],
        lastEvaluatedKey: encodeLEK(LastEvaluatedKey)
    };
};
exports.listAllInventoryItems = listAllInventoryItems;
const getActiveInventoryItems = async (query, limit = 50, lastKey) => {
    const exclusiveStartKey = decodeLEK(lastKey);
    const expressionAttributeValues = {
        ':pk': 'INVENTORY_ITEMS',
        ':inactive': 'Inactive',
        ':zero': 0
    };
    let filterExpression = '(attribute_not_exists(#status) OR (#status <> :inactive AND #status <> :inactiveLower)) AND quantity > :zero';
    const expressionAttributeNames = { '#status': 'status' };
    expressionAttributeValues[':inactiveLower'] = 'inactive';
    if (query) {
        const search_query = query.toLowerCase().trim();
        filterExpression += ' AND (contains(product_name, :query) OR contains(base_product_name, :query))';
        expressionAttributeValues[':query'] = search_query;
    }
    const { Items, LastEvaluatedKey } = await awsClient_1.docClient.send(new lib_dynamodb_1.QueryCommand({
        TableName: awsClient_1.INVENTORY_TABLE,
        IndexName: 'GSI3',
        KeyConditionExpression: 'GSI3PK = :pk',
        FilterExpression: filterExpression,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        Limit: limit,
        ExclusiveStartKey: exclusiveStartKey
    }));
    return {
        items: Items || [],
        lastEvaluatedKey: encodeLEK(LastEvaluatedKey)
    };
};
exports.getActiveInventoryItems = getActiveInventoryItems;
const searchInvoices = async (query, limit = 20, lastKey) => {
    const exclusiveStartKey = decodeLEK(lastKey);
    const search_query = query.toLowerCase().trim();
    const { Items, LastEvaluatedKey } = await awsClient_1.docClient.send(new lib_dynamodb_1.QueryCommand({
        TableName: awsClient_1.INVENTORY_TABLE,
        IndexName: 'GSI4',
        KeyConditionExpression: 'GSI4PK = :pk AND begins_with(GSI4SK, :query)',
        ExpressionAttributeValues: {
            ':pk': 'INVOICE_SEARCH',
            ':query': search_query
        },
        Limit: limit,
        ExclusiveStartKey: exclusiveStartKey
    }));
    return {
        items: Items || [],
        lastEvaluatedKey: encodeLEK(LastEvaluatedKey)
    };
};
exports.searchInvoices = searchInvoices;
const getAllInventoryItems = async (limit = 100, lastKey, filters) => {
    const exclusiveStartKey = decodeLEK(lastKey);
    const expressionAttributeValues = { ':pk': 'INVENTORY_ITEMS' };
    const expressionAttributeNames = { '#status': 'status' };
    const filterParts = [];
    if (filters) {
        if (filters.status && filters.status !== 'All') {
            if (filters.status === 'Draft') {
                filterParts.push('(#status = :status OR attribute_not_exists(#status))');
            }
            else {
                filterParts.push('#status = :status');
            }
            expressionAttributeValues[':status'] = filters.status;
        }
        if (filters.sku) {
            // Check both inventory_id and invoice_number for more flexible SKU matching
            filterParts.push('(contains(inventory_id, :sku) OR contains(invoice_number, :sku))');
            expressionAttributeValues[':sku'] = filters.sku;
        }
        if (filters.name) {
            filterParts.push('contains(product_name, :name)');
            expressionAttributeValues[':name'] = filters.name;
        }
        if (filters.location) {
            filterParts.push('contains(vendor_name, :location)');
            expressionAttributeValues[':location'] = filters.location;
        }
        if (filters.startDate && filters.endDate) {
            filterParts.push('created_at BETWEEN :start AND :end');
            expressionAttributeValues[':start'] = Number(filters.startDate);
            expressionAttributeValues[':end'] = Number(filters.endDate);
        }
        if (filters.condition) {
            if (filters.condition === 'Critical')
                filterParts.push('quantity <= :crit');
            else if (filters.condition === 'Low')
                filterParts.push('quantity > :crit AND quantity <= :low');
            else if (filters.condition === 'Healthy')
                filterParts.push('quantity > :low');
            expressionAttributeValues[':crit'] = 5;
            expressionAttributeValues[':low'] = 20;
        }
    }
    const queryInput = {
        TableName: awsClient_1.INVENTORY_TABLE,
        IndexName: 'GSI3',
        KeyConditionExpression: 'GSI3PK = :pk',
        ExpressionAttributeValues: expressionAttributeValues,
        Limit: limit,
        ScanIndexForward: false,
        ExclusiveStartKey: exclusiveStartKey
    };
    if (filterParts.length > 0) {
        queryInput.FilterExpression = filterParts.join(' AND ');
        queryInput.ExpressionAttributeNames = expressionAttributeNames;
    }
    const { Items, LastEvaluatedKey } = await awsClient_1.docClient.send(new lib_dynamodb_1.QueryCommand(queryInput));
    return {
        items: Items || [],
        lastEvaluatedKey: encodeLEK(LastEvaluatedKey)
    };
};
exports.getAllInventoryItems = getAllInventoryItems;
const getItemById = async (invoice_number, item_id) => {
    const { Item } = await awsClient_1.docClient.send(new lib_dynamodb_1.GetCommand({
        TableName: awsClient_1.INVENTORY_TABLE,
        Key: {
            PK: `INVOICE#${invoice_number}`,
            SK: `ITEM#${item_id}`
        }
    }));
    return Item;
};
exports.getItemById = getItemById;
const updateInvoiceStatus = async (invoiceNumber, status) => {
    const now = Date.now();
    await awsClient_1.docClient.send(new lib_dynamodb_1.TransactWriteCommand({
        TransactItems: [
            {
                Update: {
                    TableName: awsClient_1.INVENTORY_TABLE,
                    Key: { PK: `INVOICE#${invoiceNumber}`, SK: 'SUMMARY' },
                    UpdateExpression: 'SET #status = :status, updated_at = :now',
                    ExpressionAttributeNames: { '#status': 'status' },
                    ExpressionAttributeValues: {
                        ':status': status,
                        ':now': now
                    }
                }
            }
        ]
    }));
    return { success: true, invoiceNumber, status };
};
exports.updateInvoiceStatus = updateInvoiceStatus;
const updateInventoryItemStatus = async (invoiceNumber, inventoryId, status) => {
    const now = Date.now();
    await awsClient_1.docClient.send(new lib_dynamodb_1.TransactWriteCommand({
        TransactItems: [
            {
                Update: {
                    TableName: awsClient_1.INVENTORY_TABLE,
                    Key: { PK: `INVOICE#${invoiceNumber}`, SK: `ITEM#${inventoryId}` },
                    UpdateExpression: 'SET #status = :status, updated_at = :now',
                    ExpressionAttributeNames: { '#status': 'status' },
                    ExpressionAttributeValues: {
                        ':status': status,
                        ':now': now
                    }
                }
            }
        ]
    }));
    return { success: true, invoiceNumber, inventoryId, status };
};
exports.updateInventoryItemStatus = updateInventoryItemStatus;
const bulkUpdateInventoryItemStatus = async (updates) => {
    const now = Date.now();
    const chunkSize = 25;
    const results = [];
    console.log('[DEBUG] Starting bulk update for items:', updates.length);
    for (let i = 0; i < updates.length; i += chunkSize) {
        const chunk = updates.slice(i, i + chunkSize);
        const transactItems = chunk.map((u) => {
            const pk = `INVOICE#${u.invoiceNumber}`;
            const sk = `ITEM#${u.inventoryId}`;
            console.log(`[DEBUG] Updating PK: ${pk}, SK: ${sk} to status: ${u.status}`);
            return {
                Update: {
                    TableName: awsClient_1.INVENTORY_TABLE,
                    Key: { PK: pk, SK: sk },
                    UpdateExpression: 'SET #status = :status, updated_at = :now',
                    ExpressionAttributeNames: { '#status': 'status' },
                    ExpressionAttributeValues: {
                        ':status': u.status,
                        ':now': now
                    }
                }
            };
        });
        try {
            await awsClient_1.docClient.send(new lib_dynamodb_1.TransactWriteCommand({ TransactItems: transactItems }));
            results.push(...chunk);
        }
        catch (error) {
            console.error('[ERROR] Bulk Update Transaction failed:', error.message);
            throw error;
        }
    }
    return { success: true, updatedCount: results.length };
};
exports.bulkUpdateInventoryItemStatus = bulkUpdateInventoryItemStatus;
