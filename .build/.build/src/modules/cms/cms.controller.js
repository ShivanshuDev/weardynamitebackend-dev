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
exports.updateGallery = exports.updatePoliciesPrivacy = exports.updatePoliciesFaq = exports.updatePoliciesShipping = exports.updatePolicies = exports.updateContact = exports.updateProcess = exports.updateStandard = exports.updateHomeNewsletter = exports.updateHomeTrustFeatures = exports.updateHomeWhatWeDo = exports.updateHomeVipBanner = exports.updateHomeVideoBlock = exports.updateHomeProductSections = exports.updateHomeCollections = exports.updateHomePromos = exports.updateHomeCarousel = exports.updateCmsByPath = exports.getCms = void 0;
const CmsService = __importStar(require("./cms.service"));
const getCms = async (_req, res) => {
    try {
        res.json(await CmsService.getCms());
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.getCms = getCms;
const sectionUpdater = (section) => async (req, res) => {
    try {
        res.json(await CmsService.updateCmsSection(section, req.body));
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
const updateCmsByPath = async (req, res) => {
    try {
        const rawPath = req.params[0] || '';
        const path = rawPath.replace(/\//g, '.').replace(/^\.|\.$/g, '');
        res.json(await CmsService.updateCmsSection(path, req.body));
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.updateCmsByPath = updateCmsByPath;
exports.updateHomeCarousel = sectionUpdater('home.carousel');
exports.updateHomePromos = sectionUpdater('home.megaPromos');
exports.updateHomeCollections = sectionUpdater('home.categories');
exports.updateHomeProductSections = sectionUpdater('home.productSections');
exports.updateHomeVideoBlock = sectionUpdater('home.videoBlock');
exports.updateHomeVipBanner = sectionUpdater('home.vipBanner');
exports.updateHomeWhatWeDo = sectionUpdater('home.whatWeDo');
exports.updateHomeTrustFeatures = sectionUpdater('home.trustFeatures');
exports.updateHomeNewsletter = sectionUpdater('home.newsletter');
exports.updateStandard = sectionUpdater('standard');
exports.updateProcess = sectionUpdater('process');
exports.updateContact = sectionUpdater('contact');
exports.updatePolicies = sectionUpdater('policies');
exports.updatePoliciesShipping = sectionUpdater('policies.shipping');
exports.updatePoliciesFaq = sectionUpdater('policies.faq');
exports.updatePoliciesPrivacy = sectionUpdater('policies.privacy');
exports.updateGallery = sectionUpdater('gallery');
