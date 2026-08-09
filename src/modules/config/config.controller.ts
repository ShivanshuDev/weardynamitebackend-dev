import { Request, Response } from 'express';
import * as ConfigService from './config.service';

export const getMembershipPricing = async (_req: Request, res: Response) => {
  try {
    const data = await ConfigService.getMembershipPricing();
    res.json(data);
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};

export const updateMembershipPricing = async (req: Request, res: Response) => {
  try {
    const data = await ConfigService.updateMembershipPricing(req.body);
    res.json(data);
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};
