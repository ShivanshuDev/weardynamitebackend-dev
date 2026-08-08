"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bulkUpdateProductStatus = exports.patchProductStatus = exports.deleteProduct = exports.updateProduct = exports.getBestSellers = exports.getNewArrivals = exports.searchProducts = exports.listProducts = exports.getProduct = exports.createProduct = void 0;
const awsClient_1 = require("../../utils/awsClient");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const uuid_1 = require("uuid");
const user_service_1 = require("../user/user.service");
const redisClient_1 = require("../../utils/redisClient");
/**
 * CREATE PRODUCT
 */
const createProduct = async (data) => {
    const productId = data.product_id || (0, uuid_1.v4)();
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
        const value = data[field] || data[field.replace(/_([a-z])/g, (g) => g[1].toUpperCase())];
        if (!value && value !== 0) {
            throw new Error(`Missing mandatory field: ${field}`);
        }
    }
    // ✅ Image Minimum Requirement
    if (!data.images || data.images.length < 3) {
        throw new Error('Institutional requirement: Minimum 3 images required for product catalog.');
    }
    const product = {
        PK: `PRODUCT#${productId}`,
        SK: 'METADATA',
        GSI1PK: `CAT#${category}`,
        GSI1SK: `STATUS#${status}`,
        GSI2PK: `SKU#${sku}`,
        GSI2SK: `ID#${productId}`,
        GSI4PK: 'PRODUCT',
        GSI4SK: data.product_name || data.name || `PRODUCT#${productId}`,
        entity_type: 'PRODUCT',
        product_id: productId,
        product_name: data.product_name || data.name,
        brand: data.brand || 'Wear Dynamite',
        category: category,
        subCategory: data.subCategory || data.sub_category,
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
        primaryColor: data.primaryColor || data.color,
        primarySize: data.primarySize || data.size,
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
        isShippingApplicable: !!data.isShippingApplicable,
        shippingCost: Number(data.shippingCost) || 0,
        created_at: now,
        created_by: data.user_info || 'system',
        updated_at: now,
        updated_by: data.user_info || 'system'
    };
    await awsClient_1.docClient.send(new lib_dynamodb_1.PutCommand({
        TableName: awsClient_1.INVENTORY_TABLE,
        Item: product,
        ConditionExpression: 'attribute_not_exists(PK)'
    }));
    // Invalidate list caches
    await redisClient_1.cache.delPattern('products:*');
    // Broadcast notification if active
    if (status === 'Active') {
        (0, user_service_1.adminListUsers)().then(users => {
            NotificationService.broadcastNewProduct(product, users);
        }).catch(console.error);
    }
    return product;
};
exports.createProduct = createProduct;
/**
 * GET SINGLE PRODUCT
 */
const getProduct = async (productId) => {
    const cacheKey = `product:${productId}`;
    const cached = await redisClient_1.cache.get(cacheKey);
    if (cached)
        return cached;
    const { Item } = await awsClient_1.docClient.send(new lib_dynamodb_1.GetCommand({
        TableName: awsClient_1.INVENTORY_TABLE,
        Key: {
            PK: `PRODUCT#${productId}`,
            SK: 'METADATA'
        }
    }));
    if (Item) {
        await redisClient_1.cache.set(cacheKey, Item, 900); // Cache for 15 mins
    }
    return Item;
};
exports.getProduct = getProduct;
/**
 * LIST ALL PRODUCTS (USING GSI4)
 */
