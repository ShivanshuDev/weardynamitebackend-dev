import { Request, Response } from 'express';
import * as AnalyticsService from './analytics.service';

export const trackVisit = async (req: Request, res: Response) => {
  try {
    const result = await AnalyticsService.trackVisit(req.body || {});
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};

export const trackProductView = async (req: Request, res: Response) => {
  try {
    const result = await AnalyticsService.trackProductView(req.params.id as string);
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};

export const trackSearch = async (req: Request, res: Response) => {
  try {
    const { query } = req.body;
    const result = await AnalyticsService.trackSearch(query);
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};

export const getOverview = async (req: Request, res: Response) => {
  try {
    // Pass query params for timeframe
    const result = await AnalyticsService.getOverview(req.query.timeframe as string);
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};

export const trackCart = async (req: Request, res: Response) => {
  try {
    const result = await AnalyticsService.trackCart(req.body);
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};
