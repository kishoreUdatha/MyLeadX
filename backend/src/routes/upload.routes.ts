import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { authenticate } from '../middlewares/auth';
import { s3Service } from '../integrations/s3.service';
import { config } from '../config';

const router = Router();

// Configure multer for memory storage (for S3 uploads)
const memoryStorage = multer.memoryStorage();

// Configure multer for disk storage (fallback for local)
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

// File filter
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'text/plain',
    'audio/mpeg',
    'audio/wav',
    'video/mp4',
    'video/webm',
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed`));
  }
};

// Use memory storage if S3 is configured, otherwise disk
const upload = multer({
  storage: s3Service.isEnabled() ? memoryStorage : diskStorage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

// Upload single file
router.post('/single', authenticate, upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const folder = (req.body.folder as string) || 'uploads';

    if (s3Service.isEnabled()) {
      // Upload to S3
      const result = await s3Service.uploadFile(
        req.file.buffer,
        req.file.originalname,
        {
          folder,
          contentType: req.file.mimetype,
          isPublic: req.body.isPublic === 'true',
        }
      );

      return res.json({
        success: true,
        file: {
          key: result.key,
          url: result.url,
          originalName: req.file.originalname,
          size: req.file.size,
          mimeType: req.file.mimetype,
          storage: 's3',
        },
      });
    } else {
      // Local storage
      const fileUrl = `${config.baseUrl}/uploads/${req.file.filename}`;

      return res.json({
        success: true,
        file: {
          key: req.file.filename,
          url: fileUrl,
          originalName: req.file.originalname,
          size: req.file.size,
          mimeType: req.file.mimetype,
          storage: 'local',
        },
      });
    }
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ success: false, message: (error as Error).message });
  }
});

// Upload multiple files
router.post('/multiple', authenticate, upload.array('files', 10), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded' });
    }

    const folder = (req.body.folder as string) || 'uploads';
    const results = [];

    for (const file of files) {
      if (s3Service.isEnabled()) {
        const result = await s3Service.uploadFile(file.buffer, file.originalname, {
          folder,
          contentType: file.mimetype,
          isPublic: req.body.isPublic === 'true',
        });

        results.push({
          key: result.key,
          url: result.url,
          originalName: file.originalname,
          size: file.size,
          mimeType: file.mimetype,
          storage: 's3',
        });
      } else {
        const fileUrl = `${config.baseUrl}/uploads/${file.filename}`;
        results.push({
          key: file.filename,
          url: fileUrl,
          originalName: file.originalname,
          size: file.size,
          mimeType: file.mimetype,
          storage: 'local',
        });
      }
    }

    return res.json({ success: true, files: results });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ success: false, message: (error as Error).message });
  }
});

// Get presigned upload URL (for direct client-to-S3 uploads)
router.post('/presigned-url', authenticate, async (req: Request, res: Response) => {
  try {
    if (!s3Service.isEnabled()) {
      return res.status(400).json({
        success: false,
        message: 'S3 is not configured. Use direct upload endpoint instead.',
      });
    }

    const { folder, fileName, contentType } = req.body;

    if (!fileName) {
      return res.status(400).json({ success: false, message: 'fileName is required' });
    }

    const result = await s3Service.generateUploadUrl(
      folder || 'uploads',
      fileName,
      contentType
    );

    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Presigned URL error:', error);
    return res.status(500).json({ success: false, message: (error as Error).message });
  }
});

// Get presigned download URL
router.get('/download-url/:key', authenticate, async (req: Request, res: Response) => {
  try {
    if (!s3Service.isEnabled()) {
      return res.status(400).json({
        success: false,
        message: 'S3 is not configured',
      });
    }

    const { key } = req.params;
    const url = await s3Service.getSignedDownloadUrl(key);

    return res.json({ success: true, url });
  } catch (error) {
    console.error('Download URL error:', error);
    return res.status(500).json({ success: false, message: (error as Error).message });
  }
});

// Delete file
router.delete('/:key', authenticate, async (req: Request, res: Response) => {
  try {
    const { key } = req.params;

    if (s3Service.isEnabled()) {
      await s3Service.deleteFile(key);
    } else {
      const filePath = path.join(__dirname, '../../uploads', key);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    return res.json({ success: true, message: 'File deleted' });
  } catch (error) {
    console.error('Delete error:', error);
    return res.status(500).json({ success: false, message: (error as Error).message });
  }
});

export default router;
