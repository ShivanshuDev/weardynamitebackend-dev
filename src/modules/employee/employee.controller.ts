import { Request, Response } from 'express';
import * as EmployeeService from './employee.service';

export const listEmployees = (_req: Request, res: Response) => {
  try { res.json(EmployeeService.listEmployees()); } catch (e: any) { res.status(400).json({ message: e.message }); }
};
export const createEmployee = (req: Request, res: Response) => {
  try { res.status(201).json(EmployeeService.createEmployee(req.body)); } catch (e: any) { res.status(400).json({ message: e.message }); }
};
export const updateEmployee = (req: Request, res: Response) => {
  try { res.json(EmployeeService.updateEmployee(req.params.id as string, req.body)); } catch (e: any) { res.status(400).json({ message: e.message }); }
};
export const patchEmployeeStatus = (req: Request, res: Response) => {
  try { res.json(EmployeeService.patchEmployeeStatus(req.params.id as string, req.body.status as string)); } catch (e: any) { res.status(400).json({ message: e.message }); }
};
export const deleteEmployee = (req: Request, res: Response) => {
  try { res.json(EmployeeService.deleteEmployee(req.params.id as string)); } catch (e: any) { res.status(400).json({ message: e.message }); }
};

// Attendance
export const getAttendanceByDate = (req: Request, res: Response) => {
  try { res.json(EmployeeService.getAttendanceByDate(req.query.date as string)); } catch (e: any) { res.status(400).json({ message: e.message }); }
};
export const markAttendance = (req: Request, res: Response) => {
  try { res.json(EmployeeService.markAttendance(req.body)); } catch (e: any) { res.status(400).json({ message: e.message }); }
};
export const editAttendance = (req: Request, res: Response) => {
  try { res.json(EmployeeService.markAttendance({ ...req.body, employeeId: req.params.employeeId as string, date: req.params.date as string })); } catch (e: any) { res.status(400).json({ message: e.message }); }
};
export const getEmployeeAttendanceHistory = (req: Request, res: Response) => {
  try { res.json(EmployeeService.getEmployeeAttendanceHistory(req.params.employeeId as string)); } catch (e: any) { res.status(400).json({ message: e.message }); }
};
export const getEmployeeAuditLog = (req: Request, res: Response) => {
  try { res.json(EmployeeService.getEmployeeAuditLog(req.params.employeeId as string)); } catch (e: any) { res.status(400).json({ message: e.message }); }
};

// Payroll
export const listPayroll = (_req: Request, res: Response) => {
  try { res.json(EmployeeService.listPayroll()); } catch (e: any) { res.status(400).json({ message: e.message }); }
};
export const processPayroll = (req: Request, res: Response) => {
  try { res.status(201).json(EmployeeService.processPayroll(req.body)); } catch (e: any) { res.status(400).json({ message: e.message }); }
};
export const getEmployeePayroll = (req: Request, res: Response) => {
  try { res.json(EmployeeService.getEmployeePayroll(req.params.employeeId as string)); } catch (e: any) { res.status(400).json({ message: e.message }); }
};
