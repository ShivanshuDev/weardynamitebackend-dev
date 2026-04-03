import { docClient, MAIN_TABLE } from '../../utils/awsClient';
import { GetCommand, PutCommand, QueryCommand, DeleteCommand, UpdateCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { addTransaction } from '../ledger/ledger.service';

// ─── Employees ───────────────────────────────────────────────────────────────

export const listEmployees = async () => {
  const { Items } = await docClient.send(new QueryCommand({
    TableName: MAIN_TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk AND begins_with(GSI1SK, :sk)',
    ExpressionAttributeValues: { ':pk': 'ROLE#employee', ':sk': 'EMP#' }
  }));
  return Items || [];
};

export const createEmployee = async (data: Record<string, any>) => {
  const id = uuidv4();
  const now = Date.now();
  
  const record = {
    PK: `EMPLOYEE#${id}`,
    SK: 'EMPLOYEE',
    GSI1PK: `ROLE#employee`,
    GSI1SK: `EMP#${id}`,
    GSI2PK: `STATUS#Active`,
    GSI2SK: `EMP#${id}`,
    employeeId: id,
    status: 'Active',
    ...data,
    joinedDate: data.joinedDate || now,
    createdAt: now
  };

  await docClient.send(new PutCommand({ TableName: MAIN_TABLE, Item: record }));
  return record;
};

export const updateEmployee = async (id: string, updates: Record<string, any>) => {
  const { Item } = await docClient.send(new GetCommand({ TableName: MAIN_TABLE, Key: { PK: `EMPLOYEE#${id}`, SK: 'EMPLOYEE' } }));
  if (!Item) throw new Error('Employee not found');
  
  const updatedItem = { ...Item, ...updates };
  await docClient.send(new PutCommand({ TableName: MAIN_TABLE, Item: updatedItem }));
  return updatedItem;
};

export const patchEmployeeStatus = async (id: string, status: string) => {
  const { Attributes } = await docClient.send(new UpdateCommand({
    TableName: MAIN_TABLE,
    Key: { PK: `EMPLOYEE#${id}`, SK: 'EMPLOYEE' },
    UpdateExpression: 'SET #st = :status, GSI2PK = :gsi',
    ExpressionAttributeNames: { '#st': 'status' },
    ExpressionAttributeValues: { ':status': status, ':gsi': `STATUS#${status}` },
    ReturnValues: 'ALL_NEW'
  }));
  return Attributes;
};

export const deleteEmployee = async (id: string) => {
  await docClient.send(new DeleteCommand({ TableName: MAIN_TABLE, Key: { PK: `EMPLOYEE#${id}`, SK: 'EMPLOYEE' } }));
  return { message: 'Employee removed' };
};

// ─── Attendance ────────────────────────────────────────────────────────────────

export const getAttendanceByDate = async (date: string) => {
  const { Items } = await docClient.send(new QueryCommand({
    TableName: MAIN_TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk AND begins_with(GSI1SK, :sk)',
    ExpressionAttributeValues: { ':pk': `DATE#${date}`, ':sk': 'EMP#' }
  }));
  return Items || [];
};

export const markAttendance = async (data: {
  employeeId: string;
  date: string;
  status: string;
  clockIn?: string;
  clockOut?: string;
  markedBy?: string;
}) => {
  const { Item: existing } = await docClient.send(new GetCommand({
    TableName: MAIN_TABLE,
    Key: { PK: `EMPLOYEE#${data.employeeId}`, SK: `ATTENDANCE#${data.date}` }
  }));

  if (existing) {
    // Create audit log before override
    await docClient.send(new PutCommand({
      TableName: MAIN_TABLE,
      Item: {
        PK: `EMPLOYEE#${data.employeeId}`,
        SK: `AUDIT#${data.date}#${Date.now()}`,
        employeeId: data.employeeId,
        date: data.date,
        oldStatus: existing.status || 'Unknown',
        newStatus: data.status,
        editedBy: data.markedBy || 'admin',
        editType: 'override',
        createdAt: Date.now()
      }
    }));
  }

  const record = {
    PK: `EMPLOYEE#${data.employeeId}`,
    SK: `ATTENDANCE#${data.date}`,
    GSI1PK: `DATE#${data.date}`,
    GSI1SK: `EMP#${data.employeeId}`,
    ...data,
    createdAt: Date.now()
  };

  await docClient.send(new PutCommand({ TableName: MAIN_TABLE, Item: record }));
  return record;
};

export const getEmployeeAttendanceHistory = async (employeeId: string) => {
  const { Items } = await docClient.send(new QueryCommand({
    TableName: MAIN_TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: { ':pk': `EMPLOYEE#${employeeId}`, ':sk': 'ATTENDANCE#' },
    ScanIndexForward: false // Newest first
  }));
  return Items || [];
};

export const getEmployeeAuditLog = async (employeeId: string) => {
  const { Items } = await docClient.send(new QueryCommand({
    TableName: MAIN_TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: { ':pk': `EMPLOYEE#${employeeId}`, ':sk': 'AUDIT#' },
    ScanIndexForward: false
  }));
  return Items || [];
};

// ─── Payroll ──────────────────────────────────────────────────────────────────

export const listPayroll = async () => {
  const { Items } = await docClient.send(new QueryCommand({
    TableName: MAIN_TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk',
    ExpressionAttributeValues: { ':pk': 'PAYROLL' },
    ScanIndexForward: false
  }));
  return Items || [];
};

export const processPayroll = async (data: { employeeId: string; month: string; amount: number; note?: string }) => {
  const id = uuidv4();
  
  const { Item: employee } = await docClient.send(new GetCommand({
    TableName: MAIN_TABLE,
    Key: { PK: `EMPLOYEE#${data.employeeId}`, SK: 'EMPLOYEE' }
  }));
  
  if (!employee) throw new Error('Employee not found');

  // Auto create ledger debit entry
  await addTransaction({
    description: `Admin Salary - ${employee.name} (${data.month})`,
    type: 'Debit',
    amount: data.amount,
    referenceId: data.employeeId,
    date: Date.now()
  });

  const record = {
    PK: `EMPLOYEE#${data.employeeId}`,
    SK: `PAYROLL#${data.month}`,
    GSI1PK: 'PAYROLL',
    GSI1SK: `DATE#${Date.now()}`,
    payrollId: id,
    employeeName: employee.name,
    ...data,
    status: 'Paid',
    createdAt: Date.now()
  };

  await docClient.send(new PutCommand({ TableName: MAIN_TABLE, Item: record }));
  return record;
};

export const getEmployeePayroll = async (employeeId: string) => {
  const { Items } = await docClient.send(new QueryCommand({
    TableName: MAIN_TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: { ':pk': `EMPLOYEE#${employeeId}`, ':sk': 'PAYROLL#' },
    ScanIndexForward: false
  }));
  return Items || [];
};
