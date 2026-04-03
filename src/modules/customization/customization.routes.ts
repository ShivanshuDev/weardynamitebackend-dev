import { Router } from 'express';
import * as CC from './customization.controller';
import { authenticate, adminOnly } from '../../middleware/auth';

const router = Router();
const auth = authenticate as any;
const admin = adminOnly as any;

router.post('/customization/print', CC.submitPrint);
router.post('/customization/embroidery', CC.submitEmbroidery);
router.post('/customization/design-studio', CC.submitDesignStudio);
router.get('/admin/customizations', auth, admin, CC.listCustomOrders);
router.put('/admin/customizations/:id/status', auth, admin, CC.updateCustomOrderStatus);

export default router;
