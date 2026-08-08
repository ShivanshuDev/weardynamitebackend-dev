"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createInventoryInvoice = exports.getInventoryReport = exports.getProductHistory = exports.listInvoices = exports.getInvoice = exports.addInventory = void 0;
const awsClient_1 = require("../../utils/awsClient");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const uuid_1 = require("uuid");
const addInventory = async (data) => {
    // ✅ Normalize payload
    const invoice_number = data.invoiceNumber;
    const invoice_date = data.invoiceDate;
    const vendor_name = data.vendorName;
    const user_info = data.addedBy || 'system';
    const now = Date.now();
    const dateStr = invoice_date || new Date().toISOString().split('T')[0];
    if (!data.items || data.items.length === 0) {
        throw new Error('Items are required');
    }
    // ✅ Transform items
    const items = data.items.flatMap((item) => {
        return item.variants.map((v) => ({
            product_id: item.productId || (0, uuid_1.v4)(),
            product_name: item.productName,
            category: item.category,
            sub_category: item.subCategory,
            fabric: item.fabric,
            size: v.size,
            color: v.colors?.[0],
            quantity: v.quantity,
            cost_price: item.price
        }));
    });
    const transactItems = [];
    let totalQuantity = 0;
    let totalAmount = 0;
    for (const item of items) {
        const inventoryId = (0, uuid_1.v4)();
        const qty = Number(item.quantity);
        const price = Number(item.cost_price);
        const total = qty * price;
        totalQuantity += qty;
        totalAmount += total;
        // ✅ INVENTORY
        transactItems.push({
            Put: {
                TableName: awsClient_1.INVENTORY_TABLE,
                Item: {
                    PK: `INVOICE#${invoice_number}`,
                    SK: `ITEM#${inventoryId}`,
                    GSI1PK: 'INVOICE',
                    GSI1SK: `${dateStr}#${invoice_number}`,
                    GSI2PK: `PRODUCT#${item.product_id}`,
                    GSI2SK: `${dateStr}#${inventoryId}`,
                    GSI3PK: 'INVENTORY',
                    GSI3SK: `${dateStr}#${inventoryId}`,
                    entity_type: 'INVENTORY',
                    inventory_id: inventoryId,
                    invoice_number,
                    invoice_date: dateStr,
                    vendor_name,
                    product_id: item.product_id,
                    product_name: item.product_name,
                    category: item.category,
                    sub_category: item.sub_category,
                    color: item.color,
                    size: item.size,
                    fabric: item.fabric,
                    quantity: qty,
                    cost_price: price,
                    total_cost: total,
                    created_at: now,
                    created_by: user_info
                }
            }
        });
        // ✅ PRODUCT UPDATE
        transactItems.push({
            Update: {
                TableName: awsClient_1.INVENTORY_TABLE,
                Key: {
                    PK: `PRODUCT#${item.product_id}`,
                    SK: 'METADATA'
                },
                UpdateExpression: `
          SET 
            product_name = if_not_exists(product_name, :name),
            category = if_not_exists(category, :cat),
            updated_at = :now,
            current_stock = if_not_exists(current_stock, :zero) + :qty
        `,
                ExpressionAttributeValues: {
                    ':name': item.product_name || 'Unknown',
                    ':cat': item.category || 'General',
                    ':qty': qty,
                    ':zero': 0,
                    ':now': now
                }
            }
        });
    }
    // ✅ INVOICE SUMMARY
    transactItems.push({
        Update: {
            TableName: awsClient_1.INVENTORY_TABLE,
            Key: {
                PK: `INVOICE#${invoice_number}`,
                SK: 'SUMMARY'
            },
            UpdateExpression: `
        SET 
          invoice_number = :inv,
          invoice_date = :date,
          vendor_name = :vendor,
          updated_at = :now,
          GSI1PK = :gsi1pk,
          GSI1SK = :gsi1sk
        ADD 
          total_items_count :count,
          total_quantity :qty,
          total_amount :amt
      `,
            ExpressionAttributeValues: {
                ':inv': invoice_number,
                ':date': dateStr,
                ':vendor': vendor_name || 'Unknown',
                ':now': now,
                ':count': items.length,
                ':qty': totalQuantity,
                ':amt': totalAmount,
                ':gsi1pk': 'INVOICE',
                ':gsi1sk': `${dateStr}#${invoice_number}`
            }
        }
    });
    await awsClient_1.docClient.send(new lib_dynamodb_1.TransactWriteCommand({ TransactItems: transactItems }));
    return { message: 'Inventory added', invoice_number };
};
exports.addInventory = addInventory;
/**
 * GET INVOICE
 */
const getInvoice = async (invoice_number) => {
    const { Items } = await awsClient_1.docClient.send(new lib_dynamodb_1.QueryCommand({
        TableName: awsClient_1.INVENTORY_TABLE,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: {
            ':pk': `INVOICE#${invoice_number}`
        }
    }));
    return {
        summary: Items?.find(i => i.SK === 'SUMMARY'),
        items: Items?.filter(i => i.SK.startsWith('ITEM#'))
    };
};
exports.getInvoice = getInvoice;
/**
 * LIST INVOICES
 */
const listInvoices = async () => {
    const { Items } = await awsClient_1.docClient.send(new lib_dynamodb_1.QueryCommand({
        TableName: awsClient_1.INVENTORY_TABLE,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        ExpressionAttributeValues: {
            ':pk': 'INVOICE'
        }
    }));
    return Items;
};
exports.listInvoices = listInvoices;
/**
 * PRODUCT HISTORY
 */
const getProductHistory = async (product_id) => {
    const { Items } = await awsClient_1.docClient.send(new lib_dynamodb_1.QueryCommand({
        TableName: awsClient_1.INVENTORY_TABLE,
        IndexName: 'GSI2',
        KeyConditionExpression: 'GSI2PK = :pk',
        ExpressionAttributeValues: {
            ':pk': `PRODUCT#${product_id}`
        }
    }));
    return Items;
};
exports.getProductHistory = getProductHistory;
const getInventoryReport = async () => {
    const { Items } = await awsClient_1.docClient.send(new lib_dynamodb_1.QueryCommand({
        TableName: awsClient_1.INVENTORY_TABLE,
        IndexName: 'GSI4',
        KeyConditionExpression: 'GSI4PK = :pk',
        ExpressionAttributeValues: {
            ':pk': 'PRODUCT'
        }
    }));
    const products = Items || [];
    let totalProducts = products.length;
    let totalStock = 0;
    const records = products.map((p) => {
        const stock = Number(p.current_stock || 0);
        totalStock += stock;
        return {
            product_id: p.product_id,
            product_name: p.product_name,
            category: p.category,
            stock
        };
    });
    return {
        summary: {
            totalProducts,
            totalStock
        },
        records
    };
};
exports.getInventoryReport = getInventoryReport;
exports.createInventoryInvoice = exports.addInventory;
