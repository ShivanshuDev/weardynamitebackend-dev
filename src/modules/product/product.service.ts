import { docClient, INVENTORY_TABLE } from '../../utils/awsClient';
import {
  GetCommand,
  PutCommand,
  QueryCommand,
  DeleteCommand,
  UpdateCommand
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

export interface Product {
  product_id: string;
  product_name: string;
  category: string;
  sub_category: string;
  color: string;
  size: string;
  fabric: string;
  gsm: string;
  current_stock: number;
  reserved_stock: number;
  available_stock: number;
  status: 'draft' | 'active' | 'inactive' | 'under_review';
  created_at: number;
  created_by: string;
  updated_at: number;
  updated_by: string;
}

/**
 * CREATE PRODUCT
 */
export const createProduct = async (
  data: Partial<Product> & { user_info?: string }
) => {
  const productId = data.product_id || uuidv4();
  const now = Date.now();

  const product: any = {
    PK: `PRODUCT#${productId}`,
    SK: 'METADATA',

    // GSI4 → product listing
    GSI4PK: 'PRODUCT',
    GSI4SK: data.product_name || `PRODUCT#${productId}`,

    entity_type: 'PRODUCT',

    product_id: productId,
    product_name: data.product_name,
    category: data.category,
    sub_category: data.sub_category,
    color: data.color,
    size: data.size,
    fabric: data.fabric,
    gsm: data.gsm,

    current_stock: 0,
    reserved_stock: 0,
    available_stock: 0,

    status: data.status || 'draft',

    created_at: now,
    created_by: data.user_info || 'system',
    updated_at: now,
    updated_by: data.user_info || 'system'
  };

  await docClient.send(
    new PutCommand({
      TableName: INVENTORY_TABLE,
      Item: product,
      ConditionExpression: 'attribute_not_exists(PK)' // prevent overwrite
    })
  );

  return product;
};

/**
 * GET SINGLE PRODUCT
 */
export const getProduct = async (productId: string) => {
  const { Item } = await docClient.send(
    new GetCommand({
      TableName: INVENTORY_TABLE,
      Key: {
        PK: `PRODUCT#${productId}`,
        SK: 'METADATA'
      }
    })
  );

  return Item;
};

/**
 * LIST ALL PRODUCTS (USING GSI4)
 */
export const listProducts = async (filters: any = {}) => {
  const { page = 1, limit = 10 } = filters;

  const { Items } = await docClient.send(
    new QueryCommand({
      TableName: INVENTORY_TABLE,
      IndexName: 'GSI4',
      KeyConditionExpression: 'GSI4PK = :pk',
      ExpressionAttributeValues: {
        ':pk': 'PRODUCT'
      }
    })
  );

  const products = Items || [];

  const start = (page - 1) * limit;

  return {
    items: products.slice(start, start + limit),
    total: products.length
  };
};

/**
 * UPDATE PRODUCT
 */
export const updateProduct = async (
  productId: string,
  updates: Partial<Product> & { user_info?: string }
) => {
  const now = Date.now();

  const allowedFields = [
    'product_name',
    'category',
    'sub_category',
    'color',
    'size',
    'fabric',
    'gsm',
    'status'
  ];

  const keys = Object.keys(updates).filter(k =>
    allowedFields.includes(k)
  );

  if (keys.length === 0) return null;

  let updateExpression = 'SET ';
  const expressionAttributeNames: any = {};
  const expressionAttributeValues: any = {};

  keys.forEach((key, i) => {
    updateExpression += `#f${i} = :v${i}, `;
    expressionAttributeNames[`#f${i}`] = key;
    expressionAttributeValues[`:v${i}`] = (updates as any)[key];
  });

  // update audit fields
  updateExpression += 'updated_at = :now, updated_by = :user';

  expressionAttributeValues[':now'] = now;
  expressionAttributeValues[':user'] = updates.user_info || 'system';

  const { Attributes } = await docClient.send(
    new UpdateCommand({
      TableName: INVENTORY_TABLE,
      Key: {
        PK: `PRODUCT#${productId}`,
        SK: 'METADATA'
      },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    })
  );

  return Attributes;
};

/**
 * DELETE PRODUCT (SOFT DELETE RECOMMENDED)
 */
export const deleteProduct = async (productId: string) => {
  await docClient.send(
    new UpdateCommand({
      TableName: INVENTORY_TABLE,
      Key: {
        PK: `PRODUCT#${productId}`,
        SK: 'METADATA'
      },
      UpdateExpression: 'SET #status = :inactive',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':inactive': 'inactive'
      }
    })
  );

  return { success: true };
};