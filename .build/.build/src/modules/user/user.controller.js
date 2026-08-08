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
exports.markAllNotificationsRead = exports.markNotificationRead = exports.getNotifications = exports.adminListUsers = exports.updateFcmToken = exports.updatePreferences = exports.setDefaultAddress = exports.deleteAddress = exports.updateAddress = exports.addAddress = exports.getAddresses = exports.updateProfile = exports.getProfile = void 0;
const UserService = __importStar(require("./user.service"));
const getProfile = async (req, res) => {
    try {
        res.json(await UserService.getProfile(req.user.id));
    }
    catch (e) {
        res.status(404).json({ message: e.message });
    }
};
exports.getProfile = getProfile;
const updateProfile = async (req, res) => {
    try {
        res.json(await UserService.updateProfile(req.user.id, req.body));
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.updateProfile = updateProfile;
const getAddresses = async (req, res) => {
    try {
        res.json(await UserService.getAddresses(req.user.id));
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.getAddresses = getAddresses;
const addAddress = async (req, res) => {
    try {
        res.status(201).json(await UserService.addAddress(req.user.id, req.body));
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.addAddress = addAddress;
const updateAddress = async (req, res) => {
    try {
        res.json(await UserService.updateAddress(req.user.id, req.params.id, req.body));
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.updateAddress = updateAddress;
const deleteAddress = async (req, res) => {
    try {
        res.json(await UserService.deleteAddress(req.user.id, req.params.id));
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.deleteAddress = deleteAddress;
const setDefaultAddress = async (req, res) => {
    try {
        res.json(await UserService.setDefaultAddress(req.user.id, req.params.id));
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.setDefaultAddress = setDefaultAddress;
const updatePreferences = async (req, res) => {
    try {
        res.json(await UserService.updatePreferences(req.user.id, req.body));
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.updatePreferences = updatePreferences;
const updateFcmToken = async (req, res) => {
    try {
        res.json(await UserService.updateFcmToken(req.user.id, req.body.token));
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.updateFcmToken = updateFcmToken;
const adminListUsers = async (req, res) => {
    try {
        res.json(await UserService.adminListUsers());
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.adminListUsers = adminListUsers;
const getNotifications = async (req, res) => {
    try {
        res.json(await UserService.listUserNotifications(req.user.id));
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.getNotifications = getNotifications;
const markNotificationRead = async (req, res) => {
    try {
        res.json(await UserService.markNotificationRead(req.user.id, req.params.id));
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.markNotificationRead = markNotificationRead;
const markAllNotificationsRead = async (req, res) => {
    try {
        res.json(await UserService.markAllNotificationsRead(req.user.id));
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.markAllNotificationsRead = markAllNotificationsRead;
