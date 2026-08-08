"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateOrderTracking = exports.updateOrderStatus = exports.adminListOrders = exports.getUserOrder = exports.getOrderDetail = exports.getUserOrders = exports.placeOrder = exports.toggleFavorite = exports.getFavorites = exports.clearCart = exports.removeCartItem = exports.updateCartItem = exports.addToCart = exports.getCart = void 0;
const awsClient_1 = require("../../utils/awsClient");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const uuid_1 = require("uuid");
const ledger_service_1 = require("../ledger/ledger.service");
const notificationService_1 = require("../../utils/notificationService");
const user_service_1 = require("../user/user.service");
const promotionEngine_1 = require("../../utils/promotionEngine");
const redisClient_1 = require("../../utils/redisClient");
// ─── Cart ────────────────────────────────────────────────────────────────────
const getCart = async (userId) => {
    const { Items } = await awsClient_1.docClient.send(new lib_dynamodb_1.QueryCommand({
        TableName: awsClient_1.MAIN_TABLE,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: { ':pk': `USER#${userId}`, ':sk': 'CART#' }
    }));
    return Items || [];
};
exports.getCart = getCart;
const addToCart = async (userId, item) => {
    const itemKey = `${item.productId}-${item.color}-${item.size}`;
    const cartItem = {
        PK: `USER#${userId}`,
        SK: `CART#${itemKey}`,
        ...item,
        owner_id: userId,
    };
    await awsClient_1.docClient.send(new lib_dynamodb_1.PutCommand({ TableName: awsClient_1.MAIN_TABLE, Item: cartItem }));
    return cartItem;
};
exports.addToCart = addToCart;
const updateCartItem = async (userId, itemId, quantity) => {
    const { Attributes } = await awsClient_1.docClient.send(new lib_dynamodb_1.UpdateCommand({
        TableName: awsClient_1.MAIN_TABLE,
        Key: { PK: `USER#${userId}`, SK: `CART#${itemId}` },
        UpdateExpression: 'SET quantity = :q',
        ExpressionAttributeValues: { ':q': quantity },
        ReturnValues: 'ALL_NEW'
    }));
    return Attributes;
};
exports.updateCartItem = updateCartItem;
const removeCartItem = async (userId, itemId) => {
    await awsClient_1.docClient.send(new lib_dynamodb_1.DeleteCommand({
        TableName: awsClient_1.MAIN_TABLE,
        Key: { PK: `USER#${userId}`, SK: `CART#${itemId}` }
    }));
    return { message: 'Item removed from cart' };
};
exports.removeCartItem = removeCartItem;
const clearCart = async (userId) => {
    const items = await (0, exports.getCart)(userId);
    for (const i of items) {
        await awsClient_1.docClient.send(new lib_dynamodb_1.DeleteCommand({ TableName: awsClient_1.MAIN_TABLE, Key: { PK: i.PK, SK: i.SK } }));
    }
    return { message: 'Cart cleared' };
};
exports.clearCart = clearCart;
// ─── Favorites ───────────────────────────────────────────────────────────────
const getFavorites = async (userId) => {
    const { Items } = await awsClient_1.docClient.send(new lib_dynamodb_1.QueryCommand({
        TableName: awsClient_1.MAIN_TABLE,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: { ':pk': `USER#${userId}`, ':sk': 'FAVORITE#' }
    }));
    return Items || [];
};
exports.getFavorites = getFavorites;
const toggleFavorite = async (userId, productId) => {
    const { Item } = await awsClient_1.docClient.send(new lib_dynamodb_1.GetCommand({
        TableName: awsClient_1.MAIN_TABLE,
        Key: { PK: `USER#${userId}`, SK: `FAVORITE#${productId}` }
    }));
    if (Item) {
        await awsClient_1.docClient.send(new lib_dynamodb_1.DeleteCommand({ TableName: awsClient_1.MAIN_TABLE, Key: { PK: `USER#${userId}`, SK: `FAVORITE#${productId}` } }));
        return { favorited: false };
    }
    else {
        await awsClient_1.docClient.send(new lib_dynamodb_1.PutCommand({ TableName: awsClient_1.MAIN_TABLE, Item: { PK: `USER#${userId}`, SK: `FAVORITE#${productId}`, product_id: productId, owner_id: userId } }));
        return { favorited: true };
    }
};
exports.toggleFavorite = toggleFavorite;
// ─── Orders (Summary + Items Pattern) ────────────────────────────────────────
/**
 * Places an order using the highly efficient Summary + Items pattern.
 * Uses TransactWrite to ensure stock reservation and order creation are atomic.
 */
