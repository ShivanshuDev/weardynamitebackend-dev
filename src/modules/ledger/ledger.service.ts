import { docClient, MAIN_TABLE } from '../../utils/awsClient';
import { GetCommand, PutCommand, QueryCommand, DeleteCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { cache } from '../../utils/redisClient';

// ─── Ledger ───────────────────────────────────────────────────────────────────

export const listTransactions = async (filters: { type?: string; dateFrom?: string; dateTo?: string }) => {
  const cacheKey = `ledger:list:${JSON.stringify(filters)}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached as any;

  // Use GSI1 for chronological ledger fetching
  let cmd: any = {
    TableName: MAIN_TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk',
    ExpressionAttributeValues: { ':pk': 'LEDGER' },
    ScanIndexForward: false // Newest first
  };

  // If date range is required
  if (filters.dateFrom && filters.dateTo) {
    cmd.KeyConditionExpression = 'GSI1PK = :pk AND GSI1SK BETWEEN :d1 AND :d2';
    cmd.ExpressionAttributeValues[':d1'] = `DATE#${filters.dateFrom}`;
    cmd.ExpressionAttributeValues[':d2'] = `DATE#${filters.dateTo}\uf8ff`;
  }

  const { Items } = await docClient.send(new QueryCommand(cmd));
  let result = Items || [];
  
  if (filters.type) {
    result = result.filter(i => i.type === filters.type); // In-memory filter for sub-types
  }
  
  await cache.set(cacheKey, result, 300);
  return result;
};

export const addTransaction = async (data: { description: string; type: 'Credit' | 'Debit'; category?: string; amount: number; referenceId?: string; date?: number | string }) => {
  const id = uuidv4();
  const now = new Date();
  
  // High-Precision Hybrid Timing
  let dateTs: number;
  let dateStr: string;
  
  if (typeof data.date === 'number') {
    dateTs = data.date;
    dateStr = new Date(dateTs).toISOString().split('T')[0];
  } else if (typeof data.date === 'string' && data.date.includes('-')) {
    dateStr = data.date;
    const selected = new Date(dateStr);
    selected.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
    dateTs = selected.getTime();
  } else {
    dateTs = now.getTime();
    dateStr = now.toISOString().split('T')[0];
  }
  
  const ledgerRecord = {
    PK: `LEDGER#${id}`,
    SK: 'LEDGER',
    GSI1PK: 'LEDGER',
    GSI1SK: `DATE#${dateStr}#${dateTs}`,
    ledgerId: id,
    ...data,
    date: dateTs,
    createdAt: dateTs
  };

  await docClient.send(new PutCommand({ TableName: MAIN_TABLE, Item: ledgerRecord }));
  await cache.delPattern('ledger:list:*');
  await cache.delPattern('ledger:summary:*');
  await cache.delPattern('ledger:chart:*');
  await cache.del('ledger:export:csv');
  return ledgerRecord;
};

export const getDailySummary = async (date: string) => {
  const cacheKey = `ledger:summary:${date}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached as any;

  // Retrieve Ledger Items up to target date (Query with Range instead of memory filter)
  const targetDateTs = new Date(date).getTime();
  const { Items } = await docClient.send(new QueryCommand({
    TableName: MAIN_TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK <= :date',
    ExpressionAttributeValues: { 
      ':pk': 'LEDGER',
      ':date': `DATE#${date}\uf8ff`
    }
  }));
  
  const allItems = Items || [];
  
  // 1. Opening Balance: All transactions before the selected date
  const beforeItems = allItems.filter((i: any) => {
    const itemDate = i.date || i.createdAt || 0;
    const itemDateStr = new Date(itemDate).toISOString().split('T')[0];
    return itemDateStr < date;
  });
  const openingCredit = beforeItems.filter((i: any) => i.type === 'Credit').reduce((s: number, i: any) => s + Number(i.amount), 0);
  const openingDebit = beforeItems.filter((i: any) => i.type === 'Debit').reduce((s: number, i: any) => s + Number(i.amount), 0);
  const openingBalance = openingCredit - openingDebit;

  // 2. Today's Activity: Transactions on the target date
  const todayItems = allItems.filter((i: any) => {
    const itemDate = i.date || i.createdAt || 0;
    const itemDateStr = new Date(itemDate).toISOString().split('T')[0];
    return itemDateStr === date;
  });
  const todayCredit = todayItems.filter((i: any) => i.type === 'Credit').reduce((s: number, i: any) => s + Number(i.amount), 0);
  const todayDebit = todayItems.filter((i: any) => i.type === 'Debit').reduce((s: number, i: any) => s + Number(i.amount), 0);

  // 3. Closing Balance
  const closingBalance = openingBalance + todayCredit - todayDebit;

  const result = {
    date,
    openingBalance,
    todayCredit,
    todayDebit,
    netChange: todayCredit - todayDebit,
    closingBalance,
    transactionCount: todayItems.length
  };

  await cache.set(cacheKey, result, 900);
  return result;
};

