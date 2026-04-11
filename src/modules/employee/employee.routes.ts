import { Router } from 'express';
import * as EC from './employee.controller';
import { authenticate, adminOnly } from '../../middleware/auth';

const router = Router();
const auth = authenticate as any;
const admin = adminOnly as any;

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

export default router;
