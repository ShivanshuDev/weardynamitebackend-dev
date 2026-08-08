"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEmployeePayroll = exports.processPayroll = exports.listPayroll = exports.getEmployeeAuditLog = exports.getEmployeeAttendanceHistory = exports.getAttendanceMatrix = exports.markAttendance = exports.getAttendanceByDate = exports.getEmployee = exports.deleteEmployee = exports.patchEmployeeStatus = exports.updateEmployee = exports.createEmployee = exports.listEmployees = void 0;
const awsClient_1 = require("../../utils/awsClient");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const uuid_1 = require("uuid");
const ledger_service_1 = require("../ledger/ledger.service");
const mailService_1 = require("../../utils/mailService");
// ─── Employees ───────────────────────────────────────────────────────────────
const listEmployees = async () => {
    const { Items } = await awsClient_1.docClient.send(new lib_dynamodb_1.QueryCommand({
        TableName: awsClient_1.MAIN_TABLE,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk AND begins_with(GSI1SK, :sk)',
        ExpressionAttributeValues: { ':pk': 'ROLE#employee', ':sk': 'EMP#' }
    }));
    return Items || [];
};
exports.listEmployees = listEmployees;
const getNextSequenceValue = async (counterId) => {
    const { Attributes } = await awsClient_1.docClient.send(new lib_dynamodb_1.UpdateCommand({
        TableName: awsClient_1.MAIN_TABLE,
        Key: { PK: 'METADATA', SK: `SEQUENCE#${counterId}` },
        UpdateExpression: 'ADD current_value :inc',
        ExpressionAttributeValues: { ':inc': 1 },
        ReturnValues: 'ALL_NEW'
    }));
    return Attributes?.current_value || 1;
};
const createEmployee = async (data) => {
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
    await awsClient_1.docClient.send(new lib_dynamodb_1.PutCommand({ TableName: awsClient_1.MAIN_TABLE, Item: record }));
    return record;
};
exports.createEmployee = createEmployee;
const updateEmployee = async (id, updates) => {
    const { Item } = await awsClient_1.docClient.send(new lib_dynamodb_1.GetCommand({ TableName: awsClient_1.MAIN_TABLE, Key: { PK: `EMPLOYEE#${id}`, SK: 'EMPLOYEE' } }));
    if (!Item)
        throw new Error('Employee not found');
    const updatedItem = { ...Item, ...updates };
    await awsClient_1.docClient.send(new lib_dynamodb_1.PutCommand({ TableName: awsClient_1.MAIN_TABLE, Item: updatedItem }));
    return updatedItem;
};
exports.updateEmployee = updateEmployee;
const patchEmployeeStatus = async (id, status) => {
    const { Attributes } = await awsClient_1.docClient.send(new lib_dynamodb_1.UpdateCommand({
        TableName: awsClient_1.MAIN_TABLE,
        Key: { PK: `EMPLOYEE#${id}`, SK: 'EMPLOYEE' },
        UpdateExpression: 'SET #st = :status, GSI2PK = :gsi',
        ExpressionAttributeNames: { '#st': 'status' },
        ExpressionAttributeValues: { ':status': status, ':gsi': `STATUS#${status}` },
        ReturnValues: 'ALL_NEW'
    }));
    return Attributes;
};
exports.patchEmployeeStatus = patchEmployeeStatus;
const deleteEmployee = async (id) => {
    await awsClient_1.docClient.send(new lib_dynamodb_1.DeleteCommand({ TableName: awsClient_1.MAIN_TABLE, Key: { PK: `EMPLOYEE#${id}`, SK: 'EMPLOYEE' } }));
    return { message: 'Employee removed' };
};
exports.deleteEmployee = deleteEmployee;
const getEmployee = async (id) => {
    const { Item } = await awsClient_1.docClient.send(new lib_dynamodb_1.GetCommand({ TableName: awsClient_1.MAIN_TABLE, Key: { PK: `EMPLOYEE#${id}`, SK: 'EMPLOYEE' } }));
    return Item;
};
exports.getEmployee = getEmployee;
// ─── Attendance ────────────────────────────────────────────────────────────────
const getAttendanceByDate = async (date) => {
    const [year, month] = date.split('-');
    const { Items } = await awsClient_1.docClient.send(new lib_dynamodb_1.QueryCommand({
        TableName: awsClient_1.MAIN_TABLE,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk AND begins_with(GSI1SK, :sk)',
        ExpressionAttributeValues: {
            ':pk': `ORG#DYNAMITE#ATT#${year}-${month}`,
            ':sk': `DATE#${date}`
        }
    }));
    return Items || [];
};
exports.getAttendanceByDate = getAttendanceByDate;
const markAttendance = async (data) => {
    const { Item: existing } = await awsClient_1.docClient.send(new lib_dynamodb_1.GetCommand({
        TableName: awsClient_1.MAIN_TABLE,
        Key: { PK: `EMPLOYEE#${data.employeeId}`, SK: `ATTENDANCE#${data.date}` }
    }));
    if (existing) {
        // Audit Trail
        await awsClient_1.docClient.send(new lib_dynamodb_1.PutCommand({
            TableName: awsClient_1.MAIN_TABLE,
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
    await awsClient_1.docClient.send(new lib_dynamodb_1.PutCommand({ TableName: awsClient_1.MAIN_TABLE, Item: record }));
    return record;
};
exports.markAttendance = markAttendance;
const getAttendanceMatrix = async (year, month) => {
    const { Items } = await awsClient_1.docClient.send(new lib_dynamodb_1.QueryCommand({
        TableName: awsClient_1.MAIN_TABLE,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        ExpressionAttributeValues: { ':pk': `ORG#DYNAMITE#ATT#${year}-${month}` }
    }));
    return Items || [];
};
exports.getAttendanceMatrix = getAttendanceMatrix;
const getEmployeeAttendanceHistory = async (employeeId) => {
    const { Items } = await awsClient_1.docClient.send(new lib_dynamodb_1.QueryCommand({
        TableName: awsClient_1.MAIN_TABLE,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: { ':pk': `EMPLOYEE#${employeeId}`, ':sk': 'ATTENDANCE#' },
        ScanIndexForward: false // Newest first
    }));
    return Items || [];
};
exports.getEmployeeAttendanceHistory = getEmployeeAttendanceHistory;
const getEmployeeAuditLog = async (employeeId) => {
    const { Items } = await awsClient_1.docClient.send(new lib_dynamodb_1.QueryCommand({
        TableName: awsClient_1.MAIN_TABLE,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: { ':pk': `EMPLOYEE#${employeeId}`, ':sk': 'AUDIT#' },
        ScanIndexForward: false
    }));
    return Items || [];
};
exports.getEmployeeAuditLog = getEmployeeAuditLog;
// ─── Payroll ──────────────────────────────────────────────────────────────────
const listPayroll = async () => {
    const { Items } = await awsClient_1.docClient.send(new lib_dynamodb_1.QueryCommand({
        TableName: awsClient_1.MAIN_TABLE,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        ExpressionAttributeValues: { ':pk': 'PAYROLL' },
        ScanIndexForward: false
    }));
    return Items || [];
};
exports.listPayroll = listPayroll;
const processPayroll = async (data) => {
    const id = (0, uuid_1.v4)();
    const now = Date.now();
    console.log('[PAYROLL DEBUG] Incoming Payout Request:', JSON.stringify(data, null, 2));
    const { Item: employee } = await awsClient_1.docClient.send(new lib_dynamodb_1.GetCommand({
        TableName: awsClient_1.MAIN_TABLE,
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
    await (0, ledger_service_1.addTransaction)({
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
    await awsClient_1.docClient.send(new lib_dynamodb_1.PutCommand({ TableName: awsClient_1.MAIN_TABLE, Item: record }));
    // Automated Notification: Dispatch payout alert to personnel
    if (employee.email) {
        mailService_1.MailService.sendPayrollPaymentEmail(employee.email, employee.name, record).catch(e => {
            console.error('[MAIL TRIGGER ERROR] Automated payout alert failed:', e);
        });
    }
    return record;
};
exports.processPayroll = processPayroll;
const getEmployeePayroll = async (employeeId) => {
    const { Items } = await awsClient_1.docClient.send(new lib_dynamodb_1.QueryCommand({
        TableName: awsClient_1.MAIN_TABLE,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: { ':pk': `EMPLOYEE#${employeeId}`, ':sk': 'PAYROLL#' },
        ScanIndexForward: false
    }));
    return Items || [];
};
exports.getEmployeePayroll = getEmployeePayroll;
