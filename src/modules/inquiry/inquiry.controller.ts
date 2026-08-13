import { Request, Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import * as InquiryService from './inquiry.service';

// Inquiries
export const submitInquiry = async (req: Request, res: Response) => {
  try {
    res.status(201).json(await InquiryService.submitInquiry(req.body));
  } catch (e: any) {
    const status = e.message.includes('reached limit') ? 429 : 400;
    res.status(status).json({ message: e.message });
  }
};
export const listInquiries = async (req: Request, res: Response) => {
  try { res.json(await InquiryService.listInquiries()); } catch (e: any) { res.status(400).json({ message: e.message }); }
};
export const updateInquiryStatus = async (req: Request, res: Response) => {
  try { res.json(await InquiryService.updateInquiryStatus(req.params.id as string, req.body.status)); } catch (e: any) { res.status(404).json({ message: e.message }); }
};
export const deleteInquiry = async (req: Request, res: Response) => {
  try { res.json(await InquiryService.deleteInquiry(req.params.id as string)); } catch (e: any) { res.status(400).json({ message: e.message }); }
};

export const getInquiryDetail = async (req: Request, res: Response) => {
  try { res.json(await InquiryService.getInquiryDetail(req.params.id as string)); } catch (e: any) { res.status(404).json({ message: e.message }); }
};

export const getBulkOrders = async (req: Request, res: Response) => {
  try {
    const params = {
      status: req.query.status as string,
      orderType: req.query.orderType as string,
      lastKey: req.query.lastKey as string,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined
    };
    res.json(await InquiryService.listBulkOrders(params));
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};

export const listMyInquiries = async (req: AuthRequest, res: Response) => {
  try {
    const email = req.user?.email;
    if (!email) return res.status(401).json({ message: 'User email not found in token' });
    res.json(await InquiryService.listInquiriesByUser(email));
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};

// Subscribers
export const subscribe = async (req: Request, res: Response) => {
  try { res.status(201).json(await InquiryService.subscribe(req.body.email)); } catch (e: any) { res.status(400).json({ message: e.message }); }
};
export const unsubscribe = async (req: Request, res: Response) => {
  try { res.json(await InquiryService.unsubscribe(req.body.email)); } catch (e: any) { res.status(400).json({ message: e.message }); }
};
export const listSubscribers = async (_req: Request, res: Response) => {
  try { res.json(await InquiryService.listSubscribers()); } catch (e: any) { res.status(400).json({ message: e.message }); }
};
export const exportSubscribers = (_req: Request, res: Response) => {
  try {
    const csv = InquiryService.exportSubscribersCSV();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=subscribers.csv');
    res.send(csv);
  } catch (e: any) { res.status(400).json({ message: e.message }); }
};
