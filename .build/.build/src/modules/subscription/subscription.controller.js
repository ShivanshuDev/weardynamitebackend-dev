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
exports.handleList = exports.handleSubscribe = void 0;
const subscriptionService = __importStar(require("./subscription.service"));
const handleSubscribe = async (req, res) => {
    const { email, name, phone } = req.body;
    if (!email) {
        return res.status(400).json({ message: 'Email required for VIP access' });
    }
    try {
        const identifier = req.user?.id || req.ip || email;
        const record = await subscriptionService.subscribe({ email, name, phone, identifier });
        return res.status(200).json({
            message: 'You are now subscribed to the Dynamite Club',
            data: record
        });
    }
    catch (error) {
        if (error.message.includes('reached limit')) {
            return res.status(429).json({ message: error.message });
        }
        // Handling Transactional Uniqueness Failures
        if (error.name === 'TransactionCanceledException') {
            const reasons = error.CancellationReasons || [];
            const emailTaken = reasons[0]?.Code === 'ConditionalCheckFailed';
            const phoneTaken = reasons[1]?.Code === 'ConditionalCheckFailed';
            if (emailTaken) {
                return res.status(409).json({ message: 'You are already a member, thank you' });
            }
            if (phoneTaken) {
                return res.status(409).json({ message: 'This mobile number is already registered' });
            }
        }
        // Fallback for PutCommand legacy or unexpected errors
        if (error.name === 'ConditionalCheckFailedException') {
            return res.status(409).json({ message: 'Identity already exists in our VIP archives' });
        }
        console.error('Subscription error:', error);
        return res.status(500).json({ message: 'Operational failure' });
    }
};
exports.handleSubscribe = handleSubscribe;
const handleList = async (_req, res) => {
    try {
        const items = await subscriptionService.listSubscribers();
        return res.status(200).json(items);
    }
    catch (error) {
        console.error('List subscribers error:', error);
        return res.status(500).json({ message: 'Database unreachable' });
    }
};
exports.handleList = handleList;
