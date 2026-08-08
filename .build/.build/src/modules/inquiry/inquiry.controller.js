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
exports.exportSubscribers = exports.listSubscribers = exports.unsubscribe = exports.subscribe = exports.listMyInquiries = exports.getBulkOrders = exports.getInquiryDetail = exports.deleteInquiry = exports.updateInquiryStatus = exports.listInquiries = exports.submitInquiry = void 0;
const InquiryService = __importStar(require("./inquiry.service"));
// Inquiries
const submitInquiry = async (req, res) => {
    try {
        res.status(201).json(await InquiryService.submitInquiry(req.body));
    }
    catch (e) {
        const status = e.message.includes('reached limit') ? 429 : 400;
        res.status(status).json({ message: e.message });
    }
};
exports.submitInquiry = submitInquiry;
const listInquiries = async (req, res) => {
    try {
        res.json(await InquiryService.listInquiries(req.query.status || undefined));
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.listInquiries = listInquiries;
const updateInquiryStatus = async (req, res) => {
    try {
        res.json(await InquiryService.updateInquiryStatus(req.params.id, req.body.status));
    }
    catch (e) {
        res.status(404).json({ message: e.message });
    }
};
exports.updateInquiryStatus = updateInquiryStatus;
const deleteInquiry = async (req, res) => {
    try {
        res.json(await InquiryService.deleteInquiry(req.params.id));
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.deleteInquiry = deleteInquiry;
const getInquiryDetail = async (req, res) => {
    try {
        res.json(await InquiryService.getInquiryDetail(req.params.id));
    }
    catch (e) {
        res.status(404).json({ message: e.message });
    }
};
exports.getInquiryDetail = getInquiryDetail;
const getBulkOrders = async (req, res) => {
    try {
        const params = {
            status: req.query.status,
            orderType: req.query.orderType,
            lastKey: req.query.lastKey,
            limit: req.query.limit ? parseInt(req.query.limit) : undefined
        };
        res.json(await InquiryService.listBulkOrders(params));
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.getBulkOrders = getBulkOrders;
const listMyInquiries = async (req, res) => {
    try {
        const email = req.user?.email;
        if (!email)
            return res.status(401).json({ message: 'User email not found in token' });
        res.json(await InquiryService.listInquiriesByUser(email));
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.listMyInquiries = listMyInquiries;
// Subscribers
const subscribe = async (req, res) => {
    try {
        res.status(201).json(await InquiryService.subscribe(req.body.email));
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.subscribe = subscribe;
const unsubscribe = async (req, res) => {
    try {
        res.json(await InquiryService.unsubscribe(req.body.email));
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.unsubscribe = unsubscribe;
const listSubscribers = async (_req, res) => {
    try {
        res.json(await InquiryService.listSubscribers());
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.listSubscribers = listSubscribers;
const exportSubscribers = (_req, res) => {
    try {
        const csv = InquiryService.exportSubscribersCSV();
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=subscribers.csv');
        res.send(csv);
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.exportSubscribers = exportSubscribers;
