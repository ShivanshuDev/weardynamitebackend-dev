import { docClient, MAIN_TABLE } from '../../utils/awsClient';
import { GetCommand, PutCommand, QueryCommand, DeleteCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { addTransaction } from '../ledger/ledger.service';
import { MailService } from '../../utils/mailService';
import { cache } from '../../utils/redisClient';


// ─── Employees ───────────────────────────────────────────────────────────────

export const listEmployees = async () => {
  const cacheKey = 'employees:list:all';
  const cached = await cache.get(cacheKey);
  if (cached) return cached as any;
  const { Items } = await docClient.send(new QueryCommand({
    TableName: MAIN_TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk AND begins_with(GSI1SK, :sk)',
    ExpressionAttributeValues: { ':pk': 'ROLE#employee', ':sk': 'EMP#' }
  }));
  const result = Items || [];
  await cache.set(cacheKey, result, 300);
  return result;
};

const getNextSequenceValue = async (counterId: string) => {
  const { Attributes } = await docClient.send(new UpdateCommand({
    TableName: MAIN_TABLE,
    Key: { PK: 'METADATA', SK: `SEQUENCE#${counterId}` },
    UpdateExpression: 'ADD current_value :inc',
    ExpressionAttributeValues: { ':inc': 1 },
    ReturnValues: 'ALL_NEW'
  }));
  return Attributes?.current_value || 1;
};

export const createEmployee = async (data: Record<string, any>) => {
  const seq = await getNextSequenceValue('EMPLOYEE');
  const id = `WDTH${String(seq).padStart(6, '0')}`;
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
  await cache.delPattern('employees:list:*');
  return record;
};

export const updateEmployee = async (id: string, updates: Record<string, any>) => {
  const { Item } = await docClient.send(new GetCommand({ TableName: MAIN_TABLE, Key: { PK: `EMPLOYEE#${id}`, SK: 'EMPLOYEE' } }));
  if (!Item) throw new Error('Employee not found');
  
  const updatedItem = { ...Item, ...updates };
  await docClient.send(new PutCommand({ TableName: MAIN_TABLE, Item: updatedItem }));
  await cache.del(`employee:${id}`);
  await cache.delPattern('employees:list:*');
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
  await cache.del(`employee:${id}`);
  await cache.delPattern('employees:list:*');
  return Attributes;
};

export const deleteEmployee = async (id: string) => {
  await docClient.send(new DeleteCommand({ TableName: MAIN_TABLE, Key: { PK: `EMPLOYEE#${id}`, SK: 'EMPLOYEE' } }));
  await cache.del(`employee:${id}`);
  await cache.delPattern('employees:list:*');
  return { message: 'Employee removed' };
};

export const getEmployee = async (id: string) => {
  const cacheKey = `employee:${id}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached as any;
  const { Item } = await docClient.send(new GetCommand({ TableName: MAIN_TABLE, Key: { PK: `EMPLOYEE#${id}`, SK: 'EMPLOYEE' } }));
  await cache.set(cacheKey, Item, 900);
  return Item;
};

// ─── Attendance ────────────────────────────────────────────────────────────────

export const getAttendanceByDate = async (date: string) => {
  const cacheKey = `employees:list:attendance:date:${date}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached as any;
  const [year, month] = date.split('-');
  const { Items } = await docClient.send(new QueryCommand({
    TableName: MAIN_TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk AND begins_with(GSI1SK, :sk)',
    ExpressionAttributeValues: { 
      ':pk': `ORG#DYNAMITE#ATT#${year}-${month}`, 
      ':sk': `DATE#${date}` 
    }
  }));
  const result = Items || [];
  await cache.set(cacheKey, result, 300);
  return result;
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
    // Audit Trail
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

  const [year, month] = data.date.split('-');
  const record = {
    PK: `EMPLOYEE#${data.employeeId}`,
    SK: `ATTENDANCE#${data.date}`,
    GSI1PK: `ORG#DYNAMITE#ATT#${year}-${month}`,
    GSI1SK: `DATE#${data.date}#EMP#${data.employeeId}`,
    ...data,
    updatedAt: Date.now(),
    createdAt: existing?.createdAt || Date.now()
  };

  await docClient.send(new PutCommand({ TableName: MAIN_TABLE, Item: record }));
  await cache.del(`employee:${data.employeeId}`);
  await cache.delPattern('employees:list:*');
  return record;
};

export const getAttendanceMatrix = async (year: string, month: string) => {
  const cacheKey = `employees:list:attendance:matrix:${year}-${month}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached as any;
  const { Items } = await docClient.send(new QueryCommand({
    TableName: MAIN_TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk',
    ExpressionAttributeValues: { ':pk': `ORG#DYNAMITE#ATT#${year}-${month}` }
  }));
  const result = Items || [];
  await cache.set(cacheKey, result, 300);
  return result;
};

