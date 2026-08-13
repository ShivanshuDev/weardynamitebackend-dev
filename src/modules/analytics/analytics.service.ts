import { docClient, INVENTORY_TABLE } from '../../utils/awsClient';
import { cache } from '../../utils/redisClient';
import { UpdateCommand, QueryCommand, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import * as ProductService from '../product/product.service';

export const trackVisit = async (payload: any) => {
  const dateObj = new Date(payload.timestamp || Date.now());
  const dateStr = dateObj.toISOString().split('T')[0];
  const hourStr = dateObj.getHours().toString().padStart(2, '0');
  const device = (payload.userAgent || '').includes('Mobile') ? 'Mobile' : 'Desktop';
  
  let source = 'Direct';
  if (payload.referrer && payload.referrer.includes('google')) source = 'Google';
  else if (payload.referrer && payload.referrer.includes('facebook')) source = 'Facebook';
  else if (payload.referrer && payload.referrer.includes('instagram')) source = 'Instagram';
  else if (payload.referrer && payload.referrer !== 'Direct') source = 'Referral';

  // Legacy simple counter (keep for backward compatibility)
  const pk = `ANALYTICS#VISITS#${dateStr}`;
  await docClient.send(
    new UpdateCommand({
      TableName: INVENTORY_TABLE,
      Key: { PK: pk, SK: 'METADATA' },
      UpdateExpression: 'ADD visits :inc SET entity_type = :type, #date = :dateStr',
      ExpressionAttributeNames: { '#date': 'date' },
      ExpressionAttributeValues: { ':inc': 1, ':type': 'ANALYTICS', ':dateStr': dateStr }
    })
  );

  // Advanced tracking event
  await docClient.send(
    new PutCommand({
      TableName: INVENTORY_TABLE,
      Item: {
        PK: `ANALYTICS#EVENT#VISIT`,
        SK: `${dateObj.toISOString()}#${Math.random().toString(36).substr(2, 9)}`,
        entity_type: 'ANALYTICS_EVENT',
        date: dateStr,
        hour: hourStr,
        device,
        source,
        timestamp: dateObj.toISOString()
      }
    })
  );

  return { success: true };
};

export const trackCart = async (payload: any) => {
  if (!payload || !payload.cartId) return;
  // Store cart state in Redis with 7 days expiry
  await cache.setex(`cart:${payload.cartId}`, 7 * 24 * 60 * 60, JSON.stringify(payload));
  return { success: true };
};

export const trackProductView = async (productId: string) => {
  await docClient.send(
    new UpdateCommand({
      TableName: INVENTORY_TABLE,
      Key: { PK: `PRODUCT#${productId}`, SK: 'METADATA' },
      UpdateExpression: 'ADD views :inc',
      ExpressionAttributeValues: { ':inc': 1 }
    })
  );
  await cache.del(`product:${productId}`);
  return { success: true };
};

export const trackSearch = async (query: string) => {
  if (!query || query.trim().length < 2) return;
  const q = query.trim().toLowerCase();
  await cache.zincrby('analytics:searches', 1, q);
  return { success: true };
};

export const getOverview = async (timeframe: string = 'Last 7 Days') => {
  let startDate = new Date();
  startDate.setHours(0,0,0,0);
  let endDate = new Date();
  endDate.setHours(23,59,59,999);

  if (timeframe === 'Last 7 Days') startDate.setDate(endDate.getDate() - 7);
  else if (timeframe === 'Last 30 Days') startDate.setDate(endDate.getDate() - 30);
  else if (timeframe === 'This Month') startDate.setDate(1);
  else if (timeframe === 'This Year') { startDate.setMonth(0); startDate.setDate(1); }

  // 1. Fetch Visits and Demographics from Advanced Tracking
  let totalVisits = 0;
  const devices: Record<string, number> = { Desktop: 0, Mobile: 0 };
  const sources: Record<string, number> = { Direct: 0, Google: 0, Facebook: 0, Instagram: 0, Referral: 0 };
  const hours: Record<string, number> = {};

  try {
    // Note: In production with massive scale, use GSI or Athena. Using Query for PK + Filter for dates here.
    const visitRes = await docClient.send(
      new QueryCommand({
        TableName: INVENTORY_TABLE,
        KeyConditionExpression: 'PK = :pk AND SK BETWEEN :start AND :end',
        ExpressionAttributeValues: {
          ':pk': 'ANALYTICS#EVENT#VISIT',
          ':start': startDate.toISOString(),
          ':end': endDate.toISOString()
        }
      })
    );
    
    totalVisits = visitRes.Items?.length || 0;
    
    (visitRes.Items || []).forEach(item => {
      if (item.device) devices[item.device] = (devices[item.device] || 0) + 1;
      if (item.source) sources[item.source] = (sources[item.source] || 0) + 1;
      if (item.hour) hours[item.hour] = (hours[item.hour] || 0) + 1;
    });
  } catch (e) {
    console.error('Error fetching advanced visits', e);
  }

  // Fallback for today if no advanced events yet (backward compatibility)
  if (totalVisits === 0 && timeframe === 'Today') {
    try {
      const dateStr = new Date().toISOString().split('T')[0];
      const res = await docClient.send(
        new QueryCommand({
          TableName: INVENTORY_TABLE,
          KeyConditionExpression: 'PK = :pk AND SK = :sk',
          ExpressionAttributeValues: { ':pk': `ANALYTICS#VISITS#${dateStr}`, ':sk': 'METADATA' }
        })
      );
      if (res.Items && res.Items.length > 0) totalVisits = res.Items[0].visits || 0;
    } catch (e) {}
  }

  // 2. Fetch Top Searches
  let topSearches: {keyword: string, count: number}[] = [];
  try {
    const rawSearches = await cache.zrevrange('analytics:searches', 0, 4, 'WITHSCORES');
    for (let i = 0; i < rawSearches.length; i += 2) {
      topSearches.push({ keyword: rawSearches[i], count: parseInt(rawSearches[i+1]) });
    }
  } catch (e) {
    console.error('Error fetching top searches', e);
  }

  // 3. Fetch Product Stats (Views, Velocity)
  let totalProductViews = 0;
  let mostDemanded: any[] = [];
  try {
    const productsRes = await ProductService.listProducts({ status: 'Active', limit: 500 });
    const all = productsRes.items || [];
    
    totalProductViews = all.reduce((acc: number, p: any) => acc + (p.views || 0), 0);

    mostDemanded = all
      .filter((p: any) => p.views && p.views > 0)
      .sort((a: any, b: any) => (b.views || 0) - (a.views || 0))
      .slice(0, 5);
  } catch (e) {
    console.error('Error fetching most demanded', e);
  }

  // 4. Calculate Sales, Revenue, AOV from ORDERS_TABLE (Simulated scan for now as order service handles logic)
  let revenue = 0;
  let orderCount = 0;
  let aov = 0;
  let uniqueCustomers = new Set();
  let repeatCustomers = new Set();
  
  try {
    // Using scan for analytics purpose on orders, typically you'd aggregate this on write or use GSI
    const ordersRes = await docClient.send(
      new ScanCommand({
        TableName: process.env.DYNAMODB_TABLE || 'weardynamite-orders',
        FilterExpression: 'created_at BETWEEN :start AND :end',
        ExpressionAttributeValues: {
          ':start': startDate.toISOString(),
          ':end': endDate.toISOString()
        }
      })
    );
    
    const orders = ordersRes.Items || [];
    orderCount = orders.length;
    
    orders.forEach(o => {
      revenue += (o.totalAmount || o.total || 0);
      const email = o.customer?.email || o.customerEmail;
      if (email) {
        if (uniqueCustomers.has(email)) repeatCustomers.add(email);
        else uniqueCustomers.add(email);
      }
    });
    
    if (orderCount > 0) aov = revenue / orderCount;
  } catch (e) {
    console.error('Error fetching orders for analytics', e);
  }

  const retentionRate = uniqueCustomers.size > 0 ? (repeatCustomers.size / uniqueCustomers.size) * 100 : 0;

  // 5. Calculate Cart Abandonment (from Redis)
  let activeCarts = 0;
  let abandonedCarts = 0;
  try {
    const cartKeys = await cache.keys('cart:*');
    for (const key of cartKeys) {
      const data = await cache.get(key) as any;
      if (data) {
        if (data.status === 'converted') {
          // Already converted
        } else {
          // Check timestamp
          const cartTime = new Date(data.timestamp).getTime();
          const oneHourAgo = Date.now() - (60 * 60 * 1000);
          if (cartTime < oneHourAgo) abandonedCarts++;
          else activeCarts++;
        }
      }
    }
  } catch(e) {}

  const cartAbandonmentRate = (abandonedCarts + orderCount) > 0 ? (abandonedCarts / (abandonedCarts + orderCount)) * 100 : 0;

  return {
    timeframe,
    totalVisits,
    totalProductViews,
    revenue,
    orderCount,
    aov,
    retentionRate,
    cartAbandonmentRate,
    devices,
    sources,
    hours,
    topSearches,
    mostDemanded
  };
};
