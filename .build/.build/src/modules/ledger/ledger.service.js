"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTopProducts = exports.getRevenueChart = exports.getDashboardStats = exports.updateDashboardStats = exports.exportLedgerCSV = exports.getLedgerSummary = exports.getDailySummary = exports.addTransaction = exports.listTransactions = void 0;
const awsClient_1 = require("../../utils/awsClient");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const uuid_1 = require("uuid");
// ─── Ledger ───────────────────────────────────────────────────────────────────
const listTransactions = async (filters) => {
    // Use GSI1 for chronological ledger fetching
    let cmd = {
        TableName: awsClient_1.MAIN_TABLE,
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
    const { Items } = await awsClient_1.docClient.send(new lib_dynamodb_1.QueryCommand(cmd));
    let result = Items || [];
    if (filters.type) {
        result = result.filter(i => i.type === filters.type); // In-memory filter for sub-types
    }
    return result;
};
exports.listTransactions = listTransactions;
const addTransaction = async (data) => {
    const id = (0, uuid_1.v4)();
    const now = new Date();
    // High-Precision Hybrid Timing
    let dateTs;
    let dateStr;
    if (typeof data.date === 'number') {
        dateTs = data.date;
        dateStr = new Date(dateTs).toISOString().split('T')[0];
    }
    else if (typeof data.date === 'string' && data.date.includes('-')) {
        dateStr = data.date;
        const selected = new Date(dateStr);
        selected.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
        dateTs = selected.getTime();
    }
    else {
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
    await awsClient_1.docClient.send(new lib_dynamodb_1.PutCommand({ TableName: awsClient_1.MAIN_TABLE, Item: ledgerRecord }));
    return ledgerRecord;
};
exports.addTransaction = addTransaction;
const getDailySummary = async (date) => {
    // Retrieve Ledger Items up to target date (Query with Range instead of memory filter)
    const targetDateTs = new Date(date).getTime();
    const { Items } = await awsClient_1.docClient.send(new lib_dynamodb_1.QueryCommand({
        TableName: awsClient_1.MAIN_TABLE,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK <= :date',
        ExpressionAttributeValues: {
            ':pk': 'LEDGER',
            ':date': `DATE#${date}\uf8ff`
        }
    }));
    const allItems = Items || [];
    // 1. Opening Balance: All transactions before the selected date
    const beforeItems = allItems.filter((i) => {
        const itemDate = i.date || i.createdAt || 0;
        const itemDateStr = new Date(itemDate).toISOString().split('T')[0];
        return itemDateStr < date;
    });
    const openingCredit = beforeItems.filter((i) => i.type === 'Credit').reduce((s, i) => s + Number(i.amount), 0);
    const openingDebit = beforeItems.filter((i) => i.type === 'Debit').reduce((s, i) => s + Number(i.amount), 0);
    const openingBalance = openingCredit - openingDebit;
    // 2. Today's Activity: Transactions on the target date
    const todayItems = allItems.filter((i) => {
        const itemDate = i.date || i.createdAt || 0;
        const itemDateStr = new Date(itemDate).toISOString().split('T')[0];
        return itemDateStr === date;
    });
    const todayCredit = todayItems.filter((i) => i.type === 'Credit').reduce((s, i) => s + Number(i.amount), 0);
    const todayDebit = todayItems.filter((i) => i.type === 'Debit').reduce((s, i) => s + Number(i.amount), 0);
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
exports.getDailySummary = getDailySummary;
const getLedgerSummary = async () => {
    const items = await (0, exports.listTransactions)({});
    const totalCredit = items.filter((i) => i.type === 'Credit').reduce((s, i) => s + Number(i.amount), 0);
    const totalDebit = items.filter((i) => i.type === 'Debit').reduce((s, i) => s + Number(i.amount), 0);
    return { totalCredit, totalDebit, netProfit: totalCredit - totalDebit };
};
exports.getLedgerSummary = getLedgerSummary;
const exportLedgerCSV = async () => {
    const items = await (0, exports.listTransactions)({});
    return ['id,description,type,amount,date', ...items.map((i) => `${i.ledgerId},"${i.description}",${i.type},${i.amount},${i.createdAt || ''}`)].join('\n');
};
exports.exportLedgerCSV = exportLedgerCSV;
// ─── Dashboard ────────────────────────────────────────────────────────────────
const updateDashboardStats = async (values) => {
    const updateExpressions = [];
    const expressionAttributeValues = {};
    const expressionAttributeNames = {};
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
    if (updateExpressions.length === 0)
        return;
    expressionAttributeValues[':zero'] = 0;
    await awsClient_1.docClient.send(new lib_dynamodb_1.UpdateCommand({
        TableName: awsClient_1.MAIN_TABLE,
        Key: { PK: 'DASHBOARD#STATS', SK: 'LATEST' },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues
    }));
};
exports.updateDashboardStats = updateDashboardStats;
const getDashboardStats = async () => {
    // 1. Attempt to read from the Pre-Aggregated Snapshot record (Highly Efficient)
    const { Item: snapshot } = await awsClient_1.docClient.send(new lib_dynamodb_1.GetCommand({
        TableName: awsClient_1.MAIN_TABLE,
        Key: { PK: 'DASHBOARD#STATS', SK: 'LATEST' }
    }));
    // 2. Fetch fresh aggregates for critical metrics (Ensures zero-latency accuracy)
    const [ordersRes, productsRes] = await Promise.all([
        // STATUS#Returned query for Total Return metric
        awsClient_1.docClient.send(new lib_dynamodb_1.QueryCommand({
            TableName: awsClient_1.MAIN_TABLE,
            IndexName: 'GSI2',
            KeyConditionExpression: 'GSI2PK = :pk',
            ExpressionAttributeValues: { ':pk': 'STATUS#Returned' }
        })),
        // PRODUCT aggregation for accurate Current Stock
        awsClient_1.docClient.send(new lib_dynamodb_1.QueryCommand({
            TableName: awsClient_1.MAIN_TABLE,
            IndexName: 'GSI4',
            KeyConditionExpression: 'GSI4PK = :pk',
            ExpressionAttributeValues: { ':pk': 'PRODUCT' }
        })),
        // Fetch all orders for Gross Revenue fallback if snapshot is stale
        snapshot ? Promise.resolve({ Items: [] }) : awsClient_1.docClient.send(new lib_dynamodb_1.QueryCommand({
            TableName: awsClient_1.MAIN_TABLE,
            IndexName: 'GSI3',
            KeyConditionExpression: 'GSI3PK = :pk',
            ExpressionAttributeValues: { ':pk': 'ALL_ORDERS' }
        }))
    ]);
    const returnedOrders = ordersRes.Items || [];
    const products = productsRes.Items || [];
    const totalReturn = returnedOrders.reduce((s, o) => s + Number(o.total_amount || o.totalAmount || 0), 0);
    const currentStock = products.reduce((s, p) => s + Number(p.current_stock || p.available_stock || 0), 0);
    if (snapshot) {
        return {
            grossRevenue: snapshot.totalRevenue || 0,
            activeOrders: snapshot.totalOrders || 0,
            totalBurn: snapshot.totalBurn || 0,
            currentStock: currentStock, // Use fresh stock aggregate for precision
            totalReturn: totalReturn, // Dynamic return aggregation
            isRealtime: true
        };
    }
    // Fallback for initial state
    const allOrders = ordersRes.Items || []; // This would be populated if snapshot is missing
    return {
        grossRevenue: allOrders.reduce((s, o) => s + Number(o.total_amount || 0), 0),
        activeOrders: allOrders.length,
        totalBurn: 0,
        currentStock: currentStock,
        totalReturn: totalReturn,
        isRealtime: false
    };
};
exports.getDashboardStats = getDashboardStats;
const getRevenueChart = async (period) => {
    const days = period === '7d' ? 7 : (period === '14d' || period === '2 Weeks') ? 14 : period === '90d' ? 90 : 30;
    const startTime = Date.now() - (days * 24 * 60 * 60 * 1000);
    const { Items: ledgerEntries } = await awsClient_1.docClient.send(new lib_dynamodb_1.QueryCommand({
        TableName: awsClient_1.MAIN_TABLE,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK >= :start',
        ExpressionAttributeValues: {
            ':pk': 'LEDGER',
            ':start': `DATE#${startTime}`
        }
    }));
    const entries = ledgerEntries || [];
    const revenueHistory = {};
    const expenseHistory = {};
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split('T')[0];
        revenueHistory[key] = 0;
        expenseHistory[key] = 0;
    }
    entries.forEach((e) => {
        const day = new Date(e.date || e.createdAt).toISOString().split('T')[0];
        if (day && revenueHistory[day] !== undefined) {
            if (e.type === 'Credit')
                revenueHistory[day] += Number(e.amount || 0);
            else if (e.type === 'Debit')
                expenseHistory[day] += Number(e.amount || 0);
        }
    });
    return Object.keys(revenueHistory).map(date => ({
        date,
        revenue: revenueHistory[date],
        expense: expenseHistory[date]
    }));
};
exports.getRevenueChart = getRevenueChart;
const getTopProducts = async () => {
    const { Items: orders } = await awsClient_1.docClient.send(new lib_dynamodb_1.QueryCommand({
        TableName: awsClient_1.MAIN_TABLE,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        ExpressionAttributeValues: { ':pk': 'ORDER' },
        Limit: 100 // Last 100 orders for performance
    }));
    const productSales = {};
    (orders || []).forEach((order) => {
        const items = order.items || [];
        items.forEach((item) => {
            const name = item.product_name || item.name || 'Unknown';
            if (!productSales[name])
                productSales[name] = { name, quantity: 0 };
            productSales[name].quantity += Number(item.quantity || 1);
        });
    });
    return Object.values(productSales)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);
};
exports.getTopProducts = getTopProducts;
