import { docClient, MAIN_TABLE } from '../../utils/awsClient';
import { GetCommand, PutCommand, QueryCommand, DeleteCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

// ─── Ledger ───────────────────────────────────────────────────────────────────

export const listTransactions = async (filters: { type?: string; dateFrom?: string; dateTo?: string }) => {
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
  return ledgerRecord;
};

export const getDailySummary = async (date: string) => {
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

  return {
    date,
    openingBalance,
    todayCredit,
    todayDebit,
    netChange: todayCredit - todayDebit,
    closingBalance,
    transactionCount: todayItems.length
  };
};

export const getLedgerSummary = async () => {
  const items = await listTransactions({});
  const totalCredit = items.filter((i: any) => i.type === 'Credit').reduce((s: number, i: any) => s + Number(i.amount), 0);
  const totalDebit = items.filter((i: any) => i.type === 'Debit').reduce((s: number, i: any) => s + Number(i.amount), 0);
  return { totalCredit, totalDebit, netProfit: totalCredit - totalDebit };
};

export const exportLedgerCSV = async () => {
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
};

export const getDashboardStats = async () => {
  // 1. Attempt to read from the Pre-Aggregated Snapshot record (Highly Efficient)
  const { Item: snapshot } = await docClient.send(new GetCommand({
    TableName: MAIN_TABLE,
    Key: { PK: 'DASHBOARD#STATS', SK: 'LATEST' }
  }));

  if (snapshot) {
    return {
      grossRevenue: snapshot.totalRevenue || 0,
      activeOrders: snapshot.totalOrders || 0,
      totalBurn: snapshot.totalBurn || 0,
      currentStock: snapshot.totalProducts || 0,
      isRealtime: true
    };
  }

  // 2. Fallback to GSI queries if snapshot doesn't exist yet (Initialization phase)
  const [{ Items: orders }, { Items: products }] = await Promise.all([
    docClient.send(new QueryCommand({ TableName: MAIN_TABLE, IndexName: 'GSI1', KeyConditionExpression: 'GSI1PK = :pk', ExpressionAttributeValues: { ':pk': 'ORDER' } })),
    docClient.send(new QueryCommand({ TableName: MAIN_TABLE, IndexName: 'GSI4', KeyConditionExpression: 'GSI4PK = :pk', ExpressionAttributeValues: { ':pk': 'PRODUCT' } })),
  ]);

  const ords = orders || [];
  const prods = products || [];

  return {
    grossRevenue: ords.reduce((s, o: any) => s + Number(o.totalAmount || 0), 0),
    activeOrders: ords.length,
    totalBurn: 0, // Ledger analysis needed for historical burn
    currentStock: prods.reduce((s, p: any) => s + Number(p.stock || p.current_stock || 0), 0),
    isRealtime: false
  };
};

export const getRevenueChart = async (period: string) => {
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
  
  return Object.keys(revenueHistory).map(date => ({
    date,
    revenue: revenueHistory[date],
    expense: expenseHistory[date]
  }));
};

export const getTopProducts = async () => {
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

  return Object.values(productSales)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);
};

