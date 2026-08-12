import { Request, Response } from 'express';
import * as IdCardService from './idcard.service';

export const getConfig = async (req: Request, res: Response) => {
  try {
    const schoolId = String(req.query.schoolId || 'shaheed_inter_college');
    const config = await IdCardService.getConfig(schoolId);
    res.json(config);
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};

export const saveConfig = async (req: Request, res: Response) => {
  try {
    const schoolId = String(req.body.schoolId || 'shaheed_inter_college');
    const saved = await IdCardService.saveConfig(schoolId, req.body);
    res.json(saved);
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};

export const saveStudent = async (req: Request, res: Response) => {
  try {
    const schoolId = String(req.body.schoolId || 'shaheed_inter_college');
    const saved = await IdCardService.saveStudent(schoolId, req.body);
    res.status(201).json(saved);
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};

export const updateStudent = async (req: Request, res: Response) => {
  try {
    const schoolId = String(req.body.schoolId || 'shaheed_inter_college');
    const studentData = { ...req.body, studentId: String(req.params.id) };
    const saved = await IdCardService.saveStudent(schoolId, studentData);
    res.json(saved);
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};

export const deleteStudent = async (req: Request, res: Response) => {
  try {
    const schoolId = String(req.query.schoolId || 'shaheed_inter_college');
    const studentId = String(req.params.id);
    const result = await IdCardService.deleteStudent(schoolId, studentId);
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};

export const listStudents = async (req: Request, res: Response) => {
  try {
    const schoolId = String(req.query.schoolId || 'shaheed_inter_college');
    const filters = {
      schoolId,
      class: req.query.class ? String(req.query.class) : undefined,
      section: req.query.section ? String(req.query.section) : undefined,
      name: req.query.name ? String(req.query.name) : undefined,
      phone: req.query.phone ? String(req.query.phone) : undefined,
      fatherName: req.query.fatherName ? String(req.query.fatherName) : undefined,
    };
    const students = await IdCardService.listStudents(filters);
    res.json(students);
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};

export const listTemplates = async (req: Request, res: Response) => {
  try {
    const schoolId = String(req.query.schoolId || 'shaheed_inter_college');
    const result = await IdCardService.listTemplates(schoolId);
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};

export const createTemplate = async (req: Request, res: Response) => {
  try {
    const schoolId = String(req.query.schoolId || 'shaheed_inter_college');
    const result = await IdCardService.createTemplate(schoolId, req.body);
    res.status(201).json(result);
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};

export const updateTemplate = async (req: Request, res: Response) => {
  try {
    const schoolId = String(req.query.schoolId || 'shaheed_inter_college');
    const result = await IdCardService.updateTemplate(schoolId, String(req.params.id), req.body);
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};

export const deleteTemplate = async (req: Request, res: Response) => {
  try {
    const schoolId = String(req.query.schoolId || 'shaheed_inter_college');
    await IdCardService.deleteTemplate(schoolId, String(req.params.id));
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};
