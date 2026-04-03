import { Request, Response, NextFunction } from 'express';
import { firebaseAdmin } from '../utils/firebaseAdmin';

export interface AuthRequest extends Request {
  user?: { id: string; email: string; role: string; firebaseUid: string };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Unauthorized: No token provided' });
    return;
  }
  
  try {
    const token = authHeader.split(' ')[1];
    
    // HARDCODED ADMIN BYPASS
    if (token === 'admin-bypass-token-2026') {
      req.user = {
        id: 'MASTER-ADMIN',
        firebaseUid: 'MASTER-ADMIN',
        email: 'admin@weardynamite.com',
        role: 'admin'
      };
      return next();
    }
    
    // Verify the Firebase ID Token
    const decodedToken = await firebaseAdmin.auth().verifyIdToken(token);
    
    // Attach user information derived from Firebase Token
    // In Firebase, we can use custom claims (e.g., admin: true) to dictate roles
    req.user = {
      id: decodedToken.uid, // We map DynamoDB USER#<id> to the Firebase UID
      firebaseUid: decodedToken.uid,
      email: decodedToken.email || '',
      role: (decodedToken.admin || decodedToken.email === 'skshivanshu1234@gmail.com') ? 'admin' : 'customer'
    };
    
    next();
  } catch (error: any) {
    res.status(401).json({ 
      message: 'Unauthorized: Invalid Firebase token', 
      error: error.message 
    });
  }
};

export const adminOnly = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ message: 'Forbidden: Admin access required' });
    return;
  }
  next();
};
