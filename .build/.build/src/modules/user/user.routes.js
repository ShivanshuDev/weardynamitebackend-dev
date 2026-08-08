"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const UserController = __importStar(require("./user.controller"));
const auth_1 = require("../../middleware/auth");
const router = (0, express_1.Router)();
const auth = auth_1.authenticate;
const admin = auth_1.adminOnly;
router.get('/profile', auth, UserController.getProfile);
router.put('/profile', auth, UserController.updateProfile);
router.patch('/profile', auth, UserController.updateProfile);
router.put('/preferences', auth, UserController.updatePreferences);
router.post('/fcm-token', auth, UserController.updateFcmToken);
router.get('/addresses', auth, UserController.getAddresses);
router.post('/addresses', auth, UserController.addAddress);
router.put('/addresses/:id', auth, UserController.updateAddress);
router.delete('/addresses/:id', auth, UserController.deleteAddress);
router.patch('/addresses/:id/default', auth, UserController.setDefaultAddress);
router.get('/notifications', auth, UserController.getNotifications);
router.patch('/notifications/:id/read', auth, UserController.markNotificationRead);
router.post('/notifications/read-all', auth, UserController.markAllNotificationsRead);
// ─── Admin ───────────────────────────────────────────────────────────────────
router.get('/admin/users', auth, admin, UserController.adminListUsers);
exports.default = router;