const placeOrder = async (userId, data) => {
    const { items, address_id: addressId, payment_method: paymentMethod, coupon_code: couponCode, customer_details, shipping_address } = data;
    if (!items?.length)
        throw new Error('No items in order');
    // 0. Rate Limit Check: 4 orders in 60 minutes
    const oneHourAgo = Date.now() - 3600000;
    const { Items: recentOrders } = await awsClient_1.docClient.send(new lib_dynamodb_1.QueryCommand({
        TableName: awsClient_1.MAIN_TABLE,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK >= :sk',
        ExpressionAttributeValues: {
            ':pk': `USER#${userId}`,
            ':sk': `${oneHourAgo}#`
        }
    }));
    if (recentOrders && recentOrders.length >= 4) {
        throw new Error('try after some reached limit to order max item in one hour');
    }
    const orderId = `WDT${Math.floor(10000000 + Math.random() * 90000000)}`;
    const orderNumber = orderId; // Using the WDT ID as the official order number
    const now = Date.now();
    let subtotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;
    const transactItems = [];
    const processedItems = [];
    // 1. Process Items & Reserve Stock
    for (const item of items) {
        const { Item: product } = await awsClient_1.docClient.send(new lib_dynamodb_1.GetCommand({
            TableName: awsClient_1.MAIN_TABLE,
            Key: { PK: `PRODUCT#${item.productId}`, SK: 'METADATA' }
        }));
        // Temporarily attach product metadata to the item for the promo calculation step
        item.__productMetadata = product;
        if (!product)
            throw new Error(`Product ${item.productId} not found`);
        // --- VARIANT SPECIFIC STOCK CHECK ---
        const variant = product.variants?.find((v) => v.color === item.color);
        if (!variant)
            throw new Error(`Color ${item.color} not found for ${product.product_name || 'Product'}`);
        const sizeEntry = variant.sizes?.find((s) => s.size === item.size);
        if (!sizeEntry)
            throw new Error(`Size ${item.size} not found for ${item.color} ${product.product_name || 'Product'}`);
        const variantStock = Number(sizeEntry.stock || 0);
        if (variantStock < item.quantity) {
            throw new Error(`Insufficient stock for ${product.product_name} (${item.color}/${item.size}). Available: ${variantStock}`);
        }
        const basePrice = Number(product.salePrice || product.price || 0);
        const lineTotal = basePrice * item.quantity;
        subtotal += lineTotal;
        const itemRecordId = (0, uuid_1.v4)();
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
            isReturnable: product.isReturnable !== undefined ? product.isReturnable : true,
            returnDays: product.returnDays || 7,
            created_at: now
        };
        processedItems.push(itemRecord);
        // Order Item record
        transactItems.push({
            Put: {
                TableName: awsClient_1.MAIN_TABLE,
                Item: itemRecord
            }
        });
        // --- ATOMIC UPDATES: Update specific variant stock AND global stock ---
        // Calculate new variants array locally to find correct indices for DynamoDB Update
        const variantIndex = product.variants.findIndex((v) => v.color === item.color);
        const sizeIndex = variant.sizes.findIndex((s) => s.size === item.size);
        transactItems.push({
            Update: {
                TableName: awsClient_1.MAIN_TABLE,
                Key: { PK: `PRODUCT#${item.productId}`, SK: 'METADATA' },
                // Use list_append and specific path to decrement only that size's stock
                UpdateExpression: `SET variants[${variantIndex}].sizes[${sizeIndex}].stock = variants[${variantIndex}].sizes[${sizeIndex}].stock - :qty, 
                           available_stock = available_stock - :qty, 
                           current_stock = current_stock - :qty,
                           #stk = #stk - :qty,
                           updatedAt = :now`,
                ExpressionAttributeNames: {
                    '#stk': 'stock'
                },
                ExpressionAttributeValues: {
                    ':qty': item.quantity,
                    ':now': now
                },
                ConditionExpression: `variants[${variantIndex}].sizes[${sizeIndex}].stock >= :qty`
            }
        });
    }
    // 2. Calculate Totals via PromotionEngine
    const promoItems = items.map(item => {
        // Find the ACTUAL product metadata we fetched earlier
        const product = item.__productMetadata;
        return {
            productId: item.productId,
            price: item.price,
            quantity: item.quantity,
            taxonomy: product?.taxonomy,
            promotionType: product?.promotionType,
            isTaxable: product?.isTaxable,
            taxPercent: product?.taxPercent,
            isShippingApplicable: product?.isShippingApplicable,
            shippingCost: product?.shippingCost
        };
    });
    const { Items: userOrders } = await awsClient_1.docClient.send(new lib_dynamodb_1.QueryCommand({
        TableName: awsClient_1.MAIN_TABLE,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        ExpressionAttributeValues: { ':pk': `USER#${userId}` },
        Limit: 1
    }));
    const isFirstTimeUser = !userOrders || userOrders.length === 0;
    const promoSummary = promotionEngine_1.PromotionEngine.calculate(promoItems, {
        couponCode,
        isFirstTimeUser
    });
    const shipping = promoSummary.shippingTotal;
    const totalAmount = promoSummary.total; // PromotionEngine already added shippingTotal to total
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
        subtotal: promoSummary.subtotal,
        discount_total: promoSummary.discountTotal,
        tax_total: promoSummary.taxTotal,
        cgst: promoSummary.cgst,
        sgst: promoSummary.sgst,
        tax_percent: promoSummary.taxPercent,
        applied_promos: promoSummary.appliedPromos,
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
            TableName: awsClient_1.MAIN_TABLE,
            Item: orderSummary
        }
    });
    // 4. Finalize Transaction
    await awsClient_1.docClient.send(new lib_dynamodb_1.TransactWriteCommand({ TransactItems: transactItems }));
    // Real-time Cache Invalidation for affected products
    try {
        const cachePats = ['products:*'];
        for (const item of items) {
            cachePats.push(`product:${item.productId}`);
        }
        await Promise.all([
            redisClient_1.cache.delPattern('products:*'),
            ...items.map(item => redisClient_1.cache.del(`product:${item.productId}`))
        ]);
    }
    catch (err) {
        console.warn('[CACHE ERROR] Failed to invalidate product cache after order:', err);
    }
    // High-Performance Event: Atomic Dashboard increment
    await (0, ledger_service_1.updateDashboardStats)({ orders: 1, revenue: totalAmount });
    // Auto-record to Ledger asynchronously 
    (0, ledger_service_1.addTransaction)({
        description: `Order Revenue: #${orderNumber} (${customer_details?.name || 'Guest'})`,
        type: 'Credit',
        category: 'Revenue',
        amount: totalAmount,
        referenceId: `ORD-${orderId}`,
        date: now
    });
    // Fire background notifications
    const user = await (0, user_service_1.getProfile)(userId);
    notificationService_1.NotificationService.sendOrderConfirmed(orderSummary, processedItems, user).catch(console.error);
    return { order_id: orderId, order_number: orderNumber, total_amount: totalAmount, status: 'Pending' };
};
exports.placeOrder = placeOrder;
/**
 * Efficiently fetches all orders for a specific user using GSI1.
 */
