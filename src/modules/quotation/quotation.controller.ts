import { Request, Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import * as QuotationService from './quotation.service';
import { MailService } from '../../utils/mailService';

export const createQuotation = async (req: AuthRequest, res: Response) => {
  try {
    const creatorName = (req.user as any)?.name || req.user?.id || 'admin';
    const quotation = await QuotationService.createQuotation({
      ...req.body,
      user_info: creatorName
    });
    res.status(201).json(quotation);
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};

export const getQuotation = async (req: Request, res: Response) => {
  try {
    const quotation = await QuotationService.getQuotation(String(req.params.id));
    res.json(quotation);
  } catch (e: any) {
    res.status(404).json({ message: e.message });
  }
};

export const listQuotations = async (req: Request, res: Response) => {
  try {
    const { status, email, lastKey, limit } = req.query;
    
    // Parse lastKey if it's a JSON string
    let parsedLastKey: any = undefined;
    if (lastKey && typeof lastKey === 'string') {
      try {
        parsedLastKey = JSON.parse(lastKey);
      } catch (err) {
        parsedLastKey = undefined;
      }
    }

    const result = await QuotationService.listQuotations({
      status: status as string,
      email: email as string,
      lastKey: parsedLastKey,
      limit: limit ? Number(limit) : undefined
    });
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};

export const updateQuotation = async (req: Request, res: Response) => {
  try {
    const quotation = await QuotationService.updateQuotation(String(req.params.id), req.body);
    res.json(quotation);
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};

export const updateQuotationStatus = async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }
    const quotation = await QuotationService.updateQuotationStatus(String(req.params.id), status);
    res.json(quotation);
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};

export const convertToOrder = async (req: Request, res: Response) => {
  try {
    const result = await QuotationService.convertToOrder(String(req.params.id));
    res.status(201).json(result);
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};

export const sendQuotation = async (req: Request, res: Response) => {
  try {
    const quotation = await QuotationService.getQuotation(String(req.params.id));
    const { pdfBase64 } = req.body;
    let customPdfBuffer: Buffer | undefined = undefined;
    if (pdfBase64) {
      customPdfBuffer = Buffer.from(pdfBase64, 'base64');
    }
    
    const result = await MailService.sendQuotationEmail(
      quotation.customerEmail,
      quotation.customerName,
      quotation,
      customPdfBuffer
    );

    if (result.success) {
      // Auto-update status to Sent if it was in Draft state
      const updates: any = { isEmailed: true };
      if (quotation.status === 'Draft') {
        updates.status = 'Sent';
      }
      const updatedQuotation = await QuotationService.updateQuotation(String(req.params.id), updates);
      res.json({ message: 'Quotation email dispatched successfully', quotation: updatedQuotation });
    } else {
      res.status(500).json({ message: 'Failed to dispatch email' });
    }
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};
