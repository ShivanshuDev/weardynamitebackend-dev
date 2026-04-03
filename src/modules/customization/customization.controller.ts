import { Request, Response } from 'express';
import * as CustomizationService from './customization.service';

export const submitPrint = (req: Request, res: Response) => {
  try { res.status(201).json(CustomizationService.submitPrintCustomization(req.body)); } catch (e: any) { res.status(400).json({ message: e.message }); }
};
export const submitEmbroidery = (req: Request, res: Response) => {
  try { res.status(201).json(CustomizationService.submitEmbroideryCustomization(req.body)); } catch (e: any) { res.status(400).json({ message: e.message }); }
};
export const submitDesignStudio = (req: Request, res: Response) => {
  try { res.status(201).json(CustomizationService.submitDesignStudioOrder(req.body)); } catch (e: any) { res.status(400).json({ message: e.message }); }
};
export const listCustomOrders = (req: Request, res: Response) => {
  try { res.json(CustomizationService.listCustomOrders(req.query as any)); } catch (e: any) { res.status(400).json({ message: e.message }); }
};
export const updateCustomOrderStatus = (req: Request, res: Response) => {
  try { res.json(CustomizationService.updateCustomOrderStatus(req.params.id as string, req.body.status as string)); } catch (e: any) { res.status(400).json({ message: e.message }); }
};