const getUserOrders = async (userId) => {
    const { Items } = await awsClient_1.docClient.send(new lib_dynamodb_1.QueryCommand({
        TableName: awsClient_1.MAIN_TABLE,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        ExpressionAttributeValues: { ':pk': `USER#${userId}` },
        ScanIndexForward: false // Newest first
    }));
    return Items || [];
};
exports.getUserOrders = getUserOrders;
/**
 * Fetches a single order's summary and its items.
 */
const getOrderDetail = async (orderId) => {
    const { Items } = await awsClient_1.docClient.send(new lib_dynamodb_1.QueryCommand({
        TableName: awsClient_1.MAIN_TABLE,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: { ':pk': `ORDER#${orderId}` }
    }));
    if (!Items || Items.length === 0)
        throw new Error('Order not found');
    const summary = Items.find(i => i.SK === 'SUMMARY');
    const items = Items.filter(i => i.SK.startsWith('ITEM#'));
    return { ...summary, items };
};
exports.getOrderDetail = getOrderDetail;
/**
 * Backward compatibility or internal detail fetch.
 */
const getUserOrder = async (userId, orderId) => {
    return (0, exports.getOrderDetail)(orderId);
};
exports.getUserOrder = getUserOrder;
// ─── Admin Orders ─────────────────────────────────────────────────────────────
/**
 * Lists orders globally or by status using GSIs.
 */
