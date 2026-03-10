import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Request } from 'express';
import { BadRequestError } from '../utils/errors';

// File type configurations
const FILE_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  spreadsheet: [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'application/csv',
    'text/comma-separated-values',
    'application/octet-stream', // Some systems send this for xlsx
  ],
  all: [
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
  ],
};

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

// Memory storage for processing files without saving
const memoryStorage = multer.memoryStorage();

// File filter factory
function createFileFilter(allowedTypes: string[]) {
  return (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new BadRequestError(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`));
    }
  };
}

// Upload configurations
export const uploadImage = multer({
  storage,
  fileFilter: createFileFilter(FILE_TYPES.image),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

export const uploadDocument = multer({
  storage,
  fileFilter: createFileFilter(FILE_TYPES.document),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

export const uploadSpreadsheet = multer({
  storage: memoryStorage,
  fileFilter: createFileFilter(FILE_TYPES.spreadsheet),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
});

export const uploadAny = multer({
  storage,
  fileFilter: createFileFilter(FILE_TYPES.all),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB
  },
});

// Memory storage for S3 uploads
export const uploadMiddleware = multer({
  storage: memoryStorage,
  fileFilter: createFileFilter(FILE_TYPES.all),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB
  },
});

// Helper to handle multer errors
export function handleMulterError(error: Error): string {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return 'File size too large';
      case 'LIMIT_FILE_COUNT':
        return 'Too many files';
      case 'LIMIT_UNEXPECTED_FILE':
        return 'Unexpected file field';
      default:
        return 'File upload error';
    }
  }
  return error.message;
}
