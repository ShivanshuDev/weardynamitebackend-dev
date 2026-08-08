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
exports.sendQuotation = exports.convertToOrder = exports.updateQuotationStatus = exports.updateQuotation = exports.listQuotations = exports.getQuotation = exports.createQuotation = void 0;
const QuotationService = __importStar(require("./quotation.service"));
const mailService_1 = require("../../utils/mailService");
const createQuotation = async (req, res) => {
    try {
        const creatorName = req.user?.name || req.user?.id || 'admin';
        const quotation = await QuotationService.createQuotation({
            ...req.body,
            user_info: creatorName
        });
        res.status(201).json(quotation);
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.createQuotation = createQuotation;
const getQuotation = async (req, res) => {
    try {
        const quotation = await QuotationService.getQuotation(req.params.id);
        res.json(quotation);
    }
    catch (e) {
        res.status(404).json({ message: e.message });
    }
};
exports.getQuotation = getQuotation;
const listQuotations = async (req, res) => {
    try {
        const { status, email, lastKey, limit } = req.query;
        // Parse lastKey if it's a JSON string
        let parsedLastKey = undefined;
        if (lastKey && typeof lastKey === 'string') {
            try {
                parsedLastKey = JSON.parse(lastKey);
            }
            catch (err) {
                parsedLastKey = undefined;
            }
        }
        const result = await QuotationService.listQuotations({
            status: status,
            email: email,
            lastKey: parsedLastKey,
            limit: limit ? Number(limit) : undefined
        });
        res.json(result);
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.listQuotations = listQuotations;
const updateQuotation = async (req, res) => {
    try {
        const quotation = await QuotationService.updateQuotation(req.params.id, req.body);
        res.json(quotation);
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.updateQuotation = updateQuotation;
const updateQuotationStatus = async (req, res) => {
    try {
        const { status } = req.body;
        if (!status) {
            return res.status(400).json({ message: 'Status is required' });
        }
        const quotation = await QuotationService.updateQuotationStatus(req.params.id, status);
        res.json(quotation);
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.updateQuotationStatus = updateQuotationStatus;
const convertToOrder = async (req, res) => {
    try {
        const result = await QuotationService.convertToOrder(req.params.id);
        res.status(201).json(result);
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.convertToOrder = convertToOrder;
const sendQuotation = async (req, res) => {
    try {
        const quotation = await QuotationService.getQuotation(req.params.id);
        const { pdfBase64 } = req.body;
        let customPdfBuffer = undefined;
        if (pdfBase64) {
            customPdfBuffer = Buffer.from(pdfBase64, 'base64');
        }
        const result = await mailService_1.MailService.sendQuotationEmail(quotation.customerEmail, quotation.customerName, quotation, customPdfBuffer);
        if (result.success) {
            // Auto-update status to Sent if it was in Draft state
            const updates = { isEmailed: true };
            if (quotation.status === 'Draft') {
                updates.status = 'Sent';
            }
            const updatedQuotation = await QuotationService.updateQuotation(req.params.id, updates);
            res.json({ message: 'Quotation email dispatched successfully', quotation: updatedQuotation });
        }
        else {
            res.status(500).json({ message: 'Failed to dispatch email' });
        }
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.sendQuotation = sendQuotation;
