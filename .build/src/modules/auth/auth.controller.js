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
exports.createAdmin = exports.assignAdmin = exports.sync = void 0;
const AuthService = __importStar(require("./auth.service"));
const sync = async (req, res) => {
    try {
        // The middleware attached req.user with Firebase token data
        const user = req.user;
        E;
        if (!user) {
            return res.status(401).json({ message: 'Sync failed: No authenticated user context.' });
        }
        // Capture optional name/photo submitted from frontend
        const { name, photoURL } = req.body;
        // Sync the Firebase authenticated user with our explicit DynamoDB master profile
        const profile = await AuthService.syncUser(user.id, user.email, name, user.role, photoURL || user.photoURL);
        res.json({ message: 'Synchronized profile', profile });
    }
    catch (e) {
        console.error('[AUTH_SYNC_ERROR]', e);
        res.status(400).json({
            message: 'Authentication Sync Failed',
            error: e.message,
            details: e.stack
        });
    }
};
exports.sync = sync;
const assignAdmin = async (req, res) => {
    try {
        const { uid } = req.body;
        if (!uid) {
            return res.status(400).json({ message: 'Firebase UID required to grant admin.' });
        }
        const result = await AuthService.makeAdmin(uid);
        res.json(result);
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.assignAdmin = assignAdmin;
const createAdmin = async (req, res) => {
    try {
        const { email, password, name } = req.body;
        if (!email || !password || !name) {
            return res.status(400).json({ message: 'Email, password, and name required' });
        }
        const result = await AuthService.createAdminAccount(email, password, name);
        res.status(201).json(result);
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.createAdmin = createAdmin;
