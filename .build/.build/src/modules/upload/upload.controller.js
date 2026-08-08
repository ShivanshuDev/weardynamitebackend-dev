"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockS3Endpoint = exports.deleteFile = exports.requestPresignedUrl = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const awsClient_1 = require("../../utils/awsClient");
const requestPresignedUrl = async (req, res) => {
    try {
        const { fileName, fileType, folder } = req.body;
        if (!fileName || !fileType) {
            return res.status(400).json({ message: 'fileName and fileType are required' });
        }
        const bucketName = process.env.S3_BUCKET_NAME;
        if (!bucketName) {
            throw new Error('S3_BUCKET_NAME not configured in environment');
        }
        const cleanFileName = fileName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
        const fileKey = `${folder || 'uploads'}/${Date.now()}_${cleanFileName}`;
        const command = new client_s3_1.PutObjectCommand({
            Bucket: bucketName,
            Key: fileKey,
            ContentType: fileType,
        });
        // URL valid for 5 minutes
        const uploadUrl = await (0, s3_request_presigner_1.getSignedUrl)(awsClient_1.s3Client, command, { expiresIn: 300 });
        res.json({
            uploadUrl,
            fileKey,
            fileUrl: `https://${bucketName}.s3.${process.env.AWS_REGION || 'ap-southeast-2'}.amazonaws.com/${fileKey}`
        });
    }
    catch (e) {
        console.error('[S3 Presigned URL Error]:', e.message);
        res.status(400).json({ message: e.message });
    }
};
exports.requestPresignedUrl = requestPresignedUrl;
const deleteFile = async (req, res) => {
    try {
        const { fileKey } = req.body;
        if (!fileKey)
            return res.status(400).json({ message: 'fileKey is required' });
        // Mock S3 Deletion
        res.json({ message: 'File deleted successfully' });
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
};
exports.deleteFile = deleteFile;
const mockS3Endpoint = (req, res) => {
    res.status(200).json({ message: 'Mock S3 upload accepted', key: req.query.key });
};
exports.mockS3Endpoint = mockS3Endpoint;
