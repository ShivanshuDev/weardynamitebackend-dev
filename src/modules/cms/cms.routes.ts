import { Router } from 'express';
import * as CmsController from './cms.controller';
import { authenticate, adminOnly } from '../../middleware/auth';

const router = Router();
const auth = authenticate as any;
const admin = adminOnly as any;

router.get('/', auth, admin, CmsController.getCms);
router.get('/public', CmsController.getCms);

router.put('/home/carousel', auth, admin, CmsController.updateHomeCarousel);
router.put('/home/megaPromos', auth, admin, CmsController.updateHomePromos);
router.put('/home/categories', auth, admin, CmsController.updateHomeCollections);
router.put('/home/collections', auth, admin, CmsController.updateHomeCollections); // Alias for safety
router.put('/home/productSections', auth, admin, CmsController.updateHomeProductSections);
router.put('/home/videoBlock', auth, admin, CmsController.updateHomeVideoBlock);
router.put('/home/vipBanner', auth, admin, CmsController.updateHomeVipBanner);
router.put('/home/whatWeDo', auth, admin, CmsController.updateHomeWhatWeDo);
router.put('/home/trustFeatures', auth, admin, CmsController.updateHomeTrustFeatures);
router.put('/home/newsletter', auth, admin, CmsController.updateHomeNewsletter);
router.put('/standard', auth, admin, CmsController.updateStandard);
router.put('/process', auth, admin, CmsController.updateProcess);
router.put('/contact', auth, admin, CmsController.updateContact);
router.put('/policies', auth, admin, CmsController.updatePolicies);
router.put('/policies/shipping', auth, admin, CmsController.updatePoliciesShipping);
router.put('/policies/faq', auth, admin, CmsController.updatePoliciesFaq);
router.put('/policies/privacy', auth, admin, CmsController.updatePoliciesPrivacy);

export default router;
