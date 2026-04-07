import { Request, Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import * as ReviewService from './review.service';

export const getReviews = async (req: Request, res: Response) => {
  try { 
    const reviews = await ReviewService.getReviewsByProduct(req.params.id as string);
    res.json(reviews); 
  }
  catch (e: any) { res.status(400).json({ message: e.message }); }
};

export const submitReview = async (req: AuthRequest, res: Response) => {
  try { 
    const { orderId, ...data } = req.body;
    if (!orderId) throw new Error('OrderId is required for verified reviews');
    
    const result = await ReviewService.addReview(
      req.user!.id, 
      req.params.id as string, 
      orderId, 
      data
    );
    res.status(201).json(result); 
  }
  catch (e: any) { res.status(400).json({ message: e.message }); }
};
