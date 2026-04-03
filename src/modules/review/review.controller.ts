import { Request, Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import * as ReviewService from './review.service';

export const getReviews = (req: Request, res: Response) => {
  try { res.json(ReviewService.getReviews(req.params.id as string)); }
  catch (e: any) { res.status(400).json({ message: e.message }); }
};

export const submitReview = (req: AuthRequest, res: Response) => {
  try { res.status(201).json(ReviewService.submitReview(req.params.id as string, req.user!.id, req.body)); }
  catch (e: any) { res.status(400).json({ message: e.message }); }
};
