import { Request, Response } from 'express';
import * as AuthService from './auth.service';
import { AuthRequest } from '../../middleware/auth';

export const sync = async (req: AuthRequest, res: Response) => {
  try {
    // The middleware attached req.user with Firebase token data
    const user = req.user; 
    if (!user) {
      return res.status(401).json({ message: 'Sync failed: No authenticated user context.' });
    }

    // Capture optional name submitted from frontend
    const { name } = req.body;
    
    // Sync the Firebase authenticated user with our explicit DynamoDB master profile
    const profile = await AuthService.syncUser(user.id, user.email, name, user.role);
    res.json({ message: 'Synchronized profile', profile });
  } catch (e: any) { 
    console.error('[AUTH_SYNC_ERROR]', e);
    res.status(400).json({ 
      message: 'Authentication Sync Failed', 
      error: e.message, 
      details: e.stack 
    }); 
  }
};

export const assignAdmin = async (req: Request, res: Response) => {
  try {
    const { uid } = req.body;
    if (!uid) {
      return res.status(400).json({ message: 'Firebase UID required to grant admin.' });
    }
    const result = await AuthService.makeAdmin(uid);
    res.json(result);
  } catch (e: any) { 
    res.status(400).json({ message: e.message }); 
  }
};

export const createAdmin = async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ message: 'Email, password, and name required' });
    }
    const result = await AuthService.createAdminAccount(email, password, name);
    res.status(201).json(result);
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};
