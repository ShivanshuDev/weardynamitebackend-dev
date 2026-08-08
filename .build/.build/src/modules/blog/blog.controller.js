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
exports.deleteBlog = exports.publishBlog = exports.patchBlogStatus = exports.updateBlog = exports.createBlog = exports.adminListBlogs = exports.getBlog = exports.listPublicBlogs = void 0;
const BlogService = __importStar(require("./blog.service"));
const listPublicBlogs = async (_req, res) => {
    try {
        res.json(await BlogService.listBlogs(false));
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.listPublicBlogs = listPublicBlogs;
const getBlog = async (req, res) => {
    try {
        res.json(await BlogService.getBlog(req.params.id));
    }
    catch (e) {
        res.status(404).json({ message: e.message });
    }
};
exports.getBlog = getBlog;
const adminListBlogs = async (_req, res) => {
    try {
        res.json(await BlogService.listBlogs(true));
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.adminListBlogs = adminListBlogs;
const createBlog = async (req, res) => {
    try {
        res.status(201).json(await BlogService.createBlog(req.body));
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.createBlog = createBlog;
const updateBlog = async (req, res) => {
    try {
        res.json(await BlogService.updateBlog(req.params.id, req.body));
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.updateBlog = updateBlog;
const patchBlogStatus = async (req, res) => {
    try {
        res.json(await BlogService.patchBlogStatus(req.params.id, req.body.status));
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.patchBlogStatus = patchBlogStatus;
const publishBlog = async (req, res) => {
    try {
        res.json(await BlogService.publishBlog(req.params.id));
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.publishBlog = publishBlog;
const deleteBlog = async (req, res) => {
    try {
        res.json(await BlogService.deleteBlog(req.params.id));
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.deleteBlog = deleteBlog;
