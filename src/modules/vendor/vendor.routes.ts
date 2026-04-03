import { Router } from 'express';
import * as VendorController from './vendor.controller';
import { authenticate, adminOnly } from '../../middleware/auth';

const router = Router();
const auth = authenticate as any;
const admin = adminOnly as any;

/**
 * Administrative endpoints for vendor ecosystem.
 */
router.get('/admin/vendors', auth, admin, VendorController.listVendors);
router.post('/admin/vendors', auth, admin, VendorController.createVendor);
router.put('/admin/vendors/:id', auth, admin, VendorController.updateVendor);

/**
 * Financial endpoints for vendor accounts.
 */
router.get('/admin/vendors/:id/transactions', auth, admin, VendorController.listVendorTransactions);
router.post('/admin/vendors/:id/transactions', auth, admin, VendorController.addVendorTransaction);

export default router;
