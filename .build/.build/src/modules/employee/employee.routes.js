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
const EC = __importStar(require("./employee.controller"));
const auth_1 = require("../../middleware/auth");
const router = (0, express_1.Router)();
const auth = auth_1.authenticate;
const admin = auth_1.adminOnly;
// Employees
router.get('/employees', auth, admin, EC.listEmployees);
router.post('/employees', auth, admin, EC.createEmployee);
router.put('/employees/:id', auth, admin, EC.updateEmployee);
router.patch('/employees/:id/status', auth, admin, EC.patchEmployeeStatus);
router.delete('/employees/:id', auth, admin, EC.deleteEmployee);
router.post('/employees/:id/send-welcome', auth, admin, EC.sendWelcomeEmail);
router.get('/employees/:id/download-form', auth, admin, EC.downloadPersonnelForm);
// Attendance
router.get('/attendance', auth, admin, EC.getAttendanceByDate);
router.get('/attendance/matrix', auth, admin, EC.getAttendanceMatrix);
router.post('/attendance', auth, admin, EC.markAttendance);
router.put('/attendance/:employeeId/:date', auth, admin, EC.editAttendance);
router.get('/attendance/:employeeId/history', auth, admin, EC.getEmployeeAttendanceHistory);
router.get('/attendance/:employeeId/audit-log', auth, admin, EC.getEmployeeAuditLog);
// Payroll
router.get('/payroll', auth, admin, EC.listPayroll);
router.post('/payroll', auth, admin, EC.processPayroll);
router.get('/payroll/:employeeId', auth, admin, EC.getEmployeePayroll);
router.post('/employees/:id/payroll/send-ledger', auth, admin, EC.sendPayrollLedgerEmail);
exports.default = router;
