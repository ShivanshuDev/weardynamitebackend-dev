import { Request, Response } from 'express';
import * as CmsService from './cms.service';

export const getCms = (_req: Request, res: Response) => {
  try { res.json(CmsService.getCms()); } catch (e: any) { res.status(400).json({ message: e.message }); }
};

const sectionUpdater = (section: string) => (req: Request, res: Response) => {
  try { res.json(CmsService.updateCmsSection(section, req.body)); } catch (e: any) { res.status(400).json({ message: e.message }); }
};

export const updateHomeCarousel = sectionUpdater('home.carousel');
export const updateHomePromos = sectionUpdater('home.megaPromos');
export const updateHomeCollections = sectionUpdater('home.categories');
export const updateHomeProductSections = sectionUpdater('home.productSections');
export const updateHomeVideoBlock = sectionUpdater('home.videoBlock');
export const updateHomeVipBanner = sectionUpdater('home.vipBanner');
export const updateHomeWhatWeDo = sectionUpdater('home.whatWeDo');
export const updateHomeTrustFeatures = sectionUpdater('home.trustFeatures');
export const updateHomeNewsletter = sectionUpdater('home.newsletter');
export const updateStandard = sectionUpdater('standard');
export const updateProcess = sectionUpdater('process');
export const updateContact = sectionUpdater('contact');
export const updatePoliciesShipping = sectionUpdater('policies.shipping');
export const updatePoliciesFaq = sectionUpdater('policies.faq');
export const updatePoliciesPrivacy = sectionUpdater('policies.privacy');
