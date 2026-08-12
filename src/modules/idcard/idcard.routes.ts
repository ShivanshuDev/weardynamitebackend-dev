import { Router } from 'express';
import * as IdCardController from './idcard.controller';
import { authenticate, adminOnly } from '../../middleware/auth';

const router = Router();
const auth = authenticate as any;
const admin = adminOnly as any;

// ID Card layout configuration
router.get('/admin/id-cards/config', auth, admin, IdCardController.getConfig);
router.post('/admin/id-cards/config', auth, admin, IdCardController.saveConfig);

// Student database entries (No scans used)
router.get('/admin/id-cards/students', auth, admin, IdCardController.listStudents);
router.post('/admin/id-cards/student', auth, admin, IdCardController.saveStudent);
router.put('/admin/id-cards/student/:id', auth, admin, IdCardController.updateStudent);
router.delete('/admin/id-cards/student/:id', auth, admin, IdCardController.deleteStudent);

// ID Card Templates
router.get('/admin/id-cards/templates', auth, admin, IdCardController.listTemplates);
router.post('/admin/id-cards/templates', auth, admin, IdCardController.createTemplate);
router.put('/admin/id-cards/templates/:id', auth, admin, IdCardController.updateTemplate);
router.delete('/admin/id-cards/templates/:id', auth, admin, IdCardController.deleteTemplate);

export default router;
