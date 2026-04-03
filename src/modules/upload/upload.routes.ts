import { Router } from 'express';
import * as UploadController from './upload.controller';
import { authenticate, adminOnly } from '../../middleware/auth';

const router = Router();
const auth = authenticate as any;
const admin = adminOnly as any;

// Admin: get presigned upload URL
router.post('/admin/upload/presigned-url', auth, admin, UploadController.requestPresignedUrl);
// Admin: delete file from S3
router.delete('/admin/upload', auth, admin, UploadController.deleteFile);
// Dev: mock S3 receiver
router.put('/mock-s3-upload', UploadController.mockS3Endpoint);

export default router;
