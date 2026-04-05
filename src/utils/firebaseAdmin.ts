import admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    let rawKey = process.env.FIREBASE_PRIVATE_KEY || '';
    
    // Cleanup: Remove potential outer quotes and handle literal/escaped newlines
    rawKey = rawKey.trim();
    if (rawKey.startsWith('"') && rawKey.endsWith('"')) {
      rawKey = rawKey.substring(1, rawKey.length - 1);
    }
    
    if (rawKey.includes('-----BEGIN PRIVATE KEY-----')) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: rawKey.replace(/\\n/g, '\n'),
        }),
      });
      console.log('[FIREBASE] Admin SDK Initialized Successfully.');
    } else {
      console.warn('[FIREBASE] Warning: FIREBASE_PRIVATE_KEY is missing or invalid in .env. Auth will fail.');
    }
  } catch (error) {
    console.error('[FIREBASE] Error initializing Admin SDK:', error);
  }
}

export const firebaseAdmin = admin;