export const getLedgerSummary = async () => {
  const cacheKey = `ledger:summary:all`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached as any;

  const items = await listTransactions({});
  const totalCredit = items.filter((i: any) => i.type === 'Credit').reduce((s: number, i: any) => s + Number(i.amount), 0);
  const totalDebit = items.filter((i: any) => i.type === 'Debit').reduce((s: number, i: any) => s + Number(i.amount), 0);
  const result = { totalCredit, totalDebit, netProfit: totalCredit - totalDebit };
  
  await cache.set(cacheKey, result, 900);
  return result;
};

export const exportLedgerCSV = async () => {
  const cacheKey = `ledger:export:csv`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached as any;

  const items = await listTransactions({});
  return ['id,description,type,amount,date', ...items.map((i: any) => `${i.ledgerId},"${i.description}",${i.type},${i.amount},${i.createdAt || ''}`)].join('\n');
};

// ─── Dashboard ────────────────────────────────────────────────────────────────
export const updateDashboardStats = async (values: { orders?: number, revenue?: number, burn?: number, products?: number }) => {
  const updateExpressions: string[] = [];
  const expressionAttributeValues: any = {};
  const expressionAttributeNames: any = {};

  if (values.orders) {
    updateExpressions.push('#o = if_not_exists(#o, :zero) + :o');
    expressionAttributeNames['#o'] = 'totalOrders';
    expressionAttributeValues[':o'] = values.orders;
  }
  if (values.revenue) {
    updateExpressions.push('#r = if_not_exists(#r, :zero) + :r');
    expressionAttributeNames['#r'] = 'totalRevenue';
    expressionAttributeValues[':r'] = values.revenue;
  }
  if (values.burn) {
    updateExpressions.push('#b = if_not_exists(#b, :zero) + :b');
    expressionAttributeNames['#b'] = 'totalBurn';
    expressionAttributeValues[':b'] = values.burn;
  }
  if (values.products) {
    updateExpressions.push('#p = if_not_exists(#p, :zero) + :p');
    expressionAttributeNames['#p'] = 'totalProducts';
    expressionAttributeValues[':p'] = values.products;
  }

  if (updateExpressions.length === 0) return;
  expressionAttributeValues[':zero'] = 0;

  await docClient.send(new UpdateCommand({
    TableName: MAIN_TABLE,
    Key: { PK: 'DASHBOARD#STATS', SK: 'LATEST' },
    UpdateExpression: `SET ${updateExpressions.join(', ')}`,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues
  }));

  await cache.del('ledger:dashboard');
};

