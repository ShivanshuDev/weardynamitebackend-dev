import { docClient, MAIN_TABLE } from '../../utils/awsClient';
import { GetCommand, PutCommand, QueryCommand, DeleteCommand, UpdateCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { cache } from '../../utils/redisClient';

export const listBlogs = async (adminMode = false) => {
  if (adminMode) {
    // Admin gets ALL versions (Drafts, Inactive, etc) via GSI1
    const { Items } = await docClient.send(new QueryCommand({
      TableName: MAIN_TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: { ':pk': 'BLOG' },
      ScanIndexForward: false
    }));
    return Items || [];
  } else {
    const cacheKey = 'blogs:list:public';
    const cached = await cache.get(cacheKey);
    if (cached) return cached as any;

    // Public ONLY gets "Live" versions via GSI2
    const { Items } = await docClient.send(new QueryCommand({
      TableName: MAIN_TABLE,
      IndexName: 'GSI2',
      KeyConditionExpression: 'GSI2PK = :pk',
      ExpressionAttributeValues: { ':pk': 'STATUS#Live' },
      ScanIndexForward: false
    }));
    
    let result = Items || [];
    // Filter out member_only blogs for public requests
    if (!adminMode) {
      result = result.filter(blog => blog.visibility !== 'member_only');
    }

    await cache.set(cacheKey, result, 600); // 10 mins
    return result;
  }
};

export const getBlog = async (id: string, version: 'LIVE' | 'DRAFT' = 'LIVE') => {
  const cacheKey = `blog:${id}:${version}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached as any;

  const { Item } = await docClient.send(new GetCommand({
    TableName: MAIN_TABLE,
    Key: { PK: `BLOG#${id}`, SK: `VERSION#${version}` }
  }));

  if (Item) {
    await cache.set(cacheKey, Item, 900); // 15 mins
  }
  return Item;
};

export const createBlog = async (data: Record<string, any>) => {
  const id = uuidv4();
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
    visibility: data.visibility || 'public',
    ...data,
    createdAt: now,
    updatedAt: now
  };

  await docClient.send(new PutCommand({ TableName: MAIN_TABLE, Item: record }));
  return record;
};

export const updateBlog = async (id: string, updates: Record<string, any>) => {
  const now = Date.now();
  
  // Logic: Edits ALWAYS go to a WORKING record (VERSION#DRAFT)
  let draft = await getBlog(id, 'DRAFT');
  
  if (!draft) {
    const live = await getBlog(id, 'LIVE');
    if (live) {
      // NEW REQUIREMENT: Create a TOTALLY NEW PHYSICAL RECORD (New Partition Key)
      // This ensures the Live blog remains untouched and visible in the dashboard
      const newStagedId = uuidv4();
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
    } else {
       throw new Error('Target blog for update not found.');
    }
  }

  // Protect the record's identity (PK/SK/ID) from being overridden by incoming data
  const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, blogId: _bId, parentLiveId: _pId, createdAt: _ca, ...cleanUpdates } = updates;
  const updated = { ...draft, ...cleanUpdates, updatedAt: now };
  await docClient.send(new PutCommand({ TableName: MAIN_TABLE, Item: updated }));
  
  // Invalidate cache
  await cache.del(`blog:${id}:DRAFT`);
  await cache.del(`blog:${id}:LIVE`);
  await cache.delPattern('blogs:list:*');

  return updated;
};

/**
 * ATOMIC DEPLOY: Move VERSION#DRAFT to VERSION#LIVE
 */
export const publishBlog = async (id: string) => {
  const staged = await getBlog(id, 'DRAFT');
  if (!staged) throw new Error('Staged version not found to publish.');

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
          TableName: MAIN_TABLE,
          Item: liveRecord
        }
      },
      {
        Delete: {
          TableName: MAIN_TABLE,
          Key: { PK: `BLOG#${id}`, SK: 'VERSION#DRAFT' }
        }
      }
    ];
    await docClient.send(new TransactWriteCommand({ TransactItems: transactItems }));
    return liveRecord;
  } else {
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
          TableName: MAIN_TABLE,
          Item: liveRecord
        }
      },
      {
        Delete: {
          TableName: MAIN_TABLE,
          Key: { PK: `BLOG#${id}`, SK: 'VERSION#DRAFT' }
        }
      }
    ];
    await docClient.send(new TransactWriteCommand({ TransactItems: transactItems }));
    
    // Invalidate caches
    await cache.delPattern('blogs:list:*');
    await cache.del(`blog:${id}:LIVE`);
    await cache.del(`blog:${id}:DRAFT`);
    if (parentId) {
      await cache.del(`blog:${parentId}:LIVE`);
    }

    return liveRecord;
  }
};

export const patchBlogStatus = async (id: string, status: string) => {
   // Complex status patching for branching logic
   const { Attributes } = await docClient.send(new UpdateCommand({
     TableName: MAIN_TABLE,
     Key: { PK: `BLOG#${id}`, SK: 'VERSION#DRAFT' },
     UpdateExpression: 'SET #st = :status, updatedAt = :now',
     ExpressionAttributeNames: { '#st': 'status' },
     ExpressionAttributeValues: { ':status': status, ':now': Date.now() },
     ReturnValues: 'ALL_NEW'
   }));
   return Attributes;
};

export const deleteBlog = async (id: string) => {
  // Hard delete both versions
  const deleteLive = docClient.send(new DeleteCommand({ TableName: MAIN_TABLE, Key: { PK: `BLOG#${id}`, SK: 'VERSION#LIVE' } }));
  const deleteDraft = docClient.send(new DeleteCommand({ TableName: MAIN_TABLE, Key: { PK: `BLOG#${id}`, SK: 'VERSION#DRAFT' } }));
  await Promise.all([deleteLive, deleteDraft]);

  // Invalidate cache
  await cache.delPattern('blogs:list:*');
  await cache.del(`blog:${id}:LIVE`);
  await cache.del(`blog:${id}:DRAFT`);

  return { message: 'Blog destroyed' };
};