const listProducts = async (filters = {}) => {
    const { page = 1, limit = 10, status, category, subCategory } = filters;
    let queryParams = {
        TableName: awsClient_1.INVENTORY_TABLE,
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
    }
    else {
        // Fallback: Use Global Search Partition (GSI4)
        queryParams.IndexName = 'GSI4';
        queryParams.KeyConditionExpression = 'GSI4PK = :pk';
        queryParams.ExpressionAttributeValues = { ':pk': 'PRODUCT' };
        const filters_arr = [];
        const names = {};
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
    const cacheKey = `products:list:${JSON.stringify(filters)}`;
    const cached = await redisClient_1.cache.get(cacheKey);
    if (cached)
        return cached;
    const { Items } = await awsClient_1.docClient.send(new lib_dynamodb_1.QueryCommand(queryParams));
    const products = Items || [];
    const start = (page - 1) * limit;
    const result = {
        items: products.slice(start, start + limit),
        total: products.length,
        page,
        limit,
        totalPages: Math.ceil(products.length / limit)
    };
    await redisClient_1.cache.set(cacheKey, result, 300); // Cache for 5 mins
    return result;
};
exports.listProducts = listProducts;
/**
 * SEARCH PRODUCTS
 */
const searchProducts = async (query) => {
    const { Items } = await awsClient_1.docClient.send(new lib_dynamodb_1.QueryCommand({
        TableName: awsClient_1.INVENTORY_TABLE,
        IndexName: 'GSI4',
        KeyConditionExpression: 'GSI4PK = :pk',
        FilterExpression: 'contains(product_name, :q) OR contains(sku, :q)',
        ExpressionAttributeValues: {
            ':pk': 'PRODUCT',
            ':q': query
        }
    }));
    return Items || [];
};
exports.searchProducts = searchProducts;
/**
 * GET NEW ARRIVALS
 */
const getNewArrivals = async () => {
    const cacheKey = 'products:news';
    const cached = await redisClient_1.cache.get(cacheKey);
    if (cached)
        return cached;
    // Fetch products explicitly flagged as Fresh Arrival
    const { Items } = await awsClient_1.docClient.send(new lib_dynamodb_1.QueryCommand({
        TableName: awsClient_1.INVENTORY_TABLE,
        IndexName: 'GSI4',
        KeyConditionExpression: 'GSI4PK = :pk',
        FilterExpression: '#status = :status AND #fresh = :fresh',
        ExpressionAttributeNames: { '#status': 'status', '#fresh': 'isFreshArrival' },
        ExpressionAttributeValues: { ':pk': 'PRODUCT', ':status': 'Active', ':fresh': true },
        Limit: 20
    }));
    const result = Items || [];
    await redisClient_1.cache.set(cacheKey, result, 600); // Cache for 10 mins
    return result;
};
exports.getNewArrivals = getNewArrivals;
/**
 * GET BEST SELLERS
 */
const getBestSellers = async () => {
    const cacheKey = 'products:bestsellers';
    const cached = await redisClient_1.cache.get(cacheKey);
    if (cached)
        return cached;
    // Fetch products explicitly flagged as Most Popular
    const { Items } = await awsClient_1.docClient.send(new lib_dynamodb_1.QueryCommand({
        TableName: awsClient_1.INVENTORY_TABLE,
        IndexName: 'GSI4',
        KeyConditionExpression: 'GSI4PK = :pk',
        FilterExpression: '#status = :status AND #popular = :popular',
        ExpressionAttributeNames: { '#status': 'status', '#popular': 'isMostPopular' },
        ExpressionAttributeValues: { ':pk': 'PRODUCT', ':status': 'Active', ':popular': true },
        Limit: 20
    }));
    const result = Items || [];
    await redisClient_1.cache.set(cacheKey, result, 600); // Cache for 10 mins
    return result;
};
exports.getBestSellers = getBestSellers;
/**
 * UPDATE PRODUCT
 */
const updateProduct = async (productId, updates) => {
    const now = Date.now();
    // Load existing to ensure GSI consistency if parent fields change
    const existing = await (0, exports.getProduct)(productId);
    if (!existing)
        return null;
    // ✅ Validation: Prevent removing mandatory fields during update
    const requiredFields = [
        'product_name', 'brand', 'category', 'subCategory', 'gender',
        'description', 'mrp', 'salePrice', 'sku', 'barcode'
    ];
    for (const field of requiredFields) {
        if (updates.hasOwnProperty(field) || updates.hasOwnProperty(field.replace(/_([a-z])/g, (g) => g[1].toUpperCase()))) {
            const val = updates[field] ?? updates[field.replace(/_([a-z])/g, (g) => g[1].toUpperCase())];
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
        'isShippingApplicable',
        'shippingCost',
        'aboutThisItem'
    ];
    const keys = Object.keys(updates).filter(k => allowedFields.includes(k));
    let updateExpression = 'SET ';
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};
    keys.forEach((key, i) => {
        updateExpression += `#f${i} = :v${i}, `;
        expressionAttributeNames[`#f${i}`] = key;
        expressionAttributeValues[`:v${i}`] = updates[key];
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
    const { Attributes } = await awsClient_1.docClient.send(new lib_dynamodb_1.UpdateCommand({
        TableName: awsClient_1.INVENTORY_TABLE,
        Key: {
            PK: `PRODUCT#${productId}`,
            SK: 'METADATA'
        },
        UpdateExpression: updateExpression,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW'
    }));
    // Invalidate cache
    await redisClient_1.cache.del(`product:${productId}`);
    await redisClient_1.cache.delPattern('products:*');
    return Attributes;
};
exports.updateProduct = updateProduct;
/**
 * DELETE PRODUCT (HARD DELETE)
 */
const deleteProduct = async (productId) => {
    await awsClient_1.docClient.send(new lib_dynamodb_1.DeleteCommand({
        TableName: awsClient_1.INVENTORY_TABLE,
        Key: {
            PK: `PRODUCT#${productId}`,
            SK: 'METADATA'
        }
    }));
    // Invalidate cache
    await redisClient_1.cache.del(`product:${productId}`);
    await redisClient_1.cache.delPattern('products:*');
    return { success: true };
};
exports.deleteProduct = deleteProduct;
/**
 * PATCH SINGLE PRODUCT STATUS
 */
const patchProductStatus = async (productId, status) => {
    return await (0, exports.updateProduct)(productId, { status });
};
exports.patchProductStatus = patchProductStatus;
/**
 * BULK UPDATE PRODUCT STATUS
 */
const bulkUpdateProductStatus = async (productIds, status) => {
    // DynamoDB TransactWriteItems or BatchWrite is complex for GSI updates via UpdateCommand.
    // Given the 50-item cap, parallel UpdateCommands are reliable and maintain transaction-like consistency for GSI fields.
    const updates = productIds.map(id => (0, exports.patchProductStatus)(id, status));
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
            error: r.status === 'rejected' ? r.reason.message : undefined
        }))
    };
};
exports.bulkUpdateProductStatus = bulkUpdateProductStatus;
