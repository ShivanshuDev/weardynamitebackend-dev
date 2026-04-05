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
    let decodedToken;
    try {
      decodedToken = await firebaseAdmin.auth().verifyIdToken(token);
    } catch (verifyError: any) {
      if (verifyError.code === 'auth/argument-error' && verifyError.message.includes('kid')) {
        console.error('[AUTH ERROR] Token missing "kid" claim. This usually means an Access Token or Custom Token was sent instead of an ID Token.');
      } else {
        console.error('[AUTH ERROR] Token Verification Failed:', verifyError.message);
      }
      throw verifyError;
    }
    
    // Attach user information derived from Firebase Token
    req.user = {
      id: decodedToken.uid,
      firebaseUid: decodedToken.uid,
      email: decodedToken.email || '',
      role: (decodedToken.admin || decodedToken.email === 'skshivanshu1234@gmail.com') ? 'admin' : 'customer'
    };
    
    next();
  } catch (error: any) {
    const isNoKid = error.message.includes('kid');
    res.status(401).json({ 
      message: isNoKid ? 'Unauthorized: Token is not a valid Firebase ID Token (Missing kid claim)' : 'Unauthorized: Invalid Firebase token', 
      error: error.message,
      hint: isNoKid ? 'Ensure you are passing the result of user.getIdToken() from the frontend, not an access token.' : undefined
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
