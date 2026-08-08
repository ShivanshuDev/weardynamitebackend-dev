"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeAdmin = exports.createAdminAccount = exports.syncUser = void 0;
const firebaseAdmin_1 = require("../../utils/firebaseAdmin");
const awsClient_1 = require("../../utils/awsClient");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const mailService_1 = require("../../utils/mailService");
// ─── Customer / Admin Sync (Firebase Driven) ─────────────────────────────────
/**
 * Ensures a user authenticated via Firebase exists in our DynamoDB Single-Table Schema.
 */
const syncUser = async (uid, email, name, role = 'customer', photoURL) => {
    const getCmd = new lib_dynamodb_1.GetCommand({
        TableName: awsClient_1.MAIN_TABLE,
        Key: { PK: `USER#${uid}`, SK: 'PROFILE' }
    });
    const { Item } = await awsClient_1.docClient.send(getCmd);
    // If the user already exists in DynamoDB, check if updates are needed
    if (Item) {
        console.log(`[AUTH DEBUG] User already exists in DynamoDB: ${uid}. Skipping email.`);
        if ((name && Item.name !== name) || (photoURL && Item.photoURL !== photoURL)) {
            const updatedProfile = { ...Item, name: name || Item.name, photoURL: photoURL || Item.photoURL };
            await awsClient_1.docClient.send(new lib_dynamodb_1.PutCommand({ TableName: awsClient_1.MAIN_TABLE, Item: updatedProfile }));
            return updatedProfile;
        }
        return Item;
    }
    console.log(`[AUTH DEBUG] New user detected: ${uid}. Proceeding with profile creation and welcome email.`);
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
        photoURL: photoURL || '',
        role,
        joinedDate: now,
    };
    await awsClient_1.docClient.send(new lib_dynamodb_1.PutCommand({
        TableName: awsClient_1.MAIN_TABLE,
        Item: newProfile,
    }));
    // ─── Post-Sync: Welcome Communications (Async) ───────────────────────────
    mailService_1.MailService.sendWelcomeEmail(safeEmail, safeName).catch(err => {
        console.error(`[AUTH] Welcome email dispatch failed for ${safeEmail}:`, err);
    });
    return newProfile;
};
exports.syncUser = syncUser;
// ─── Role Management ────────────────────────────────────────────────────────
/**
 * Super Admin strictly created via Backend APIs preventing open registration.
 */
const createAdminAccount = async (email, password, name) => {
    // 1. Manually create the Firebase Identity
    const fbUser = await firebaseAdmin_1.firebaseAdmin.auth().createUser({
        email: email.toLowerCase(),
        password,
        displayName: name,
    });
    // 2. Hardcode the admin claim directly into the identity token
    await firebaseAdmin_1.firebaseAdmin.auth().setCustomUserClaims(fbUser.uid, { admin: true });
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
    await awsClient_1.docClient.send(new lib_dynamodb_1.PutCommand({
        TableName: awsClient_1.MAIN_TABLE,
        Item: adminProfile,
    }));
    return { message: 'Admin Provisioned Securely', adminId: fbUser.uid };
};
exports.createAdminAccount = createAdminAccount;
/**
 * Assigns admin privileges to an existing Firebase user.
 */
const makeAdmin = async (uid) => {
    await firebaseAdmin_1.firebaseAdmin.auth().setCustomUserClaims(uid, { admin: true });
    // Notice: We also need to update the GSI1PK to ROLE#admin in the database
    // to ensure sorting and role-based searching works universally.
    return { message: `User ${uid} successfully granted admin privileges.` };
};
exports.makeAdmin = makeAdmin;
