"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteReview = exports.updateReviewStatus = exports.addReview = exports.getReviewsByProduct = exports.listReviews = void 0;
const awsClient_1 = require("../../utils/awsClient");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const uuid_1 = require("uuid");
const order_service_1 = require("../order/order.service");
const listReviews = async () => {
    const { Items } = await awsClient_1.docClient.send(new lib_dynamodb_1.QueryCommand({
        TableName: awsClient_1.MAIN_TABLE,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        ExpressionAttributeValues: { ':pk': 'REVIEW' },
        ScanIndexForward: false
    }));
    return Items || [];
};
exports.listReviews = listReviews;
const getReviewsByProduct = async (productId) => {
    const { Items } = await awsClient_1.docClient.send(new lib_dynamodb_1.QueryCommand({
        TableName: awsClient_1.MAIN_TABLE,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: { ':pk': `PRODUCT#${productId}`, ':sk': 'REVIEW#' },
        ScanIndexForward: false
    }));
    return (Items || []).filter(r => r.status === 'Approved');
};
exports.getReviewsByProduct = getReviewsByProduct;
const addReview = async (userId, productId, orderId, data) => {
    // 1. Verify Delivered Order
    const order = await (0, order_service_1.getOrderDetail)(orderId);
    if (!order)
        throw new Error('Order not found');
    if (order.user_id !== userId)
        throw new Error('Unauthorized: Order does not belong to user');
    if (order.status !== 'Delivered')
        throw new Error('Reviews are only allowed after the item is Delivered');
    // 2. Verify Product is in Order
    const hasProduct = order.items?.some((i) => i.product_id === productId);
    if (!hasProduct)
        throw new Error('Product not found in this order');
    const id = (0, uuid_1.v4)();
    const record = {
        PK: `PRODUCT#${productId}`,
        SK: `REVIEW#${id}`,
        GSI1PK: 'REVIEW',
        GSI1SK: `DATE#${Date.now()}`,
        reviewId: id,
        userId,
        productId,
        orderId,
        ...data,
        status: 'Pending', // Pending admin approval
        createdAt: Date.now()
    };
    await awsClient_1.docClient.send(new lib_dynamodb_1.PutCommand({ TableName: awsClient_1.MAIN_TABLE, Item: record }));
    return record;
};
exports.addReview = addReview;
const updateReviewStatus = async (reviewId, status) => {
    // Since we don't know the exact productId to form the exact PK for a specific review quickly,
    // we fetch via GSI1 to locate the record first:
    const { Items } = await awsClient_1.docClient.send(new lib_dynamodb_1.QueryCommand({
        TableName: awsClient_1.MAIN_TABLE,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        FilterExpression: 'reviewId = :rid',
        ExpressionAttributeValues: { ':pk': 'REVIEW', ':rid': reviewId }
    }));
    const existing = (Items || [])[0];
    if (!existing)
        throw new Error('Review not found');
    const record = { ...existing, status };
    await awsClient_1.docClient.send(new lib_dynamodb_1.PutCommand({ TableName: awsClient_1.MAIN_TABLE, Item: record }));
    return record;
};
exports.updateReviewStatus = updateReviewStatus;
const deleteReview = async (reviewId) => {
    const { Items } = await awsClient_1.docClient.send(new lib_dynamodb_1.QueryCommand({
        TableName: awsClient_1.MAIN_TABLE,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        FilterExpression: 'reviewId = :rid',
        ExpressionAttributeValues: { ':pk': 'REVIEW', ':rid': reviewId }
    }));
    const existing = (Items || [])[0];
    if (!existing)
        throw new Error('Review not found');
    await awsClient_1.docClient.send(new lib_dynamodb_1.DeleteCommand({ TableName: awsClient_1.MAIN_TABLE, Key: { PK: existing.PK, SK: existing.SK } }));
    return { message: 'Review deleted' };
};
exports.deleteReview = deleteReview;
