import { Router } from 'express';
import * as AnalyticsController from './analytics.controller';
import { authenticate, adminOnly } from '../../middleware/auth';

const router = Router();

// ── Public Tracking routes ───────────────────────────────────────────────────
router.post('/visit', AnalyticsController.trackVisit);
router.post('/product-view/:id', AnalyticsController.trackProductView);
router.post('/search', AnalyticsController.trackSearch);
router.post('/cart', AnalyticsController.trackCart);

// ── Admin routes ─────────────────────────────────────────────────────────────
router.get('/admin/overview', authenticate as any, adminOnly as any, AnalyticsController.getOverview);
router.post('/admin/ai-insights', authenticate as any, adminOnly as any, AnalyticsController.generateAIInsights);
router.post('/admin/ai-chat', authenticate as any, adminOnly as any, AnalyticsController.chatWithData);

export default router;
