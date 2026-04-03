import { docClient, MAIN_TABLE } from '../../utils/awsClient';
import { GetCommand, PutCommand, QueryCommand, DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { addTransaction } from '../ledger/ledger.service';

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
    cmd.ExpressionAttributeValues[':d2'] = `DATE#${filters.dateTo}-Z`;
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
  const expenseDate = data.date || Date.now();
  const now = Date.now();
  
  const record = {
    PK: `EXPENSE#${id}`,
    SK: 'EXPENSE',
    GSI1PK: 'EXPENSE',
    GSI1SK: `DATE#${expenseDate}`,
    GSI2PK: `CATEGORY#${data.category}`,
    GSI2SK: `DATE#${expenseDate}`,
    expenseId: id,
    ...data,
    date: expenseDate,
    status: 'Paid',
    createdAt: now
  };

  await docClient.send(new PutCommand({
    TableName: MAIN_TABLE,
    Item: record
  }));

  // Automated Financial Propagation: Trigger Ledger Debit
  await addTransaction({
    description: `Operational Outflow: ${data.description} (${data.category})`,
    type: 'Debit',
    amount: data.amount,
    date: expenseDate
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
