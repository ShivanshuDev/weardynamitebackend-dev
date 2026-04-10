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
  brand?: string;
  category: string;
  subCategory?: string;
  gender?: string;
  description?: string;
  mrp?: number;
  salePrice?: number;
  purchasePrice?: number;
  taxPercent?: number;
  isTaxable?: boolean;
  discountPercentage?: number;
  promotionType?: string;
  discountCoupon?: string;
  sku?: string;
  barcode?: string;
  stock?: number;
  lowStockAlert?: number;
  primaryColor?: string;
  primarySize?: string;
  fit?: string;
  neckType?: string;
  occasion?: string;
  images?: string[];
  variants?: any[];
  keywords?: string[];
  seoTitle?: string;
  seoDescription?: string;
  urlHandle?: string;
  isReturnable: boolean;
  returnDays: number;
  codAvailable: boolean;
  codCouponApplicable: boolean;
  specs?: any[];
  aboutThisItem?: string[];
  
  // Legacy or Internal mapping
  current_stock: number;
  available_stock: number;
  status: 'Draft' | 'Active' | 'Inactive' | 'Under Review' | 'Sold' | 'Return';
  inventory_link?: string; // ID of the source inventory item
  image?: string;
  isFreshArrival?: boolean;
  isMostPopular?: boolean;
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
  const status = data.status || 'Draft';
  const category = data.category || 'Uncategorized';
  const sku = data.sku || `SKU-${productId.substring(0, 8)}`;

  // ✅ Strict Validation: Ensure all mandatory fields are present
  const requiredFields = [
    'product_name', 'brand', 'category', 'subCategory', 'gender', 
    'description', 'mrp', 'salePrice', 'sku', 'barcode'
  ];
  
  for (const field of requiredFields) {
    const value = (data as any)[field] || (data as any)[field.replace(/_([a-z])/g, (g) => g[1].toUpperCase())];
    if (!value && value !== 0) {
      throw new Error(`Missing mandatory field: ${field}`);
    }
  }

  // ✅ Image Minimum Requirement
  if (!data.images || data.images.length < 3) {
    throw new Error('Institutional requirement: Minimum 3 images required for product catalog.');
  }

  const product: any = {
    PK: `PRODUCT#${productId}`,
    SK: 'METADATA',

    GSI1PK: `CAT#${category}`,
    GSI1SK: `STATUS#${status}`,
    GSI2PK: `SKU#${sku}`,
    GSI2SK: `ID#${productId}`,
    GSI4PK: 'PRODUCT',
    GSI4SK: data.product_name || (data as any).name || `PRODUCT#${productId}`,

    entity_type: 'PRODUCT',

    product_id: productId,
    product_name: data.product_name || (data as any).name,
    brand: data.brand || 'Wear Dynamite',
    category: category,
    subCategory: data.subCategory || (data as any).sub_category,
    gender: data.gender,
    description: data.description,
    mrp: Number(data.mrp) || 0,
    salePrice: Number(data.salePrice) || 0,
    purchasePrice: Number(data.purchasePrice) || 0,
    taxPercent: Number(data.taxPercent) || 0,
    isTaxable: !!data.isTaxable,
    discountPercentage: Number(data.discountPercentage) || 0,
    promotionType: data.promotionType,
    discountCoupon: data.discountCoupon,
    sku: sku,
    barcode: data.barcode,
    image: data.image || data.images?.[0],
    images: data.images || [],
    
    stock: Number(data.stock) || Number(data.current_stock) || 0,
    current_stock: Number(data.current_stock) || Number(data.stock) || 0,
    available_stock: Number(data.available_stock) || Number(data.stock) || 0,
    lowStockAlert: Number(data.lowStockAlert) || 10,
    
    primaryColor: data.primaryColor || (data as any).color,
    primarySize: data.primarySize || (data as any).size,
    fit: data.fit,
    neckType: data.neckType,
    occasion: data.occasion,
    
    variants: data.variants || [],
    keywords: data.keywords || [],
    seoTitle: data.seoTitle,
    seoDescription: data.seoDescription,
    urlHandle: data.urlHandle,
    specs: data.specs || [],
    aboutThisItem: data.aboutThisItem || [],

    inventory_link: data.inventory_link,
    status: status,

    isReturnable: data.isReturnable ?? true,
    returnDays: Number(data.returnDays) || 7,
    codAvailable: data.codAvailable ?? false,
    codCouponApplicable: data.codCouponApplicable ?? false,

    isFreshArrival: !!data.isFreshArrival,
    isMostPopular: !!data.isMostPopular,

    created_at: now,
    created_by: data.user_info || 'system',
    updated_at: now,
    updated_by: data.user_info || 'system'
  };

  await docClient.send(
    new PutCommand({
      TableName: INVENTORY_TABLE,
      Item: product,
      ConditionExpression: 'attribute_not_exists(PK)'
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
  const { page = 1, limit = 10, status, category, subCategory } = filters;

  let queryParams: any = {
    TableName: INVENTORY_TABLE,
  };

  if (category) {
    // High-Efficiency: Use Category Partition (GSI1)
    queryParams.IndexName = 'GSI1';
    queryParams.KeyConditionExpression = 'GSI1PK = :cat';
    queryParams.ExpressionAttributeValues = { ':cat': `CAT#${category}` };
    
    if (status) {
      queryParams.KeyConditionExpression += ' AND GSI1SK = :stat';
      queryParams.ExpressionAttributeValues[':stat'] = `STATUS#${status}`;
    }
    
    if (subCategory) {
      queryParams.FilterExpression = '#subCategory = :sub';
      queryParams.ExpressionAttributeNames = { '#subCategory': 'subCategory' };
      queryParams.ExpressionAttributeValues[':sub'] = subCategory;
    }
  } else {
    // Fallback: Use Global Search Partition (GSI4)
    queryParams.IndexName = 'GSI4';
    queryParams.KeyConditionExpression = 'GSI4PK = :pk';
    queryParams.ExpressionAttributeValues = { ':pk': 'PRODUCT' };
    
    const filters_arr = [];
    const names: any = {};
    const values = queryParams.ExpressionAttributeValues;

    if (status) {
      filters_arr.push('#st = :st');
      names['#st'] = 'status';
      values[':st'] = status;
    }
    if (subCategory) {
      filters_arr.push('#sub = :sub');
      names['#sub'] = 'subCategory';
      values[':sub'] = subCategory;
    }

    if (filters_arr.length > 0) {
      queryParams.FilterExpression = filters_arr.join(' AND ');
      queryParams.ExpressionAttributeNames = names;
    }
  }

  const { Items } = await docClient.send(new QueryCommand(queryParams));

  const products = Items || [];
  const start = (page - 1) * limit;

  return {
    items: products.slice(start, start + limit),
    total: products.length,
    page,
    limit,
    totalPages: Math.ceil(products.length / limit)
  };
};

/**
 * SEARCH PRODUCTS
 */
export const searchProducts = async (query: string) => {
  const { Items } = await docClient.send(
    new QueryCommand({
      TableName: INVENTORY_TABLE,
      IndexName: 'GSI4',
      KeyConditionExpression: 'GSI4PK = :pk',
      FilterExpression: 'contains(product_name, :q) OR contains(sku, :q)',
      ExpressionAttributeValues: {
        ':pk': 'PRODUCT',
        ':q': query
      }
    })
  );
  return Items || [];
};

/**
 * GET NEW ARRIVALS
 */
export const getNewArrivals = async () => {
  // Fetch products explicitly flagged as Fresh Arrival
  const { Items } = await docClient.send(
    new QueryCommand({
      TableName: INVENTORY_TABLE,
      IndexName: 'GSI4',
      KeyConditionExpression: 'GSI4PK = :pk',
      FilterExpression: '#status = :status AND #fresh = :fresh',
      ExpressionAttributeNames: { '#status': 'status', '#fresh': 'isFreshArrival' },
      ExpressionAttributeValues: { ':pk': 'PRODUCT', ':status': 'Active', ':fresh': true },
      Limit: 20
    })
  );
  return Items || [];
};

/**
 * GET BEST SELLERS
 */
export const getBestSellers = async () => {
  // Fetch products explicitly flagged as Most Popular
  const { Items } = await docClient.send(
    new QueryCommand({
      TableName: INVENTORY_TABLE,
      IndexName: 'GSI4',
      KeyConditionExpression: 'GSI4PK = :pk',
      FilterExpression: '#status = :status AND #popular = :popular',
      ExpressionAttributeNames: { '#status': 'status', '#popular': 'isMostPopular' },
      ExpressionAttributeValues: { ':pk': 'PRODUCT', ':status': 'Active', ':popular': true },
      Limit: 20
    })
  );
  return Items || [];
};

/**
 * UPDATE PRODUCT
 */
export const updateProduct = async (
  productId: string,
  updates: Partial<Product> & { user_info?: string }
) => {
  const now = Date.now();

  // Load existing to ensure GSI consistency if parent fields change
  const existing = await getProduct(productId);
  if (!existing) return null;

  // ✅ Validation: Prevent removing mandatory fields during update
  const requiredFields = [
    'product_name', 'brand', 'category', 'subCategory', 'gender', 
    'description', 'mrp', 'salePrice', 'sku', 'barcode'
  ];

  for (const field of requiredFields) {
    if (updates.hasOwnProperty(field) || updates.hasOwnProperty(field.replace(/_([a-z])/g, (g) => g[1].toUpperCase()))) {
      const val = (updates as any)[field] ?? (updates as any)[field.replace(/_([a-z])/g, (g) => g[1].toUpperCase())];
      if (!val && val !== 0) {
        throw new Error(`Cannot clear mandatory field: ${field}`);
      }
    }
  }

  // ✅ Image Minimum Requirement (if images are being updated)
  if (updates.images && updates.images.length < 3) {
    throw new Error('Institutional requirement: Minimum 3 images required even for updates.');
  }

  const allowedFields = [
    'product_name',
    'brand',
    'category',
    'subCategory',
    'gender',
    'description',
    'mrp',
    'salePrice',
    'purchasePrice',
    'taxPercent',
    'isTaxable',
    'discountPercentage',
    'promotionType',
    'discountCoupon',
    'sku',
    'barcode',
    'status',
    'stock',
    'lowStockAlert',
    'primaryColor',
    'primarySize',
    'fit',
    'neckType',
    'occasion',
    'images',
    'variants',
    'keywords',
    'seoTitle',
    'seoDescription',
    'urlHandle',
    'specs',
    'current_stock',
    'available_stock',
    'inventory_link',
    'image',
    'isReturnable',
    'returnDays',
    'codAvailable',
    'codCouponApplicable',
    'isFreshArrival',
    'isMostPopular',
    'aboutThisItem'
  ];

  const keys = Object.keys(updates).filter(k =>
    allowedFields.includes(k)
  );

  let updateExpression = 'SET ';
  const expressionAttributeNames: any = {};
  const expressionAttributeValues: any = {};

  keys.forEach((key, i) => {
    updateExpression += `#f${i} = :v${i}, `;
    expressionAttributeNames[`#f${i}`] = key;
    expressionAttributeValues[`:v${i}`] = (updates as any)[key];
  });

  // Handle GSI Updates if dependent fields change
  let gsiIdx = keys.length;
  if (updates.category || updates.status) {
    const cat = updates.category || existing.category;
    const stat = updates.status || existing.status;
    updateExpression += `GSI1PK = :gp1, GSI1SK = :gs1, `;
    expressionAttributeValues[':gp1'] = `CAT#${cat}`;
    expressionAttributeValues[':gs1'] = `STATUS#${stat}`;
  }
  if (updates.sku) {
    updateExpression += `GSI2PK = :gp2, `;
    expressionAttributeValues[':gp2'] = `SKU#${updates.sku}`;
  }
  if (updates.product_name) {
    updateExpression += `GSI4SK = :gs4, `;
    expressionAttributeValues[':gs4'] = updates.product_name;
  }

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
 * DELETE PRODUCT (HARD DELETE)
 */
export const deleteProduct = async (productId: string) => {
  await docClient.send(
    new DeleteCommand({
      TableName: INVENTORY_TABLE,
      Key: {
        PK: `PRODUCT#${productId}`,
        SK: 'METADATA'
      }
    })
  );

  return { success: true };
};

/**
 * PATCH SINGLE PRODUCT STATUS
 */
export const patchProductStatus = async (productId: string, status: Product['status']) => {
  return await updateProduct(productId, { status });
};

/**
 * BULK UPDATE PRODUCT STATUS
 */
export const bulkUpdateProductStatus = async (productIds: string[], status: Product['status']) => {
  // DynamoDB TransactWriteItems or BatchWrite is complex for GSI updates via UpdateCommand.
  // Given the 50-item cap, parallel UpdateCommands are reliable and maintain transaction-like consistency for GSI fields.
  const updates = productIds.map(id => patchProductStatus(id, status));
  const results = await Promise.allSettled(updates);

  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  return {
    total: productIds.length,
    successful,
    failed,
    results: results.map((r, i) => ({
      id: productIds[i],
      status: r.status,
      error: r.status === 'rejected' ? (r as PromiseRejectedResult).reason.message : undefined
    }))
  };
};