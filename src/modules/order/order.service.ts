import { docClient, MAIN_TABLE } from '../../utils/awsClient';
import { GetCommand, PutCommand, QueryCommand, DeleteCommand, UpdateCommand, TransactWriteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { addTransaction } from '../ledger/ledger.service';

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
    ownerId: userId,
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
  // Batch delete items in memory
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
    await docClient.send(new PutCommand({ TableName: MAIN_TABLE, Item: { PK: `USER#${userId}`, SK: `FAVORITE#${productId}`, productId, ownerId: userId } }));
    return { favorited: true };
  }
};

// ─── Orders ──────────────────────────────────────────────────────────────────

export const placeOrder = async (userId: string, orderData: { addressId: string; paymentMethod: string; items: any[]; couponCode?: string }) => {
  const { addressId, paymentMethod, items, couponCode } = orderData;
  if (!items?.length) throw new Error('No items in order');

  const orderId = uuidv4();
  const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;
  const now = Date.now();

  let subtotal = 0;
  let discountTotal = 0;
  let taxTotal = 0;

  // 1. Group items
  const groupedItems = items.reduce((acc: any, item: any) => {
    if (!acc[item.productId]) acc[item.productId] = [];
    acc[item.productId].push(item);
    return acc;
  }, {});

  const itemsWithPrice: any[] = [];
  const transactItems: any[] = [];

  for (const productId of Object.keys(groupedItems)) {
    // UPDATED: Products now use SK: 'METADATA'
    const { Item: product } = await docClient.send(new GetCommand({ 
      TableName: MAIN_TABLE, 
      Key: { PK: `PRODUCT#${productId}`, SK: 'METADATA' } 
    }));
    
    if (!product) throw new Error(`Product ${productId} not found`);

    const productItems = groupedItems[productId];
    const basePrice = Number(product.price || product.salePrice || 0);
    const totalQty = productItems.reduce((s: number, i: any) => s + i.quantity, 0);

    // Check availability
    if ((product.availableForSale || 0) < totalQty) {
      throw new Error(`Insufficient stock for ${product.name}. Available: ${product.availableForSale}`);
    }

    subtotal += basePrice * totalQty;
    
    productItems.forEach((item: any) => {
      itemsWithPrice.push({ ...item, price: basePrice });
    });

    // Atomic Reservation: Decrement only Available Stock
    transactItems.push({
      Update: {
        TableName: MAIN_TABLE,
        Key: { PK: `PRODUCT#${productId}`, SK: 'METADATA' },
        UpdateExpression: 'SET availableForSale = availableForSale - :qty, updatedAt = :now',
        ExpressionAttributeValues: { 
          ':qty': totalQty, 
          ':now': now 
        },
        ConditionExpression: 'availableForSale >= :qty'
      }
    });
  }

  // Final totals
  if (couponCode) discountTotal += (subtotal - discountTotal) * 0.15;
  
  const { Items: userOrders } = await docClient.send(new QueryCommand({
    TableName: MAIN_TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: { ':pk': `USER#${userId}`, ':sk': 'ORDER#' }
  }));
  
  if (!userOrders || userOrders.length === 0) discountTotal += (subtotal - discountTotal) * 0.10;

  const shipping = subtotal > 5000 ? 0 : 150;
  const totalAmount = Math.round((subtotal - discountTotal + shipping + taxTotal) * 100) / 100;

  // Add Order creation to transaction
  transactItems.push({
    Put: {
      TableName: MAIN_TABLE,
      Item: {
        PK: `USER#${userId}`,
        SK: `ORDER#${now}#${orderId}`, // Allows chronological sorting automatically
        GSI1PK: 'ORDER',
        GSI1SK: `DATE#${now}`,
        GSI2PK: 'STATUS#Pending',
        GSI2SK: `DATE#${now}`,
        orderId,
        orderNumber,
        userId,
        addressId,
        paymentMethod,
        status: 'Pending',
        items: itemsWithPrice,
        totalAmount,
        couponCode,
        createdAt: now
      }
    }
  });

  // Execute native AWS DynamoDB Transaction
  await docClient.send(new TransactWriteCommand({ TransactItems: transactItems }));

  // Auto-record to Ledger asynchronously 
  addTransaction({
    description: `Order Revenue (New): ${orderNumber}`,
    type: 'Credit',
    amount: totalAmount,
    referenceId: orderId,
    date: now
  });

  return { orderId, orderNumber, totalAmount, status: 'Pending' };
};

