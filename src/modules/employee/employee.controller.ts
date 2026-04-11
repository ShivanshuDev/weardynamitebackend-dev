import * as EmployeeService from './employee.service';
import { MailService } from '../../utils/mailService';

export const listEmployees = async (_req: Request, res: Response) => {
  try { res.json(await EmployeeService.listEmployees()); } catch (e: any) { res.status(400).json({ message: e.message }); }
};
export const createEmployee = async (req: Request, res: Response) => {
  try { res.status(201).json(await EmployeeService.createEmployee(req.body)); } catch (e: any) { res.status(400).json({ message: e.message }); }
};
export const updateEmployee = async (req: Request, res: Response) => {
  try { res.json(await EmployeeService.updateEmployee(req.params.id as string, req.body)); } catch (e: any) { res.status(400).json({ message: e.message }); }
};
export const patchEmployeeStatus = async (req: Request, res: Response) => {
  try { res.json(await EmployeeService.patchEmployeeStatus(req.params.id as string, req.body.status as string)); } catch (e: any) { res.status(400).json({ message: e.message }); }
};
export const deleteEmployee = async (req: Request, res: Response) => {
  try { res.json(await EmployeeService.deleteEmployee(req.params.id as string)); } catch (e: any) { res.status(400).json({ message: e.message }); }
};

// Attendance
export const getAttendanceByDate = async (req: Request, res: Response) => {
  try { res.json(await EmployeeService.getAttendanceByDate(req.query.date as string)); } catch (e: any) { res.status(400).json({ message: e.message }); }
};
export const getAttendanceMatrix = async (req: Request, res: Response) => {
  try { 
    res.json(await EmployeeService.getAttendanceMatrix(req.query.year as string, req.query.month as string)); 
  } catch (e: any) { res.status(400).json({ message: e.message }); }
};
export const markAttendance = async (req: Request, res: Response) => {
  try { res.json(await EmployeeService.markAttendance(req.body)); } catch (e: any) { res.status(400).json({ message: e.message }); }
};
export const editAttendance = async (req: Request, res: Response) => {
  try { res.json(await EmployeeService.markAttendance({ ...req.body, employeeId: req.params.employeeId as string, date: req.params.date as string })); } catch (e: any) { res.status(400).json({ message: e.message }); }
};
export const getEmployeeAttendanceHistory = async (req: Request, res: Response) => {
  try { res.json(await EmployeeService.getEmployeeAttendanceHistory(req.params.employeeId as string)); } catch (e: any) { res.status(400).json({ message: e.message }); }
};
export const getEmployeeAuditLog = async (req: Request, res: Response) => {
  try { res.json(await EmployeeService.getEmployeeAuditLog(req.params.employeeId as string)); } catch (e: any) { res.status(400).json({ message: e.message }); }
};

// Payroll
export const listPayroll = async (_req: Request, res: Response) => {
  try { res.json(await EmployeeService.listPayroll()); } catch (e: any) { res.status(400).json({ message: e.message }); }
};
export const processPayroll = async (req: Request, res: Response) => {
  try { res.status(201).json(await EmployeeService.processPayroll(req.body)); } catch (e: any) { res.status(400).json({ message: e.message }); }
};
export const getEmployeePayroll = async (req: Request, res: Response) => {
  try { res.json(await EmployeeService.getEmployeePayroll(req.params.employeeId as string)); } catch (e: any) { res.status(400).json({ message: e.message }); }
};

export const sendWelcomeEmail = async (req: Request, res: Response) => {
  try {
    const employee = await EmployeeService.getEmployee(req.params.id as string);
    if (!employee) return res.status(404).json({ message: 'Personnel record not found' });
    
    await MailService.sendOnboardingWelcomeEmail(employee.email, employee);
    res.json({ message: 'Personnel dossier dispatched via email' });
  } catch (e: any) {
    console.error('[CONTROLLER ERROR] Welcome Email:', e);
    res.status(500).json({ message: 'Vault communications failure' });
  }
};

export const downloadPersonnelForm = async (req: Request, res: Response) => {
  try {
    const employee = await EmployeeService.getEmployee(req.params.id as string);
    if (!employee) return res.status(404).json({ message: 'Personnel record not found' });
    
    const buffer = await MailService.generatePersonnelPDF(employee);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Personnel_Form_${employee.name.replace(/\s+/g, '_')}.pdf`);
    res.send(buffer);
  } catch (e: any) {
    console.error('[CONTROLLER ERROR] Download PDF:', e);
    res.status(500).json({ message: 'PDF generation failure' });
  }
};
