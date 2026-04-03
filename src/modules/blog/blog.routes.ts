import { Router } from 'express';
import * as BlogController from './blog.controller';
import { authenticate, adminOnly } from '../../middleware/auth';

const router = Router();
const auth = authenticate as any;
const admin = adminOnly as any;

router.get('/', BlogController.listPublicBlogs);
router.get('/:id', BlogController.getBlog);

router.get('/admin/list', auth, admin, BlogController.adminListBlogs);
router.post('/admin', auth, admin, BlogController.createBlog);
router.put('/admin/:id', auth, admin, BlogController.updateBlog);
router.patch('/admin/:id/status', auth, admin, BlogController.patchBlogStatus);
router.delete('/admin/:id', auth, admin, BlogController.deleteBlog);

export default router;
