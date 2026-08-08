import { docClient, MAIN_TABLE } from '../../utils/awsClient';
import { GetCommand, PutCommand, QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { cache } from '../../utils/redisClient';

export interface IDCardConfig {
  name: string;
  address: string;
  phone: string;
  session: string;
  principalTitle: string;
  startSrNo: string;
  showHeader: boolean;
  templateUrl?: string;
  signatureUrl?: string;
}

export interface StudentRecord {
  studentId?: string;
  name: string;
  srNo: string;
  fatherName: string;
  class: string;
  section: string;
  dob: string;
  phone: string;
  address: string;
  photoUrl?: string;
  createdAt?: number;
  updatedAt?: number;
}

/**
 * Get school configuration from DynamoDB
 */
export const getConfig = async (schoolId: string) => {
  const cacheKey = `idcardConfig:${schoolId}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached as any;

  const { Item } = await docClient.send(new GetCommand({
    TableName: MAIN_TABLE,
    Key: { PK: `SCHOOL#${schoolId}`, SK: 'CONFIG' }
  }));
  
  await cache.set(cacheKey, Item || null, 900);
  return Item || null;
};

/**
 * Save school configuration to DynamoDB
 */
export const saveConfig = async (schoolId: string, config: Partial<IDCardConfig>) => {
  const now = Date.now();
  const record = {
    ...config,
    PK: `SCHOOL#${schoolId}`,
    SK: 'CONFIG',
    schoolId,
    entity_type: 'IDCARD_CONFIG',
    updatedAt: now
  };
  await docClient.send(new PutCommand({
    TableName: MAIN_TABLE,
    Item: record
  }));
  await cache.del(`idcardConfig:${schoolId}`);
  return record;
};

/**
 * Save a student record (handles create and update)
 */
export const saveStudent = async (schoolId: string, studentData: StudentRecord) => {
  const studentId = studentData.studentId || uuidv4();
  const now = Date.now();
  
  const record = {
    ...studentData,
    PK: `SCHOOL#${schoolId}`,
    SK: `STUDENT#${studentId}`,
    schoolId,
    studentId,
    entity_type: 'IDCARD_STUDENT',
    createdAt: studentData.createdAt || now,
    updatedAt: now,
    // GSIs
    GSI1PK: `SCHOOL#${schoolId}#CLASS#${studentData.class}`,
    GSI1SK: `SEC#${(studentData.section || 'N/A').toUpperCase().trim()}#SR_NO#${studentData.srNo}`,
    GSI2PK: `SCHOOL#${schoolId}#SEARCH#NAME`,
    GSI2SK: `${(studentData.name || '').toLowerCase().trim()}#${studentId}`,
    GSI3PK: `PHONE#${studentData.phone}`,
    GSI3SK: `SCHOOL#${schoolId}#STUDENT#${studentId}`,
    GSI4PK: `SCHOOL#${schoolId}#SEARCH#FATHER`,
    GSI4SK: `${(studentData.fatherName || '').toLowerCase().trim()}#${studentId}`
  };

  await docClient.send(new PutCommand({
    TableName: MAIN_TABLE,
    Item: record
  }));
  
  await cache.delPattern('students:list:*');
  return record;
};

/**
 * Delete a student record
 */
export const deleteStudent = async (schoolId: string, studentId: string) => {
  await docClient.send(new DeleteCommand({
    TableName: MAIN_TABLE,
    Key: { PK: `SCHOOL#${schoolId}`, SK: `STUDENT#${studentId}` }
  }));
  await cache.delPattern('students:list:*');
  return { success: true };
};

/**
 * List/query student records based on search filters (No Scans used)
 */
export const listStudents = async (filters: {
  schoolId: string;
  class?: string;
  section?: string;
  name?: string;
  phone?: string;
  fatherName?: string;
}) => {
  const cacheKey = `students:list:${JSON.stringify(filters)}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached as any;

  const fetch = async () => {
    const { schoolId, class: cls, section, name, phone, fatherName } = filters;
  
  if (!schoolId) {
    throw new Error('schoolId is required');
  }

  // 1. Phone Lookup (GSI3)
  if (phone && phone.trim()) {
    const { Items } = await docClient.send(new QueryCommand({
      TableName: MAIN_TABLE,
      IndexName: 'GSI3',
      KeyConditionExpression: 'GSI3PK = :pk',
      ExpressionAttributeValues: { ':pk': `PHONE#${phone.trim()}` }
    }));
    const list = Items || [];
    // Filter globally matched phone results by schoolId
    return list.filter(item => item.schoolId === schoolId);
  }

  // 2. Name Search (GSI2)
  if (name && name.trim()) {
    const { Items } = await docClient.send(new QueryCommand({
      TableName: MAIN_TABLE,
      IndexName: 'GSI2',
      KeyConditionExpression: 'GSI2PK = :pk AND begins_with(GSI2SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `SCHOOL#${schoolId}#SEARCH#NAME`,
        ':sk': name.toLowerCase().trim()
      }
    }));
    return Items || [];
  }

  // 3. Father's Name Search (GSI4)
  if (fatherName && fatherName.trim()) {
    const { Items } = await docClient.send(new QueryCommand({
      TableName: MAIN_TABLE,
      IndexName: 'GSI4',
      KeyConditionExpression: 'GSI4PK = :pk AND begins_with(GSI4SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `SCHOOL#${schoolId}#SEARCH#FATHER`,
        ':sk': fatherName.toLowerCase().trim()
      }
    }));
    return Items || [];
  }

  // 4. Class (and optionally Section) Lookup (GSI1)
  if (cls && cls.trim()) {
    const gsi1pk = `SCHOOL#${schoolId}#CLASS#${cls.trim()}`;
    let keyExpression = 'GSI1PK = :pk';
    const values: Record<string, any> = { ':pk': gsi1pk };

    if (section && section.trim()) {
      keyExpression += ' AND begins_with(GSI1SK, :sk)';
      values[':sk'] = `SEC#${section.toUpperCase().trim()}#`;
    }

    const { Items } = await docClient.send(new QueryCommand({
      TableName: MAIN_TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: keyExpression,
      ExpressionAttributeValues: values
    }));
    return Items || [];
  }

  // 5. Default school-wide listing (Base Table query)
  const { Items } = await docClient.send(new QueryCommand({
    TableName: MAIN_TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': `SCHOOL#${schoolId}`,
      ':sk': 'STUDENT#'
    }
  }));
  return Items || [];
  };

  const result = await fetch();
  await cache.set(cacheKey, result, 300);
  return result;
};