export const getEmployeeAttendanceHistory = async (employeeId: string) => {
  const cacheKey = `employees:list:attendance:history:${employeeId}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached as any;
  const { Items } = await docClient.send(new QueryCommand({
    TableName: MAIN_TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: { ':pk': `EMPLOYEE#${employeeId}`, ':sk': 'ATTENDANCE#' },
    ScanIndexForward: false // Newest first
  }));
  const result = Items || [];
  await cache.set(cacheKey, result, 300);
  return result;
};

export const getEmployeeAuditLog = async (employeeId: string) => {
  const cacheKey = `employees:list:audit:${employeeId}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached as any;
  const { Items } = await docClient.send(new QueryCommand({
    TableName: MAIN_TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: { ':pk': `EMPLOYEE#${employeeId}`, ':sk': 'AUDIT#' },
    ScanIndexForward: false
  }));
  const result = Items || [];
  await cache.set(cacheKey, result, 300);
  return result;
};

// ─── Payroll ──────────────────────────────────────────────────────────────────

export const listPayroll = async () => {
  const cacheKey = `employees:list:payroll:all`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached as any;
  const { Items } = await docClient.send(new QueryCommand({
    TableName: MAIN_TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk',
    ExpressionAttributeValues: { ':pk': 'PAYROLL' },
    ScanIndexForward: false
  }));
  const result = Items || [];
  await cache.set(cacheKey, result, 300);
  return result;
};

export const processPayroll = async (data: { 
  employeeId: string; 
  month: string; 
  amount: number; 
  isAdvance?: boolean; 
  note?: string;
  paymentMethod?: 'Cash' | 'Online';
  transactionId?: string;
  receiptUrl?: string;
}) => {
  const id = uuidv4();
  const now = Date.now();
  
  console.log('[PAYROLL DEBUG] Incoming Payout Request:', JSON.stringify(data, null, 2));

  const { Item: employee } = await docClient.send(new GetCommand({
    TableName: MAIN_TABLE,
    Key: { PK: `EMPLOYEE#${data.employeeId}`, SK: 'EMPLOYEE' }
  }));
  
  if (!employee) {
    console.error('[PAYROLL ERROR] Employee record not found for PK:', `EMPLOYEE#${data.employeeId}`);
    throw new Error('Personnel record not found in central vault.');
  }

  // Policy Enforcement: Amount must be within CTC limits
  const monthlySalary = Number(employee.salary || 0);
  if (monthlySalary > 0 && data.amount > monthlySalary) {
    console.warn('[PAYROLL WARNING] Over-disbursement detected:', { amount: data.amount, salary: monthlySalary });
    throw new Error(`Disbursement exceeds Monthly CTC limit (₹${monthlySalary}). Operation aborted.`);
  }

  // Auto create ledger debit entry with context-aware metadata
  const methodSuffix = data.paymentMethod ? ` (${data.paymentMethod})` : '';
  const ledgerDescription = data.isAdvance 
    ? `Salary Advance${methodSuffix} - ${employee.name} (${data.month})` 
    : `Monthly Payout${methodSuffix} - ${employee.name} (${data.month})`;

  await addTransaction({
    description: ledgerDescription,
    type: 'Debit',
    amount: data.amount,
    referenceId: data.employeeId,
    date: now
  });

  const record = {
    PK: `EMPLOYEE#${data.employeeId}`,
    SK: `PAYROLL#${data.month}#${now}`, // Unique SK allows multiple disbursements in a single month
    GSI1PK: 'PAYROLL',
    GSI1SK: `DATE#${now}`,
    payrollId: id,
    employeeName: employee.name,
    ...data,
    status: 'Paid',
    createdAt: now
  };

  await docClient.send(new PutCommand({ TableName: MAIN_TABLE, Item: record }));

  // Automated Notification: Dispatch payout alert to personnel
  if (employee.email) {
    MailService.sendPayrollPaymentEmail(employee.email, employee.name, record).catch(e => {
       console.error('[MAIL TRIGGER ERROR] Automated payout alert failed:', e);
    });
  }
  await cache.del(`employee:${data.employeeId}`);
  await cache.delPattern('employees:list:*');
  return record;
};

export const getEmployeePayroll = async (employeeId: string) => {
  const cacheKey = `employees:list:payroll:${employeeId}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached as any;
  const { Items } = await docClient.send(new QueryCommand({
    TableName: MAIN_TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: { ':pk': `EMPLOYEE#${employeeId}`, ':sk': 'PAYROLL#' },
    ScanIndexForward: false
  }));
  const result = Items || [];
  await cache.set(cacheKey, result, 300);
  return result;
};
