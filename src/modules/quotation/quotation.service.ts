import { docClient, MAIN_TABLE } from '../../utils/awsClient';
import { PutCommand, QueryCommand, GetCommand, UpdateCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { cache } from '../../utils/redisClient';

export interface QuotationItem {
  productId?: string;
  productName: string;
  sku?: string;
  size?: string;
  color?: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  taxPercent?: number;
  total: number;
  customizationDetails?: {
    type?: string;
    location?: string;
    logoUrl?: string;
    notes?: string;
  };
}

export interface Quotation {
  quotationId: string;
  inquiryId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  companyName?: string;
  billingAddress: any;
  shippingAddress: any;
  status: 'Draft' | 'Sent' | 'Approved' | 'Rejected' | 'Expired' | 'Converted';
  isEmailed?: boolean;
  items: QuotationItem[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  shippingCharges: number;
  grandTotal: number;
  paymentTerms?: string;
  deliveryTimeline?: string;
  termsConditions?: string;
  adminNotes?: string;
  expiryDate: number;
  revisionNumber: number;
  createdAt: number;
  updatedAt: number;
  createdBy?: string;
}

export const createQuotation = async (data: Partial<Quotation> & { user_info?: string }) => {
  const quotationId = `QT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const now = Date.now();
  const status = data.status || 'Draft';
  const customerEmail = data.customerEmail?.toLowerCase() || '';

  const quotation: any = {
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

  await docClient.send(new PutCommand({
    TableName: MAIN_TABLE,
    Item: quotation
  }));

  await cache.delPattern('quotations:list:*');
  return quotation;
};

export const getQuotation = async (quotationId: string) => {
  const cacheKey = `quotation:${quotationId}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached as any;

  const { Item } = await docClient.send(new GetCommand({
    TableName: MAIN_TABLE,
    Key: {
      PK: `QUOTATION#${quotationId}`,
      SK: 'METADATA'
    }
  }));

  if (!Item) {
    throw new Error(`Quotation ${quotationId} not found`);
  }

  await cache.set(cacheKey, Item, 900);
  return Item;
};

export const listQuotations = async (query: { status?: string; email?: string; lastKey?: any; limit?: number }) => {
  const cacheKey = `quotations:list:${JSON.stringify(query)}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached as any;

  const limit = query.limit ? Number(query.limit) : 20;
  let KeyConditionExpression = '';
  let ExpressionAttributeValues: any = {};
  let IndexName = 'GSI1';

  if (query.status) {
    IndexName = 'GSI3';
    KeyConditionExpression = 'GSI3PK = :pk';
    ExpressionAttributeValues = { ':pk': `QUOTATION#STATUS#${query.status}` };
  } else if (query.email) {
    IndexName = 'GSI2';
    KeyConditionExpression = 'GSI2PK = :pk';
    ExpressionAttributeValues = { ':pk': `CUSTOMER_EMAIL#${query.email.toLowerCase()}` };
  } else {
    KeyConditionExpression = 'GSI1PK = :pk';
    ExpressionAttributeValues = { ':pk': 'QUOTATION' };
  }

  const { Items, LastEvaluatedKey } = await docClient.send(new QueryCommand({
    TableName: MAIN_TABLE,
    IndexName,
    KeyConditionExpression,
    ExpressionAttributeValues,
    ScanIndexForward: false,
    Limit: limit,
    ExclusiveStartKey: query.lastKey
  }));

  const result = {
    items: Items || [],
    lastKey: LastEvaluatedKey
  };
  await cache.set(cacheKey, result, 300);
  return result;
};

export const updateQuotation = async (quotationId: string, data: Partial<Quotation>) => {
  const existing = await getQuotation(quotationId);
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

  await docClient.send(new PutCommand({
    TableName: MAIN_TABLE,
    Item: updatedItem
  }));

  await cache.del(`quotation:${quotationId}`);
  await cache.delPattern('quotations:list:*');
  return updatedItem;
};

export const updateQuotationStatus = async (quotationId: string, status: string) => {
  const existing = await getQuotation(quotationId);
  const now = Date.now();

  const { Attributes } = await docClient.send(new UpdateCommand({
    TableName: MAIN_TABLE,
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

  await cache.del(`quotation:${quotationId}`);
  await cache.delPattern('quotations:list:*');
  return Attributes;
};

export const convertToOrder = async (quotationId: string) => {
  const quotation = await getQuotation(quotationId);
  if (quotation.status !== 'Approved') {
    throw new Error('Only approved quotations can be converted to an order');
  }

  const orderId = `WDT${Math.floor(10000000 + Math.random() * 90000000)}`;
  const now = Date.now();

  const transactItems: any[] = [];
  const processedItems: any[] = [];

  // Generate order item records
  for (const item of quotation.items) {
    const itemRecordId = uuidv4();
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
        TableName: MAIN_TABLE,
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
      TableName: MAIN_TABLE,
      Item: orderSummary
    }
  });

  // Mark quotation as Converted
  transactItems.push({
    Update: {
      TableName: MAIN_TABLE,
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

  await docClient.send(new TransactWriteCommand({
    TransactItems: transactItems
  }));

  await cache.del(`quotation:${quotationId}`);
  await cache.delPattern('quotations:list:*');
  return { orderId, orderNumber: orderId };
};
