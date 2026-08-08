"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteBlog = exports.patchBlogStatus = exports.publishBlog = exports.updateBlog = exports.createBlog = exports.getBlog = exports.listBlogs = void 0;
const awsClient_1 = require("../../utils/awsClient");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const uuid_1 = require("uuid");
const redisClient_1 = require("../../utils/redisClient");
const listBlogs = async (adminMode = false) => {
    if (adminMode) {
        // Admin gets ALL versions (Drafts, Inactive, etc) via GSI1
        const { Items } = await awsClient_1.docClient.send(new lib_dynamodb_1.QueryCommand({
            TableName: awsClient_1.MAIN_TABLE,
            IndexName: 'GSI1',
            KeyConditionExpression: 'GSI1PK = :pk',
            ExpressionAttributeValues: { ':pk': 'BLOG' },
            ScanIndexForward: false
        }));
        return Items || [];
    }
    else {
        const cacheKey = 'blogs:list:public';
        const cached = await redisClient_1.cache.get(cacheKey);
        if (cached)
            return cached;
        // Public ONLY gets "Live" versions via GSI2
        const { Items } = await awsClient_1.docClient.send(new lib_dynamodb_1.QueryCommand({
            TableName: awsClient_1.MAIN_TABLE,
            IndexName: 'GSI2',
            KeyConditionExpression: 'GSI2PK = :pk',
            ExpressionAttributeValues: { ':pk': 'STATUS#Live' },
            ScanIndexForward: false
        }));
        const result = Items || [];
        await redisClient_1.cache.set(cacheKey, result, 600); // 10 mins
        return result;
    }
};
exports.listBlogs = listBlogs;
const getBlog = async (id, version = 'LIVE') => {
    const cacheKey = `blog:${id}:${version}`;
    const cached = await redisClient_1.cache.get(cacheKey);
    if (cached)
        return cached;
    const { Item } = await awsClient_1.docClient.send(new lib_dynamodb_1.GetCommand({
        TableName: awsClient_1.MAIN_TABLE,
        Key: { PK: `BLOG#${id}`, SK: `VERSION#${version}` }
    }));
    if (Item) {
        await redisClient_1.cache.set(cacheKey, Item, 900); // 15 mins
    }
    return Item;
};
exports.getBlog = getBlog;
const createBlog = async (data) => {
    const id = (0, uuid_1.v4)();
    const now = Date.now();
    // Initial state is ALWAYS Draft
    const record = {
        PK: `BLOG#${id}`,
        SK: 'VERSION#DRAFT',
        GSI1PK: 'BLOG',
        GSI1SK: `DATE#${now}`,
        // GSI2 is NOT activated for Drafts to ensure privacy
        blogId: id,
        status: 'Draft',
        ...data,
        createdAt: now,
        updatedAt: now
    };
    await awsClient_1.docClient.send(new lib_dynamodb_1.PutCommand({ TableName: awsClient_1.MAIN_TABLE, Item: record }));
    return record;
};
exports.createBlog = createBlog;
const updateBlog = async (id, updates) => {
    const now = Date.now();
    // Logic: Edits ALWAYS go to a WORKING record (VERSION#DRAFT)
    let draft = await (0, exports.getBlog)(id, 'DRAFT');
    if (!draft) {
        const live = await (0, exports.getBlog)(id, 'LIVE');
        if (live) {
            // NEW REQUIREMENT: Create a TOTALLY NEW PHYSICAL RECORD (New Partition Key)
            // This ensures the Live blog remains untouched and visible in the dashboard
            const newStagedId = (0, uuid_1.v4)();
            draft = {
                ...live,
                PK: `BLOG#${newStagedId}`,
                SK: 'VERSION#DRAFT',
                blogId: newStagedId,
                parentLiveId: live.blogId, // Explicitly store the reference to the Live blog we're replacing
                status: updates.status || 'Under Review',
                GSI2PK: undefined,
                GSI2SK: undefined,
                createdAt: now,
                updatedAt: now
            };
        }
        else {
            throw new Error('Target blog for update not found.');
        }
    }
    // Protect the record's identity (PK/SK/ID) from being overridden by incoming data
    const updated = { ...draft, ...cleanUpdates, updatedAt: now };
    await awsClient_1.docClient.send(new lib_dynamodb_1.PutCommand({ TableName: awsClient_1.MAIN_TABLE, Item: updated }));
    // Invalidate cache
    await redisClient_1.cache.del(`blog:${id}:DRAFT`);
    await redisClient_1.cache.del(`blog:${id}:LIVE`);
    await redisClient_1.cache.delPattern('blogs:list:*');
    return updated;
};
exports.updateBlog = updateBlog;
/**
 * ATOMIC DEPLOY: Move VERSION#DRAFT to VERSION#LIVE
 */