export const getDashboardStats = async () => {
  const cacheKey = `ledger:dashboard`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached as any;

  // 1. Attempt to read from the Pre-Aggregated Snapshot record (Highly Efficient)
  const { Item: snapshot } = await docClient.send(new GetCommand({
    TableName: MAIN_TABLE,
    Key: { PK: 'DASHBOARD#STATS', SK: 'LATEST' }
  }));

  // 2. Fetch fresh aggregates for critical metrics (Ensures zero-latency accuracy)
  const [ordersRes, productsRes] = await Promise.all([
    // STATUS#Returned query for Total Return metric
    docClient.send(new QueryCommand({ 
      TableName: MAIN_TABLE, 
      IndexName: 'GSI2', 
      KeyConditionExpression: 'GSI2PK = :pk', 
      ExpressionAttributeValues: { ':pk': 'STATUS#Returned' } 
    })),
    // PRODUCT aggregation for accurate Current Stock
    docClient.send(new QueryCommand({ 
      TableName: MAIN_TABLE, 
      IndexName: 'GSI4', 
      KeyConditionExpression: 'GSI4PK = :pk', 
      ExpressionAttributeValues: { ':pk': 'PRODUCT' } 
    })),
    // Fetch all orders for Gross Revenue fallback if snapshot is stale
    snapshot ? Promise.resolve({ Items: [] }) : docClient.send(new QueryCommand({ 
      TableName: MAIN_TABLE, 
      IndexName: 'GSI3', 
      KeyConditionExpression: 'GSI3PK = :pk', 
      ExpressionAttributeValues: { ':pk': 'ALL_ORDERS' } 
    }))
  ]);

  const returnedOrders = ordersRes.Items || [];
  const products = productsRes.Items || [];
  
  const totalReturn = returnedOrders.reduce((s, o: any) => s + Number(o.total_amount || o.totalAmount || 0), 0);
  const currentStock = products.reduce((s, p: any) => s + Number(p.current_stock || p.available_stock || 0), 0);

  if (snapshot) {
    const result = {
      grossRevenue: snapshot.totalRevenue || 0,
      activeOrders: snapshot.totalOrders || 0,
      totalBurn: snapshot.totalBurn || 0,
      currentStock: currentStock, // Use fresh stock aggregate for precision
      totalReturn: totalReturn,    // Dynamic return aggregation
      isRealtime: true
    };
    await cache.set(cacheKey, result, 900);
    return result;
  }

  // Fallback for initial state
  const allOrders = (ordersRes as any).Items || []; // This would be populated if snapshot is missing
  const resultFallback = {
    grossRevenue: allOrders.reduce((s: number, o: any) => s + Number(o.total_amount || 0), 0),
    activeOrders: allOrders.length,
    totalBurn: 0,
    currentStock: currentStock,
    totalReturn: totalReturn,
    isRealtime: false
  };

  await cache.set(cacheKey, resultFallback, 900);
  return resultFallback;
};

export const getRevenueChart = async (period: string) => {
  const cacheKey = `ledger:chart:${period}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached as any;

  const days = period === '7d' ? 7 : (period === '14d' || period === '2 Weeks') ? 14 : period === '90d' ? 90 : 30;
  const startTime = Date.now() - (days * 24 * 60 * 60 * 1000);

  const { Items: ledgerEntries } = await docClient.send(new QueryCommand({
    TableName: MAIN_TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK >= :start',
    ExpressionAttributeValues: { 
      ':pk': 'LEDGER',
      ':start': `DATE#${startTime}`
    }
  }));
  
  const entries = ledgerEntries || [];
  
  const revenueHistory: Record<string, number> = {};
  const expenseHistory: Record<string, number> = {};
  
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    revenueHistory[key] = 0;
    expenseHistory[key] = 0;
  }
  
  entries.forEach((e: any) => {
    const day = new Date(e.date || e.createdAt).toISOString().split('T')[0];
    if (day && revenueHistory[day] !== undefined) {
      if (e.type === 'Credit') revenueHistory[day] += Number(e.amount || 0);
      else if (e.type === 'Debit') expenseHistory[day] += Number(e.amount || 0);
    }
  });
  
  const result = Object.keys(revenueHistory).map(date => ({
    date,
    revenue: revenueHistory[date],
    expense: expenseHistory[date]
  }));

  await cache.set(cacheKey, result, 300);
  return result;
};

export const getTopProducts = async () => {
  const cacheKey = `ledger:topProducts`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached as any;

  const { Items: orders } = await docClient.send(new QueryCommand({
    TableName: MAIN_TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk',
    ExpressionAttributeValues: { ':pk': 'ORDER' },
    Limit: 100 // Last 100 orders for performance
  }));

  const productSales: Record<string, { name: string, quantity: number }> = {};

  (orders || []).forEach((order: any) => {
    const items = order.items || [];
    items.forEach((item: any) => {
      const name = item.product_name || item.name || 'Unknown';
      if (!productSales[name]) productSales[name] = { name, quantity: 0 };
      productSales[name].quantity += Number(item.quantity || 1);
    });
  });

  const result = Object.values(productSales)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  await cache.set(cacheKey, result, 300);
  return result;
};

