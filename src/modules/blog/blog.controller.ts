import { Request, Response } from 'express';
import * as BlogService from './blog.service';

export const listPublicBlogs = async (_req: Request, res: Response) => {
  try { res.json(await BlogService.listBlogs(false)); } catch (e: any) { res.status(400).json({ message: e.message }); }
};
export const getBlog = async (req: Request, res: Response) => {
  try { res.json(await BlogService.getBlog(req.params.id as string)); } catch (e: any) { res.status(404).json({ message: e.message }); }
};
export const adminListBlogs = async (_req: Request, res: Response) => {
  try { res.json(await BlogService.listBlogs(true)); } catch (e: any) { res.status(400).json({ message: e.message }); }
};
export const createBlog = async (req: Request, res: Response) => {
  try { res.status(201).json(await BlogService.createBlog(req.body)); } catch (e: any) { res.status(400).json({ message: e.message }); }
};
export const updateBlog = async (req: Request, res: Response) => {
  try { res.json(await BlogService.updateBlog(req.params.id as string, req.body)); } catch (e: any) { res.status(400).json({ message: e.message }); }
};
export const patchBlogStatus = async (req: Request, res: Response) => {
  try { res.json(await BlogService.patchBlogStatus(req.params.id as string, req.body.status as string)); } catch (e: any) { res.status(400).json({ message: e.message }); }
};
export const publishBlog = async (req: Request, res: Response) => {
  try { res.json(await BlogService.publishBlog(req.params.id as string)); } catch (e: any) { res.status(400).json({ message: e.message }); }
};
export const deleteBlog = async (req: Request, res: Response) => {
  try { res.json(await BlogService.deleteBlog(req.params.id as string)); } catch (e: any) { res.status(400).json({ message: e.message }); }
};
