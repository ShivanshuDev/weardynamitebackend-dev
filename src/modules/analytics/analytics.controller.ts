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
    const { timeframe, startDate, endDate } = req.query;
    const result = await AnalyticsService.getOverview(
      timeframe as string, 
      startDate as string, 
      endDate as string
    );
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

import { AnalyticsAIService } from './analytics.ai.service';

export const generateAIInsights = async (req: Request, res: Response) => {
  try {
    const insights = await AnalyticsAIService.generateInsights(req.body.analyticsData);
    res.json({ insights });
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};

export const chatWithData = async (req: Request, res: Response) => {
  try {
    const { analyticsData, query } = req.body;
    const answer = await AnalyticsAIService.chatWithData(analyticsData, query);
    res.json({ answer });
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};
