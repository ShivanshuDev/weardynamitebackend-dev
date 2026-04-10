import { Request, Response } from 'express';
import * as NotificationService from './notification.service';
import * as BroadcastService from './broadcast.service';

export const createRequest = async (req: Request, res: Response) => {
  try {
    const { productId, productName, color, size, email } = req.body;
    
    if (!productId || !email) {
      return res.status(400).json({ message: 'Product ID and Email are required.' });
    }

    const request = await NotificationService.createNotificationRequest({
      productId,
      productName,
      color,
      size,
      email
    });

    res.status(201).json(request);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to save notification request.', error: error.message });
  }
};

export const getRequests = async (req: Request, res: Response) => {
  try {
    const requests = await NotificationService.listNotifications();
    res.json(requests);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch notification requests.', error: error.message });
  }
};

// ─── Broadcast Management (Admin) ──────────────────────────────────────────

export const createAndSendBroadcast = async (req: Request, res: Response) => {
  try {
    const { title, message, imageUrl, targetType, targetValue, channels, product } = req.body;

    if (!title || !message) {
      return res.status(400).json({ message: 'Title and Message are required for broadcast.' });
    }

    // 1. Save Campaign Record
    const campaign = await BroadcastService.createCampaign({
      title,
      message,
      imageUrl,
      targetType,
      targetValue,
      channels,
      product
    });

    // 2. Execute Async (Don't wait for thousands of emails to finish before responding)
    BroadcastService.executeBroadcast(campaign).catch(err => {
      console.error('[CRITICAL] Async Broadcast Execution Failed:', err);
    });

    res.status(201).json({ 
      message: 'Broadcast initiated successfully.', 
      campaignId: campaign.SK 
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to initiate broadcast.', error: error.message });
  }
};

export const getBroadcastHistory = async (req: Request, res: Response) => {
  try {
    const campaigns = await BroadcastService.listCampaigns();
    res.json(campaigns);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch broadcast history.', error: error.message });
  }
};
