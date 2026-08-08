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
exports.addVendorTransaction = exports.listVendorTransactions = exports.updateVendor = exports.createVendor = exports.listVendors = void 0;
const VendorService = __importStar(require("./vendor.service"));
/**
 * List all vendors for admin.
 */
const listVendors = async (req, res) => {
    try {
        res.json(await VendorService.listVendors());
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.listVendors = listVendors;
/**
 * Handle new vendor onboarding.
 */
const createVendor = async (req, res) => {
    try {
        const { name, email, category } = req.body;
        if (!name || !email || !category) {
            return res.status(400).json({ message: 'Missing mandatory fields for vendor onboarding.' });
        }
        const record = await VendorService.createVendor(req.body);
        res.status(201).json(record);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.createVendor = createVendor;
/**
 * Handle vendor profile updates.
 */
const updateVendor = async (req, res) => {
    try {
        const record = await VendorService.updateVendor(req.params.id, req.body);
        res.json(record);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.updateVendor = updateVendor;
/**
 * Fetch detailed ledger for a specific vendor.
 */
const listVendorTransactions = async (req, res) => {
    try {
        res.json(await VendorService.listVendorTransactions(req.params.id));
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.listVendorTransactions = listVendorTransactions;
/**
 * Record a financial event (Bill or Payment) for a vendor.
 */
const addVendorTransaction = async (req, res) => {
    try {
        const { type, amount, description } = req.body;
        if (!type || amount === undefined || !description) {
            return res.status(400).json({ message: 'Transaction Type, Amount, and Description are mandatory.' });
        }
        const date = req.body.date || Date.now();
        const record = await VendorService.addVendorTransaction(req.params.id, { ...req.body, date });
        res.status(201).json(record);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.addVendorTransaction = addVendorTransaction;