const adminListOrders = async (filters) => {
    let orders = [];
    if (filters.status) {
        const { Items } = await awsClient_1.docClient.send(new lib_dynamodb_1.QueryCommand({
            TableName: awsClient_1.MAIN_TABLE,
            IndexName: 'GSI2',
            KeyConditionExpression: 'GSI2PK = :pk',
            ExpressionAttributeValues: { ':pk': `STATUS#${filters.status}` },
            ScanIndexForward: false
        }));
        orders = Items || [];
    }
    else {
        const { Items } = await awsClient_1.docClient.send(new lib_dynamodb_1.QueryCommand({
            TableName: awsClient_1.MAIN_TABLE,
            IndexName: 'GSI3',
            KeyConditionExpression: 'GSI3PK = :pk',
            ExpressionAttributeValues: { ':pk': 'ALL_ORDERS' },
            ScanIndexForward: false
        }));
        orders = Items || [];
    }
    return orders;
};
exports.adminListOrders = adminListOrders;
/**
 * Updates order status and handles inventory/financial impacts.
 */
const updateOrderStatus = async (orderId, status) => {
    const order = await (0, exports.getOrderDetail)(orderId);
    const now = Date.now();
    await awsClient_1.docClient.send(new lib_dynamodb_1.UpdateCommand({
        TableName: awsClient_1.MAIN_TABLE,
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
            await awsClient_1.docClient.send(new lib_dynamodb_1.UpdateCommand({
                TableName: awsClient_1.MAIN_TABLE,
                Key: { PK: `PRODUCT#${item.product_id}`, SK: 'METADATA' },
                UpdateExpression: 'SET totalPhysicalStock = totalPhysicalStock - :qty, updatedAt = :now',
                ExpressionAttributeValues: {
                    ':qty': item.quantity,
                    ':now': now
                }
            }));
        }
        if (status === 'Delivered') {
            (0, ledger_service_1.addTransaction)({
                description: `Order Revenue: ${order.order_number || orderId}`,
                type: 'Credit',
                amount: order.total_amount || 0,
                referenceId: orderId,
                date: now
            });
        }
    }
    // Notify user of status change
    const user = await (0, user_service_1.getProfile)(order.user_id);
    notificationService_1.NotificationService.sendOrderStatusUpdate(order, status, user).catch(console.error);
    return { message: 'Order Status Updated', status };
};
exports.updateOrderStatus = updateOrderStatus;
/**
 * Attaches tracking info and moves order to Shipped status.
 */
const updateOrderTracking = async (orderId, trackingNumber, courier) => {
    const now = Date.now();
    await awsClient_1.docClient.send(new lib_dynamodb_1.UpdateCommand({
        TableName: awsClient_1.MAIN_TABLE,
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
    // Notify user of tracking update
    const order = await (0, exports.getOrderDetail)(orderId);
    const user = await (0, user_service_1.getProfile)(order.user_id);
    notificationService_1.NotificationService.sendOrderStatusUpdate(order, 'Shipped', user).catch(console.error);
    return { message: 'Order Tracking Updated' };
};
exports.updateOrderTracking = updateOrderTracking;
