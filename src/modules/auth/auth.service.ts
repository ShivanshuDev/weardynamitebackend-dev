import { firebaseAdmin } from '../../utils/firebaseAdmin';
import { docClient, MAIN_TABLE } from '../../utils/awsClient';
import { PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';

// ─── Customer / Admin Sync (Firebase Driven) ─────────────────────────────────

/**
 * Ensures a user authenticated via Firebase exists in our DynamoDB Single-Table Schema.
 */
export const syncUser = async (uid: string, email: string, name?: string, role: string = 'customer') => {
  const getCmd = new GetCommand({
    TableName: MAIN_TABLE,
    Key: { PK: `USER#${uid}`, SK: 'PROFILE' }
  });
  
  const { Item } = await docClient.send(getCmd);
  
  // If the user already exists in DynamoDB, just return their profile
  if (Item) {
    return Item;
  }

  // Otherwise, create their Master Profile utilizing our explicit Identity GSIs
  const now = Date.now();
  const safeEmail = (email || `user_${uid}@weardynamite.com`).toLowerCase();
  const safeName = name || safeEmail.split('@')[0] || 'User';

  const newProfile = {
    PK: `USER#${uid}`,
    SK: 'PROFILE',
    GSI1PK: 'USER',
    GSI1SK: `ROLE#${role}#ID#${uid}`,
    GSI2PK: `EMAIL#${safeEmail}`,
    GSI2SK: 'PROFILE',
    
    // Core attributes
    id: uid, 
    firebaseUid: uid,
    email: safeEmail,
    name: safeName,
    role,
    joinedDate: now,
  };
  
  await docClient.send(new PutCommand({
    TableName: MAIN_TABLE,
    Item: newProfile,
  }));
  
  return newProfile;
};

// ─── Role Management ────────────────────────────────────────────────────────

/**
 * Super Admin strictly created via Backend APIs preventing open registration.
 */
export const createAdminAccount = async (email: string, password: string, name: string) => {
  // 1. Manually create the Firebase Identity
  const fbUser = await firebaseAdmin.auth().createUser({
    email: email.toLowerCase(),
    password,
    displayName: name,
  });

  // 2. Hardcode the admin claim directly into the identity token
  await firebaseAdmin.auth().setCustomUserClaims(fbUser.uid, { admin: true });

  // 3. Persist the Master Profile into the Database
  const now = Date.now();
  const adminProfile = {
    PK: `USER#${fbUser.uid}`,
    SK: 'PROFILE',
    GSI1PK: 'USER',
    GSI1SK: `ROLE#admin#ID#${fbUser.uid}`,
    GSI2PK: `EMAIL#${email.toLowerCase()}`,
    GSI2SK: 'PROFILE',
    id: fbUser.uid,
    firebaseUid: fbUser.uid,
    email: email.toLowerCase(),
    name,
    role: 'admin',
    joinedDate: now,
  };

  await docClient.send(new PutCommand({
    TableName: MAIN_TABLE,
    Item: adminProfile,
  }));

  return { message: 'Admin Provisioned Securely', adminId: fbUser.uid };
};

/**
 * Assigns admin privileges to an existing Firebase user.
 */
export const makeAdmin = async (uid: string) => {
  await firebaseAdmin.auth().setCustomUserClaims(uid, { admin: true });
  
  // Notice: We also need to update the GSI1PK to ROLE#admin in the database
  // to ensure sorting and role-based searching works universally.
  return { message: `User ${uid} successfully granted admin privileges.` };
};
