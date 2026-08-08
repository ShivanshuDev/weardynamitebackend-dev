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
exports.sendPayrollLedgerEmail = exports.downloadPersonnelForm = exports.sendWelcomeEmail = exports.getEmployeePayroll = exports.processPayroll = exports.listPayroll = exports.getEmployeeAuditLog = exports.getEmployeeAttendanceHistory = exports.editAttendance = exports.markAttendance = exports.getAttendanceMatrix = exports.getAttendanceByDate = exports.deleteEmployee = exports.patchEmployeeStatus = exports.updateEmployee = exports.createEmployee = exports.listEmployees = void 0;
const EmployeeService = __importStar(require("./employee.service"));
const mailService_1 = require("../../utils/mailService");
const listEmployees = async (_req, res) => {
    try {
        res.json(await EmployeeService.listEmployees());
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.listEmployees = listEmployees;
const createEmployee = async (req, res) => {
    try {
        res.status(201).json(await EmployeeService.createEmployee(req.body));
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.createEmployee = createEmployee;
const updateEmployee = async (req, res) => {
    try {
        res.json(await EmployeeService.updateEmployee(req.params.id, req.body));
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.updateEmployee = updateEmployee;
const patchEmployeeStatus = async (req, res) => {
    try {
        res.json(await EmployeeService.patchEmployeeStatus(req.params.id, req.body.status));
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.patchEmployeeStatus = patchEmployeeStatus;
const deleteEmployee = async (req, res) => {
    try {
        res.json(await EmployeeService.deleteEmployee(req.params.id));
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.deleteEmployee = deleteEmployee;
// Attendance
const getAttendanceByDate = async (req, res) => {
    try {
        res.json(await EmployeeService.getAttendanceByDate(req.query.date));
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.getAttendanceByDate = getAttendanceByDate;
const getAttendanceMatrix = async (req, res) => {
    try {
        res.json(await EmployeeService.getAttendanceMatrix(req.query.year, req.query.month));
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.getAttendanceMatrix = getAttendanceMatrix;
const markAttendance = async (req, res) => {
    try {
        res.json(await EmployeeService.markAttendance(req.body));
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.markAttendance = markAttendance;
const editAttendance = async (req, res) => {
    try {
        res.json(await EmployeeService.markAttendance({ ...req.body, employeeId: req.params.employeeId, date: req.params.date }));
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.editAttendance = editAttendance;
const getEmployeeAttendanceHistory = async (req, res) => {
    try {
        res.json(await EmployeeService.getEmployeeAttendanceHistory(req.params.employeeId));
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.getEmployeeAttendanceHistory = getEmployeeAttendanceHistory;
const getEmployeeAuditLog = async (req, res) => {
    try {
        res.json(await EmployeeService.getEmployeeAuditLog(req.params.employeeId));
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.getEmployeeAuditLog = getEmployeeAuditLog;
// Payroll
const listPayroll = async (_req, res) => {
    try {
        res.json(await EmployeeService.listPayroll());
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.listPayroll = listPayroll;
const processPayroll = async (req, res) => {
    try {
        res.status(201).json(await EmployeeService.processPayroll(req.body));
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.processPayroll = processPayroll;
const getEmployeePayroll = async (req, res) => {
    try {
        res.json(await EmployeeService.getEmployeePayroll(req.params.employeeId));
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.getEmployeePayroll = getEmployeePayroll;
const sendWelcomeEmail = async (req, res) => {
    try {
        const employee = await EmployeeService.getEmployee(req.params.id);
        if (!employee)
            return res.status(404).json({ message: 'Personnel record not found' });
        await mailService_1.MailService.sendOnboardingWelcomeEmail(employee.email, employee);
        res.json({ message: 'Personnel dossier dispatched via email' });
    }
    catch (e) {
        console.error('[CONTROLLER ERROR] Welcome Email:', e);
        res.status(500).json({ message: 'Vault communications failure' });
    }
};
exports.sendWelcomeEmail = sendWelcomeEmail;
const downloadPersonnelForm = async (req, res) => {
    try {
        const employee = await EmployeeService.getEmployee(req.params.id);
        if (!employee)
            return res.status(404).json({ message: 'Personnel record not found' });
        const buffer = await mailService_1.MailService.generatePersonnelPDF(employee);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Personnel_Form_${employee.name.replace(/\s+/g, '_')}.pdf`);
        res.send(buffer);
    }
    catch (e) {
        console.error('[CONTROLLER ERROR] Download PDF:', e);
        res.status(500).json({ message: 'PDF generation failure' });
    }
};
exports.downloadPersonnelForm = downloadPersonnelForm;
const sendPayrollLedgerEmail = async (req, res) => {
    try {
        const employee = await EmployeeService.getEmployee(req.params.id);
        if (!employee)
            return res.status(404).json({ message: 'Personnel record not found' });
        const records = await EmployeeService.getEmployeePayroll(req.params.id);
        await mailService_1.MailService.sendPayrollLedgerEmail(employee.email, employee.name, records);
        res.json({ message: 'Institutional ledger dispatched via email' });
    }
    catch (e) {
        console.error('[CONTROLLER ERROR] Ledger Email:', e);
        res.status(500).json({ message: 'Vault communications failure' });
    }
};
exports.sendPayrollLedgerEmail = sendPayrollLedgerEmail;
