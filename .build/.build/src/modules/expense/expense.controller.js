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
exports.deleteExpense = exports.createExpense = exports.listExpenses = void 0;
const ExpenseService = __importStar(require("./expense.service"));
/**
 * List all expenses for admin.
 */
const listExpenses = async (req, res) => {
    try {
        const filters = {
            category: req.query.category,
            dateFrom: req.query.dateFrom,
            dateTo: req.query.dateTo
        };
        const expenses = await ExpenseService.listExpenses(filters);
        res.json(expenses);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.listExpenses = listExpenses;
/**
 * Handle new expense creation.
 */
const createExpense = async (req, res) => {
    try {
        const { description, category, amount, date } = req.body;
        if (!description || !category || amount === undefined) {
            return res.status(400).json({ message: 'Description, Category, and Amount are mandatory fields.' });
        }
        const record = await ExpenseService.createExpense({ description, category, amount, date });
        res.status(201).json(record);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.createExpense = createExpense;
/**
 * Handle expense deletion.
 */
const deleteExpense = async (req, res) => {
    try {
        const success = await ExpenseService.deleteExpense(req.params.id);
        if (!success)
            return res.status(404).json({ message: 'Expense record not found.' });
        res.json({ message: 'Expense record successfully purged from manifest.' });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.deleteExpense = deleteExpense;