const publishBlog = async (id) => {
    const staged = await (0, exports.getBlog)(id, 'DRAFT');
    if (!staged)
        throw new Error('Staged version not found to publish.');
    const now = Date.now();
    const parentId = staged.parentLiveId;
    if (parentId) {
        // REPLACEMENT SWAP: Destroy old Live, create new Live with same ID
        const liveRecord = {
            ...staged,
            PK: `BLOG#${parentId}`,
            SK: 'VERSION#LIVE',
            blogId: parentId,
            status: 'Live',
            GSI2PK: 'STATUS#Live',
            GSI2SK: `DATE#${now}`,
            parentLiveId: undefined, // Clear reference
            updatedAt: now
        };
        const transactItems = [
            {
                Put: {
                    TableName: awsClient_1.MAIN_TABLE,
                    Item: liveRecord
                }
            },
            {
                Delete: {
                    TableName: awsClient_1.MAIN_TABLE,
                    Key: { PK: `BLOG#${id}`, SK: 'VERSION#DRAFT' }
                }
            }
        ];
        await awsClient_1.docClient.send(new lib_dynamodb_1.TransactWriteCommand({ TransactItems: transactItems }));
        return liveRecord;
    }
    else {
        // Normal promotion for a fresh blog
        const liveRecord = {
            ...staged,
            SK: 'VERSION#LIVE',
            status: 'Live',
            GSI2PK: 'STATUS#Live',
            GSI2SK: `DATE#${now}`,
            updatedAt: now
        };
        const transactItems = [
            {
                Put: {
                    TableName: awsClient_1.MAIN_TABLE,
                    Item: liveRecord
                }
            },
            {
                Delete: {
                    TableName: awsClient_1.MAIN_TABLE,
                    Key: { PK: `BLOG#${id}`, SK: 'VERSION#DRAFT' }
                }
            }
        ];
        await awsClient_1.docClient.send(new lib_dynamodb_1.TransactWriteCommand({ TransactItems: transactItems }));
        // Invalidate caches
        await redisClient_1.cache.delPattern('blogs:list:*');
        await redisClient_1.cache.del(`blog:${id}:LIVE`);
        await redisClient_1.cache.del(`blog:${id}:DRAFT`);
        if (parentId) {
            await redisClient_1.cache.del(`blog:${parentId}:LIVE`);
        }
        return liveRecord;
    }
};
exports.publishBlog = publishBlog;
const patchBlogStatus = async (id, status) => {
    // Complex status patching for branching logic
    const { Attributes } = await awsClient_1.docClient.send(new lib_dynamodb_1.UpdateCommand({
        TableName: awsClient_1.MAIN_TABLE,
        Key: { PK: `BLOG#${id}`, SK: 'VERSION#DRAFT' },
        UpdateExpression: 'SET #st = :status, updatedAt = :now',
        ExpressionAttributeNames: { '#st': 'status' },
        ExpressionAttributeValues: { ':status': status, ':now': Date.now() },
        ReturnValues: 'ALL_NEW'
    }));
    return Attributes;
};
exports.patchBlogStatus = patchBlogStatus;
const deleteBlog = async (id) => {
    // Hard delete both versions
    const deleteLive = awsClient_1.docClient.send(new lib_dynamodb_1.DeleteCommand({ TableName: awsClient_1.MAIN_TABLE, Key: { PK: `BLOG#${id}`, SK: 'VERSION#LIVE' } }));
    const deleteDraft = awsClient_1.docClient.send(new lib_dynamodb_1.DeleteCommand({ TableName: awsClient_1.MAIN_TABLE, Key: { PK: `BLOG#${id}`, SK: 'VERSION#DRAFT' } }));
    await Promise.all([deleteLive, deleteDraft]);
    // Invalidate cache
    await redisClient_1.cache.delPattern('blogs:list:*');
    await redisClient_1.cache.del(`blog:${id}:LIVE`);
    await redisClient_1.cache.del(`blog:${id}:DRAFT`);
    return { message: 'Blog destroyed' };
};
exports.deleteBlog = deleteBlog;
