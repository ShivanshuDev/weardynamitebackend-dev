import { Request, Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import * as OrderService from './order.service';

// Cart
export const getCart = async (req: AuthRequest, res: Response) => {
  try { res.json(await OrderService.getCart(req.user!.id)); } catch (e: any) { res.status(400).json({ message: e.message }); }
};
export const addToCart = async (req: AuthRequest, res: Response) => {
  try { res.status(201).json(await OrderService.addToCart(req.user!.id, req.body)); } catch (e: any) { res.status(400).json({ message: e.message }); }
};
export const updateCartItem = async (req: AuthRequest, res: Response) => {
  try { res.json(await OrderService.updateCartItem(req.user!.id, req.params.itemId as string, req.body.quantity)); } catch (e: any) { res.status(400).json({ message: e.message }); }
};
export const removeCartItem = async (req: AuthRequest, res: Response) => {
  try { res.json(await OrderService.removeCartItem(req.user!.id, req.params.itemId as string)); } catch (e: any) { res.status(400).json({ message: e.message }); }
};
export const clearCart = async (req: AuthRequest, res: Response) => {
  try { res.json(await OrderService.clearCart(req.user!.id)); } catch (e: any) { res.status(400).json({ message: e.message }); }
};

// Favorites
export const getFavorites = async (req: AuthRequest, res: Response) => {
  try { res.json(await OrderService.getFavorites(req.user!.id)); } catch (e: any) { res.status(400).json({ message: e.message }); }
};
export const toggleFavorite = async (req: AuthRequest, res: Response) => {
  try { res.json(await OrderService.toggleFavorite(req.user!.id, req.params.productId as string)); } catch (e: any) { res.status(400).json({ message: e.message }); }
};

// Orders (customer)
export const placeOrder = async (req: AuthRequest, res: Response) => {
  try { res.status(201).json(await OrderService.placeOrder(req.user!.id, req.body)); } catch (e: any) { res.status(400).json({ message: e.message }); }
};
export const getUserOrders = async (req: AuthRequest, res: Response) => {
  try { res.json(await OrderService.getUserOrders(req.user!.id)); } catch (e: any) { res.status(400).json({ message: e.message }); }
};
export const getUserOrder = async (req: AuthRequest, res: Response) => {
  try { res.json(await OrderService.getUserOrder(req.user!.id, req.params.id as string)); } catch (e: any) { res.status(404).json({ message: e.message }); }
};

// Admin orders
export const adminListOrders = async (req: Request, res: Response) => {
  try { res.json(await OrderService.adminListOrders(req.query as any)); } catch (e: any) { res.status(400).json({ message: e.message }); }
};
export const getOrderDetail = async (req: Request, res: Response) => {
  try { res.json(await OrderService.getOrderDetail(req.params.id as string)); } catch (e: any) { res.status(404).json({ message: e.message }); }
};
export const updateOrderStatus = async (req: Request, res: Response) => {
  try { res.json(await OrderService.updateOrderStatus(req.params.id as string, req.body.status as string)); } catch (e: any) { res.status(400).json({ message: e.message }); }
};
export const updateOrderTracking = async (req: Request, res: Response) => {
  try { res.json(await OrderService.updateOrderTracking(req.params.id as string, req.body.trackingNumber as string, req.body.courier as string)); } catch (e: any) { res.status(400).json({ message: e.message }); }
};
export const getInvoice = async (req: Request, res: Response) => {
  try { res.json({ invoice: await OrderService.getOrderDetail(req.params.id as string) }); } catch (e: any) { res.status(404).json({ message: e.message }); }
};
