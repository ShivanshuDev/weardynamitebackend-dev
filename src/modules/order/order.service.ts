import { docClient, MAIN_TABLE } from '../../utils/awsClient';
import { GetCommand, PutCommand, QueryCommand, DeleteCommand, UpdateCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { addTransaction, updateDashboardStats } from '../ledger/ledger.service';

// ─── Cart ────────────────────────────────────────────────────────────────────

export const getCart = async (userId: string) => {
  const { Items } = await docClient.send(new QueryCommand({
    TableName: MAIN_TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: { ':pk': `USER#${userId}`, ':sk': 'CART#' }
  }));
  return Items || [];
};

export const addToCart = async (userId: string, item: { productId: string; color: string; size: string; quantity: number; forWhom?: string }) => {
  const itemKey = `${item.productId}-${item.color}-${item.size}`;
  const cartItem = {
    PK: `USER#${userId}`,
    SK: `CART#${itemKey}`,
    ...item,
    owner_id: userId,
  };
  await docClient.send(new PutCommand({ TableName: MAIN_TABLE, Item: cartItem }));
  return cartItem;
};

export const updateCartItem = async (userId: string, itemId: string, quantity: number) => {
  const { Attributes } = await docClient.send(new UpdateCommand({
    TableName: MAIN_TABLE,
    Key: { PK: `USER#${userId}`, SK: `CART#${itemId}` },
    UpdateExpression: 'SET quantity = :q',
    ExpressionAttributeValues: { ':q': quantity },
    ReturnValues: 'ALL_NEW'
  }));
  return Attributes;
};

export const removeCartItem = async (userId: string, itemId: string) => {
  await docClient.send(new DeleteCommand({
    TableName: MAIN_TABLE,
    Key: { PK: `USER#${userId}`, SK: `CART#${itemId}` }
  }));
  return { message: 'Item removed from cart' };
};

export const clearCart = async (userId: string) => {
  const items = await getCart(userId);
  for (const i of items) {
    await docClient.send(new DeleteCommand({ TableName: MAIN_TABLE, Key: { PK: i.PK, SK: i.SK } }));
  }
  return { message: 'Cart cleared' };
};

// ─── Favorites ───────────────────────────────────────────────────────────────

export const getFavorites = async (userId: string) => {
  const { Items } = await docClient.send(new QueryCommand({
    TableName: MAIN_TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: { ':pk': `USER#${userId}`, ':sk': 'FAVORITE#' }
  }));
  return Items || [];
};

export const toggleFavorite = async (userId: string, productId: string) => {
  const { Item } = await docClient.send(new GetCommand({
    TableName: MAIN_TABLE,
    Key: { PK: `USER#${userId}`, SK: `FAVORITE#${productId}` }
  }));
  
  if (Item) {
    await docClient.send(new DeleteCommand({ TableName: MAIN_TABLE, Key: { PK: `USER#${userId}`, SK: `FAVORITE#${productId}` }}));
    return { favorited: false };
  } else {
    await docClient.send(new PutCommand({ TableName: MAIN_TABLE, Item: { PK: `USER#${userId}`, SK: `FAVORITE#${productId}`, product_id: productId, owner_id: userId } }));
    return { favorited: true };
  }
};

// ─── Orders (Summary + Items Pattern) ────────────────────────────────────────

/**
 * Places an order using the highly efficient Summary + Items pattern.
 * Uses TransactWrite to ensure stock reservation and order creation are atomic.
 */
export const placeOrder = async (userId: string, data: { address_id: string; payment_method: string; items: any[]; coupon_code?: string; customer_details: any; shipping_address: any }) => {
  const { items, address_id: addressId, payment_method: paymentMethod, coupon_code: couponCode, customer_details, shipping_address } = data;
  if (!items?.length) throw new Error('No items in order');

  const orderId = uuidv4();
  const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;
  const now = Date.now();

  let subtotal = 0;
  let discountTotal = 0;
  let taxTotal = 0;

  const transactItems: any[] = [];
  const processedItems: any[] = [];

    // 1. Process Items & Reserve Stock
  for (const item of items) {
    const { Item: product } = await docClient.send(new GetCommand({ 
      TableName: MAIN_TABLE, 
      Key: { PK: `PRODUCT#${item.productId}`, SK: 'METADATA' } 
    }));
    
    if (!product) throw new Error(`Product ${item.productId} not found`);

    // --- VARIANT SPECIFIC STOCK CHECK ---
    const variant = product.variants?.find((v: any) => v.color === item.color);
    if (!variant) throw new Error(`Color ${item.color} not found for ${product.product_name || 'Product'}`);

    const sizeEntry = variant.sizes?.find((s: any) => s.size === item.size);
    if (!sizeEntry) throw new Error(`Size ${item.size} not found for ${item.color} ${product.product_name || 'Product'}`);

    const variantStock = Number(sizeEntry.stock || 0);
    if (variantStock < item.quantity) {
      throw new Error(`Insufficient stock for ${product.product_name} (${item.color}/${item.size}). Available: ${variantStock}`);
    }

    const basePrice = Number(product.salePrice || product.price || 0);
    const lineTotal = basePrice * item.quantity;
    subtotal += lineTotal;

    const itemRecordId = uuidv4();
    const itemRecord = {
      PK: `ORDER#${orderId}`,
      SK: `ITEM#${itemRecordId}`,
      order_id: orderId,
      product_id: item.productId,
      product_name: product.product_name || item.name,
      price: basePrice,
      quantity: item.quantity,
      total_price: lineTotal,
      color: item.color,
      size: item.size,
      for_whom: item.forWhom,
      image: Array.isArray(product.images) ? product.images[0] : (product.image || ''),
      created_at: now
    };

    processedItems.push(itemRecord);

    // Order Item record
    transactItems.push({
      Put: {
        TableName: MAIN_TABLE,
        Item: itemRecord
      }
    });

    // --- ATOMIC UPDATES: Update specific variant stock AND global stock ---
    // Calculate new variants array locally to find correct indices for DynamoDB Update
    const variantIndex = product.variants.findIndex((v: any) => v.color === item.color);
    const sizeIndex = variant.sizes.findIndex((s: any) => s.size === item.size);

    transactItems.push({
      Update: {
        TableName: MAIN_TABLE,
        Key: { PK: `PRODUCT#${item.productId}`, SK: 'METADATA' },
        // Use list_append and specific path to decrement only that size's stock
        UpdateExpression: `SET variants[${variantIndex}].sizes[${sizeIndex}].stock = variants[${variantIndex}].sizes[${sizeIndex}].stock - :qty, 
                           available_stock = available_stock - :qty, 
                           updatedAt = :now`,
        ExpressionAttributeValues: { 
          ':qty': item.quantity, 
          ':now': now 
        },
        ConditionExpression: `variants[${variantIndex}].sizes[${sizeIndex}].stock >= :qty`
      }
    });
  }

  // 2. Calculate Totals
  if (couponCode) discountTotal += (subtotal - discountTotal) * 0.15; // Placeholder coupon logic
  
  // First-time user discount check
  const { Items: userOrders } = await docClient.send(new QueryCommand({
    TableName: MAIN_TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk',
    ExpressionAttributeValues: { ':pk': `USER#${userId}` },
    Limit: 1
  }));
  
  if (!userOrders || userOrders.length === 0) {
    discountTotal += (subtotal - discountTotal) * 0.10;
  }

  const shipping = subtotal > 5000 ? 0 : 150;
  taxTotal = Math.round((subtotal - discountTotal) * 0.18 * 100) / 100; // 18% GST
  const totalAmount = Math.round((subtotal - discountTotal + shipping + taxTotal) * 100) / 100;

  // 3. Create Order Summary
  const orderSummary = {
    PK: `ORDER#${orderId}`,
    SK: `SUMMARY`,
    order_id: orderId,
    order_number: orderNumber,
    user_id: userId,
    address_id: addressId,
    payment_method: paymentMethod,
    status: 'Pending',
    payment_status: paymentMethod === 'COD' ? 'Pending' : 'Awaiting Payment',
    subtotal,
    discount_total: discountTotal,
    tax_total: taxTotal,
    shipping_total: shipping,
    total_amount: totalAmount,
    coupon_code: couponCode,
    item_count: items.length,
    created_at: now,
    updated_at: now,
    
    // Snapshots: We use these names to match existing Admin Panel expectations
    customer: customer_details,
    address: shipping_address,
    customer_name: customer_details?.name || 'Guest',
    customer_email: customer_details?.email,
    customer_phone: customer_details?.phone,

    // GSIs for ultra-efficient querying
    GSI1PK: `USER#${userId}`,
    GSI1SK: `${now}#${orderId}`,
    GSI2PK: `STATUS#Pending`,
    GSI2SK: `${now}#${orderId}`,
    GSI3PK: `ALL_ORDERS`,
    GSI3SK: `${now}#${orderId}`,
    thumbnail: processedItems[0]?.image || '',
    item_names: processedItems.map(i => i.product_name).join(', ')
  };

  transactItems.push({
    Put: {
      TableName: MAIN_TABLE,
      Item: orderSummary
    }
  });

  // 4. Finalize Transaction
  await docClient.send(new TransactWriteCommand({ TransactItems: transactItems }));
  
  // High-Performance Event: Atomic Dashboard increment
  await updateDashboardStats({ orders: 1, revenue: totalAmount });

  // Auto-record to Ledger asynchronously 
  addTransaction({
    description: `Order Revenue: #${orderNumber} (${customer_details?.name || 'Guest'})`,
    type: 'Credit',
    category: 'Revenue',
    amount: totalAmount,
    referenceId: `ORD-${orderId}`,
    date: now
  });

  return { order_id: orderId, order_number: orderNumber, total_amount: totalAmount, status: 'Pending' };
};

/**
 * Efficiently fetches all orders for a specific user using GSI1.
 */
export const getUserOrders = async (userId: string) => {
  const { Items } = await docClient.send(new QueryCommand({
    TableName: MAIN_TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk',
    ExpressionAttributeValues: { ':pk': `USER#${userId}` },
    ScanIndexForward: false // Newest first
  }));
  return Items || [];
};

/**
 * Fetches a single order's summary and its items.
 */
export const getOrderDetail = async (orderId: string) => {
  const { Items } = await docClient.send(new QueryCommand({
    TableName: MAIN_TABLE,
    KeyConditionExpression: 'PK = :pk',
    ExpressionAttributeValues: { ':pk': `ORDER#${orderId}` }
  }));

  if (!Items || Items.length === 0) throw new Error('Order not found');

  const summary = Items.find(i => i.SK === 'SUMMARY');
  const items = Items.filter(i => i.SK.startsWith('ITEM#'));

  return { ...summary, items };
};

/**
 * Backward compatibility or internal detail fetch.
 */
export const getUserOrder = async (userId: string, orderId: string) => {
  return getOrderDetail(orderId);
};

// ─── Admin Orders ─────────────────────────────────────────────────────────────

/**
 * Lists orders globally or by status using GSIs.
 */
export const adminListOrders = async (filters: { status?: string; search?: string }) => {
  let orders: any[] = [];
  
  if (filters.status) {
    const { Items } = await docClient.send(new QueryCommand({
      TableName: MAIN_TABLE,
      IndexName: 'GSI2',
      KeyConditionExpression: 'GSI2PK = :pk',
      ExpressionAttributeValues: { ':pk': `STATUS#${filters.status}` },
      ScanIndexForward: false
    }));
    orders = Items || [];
  } else {
    const { Items } = await docClient.send(new QueryCommand({
      TableName: MAIN_TABLE,
      IndexName: 'GSI3',
      KeyConditionExpression: 'GSI3PK = :pk',
      ExpressionAttributeValues: { ':pk': 'ALL_ORDERS' },
      ScanIndexForward: false
    }));
    orders = Items || [];
  }
  
  return orders;
};

/**
 * Updates order status and handles inventory/financial impacts.
 */
export const updateOrderStatus = async (orderId: string, status: string) => {
  const order: any = await getOrderDetail(orderId);
  const now = Date.now();
  
  await docClient.send(new UpdateCommand({
    TableName: MAIN_TABLE,
    Key: { PK: `ORDER#${orderId}`, SK: 'SUMMARY' },
    UpdateExpression: 'SET #st = :status, GSI2PK = :gsi, updated_at = :now',
    ExpressionAttributeNames: { '#st': 'status' },
    ExpressionAttributeValues: { 
      ':status': status, 
      ':gsi': `STATUS#${status}`,
      ':now': now
    }
  }));

  // Handle Inventory: Convert Reservation to Fulfillment
  if (status === 'Shipped' || status === 'Delivered') {
    const orderItems = order.items || [];
    for (const item of orderItems) {
      await docClient.send(new UpdateCommand({
        TableName: MAIN_TABLE,
        Key: { PK: `PRODUCT#${item.product_id}`, SK: 'METADATA' },
        UpdateExpression: 'SET totalPhysicalStock = totalPhysicalStock - :qty, updatedAt = :now',
        ExpressionAttributeValues: { 
          ':qty': item.quantity, 
          ':now': now 
        }
      }));
    }

    if (status === 'Delivered') {
      addTransaction({
        description: `Order Revenue: ${order.order_number || orderId}`,
        type: 'Credit',
        amount: order.total_amount || 0,
        referenceId: orderId,
        date: now
      });
    }
  }

  return { message: 'Order Status Updated', status };
};

/**
 * Attaches tracking info and moves order to Shipped status.
 */
export const updateOrderTracking = async (orderId: string, trackingNumber: string, courier: string) => {
  const now = Date.now();
  await docClient.send(new UpdateCommand({
    TableName: MAIN_TABLE,
    Key: { PK: `ORDER#${orderId}`, SK: 'SUMMARY' },
    UpdateExpression: 'SET tracking_number = :tn, courier = :cr, #st = :status, GSI2PK = :gsi, updated_at = :now',
    ExpressionAttributeNames: { '#st': 'status' },
    ExpressionAttributeValues: { 
      ':tn': trackingNumber, 
      ':cr': courier, 
      ':status': 'Shipped', 
      ':gsi': 'STATUS#Shipped',
      ':now': now
    }
  }));
  return { message: 'Order Tracking Updated' };
};
