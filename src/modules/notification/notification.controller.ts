import { Request, Response } from 'express';
import * as NotificationService from './notification.service';

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
