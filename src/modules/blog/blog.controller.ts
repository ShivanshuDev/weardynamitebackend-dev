import { Request, Response } from 'express';
import * as BlogService from './blog.service';

export const listPublicBlogs = (_req: Request, res: Response) => {
  try { res.json(BlogService.listBlogs(false)); } catch (e: any) { res.status(400).json({ message: e.message }); }
};
export const getBlog = (req: Request, res: Response) => {
  try { res.json(BlogService.getBlog(req.params.id as string)); } catch (e: any) { res.status(404).json({ message: e.message }); }
};
export const adminListBlogs = (_req: Request, res: Response) => {
  try { res.json(BlogService.listBlogs(true)); } catch (e: any) { res.status(400).json({ message: e.message }); }
};
export const createBlog = (req: Request, res: Response) => {
  try { res.status(201).json(BlogService.createBlog(req.body)); } catch (e: any) { res.status(400).json({ message: e.message }); }
};
export const updateBlog = (req: Request, res: Response) => {
  try { res.json(BlogService.updateBlog(req.params.id as string, req.body)); } catch (e: any) { res.status(400).json({ message: e.message }); }
};
export const patchBlogStatus = (req: Request, res: Response) => {
  try { res.json(BlogService.patchBlogStatus(req.params.id as string, req.body.status as string)); } catch (e: any) { res.status(400).json({ message: e.message }); }
};
export const deleteBlog = (req: Request, res: Response) => {
  try { res.json(BlogService.deleteBlog(req.params.id as string)); } catch (e: any) { res.status(400).json({ message: e.message }); }
};
