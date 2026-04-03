import { Request, Response } from 'express';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client } from '../../utils/awsClient';

export const requestPresignedUrl = async (req: Request, res: Response) => {
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

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileKey,
      ContentType: fileType,
    });

    // URL valid for 5 minutes
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

    res.json({
      uploadUrl,
      fileKey,
      fileUrl: `https://${bucketName}.s3.${process.env.AWS_REGION || 'ap-southeast-2'}.amazonaws.com/${fileKey}`
    });
  } catch (e: any) {
    console.error('[S3 Presigned URL Error]:', e.message);
    res.status(400).json({ message: e.message });
  }
};

export const deleteFile = async (req: Request, res: Response) => {
  try {
    const { fileKey } = req.body;
    if (!fileKey) return res.status(400).json({ message: 'fileKey is required' });
    // Mock S3 Deletion
    res.json({ message: 'File deleted successfully' });
  } catch (e: any) { res.status(400).json({ message: e.message }); }
};

export const mockS3Endpoint = (req: Request, res: Response) => {
  res.status(200).json({ message: 'Mock S3 upload accepted', key: req.query.key as string });
};
