import { docClient, MAIN_TABLE } from '../../utils/awsClient';
import { GetCommand, PutCommand, QueryCommand, DeleteCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { addTransaction, updateDashboardStats } from '../ledger/ledger.service';

/**
 * List all expenses for admin.
 */
export const listExpenses = async (filters: { category?: string; dateFrom?: string; dateTo?: string }) => {
  let cmd: any = {
    TableName: MAIN_TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk',
    ExpressionAttributeValues: { ':pk': 'EXPENSE' },
    ScanIndexForward: false // Newest first
  };

  if (filters.dateFrom && filters.dateTo) {
    cmd.KeyConditionExpression = 'GSI1PK = :pk AND GSI1SK BETWEEN :d1 AND :d2';
    cmd.ExpressionAttributeValues[':d1'] = `DATE#${filters.dateFrom}`;
    cmd.ExpressionAttributeValues[':d2'] = `DATE#${filters.dateTo}\uf8ff`; // \uf8ff ensures it captures all timestamps for that day
  }

  const { Items } = await docClient.send(new QueryCommand(cmd));
  let items = Items || [];
  
  if (filters.category) {
    items = items.filter(i => i.category?.toLowerCase() === filters.category!.toLowerCase());
  }
  
  return items;
};

/**
 * Create a new expense and trigger a Ledger entry.
 */
export const createExpense = async (data: { description: string; category: string; amount: number; date?: string }) => {
  const id = uuidv4();
  const now = new Date();
  
  // High-Precision Hybrid Timing: DATE#YYYY-MM-DD#TIMESTAMP
  // This maintains backward compatibility with legacy YYYY-MM-DD queries
  // while ensuring reverse-chronological sorting within the same day.
  const dateStr = data.date || now.toISOString().split('T')[0];
  const timestamp = now.getTime();
  const gsi1sk = `DATE#${dateStr}#${timestamp}`;
  
  const record = {
    PK: `EXPENSE#${id}`,
    SK: 'EXPENSE',
    GSI1PK: 'EXPENSE',
    GSI1SK: gsi1sk,
    GSI2PK: `CATEGORY#${data.category}`,
    GSI2SK: gsi1sk,
    expenseId: id,
    ...data,
    date: timestamp, // Store numeric timestamp for easy frontend formatting
    status: 'Paid',
    createdAt: timestamp
  };

  await docClient.send(new PutCommand({
    TableName: MAIN_TABLE,
    Item: record
  }));

  // High-Performance Event: Atomic Dashboard increment (Burn)
  await updateDashboardStats({ burn: Number(data.amount) });

  // Automated Financial Propagation: Trigger Ledger Debit
  await addTransaction({
    description: `Operational Outflow: ${data.description} (${data.category})`,
    type: 'Debit',
    category: data.category,
    amount: Number(data.amount),
    date: expenseDateTs,
    referenceId: id
  });

  return record;
};

/**
 * Delete an expense record.
 * Note: Decided not to reverse ledger entries for audit compliance (manual adjustment preferred).
 */
export const deleteExpense = async (id: string) => {
  await docClient.send(new DeleteCommand({
    TableName: MAIN_TABLE,
    Key: { PK: `EXPENSE#${id}`, SK: 'EXPENSE' }
  }));
  return { message: 'Expense record deleted' };
};