export const getUserOrders = async (userId: string) => {
  const { Items } = await docClient.send(new QueryCommand({
    TableName: MAIN_TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: { ':pk': `USER#${userId}`, ':sk': 'ORDER#' },
    ScanIndexForward: false // Newest first
  }));
  return Items || [];
};

export const getUserOrder = async (userId: string, orderId: string) => {
  // Extract timestamp from items array because we don't know the exact SK directly
  // Better approach: query begins_with ORDER# and filter by orderId
  const { Items } = await docClient.send(new QueryCommand({
    TableName: MAIN_TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: { ':pk': `USER#${userId}`, ':sk': 'ORDER#' }
  }));
  const item = (Items || []).find(i => i.orderId === orderId);
  if (!item) throw new Error('Order not found');
  return item;
};

// ─── Admin Orders ─────────────────────────────────────────────────────────────

export const adminListOrders = async (filters: { status?: string; date?: string; customerId?: string; search?: string }) => {
  let orders: any[] = [];
  
  if (filters.status) {
    // Zero-scan lookup using GSI2 for status queues
    const { Items } = await docClient.send(new QueryCommand({
      TableName: MAIN_TABLE,
      IndexName: 'GSI2',
      KeyConditionExpression: 'GSI2PK = :pk',
      ExpressionAttributeValues: { ':pk': `STATUS#${filters.status}` },
      ScanIndexForward: false
    }));
    orders = Items || [];
  } else {
    // List all orders via GSI1
    const { Items } = await docClient.send(new QueryCommand({
      TableName: MAIN_TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: { ':pk': 'ORDER' },
      ScanIndexForward: false
    }));
    orders = Items || [];
  }
  
  return orders;
};

export const getOrderDetail = async (orderId: string) => {
  // Using GSI1 to quickly find the exact order without scanning the whole table
  const { Items } = await docClient.send(new QueryCommand({
    TableName: MAIN_TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk',
    FilterExpression: 'orderId = :oid',
    ExpressionAttributeValues: { ':pk': 'ORDER', ':oid': orderId }
  }));
  if (!Items || Items.length === 0) throw new Error('Order not found');
  
  const order = Items[0];
  
  return { ...order };
};

export const updateOrderStatus = async (orderId: string, status: string) => {
  const order = await getOrderDetail(orderId);
  
  await docClient.send(new UpdateCommand({
    TableName: MAIN_TABLE,
    Key: { PK: order.PK, SK: order.SK },
    UpdateExpression: 'SET #st = :status, GSI2PK = :gsi',
    ExpressionAttributeNames: { '#st': 'status' },
    ExpressionAttributeValues: { ':status': status, ':gsi': `STATUS#${status}` }
  }));

  if (status === 'Shipped' || status === 'Delivered') {
    // Physical Stock Reduction logic
    const orderItems = order.items || [];
    for (const item of orderItems) {
      await docClient.send(new UpdateCommand({
        TableName: MAIN_TABLE,
        Key: { PK: `PRODUCT#${item.productId}`, SK: 'METADATA' },
        UpdateExpression: 'SET totalPhysicalStock = totalPhysicalStock - :qty, updatedAt = :now',
        ExpressionAttributeValues: { 
          ':qty': item.quantity, 
          ':now': Date.now() 
        }
      }));
    }

    if (status === 'Delivered') {
      addTransaction({
        description: `Order Revenue: ${order.orderNumber || orderId}`,
        type: 'Credit',
        amount: order.totalAmount || 0,
        referenceId: orderId,
        date: Date.now()
      });
    }
  }

  return { message: 'Order Status Updated', status };
};

export const updateOrderTracking = async (orderId: string, trackingNumber: string, courier: string) => {
  const order = await getOrderDetail(orderId);
  await docClient.send(new UpdateCommand({
    TableName: MAIN_TABLE,
    Key: { PK: order.PK, SK: order.SK },
    UpdateExpression: 'SET trackingNumber = :tn, courier = :cr, #st = :status, GSI2PK = :gsi',
    ExpressionAttributeNames: { '#st': 'status' },
    ExpressionAttributeValues: { ':tn': trackingNumber, ':cr': courier, ':status': 'Shipped', ':gsi': 'STATUS#Shipped' }
  }));
  return { message: 'Order Tracking Updated' };
};
