import { Request, Response } from 'express';
import * as subscriptionService from './subscription.service';

export const handleSubscribe = async (req: Request, res: Response) => {
  const { email, name, phone } = req.body;
  
  if (!email) {
    return res.status(400).json({ message: 'Email required for VIP access' });
  }

  try {
    const record = await subscriptionService.subscribe({ email, name, phone });
    return res.status(200).json({ 
      message: 'You are now subscribed to the Dynamite Club', 
      data: record 
    });
  } catch (error: any) {
    // Handling Transactional Uniqueness Failures
    if (error.name === 'TransactionCanceledException') {
      const reasons = error.CancellationReasons || [];
      const emailTaken = reasons[0]?.Code === 'ConditionalCheckFailed';
      const phoneTaken = reasons[1]?.Code === 'ConditionalCheckFailed';

      if (emailTaken) {
        return res.status(409).json({ message: 'You are already a member, thank you' });
      }
      if (phoneTaken) {
        return res.status(409).json({ message: 'This mobile number is already registered' });
      }
    }
    
    // Fallback for PutCommand legacy or unexpected errors
    if (error.name === 'ConditionalCheckFailedException') {
      return res.status(409).json({ message: 'Identity already exists in our VIP archives' });
    }

    console.error('Subscription error:', error);
    return res.status(500).json({ message: 'Operational failure' });
  }
};

export const handleList = async (_req: Request, res: Response) => {
  try {
    const items = await subscriptionService.listSubscribers();
    return res.status(200).json(items);
  } catch (error) {
    console.error('List subscribers error:', error);
    return res.status(500).json({ message: 'Database unreachable' });
  }
};
