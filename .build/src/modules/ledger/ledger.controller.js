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
exports.getTopProducts = exports.getRevenueChart = exports.getDashboardStats = exports.exportLedger = exports.getDailyLedger = exports.getLedgerSummary = exports.addTransaction = exports.listTransactions = void 0;
const LedgerService = __importStar(require("./ledger.service"));
const listTransactions = async (req, res) => {
    try {
        res.json(await LedgerService.listTransactions(req.query));
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.listTransactions = listTransactions;
const addTransaction = async (req, res) => {
    try {
        res.status(201).json(await LedgerService.addTransaction(req.body));
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.addTransaction = addTransaction;
const getLedgerSummary = async (_req, res) => {
    try {
        res.json(await LedgerService.getLedgerSummary());
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.getLedgerSummary = getLedgerSummary;
const getDailyLedger = async (req, res) => {
    try {
        const date = req.params.date || new Date().toISOString().split('T')[0];
        res.json(await LedgerService.getDailySummary(date));
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.getDailyLedger = getDailyLedger;
const exportLedger = async (_req, res) => {
    try {
        const csv = await LedgerService.exportLedgerCSV();
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=ledger.csv');
        res.send(csv);
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.exportLedger = exportLedger;
// Dashboard
const getDashboardStats = async (_req, res) => {
    try {
        res.json(await LedgerService.getDashboardStats());
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.getDashboardStats = getDashboardStats;
const getRevenueChart = async (req, res) => {
    try {
        res.json(await LedgerService.getRevenueChart(req.query.period || '30d'));
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.getRevenueChart = getRevenueChart;
const getTopProducts = async (_req, res) => {
    try {
        res.json(await LedgerService.getTopProducts());
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.getTopProducts = getTopProducts;
