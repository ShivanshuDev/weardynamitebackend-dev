import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import * as UserService from './user.service';

export const getProfile = async (req: AuthRequest, res: Response) => {
  try { res.json(await UserService.getProfile(req.user!.id)); }
  catch (e: any) { res.status(404).json({ message: e.message }); }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try { res.json(await UserService.updateProfile(req.user!.id, req.body)); }
  catch (e: any) { res.status(400).json({ message: e.message }); }
};

export const getAddresses = async (req: AuthRequest, res: Response) => {
  try { res.json(await UserService.getAddresses(req.user!.id)); }
  catch (e: any) { res.status(400).json({ message: e.message }); }
};

export const addAddress = async (req: AuthRequest, res: Response) => {
  try { res.status(201).json(await UserService.addAddress(req.user!.id, req.body)); }
  catch (e: any) { res.status(400).json({ message: e.message }); }
};

export const updateAddress = async (req: AuthRequest, res: Response) => {
  try { res.json(await UserService.updateAddress(req.user!.id, req.params.id as string, req.body)); }
  catch (e: any) { res.status(400).json({ message: e.message }); }
};

export const deleteAddress = async (req: AuthRequest, res: Response) => {
  try { res.json(await UserService.deleteAddress(req.user!.id, req.params.id as string)); }
  catch (e: any) { res.status(400).json({ message: e.message }); }
};

export const setDefaultAddress = async (req: AuthRequest, res: Response) => {
  try { res.json(await UserService.setDefaultAddress(req.user!.id, req.params.id as string)); }
  catch (e: any) { res.status(400).json({ message: e.message }); }
};

export const updatePreferences = async (req: AuthRequest, res: Response) => {
  try { res.json(await UserService.updatePreferences(req.user!.id, req.body)); }
  catch (e: any) { res.status(400).json({ message: e.message }); }
};

export const updateFcmToken = async (req: AuthRequest, res: Response) => {
  try { res.json(await UserService.updateFcmToken(req.user!.id, req.body.token)); }
  catch (e: any) { res.status(400).json({ message: e.message }); }
};

export const adminListUsers = async (req: AuthRequest, res: Response) => {
  try { res.json(await UserService.adminListUsers()); }
  catch (e: any) { res.status(400).json({ message: e.message }); }
};
