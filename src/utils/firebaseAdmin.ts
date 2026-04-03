import admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    const rawKey = process.env.FIREBASE_PRIVATE_KEY || '';
    // Only attempt initialization if the key looks remotely valid to prevent hard Node.js crashes
    if (rawKey.includes('-----BEGIN PRIVATE KEY-----') && rawKey.length > 100) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          // Replace literal \n with actual newlines if coming from .env
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
