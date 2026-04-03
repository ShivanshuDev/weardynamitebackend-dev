import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import * as UserService from './user.service';

export const getProfile = (req: AuthRequest, res: Response) => {
  try { res.json(UserService.getProfile(req.user!.id)); }
  catch (e: any) { res.status(404).json({ message: e.message }); }
};

export const updateProfile = (req: AuthRequest, res: Response) => {
  try { res.json(UserService.updateProfile(req.user!.id, req.body)); }
  catch (e: any) { res.status(400).json({ message: e.message }); }
};

export const getAddresses = (req: AuthRequest, res: Response) => {
  try { res.json(UserService.getAddresses(req.user!.id)); }
  catch (e: any) { res.status(400).json({ message: e.message }); }
};

export const addAddress = (req: AuthRequest, res: Response) => {
  try { res.status(201).json(UserService.addAddress(req.user!.id, req.body)); }
  catch (e: any) { res.status(400).json({ message: e.message }); }
};

export const updateAddress = (req: AuthRequest, res: Response) => {
  try { res.json(UserService.updateAddress(req.user!.id, req.params.id as string, req.body)); }
  catch (e: any) { res.status(400).json({ message: e.message }); }
};

export const deleteAddress = (req: AuthRequest, res: Response) => {
  try { res.json(UserService.deleteAddress(req.user!.id, req.params.id as string)); }
  catch (e: any) { res.status(400).json({ message: e.message }); }
};

export const setDefaultAddress = (req: AuthRequest, res: Response) => {
  try { res.json(UserService.setDefaultAddress(req.user!.id, req.params.id as string)); }
  catch (e: any) { res.status(400).json({ message: e.message }); }
};

export const updatePreferences = (req: AuthRequest, res: Response) => {
  try { res.json(UserService.updatePreferences(req.user!.id, req.body)); }
  catch (e: any) { res.status(400).json({ message: e.message }); }
};

export const adminListUsers = (req: AuthRequest, res: Response) => {
  try { res.json(UserService.adminListUsers()); }
  catch (e: any) { res.status(400).json({ message: e.message }); }
};
