"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const CmsController = __importStar(require("./cms.controller"));
const auth_1 = require("../../middleware/auth");
const router = (0, express_1.Router)();
const auth = auth_1.authenticate;
const admin = auth_1.adminOnly;
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
router.put('/gallery', auth, admin, CmsController.updateGallery);
exports.default = router;
