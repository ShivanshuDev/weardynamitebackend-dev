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
exports.listStudents = exports.deleteStudent = exports.updateStudent = exports.saveStudent = exports.saveConfig = exports.getConfig = void 0;
const IdCardService = __importStar(require("./idcard.service"));
const getConfig = async (req, res) => {
    try {
        const schoolId = String(req.query.schoolId || 'shaheed_inter_college');
        const config = await IdCardService.getConfig(schoolId);
        res.json(config);
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.getConfig = getConfig;
const saveConfig = async (req, res) => {
    try {
        const schoolId = String(req.body.schoolId || 'shaheed_inter_college');
        const saved = await IdCardService.saveConfig(schoolId, req.body);
        res.json(saved);
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.saveConfig = saveConfig;
const saveStudent = async (req, res) => {
    try {
        const schoolId = String(req.body.schoolId || 'shaheed_inter_college');
        const saved = await IdCardService.saveStudent(schoolId, req.body);
        res.status(201).json(saved);
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.saveStudent = saveStudent;
const updateStudent = async (req, res) => {
    try {
        const schoolId = String(req.body.schoolId || 'shaheed_inter_college');
        const studentData = { ...req.body, studentId: String(req.params.id) };
        const saved = await IdCardService.saveStudent(schoolId, studentData);
        res.json(saved);
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.updateStudent = updateStudent;
const deleteStudent = async (req, res) => {
    try {
        const schoolId = String(req.query.schoolId || 'shaheed_inter_college');
        const studentId = String(req.params.id);
        const result = await IdCardService.deleteStudent(schoolId, studentId);
        res.json(result);
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.deleteStudent = deleteStudent;
const listStudents = async (req, res) => {
    try {
        const schoolId = String(req.query.schoolId || 'shaheed_inter_college');
        const filters = {
            schoolId,
            class: req.query.class ? String(req.query.class) : undefined,
            section: req.query.section ? String(req.query.section) : undefined,
            name: req.query.name ? String(req.query.name) : undefined,
            phone: req.query.phone ? String(req.query.phone) : undefined,
            fatherName: req.query.fatherName ? String(req.query.fatherName) : undefined,
        };
        const students = await IdCardService.listStudents(filters);
        res.json(students);
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.listStudents = listStudents;
