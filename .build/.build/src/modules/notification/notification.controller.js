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
exports.getBroadcastHistory = exports.createAndSendBroadcast = exports.getRequests = exports.createRequest = void 0;
const NotificationService = __importStar(require("./notification.service"));
const BroadcastService = __importStar(require("./broadcast.service"));
const createRequest = async (req, res) => {
    try {
        const { productId, productName, color, size, email } = req.body;
        if (!productId || !email) {
            return res.status(400).json({ message: 'Product ID and Email are required.' });
        }
        const request = await NotificationService.createNotificationRequest({
            productId,
            productName,
            color,
            size,
            email
        });
        res.status(201).json(request);
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to save notification request.', error: error.message });
    }
};
exports.createRequest = createRequest;
const getRequests = async (req, res) => {
    try {
        const requests = await NotificationService.listNotifications();
        res.json(requests);
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to fetch notification requests.', error: error.message });
    }
};
exports.getRequests = getRequests;
// ─── Broadcast Management (Admin) ──────────────────────────────────────────
const createAndSendBroadcast = async (req, res) => {
    try {
        const { title, message, imageUrl, targetType, targetValue, channels, product } = req.body;
        if (!title || !message) {
            return res.status(400).json({ message: 'Title and Message are required for broadcast.' });
        }
        // 1. Save Campaign Record
        const campaign = await BroadcastService.createCampaign({
            title,
            message,
            imageUrl,
            targetType,
            targetValue,
            channels,
            product
        });
        // 2. Execute Async (Don't wait for thousands of emails to finish before responding)
        BroadcastService.executeBroadcast(campaign).catch(err => {
            console.error('[CRITICAL] Async Broadcast Execution Failed:', err);
        });
        res.status(201).json({
            message: 'Broadcast initiated successfully.',
            campaignId: campaign.SK
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to initiate broadcast.', error: error.message });
    }
};
exports.createAndSendBroadcast = createAndSendBroadcast;
const getBroadcastHistory = async (req, res) => {
    try {
        const campaigns = await BroadcastService.listCampaigns();
        res.json(campaigns);
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to fetch broadcast history.', error: error.message });
    }
};
exports.getBroadcastHistory = getBroadcastHistory;
