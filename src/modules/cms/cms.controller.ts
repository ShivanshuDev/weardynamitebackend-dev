import { Request, Response } from 'express';
import * as CmsService from './cms.service';

export const getCms = async (_req: Request, res: Response) => {
  try { res.json(await CmsService.getCms()); } catch (e: any) { res.status(400).json({ message: e.message }); }
};

const sectionUpdater = (section: string) => async (req: Request, res: Response) => {
  try { res.json(await CmsService.updateCmsSection(section, req.body)); } catch (e: any) { res.status(400).json({ message: e.message }); }
};

export const updateCmsByPath = async (req: Request, res: Response) => {
  try {
    let rawPath = '';
    if (Array.isArray(req.params.path)) {
      rawPath = req.params.path.join('/');
    } else {
      rawPath = String(req.params.path || req.params[0] || '');
    }
    const path = rawPath.replace(/\//g, '.').replace(/^\.|\.$/g, '');
    res.json(await CmsService.updateCmsSection(path, req.body));
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
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
export const updatePolicies = sectionUpdater('policies');
export const updatePoliciesShipping = sectionUpdater('policies.shipping');
export const updatePoliciesFaq = sectionUpdater('policies.faq');
export const updatePoliciesPrivacy = sectionUpdater('policies.privacy');
export const updateGallery = sectionUpdater('gallery');
