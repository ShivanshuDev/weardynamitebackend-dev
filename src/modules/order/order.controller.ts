import { Request, Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import * as OrderService from './order.service';

// ─── Cart ────────────────────────────────────────────────────────────────────

export const getCart = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const cart = await OrderService.getCart(userId);
    res.json(cart);
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};

export const addToCart = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const item = await OrderService.addToCart(userId, req.body);
    res.status(201).json(item);
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};

export const updateCartItem = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { itemId } = req.params;
    const { quantity } = req.body;
    const updated = await OrderService.updateCartItem(userId, itemId as string, quantity as number);
    res.json(updated);
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};

export const removeCartItem = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { itemId } = req.params;
    const result = await OrderService.removeCartItem(userId, itemId as string);
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};

export const clearCart = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const result = await OrderService.clearCart(userId);
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};

// ─── Favorites ────────────────────────────────────────────────────────────────

export const getFavorites = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const favorites = await OrderService.getFavorites(userId);
    res.json(favorites);
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};

export const toggleFavorite = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { productId } = req.params;
    const result = await OrderService.toggleFavorite(userId, String(productId));
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};

// ─── Customer Orders ──────────────────────────────────────────────────────────

export const placeOrder = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const idempotencyKey = req.headers['x-idempotency-key'] as string | undefined;
    const order = await OrderService.placeOrder(userId, req.body, idempotencyKey);
    res.status(201).json(order);
  } catch (e: any) {
    const status = e.message.includes('reached limit') ? 429 : 400;
    res.status(status).json({ message: e.message });
  }
};

export const getUserOrders = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const orders = await OrderService.getUserOrders(userId);
    res.json(orders);
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};

export const getUserOrder = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const order = await OrderService.getUserOrder(userId, id as string);
    res.json(order);
  } catch (e: any) {
    res.status(404).json({ message: e.message });
  }
};

// ─── Admin Orders ──────────────────────────────────────────────────────────────

export const adminListOrders = async (req: Request, res: Response) => {
  try {
    const orders = await OrderService.adminListOrders(req.query as any);
    res.json(orders);
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};

export const getOrderDetail = async (req: Request, res: Response) => {
  try {
    const order = await OrderService.getOrderDetail(req.params.id as string);
    res.json(order);
  } catch (e: any) {
    res.status(404).json({ message: e.message });
  }
};

export const updateOrderStatus = async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    const result = await OrderService.updateOrderStatus(req.params.id as string, status as string);
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};

export const updateOrderTracking = async (req: Request, res: Response) => {
  try {
    const { trackingNumber, courier } = req.body;
    const result = await OrderService.updateOrderTracking(req.params.id as string, trackingNumber as string, courier as string);
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};

export const getInvoice = async (req: Request, res: Response) => {
  try {
    const invoiceData = await OrderService.getOrderDetail(req.params.id as string);
    res.json({ invoice: invoiceData });
  } catch (e: any) {
    res.status(404).json({ message: e.message });
  }
};
