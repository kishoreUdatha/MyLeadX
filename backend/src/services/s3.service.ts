import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      }
    : undefined,
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'crm-lead-generation-files';
const USE_LOCAL_STORAGE = !process.env.AWS_ACCESS_KEY_ID;

// For local development without S3
const localFileStore: Map<string, { buffer: Buffer; mimeType: string }> = new Map();

/**
 * Upload file to S3 or local storage
 */
export async function uploadToS3(
  buffer: Buffer,
  key: string,
  mimeType: string
): Promise<string> {
  // Use local storage if S3 is not configured
  if (USE_LOCAL_STORAGE) {
    const localKey = `local://${key}`;
    localFileStore.set(localKey, { buffer, mimeType });
    console.log(`[Local Storage] File stored: ${localKey}`);
    return localKey;
  }

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
  });

  await s3Client.send(command);

  // Return the S3 URL
  return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com/${key}`;
}

/**
 * Delete file from S3 or local storage
 */
export async function deleteFromS3(fileUrl: string): Promise<void> {
  // Handle local storage
  if (fileUrl.startsWith('local://')) {
    localFileStore.delete(fileUrl);
    console.log(`[Local Storage] File deleted: ${fileUrl}`);
    return;
  }

  // Extract key from S3 URL
  const urlParts = fileUrl.split('.amazonaws.com/');
  if (urlParts.length !== 2) {
    throw new Error('Invalid S3 URL');
  }

  const key = urlParts[1];

  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  await s3Client.send(command);
}

/**
 * Get signed URL for private file access
 */
export async function getSignedUrlForDownload(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  // Handle local storage
  if (key.startsWith('local://')) {
    return key; // Return as-is for local storage
  }

  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Get file from local storage (for development)
 */
export function getLocalFile(key: string): { buffer: Buffer; mimeType: string } | null {
  return localFileStore.get(key) || null;
}

/**
 * Generate unique file key
 */
export function generateFileKey(folder: string, fileName: string): string {
  const extension = fileName.split('.').pop() || '';
  const uniqueName = `${uuidv4()}.${extension}`;
  return `${folder}/${uniqueName}`;
}

// Log initialization
if (USE_LOCAL_STORAGE) {
  console.log('S3 client initialized in LOCAL STORAGE mode (no AWS credentials found)');
} else {
  console.log('S3 client initialized successfully');
}

export { s3Client, BUCKET_NAME };
