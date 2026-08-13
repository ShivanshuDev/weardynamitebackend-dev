import { Request, Response } from 'express';
import * as MembershipService from './membership.service';
import { AuthRequest } from '../../middleware/auth';

export const createMembership = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
       res.status(401).json({ message: 'Unauthorized' });
       return;
    }
    const result = await MembershipService.createMembership(userId, req.body);
    res.status(201).json(result);
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};

export const listMemberships = async (_req: Request, res: Response) => {
  try {
    res.json(await MembershipService.listMemberships());
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};

export const getMyMembership = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
       res.status(401).json({ message: 'Unauthorized' });
       return;
    }
    const membership = await MembershipService.getMembership(userId);
    res.json(membership || null);
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};

export const getMembership = async (req: Request, res: Response) => {
  try {
    const membership = await MembershipService.getMembership(String(req.params.userId));
    if (!membership) {
       res.status(404).json({ message: 'Membership not found' });
       return;
    }
    res.json(membership);
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};
