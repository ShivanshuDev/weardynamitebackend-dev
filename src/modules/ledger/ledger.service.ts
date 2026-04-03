import { docClient, MAIN_TABLE } from '../../utils/awsClient';
import { GetCommand, PutCommand, QueryCommand, DeleteCommand, UpdateCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
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
    cmd.ExpressionAttributeValues[':d2'] = `DATE#${filters.dateTo}`;
  }

  const { Items } = await docClient.send(new QueryCommand(cmd));
  let result = Items || [];
  
  if (filters.type) {
    result = result.filter(i => i.type === filters.type); // In-memory filter for sub-types
  }
  
  return result;
};

export const addTransaction = async (data: { description: string; type: 'Credit' | 'Debit'; amount: number; referenceId?: string; date?: number }) => {
  const id = uuidv4();
  const date = data.date || Date.now();
  
  const ledgerRecord = {
    PK: `LEDGER#${id}`,
    SK: 'LEDGER',
    GSI1PK: 'LEDGER',
    GSI1SK: `DATE#${date}`,
    ledgerId: id,
    ...data,
    date,
    createdAt: date
  };

  await docClient.send(new PutCommand({ TableName: MAIN_TABLE, Item: ledgerRecord }));
  return ledgerRecord;
};

export const getDailySummary = async (date: string) => {
  // Retrieve ALL Ledger Items (Using Query instead of full DB Scan)
  const { Items } = await docClient.send(new QueryCommand({
    TableName: MAIN_TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk',
    ExpressionAttributeValues: { ':pk': 'LEDGER' }
  }));
  
  const allItems = Items || [];
  
  // 1. Opening Balance: All transactions before the selected date
  const beforeItems = allItems.filter((i: any) => {
    const itemDate = i.date || i.createdAt || 0;
    const itemDateStr = typeof itemDate === 'number' ? new Date(itemDate).toISOString().split('T')[0] : itemDate;
    return itemDateStr < date;
  });
  const openingCredit = beforeItems.filter((i: any) => i.type === 'Credit').reduce((s: number, i: any) => s + Number(i.amount), 0);
  const openingDebit = beforeItems.filter((i: any) => i.type === 'Debit').reduce((s: number, i: any) => s + Number(i.amount), 0);
  const openingBalance = openingCredit - openingDebit;

  // 2. Today's Activity: Transactions on the target date
  const todayItems = allItems.filter((i: any) => {
    const itemDate = i.date || i.createdAt || 0;
    const itemDateStr = typeof itemDate === 'number' ? new Date(itemDate).toISOString().split('T')[0] : itemDate;
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
export const getDashboardStats = async () => {
  // In a true massive scale system, this would read from a pre-aggregated DASHBOARD#STATS record.
  // We use GSI queries to calculate dynamically for now.
  const [{ Items: orders }, { Items: products }, { Items: employees }] = await Promise.all([
    docClient.send(new QueryCommand({ TableName: MAIN_TABLE, IndexName: 'GSI1', KeyConditionExpression: 'GSI1PK = :pk', ExpressionAttributeValues: { ':pk': 'ORDER' } })),
    docClient.send(new ScanCommand({ TableName: MAIN_TABLE, FilterExpression: 'SK = :v', ExpressionAttributeValues: { ':v': 'PRODUCT' } })),
    docClient.send(new ScanCommand({ TableName: MAIN_TABLE, FilterExpression: 'SK = :v', ExpressionAttributeValues: { ':v': 'EMPLOYEE' } }))
  ]);

  const ords = orders || [];
  const prods = products || [];
  const emps = employees || [];

  const todayStr = new Date().toISOString().split('T')[0];
  const todaysOrders = ords.filter((o: any) => {
    const orderDate = o.createdAt || 0;
    const orderDateStr = typeof orderDate === 'number' ? new Date(orderDate).toISOString().split('T')[0] : orderDate;
    return orderDateStr === todayStr;
  });
  const todaysRevenue = todaysOrders.reduce((s: number, o: any) => s + Number(o.totalAmount || 0), 0);

  return {
    todaysRevenue,
    totalOrders: ords.length,
    pendingOrders: ords.filter((o: any) => o.status === 'Pending').length,
    processingOrders: ords.filter((o: any) => o.status === 'Processing').length,
    shippedOrders: ords.filter((o: any) => o.status === 'Shipped').length,
    deliveredOrders: ords.filter((o: any) => o.status === 'Delivered').length,
    totalProducts: prods.length,
    activeProducts: prods.filter((p: any) => p.status === 'Active').length,
    totalEmployees: emps.length,
  };
};

export const getRevenueChart = async (period: string) => {
  const { Items: orders } = await docClient.send(new QueryCommand({
    TableName: MAIN_TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk',
    ExpressionAttributeValues: { ':pk': 'ORDER' }
  }));
  
  const ords = orders || [];
  const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
  const result: Record<string, number> = {};
  
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    result[key] = 0;
  }
  
  ords.forEach((o: any) => {
    const orderDate = o.createdAt || 0;
    const day = typeof orderDate === 'number' ? new Date(orderDate).toISOString().split('T')[0] : orderDate?.split('T')[0];
    if (day && result[day] !== undefined) result[day] += Number(o.totalAmount || 0);
  });
  
  return Object.entries(result).map(([date, revenue]) => ({ date, revenue }));
};

export const getTopProducts = async () => {
    // Scan fallback for top products (Optimized for rare dashboard loads)
    const { Items: products } = await docClient.send(new ScanCommand({ 
      TableName: MAIN_TABLE, 
      FilterExpression: 'SK = :v', 
      ExpressionAttributeValues: { ':v': 'PRODUCT' } 
    }));
    return (products || []).sort((a, b) => Number(b.salesCount || 0) - Number(a.salesCount || 0)).slice(0, 5);
};
