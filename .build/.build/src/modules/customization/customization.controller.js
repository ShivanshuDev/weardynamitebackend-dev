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
exports.updateCustomOrderStatus = exports.listCustomOrders = exports.submitDesignStudio = exports.submitEmbroidery = exports.submitPrint = void 0;
const CustomizationService = __importStar(require("./customization.service"));
const submitPrint = (req, res) => {
    try {
        res.status(201).json(CustomizationService.submitPrintCustomization(req.body));
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.submitPrint = submitPrint;
const submitEmbroidery = (req, res) => {
    try {
        res.status(201).json(CustomizationService.submitEmbroideryCustomization(req.body));
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.submitEmbroidery = submitEmbroidery;
const submitDesignStudio = (req, res) => {
    try {
        res.status(201).json(CustomizationService.submitDesignStudioOrder(req.body));
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.submitDesignStudio = submitDesignStudio;
const listCustomOrders = (req, res) => {
    try {
        res.json(CustomizationService.listCustomOrders(req.query));
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.listCustomOrders = listCustomOrders;
const updateCustomOrderStatus = (req, res) => {
    try {
        res.json(CustomizationService.updateCustomOrderStatus(req.params.id, req.body.status));
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.updateCustomOrderStatus = updateCustomOrderStatus;
