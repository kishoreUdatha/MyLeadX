import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../config';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

interface UploadOptions {
  folder?: string;
  fileName?: string;
  contentType?: string;
  isPublic?: boolean;
}

interface PresignedUrlOptions {
  expiresIn?: number; // seconds, default 3600 (1 hour)
  contentType?: string;
}

export class S3Service {
  private client: S3Client | null = null;
  private bucket: string;
  private _isConfigured: boolean = false;

  constructor() {
    this.bucket = config.aws.bucketName || '';
    this.initializeClient();
  }

  private initializeClient() {
    const { accessKeyId, secretAccessKey, region, bucketName } = config.aws;

    if (accessKeyId && secretAccessKey && bucketName) {
      this.client = new S3Client({
        region: region || 'ap-south-1',
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
      this._isConfigured = true;
      console.log('S3 client initialized successfully');
    } else {
      console.warn('AWS S3 not configured. File uploads will use local storage.');
    }
  }

  isEnabled(): boolean {
    return this._isConfigured;
  }

  isConfigured(): boolean {
    return this._isConfigured;
  }

  /**
   * Upload a file buffer to S3
   */
  async uploadFile(
    fileBuffer: Buffer,
    originalFileName: string,
    options: UploadOptions = {}
  ): Promise<{ key: string; url: string; bucket: string }> {
    if (!this.client) {
      throw new Error('S3 is not configured');
    }

    const folder = options.folder || 'uploads';
    const ext = path.extname(originalFileName);
    const fileName = options.fileName || `${uuidv4()}${ext}`;
    const key = `${folder}/${fileName}`;

    const contentType = options.contentType || this.getContentType(ext);

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
      ACL: options.isPublic ? 'public-read' : 'private',
    });

    await this.client.send(command);

    const url = options.isPublic
      ? `https://${this.bucket}.s3.${config.aws.region}.amazonaws.com/${key}`
      : await this.getSignedDownloadUrl(key);

    return { key, url, bucket: this.bucket };
  }

  /**
   * Upload a file from local path to S3
   */
  async uploadFromPath(
    filePath: string,
    options: UploadOptions = {}
  ): Promise<{ key: string; url: string; bucket: string }> {
    const fileBuffer = fs.readFileSync(filePath);
    const originalFileName = path.basename(filePath);
    return this.uploadFile(fileBuffer, originalFileName, options);
  }

  /**
   * Get a presigned URL for downloading a private file
   */
  async getSignedDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
    if (!this.client) {
      throw new Error('S3 is not configured');
    }

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return getSignedUrl(this.client, command, { expiresIn });
  }

  /**
   * Get a presigned URL for uploading a file directly from client
   */
  async getSignedUploadUrl(
    key: string,
    options: PresignedUrlOptions = {}
  ): Promise<{ uploadUrl: string; key: string }> {
    if (!this.client) {
      throw new Error('S3 is not configured');
    }

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: options.contentType,
    });

    const uploadUrl = await getSignedUrl(this.client, command, {
      expiresIn: options.expiresIn || 3600,
    });

    return { uploadUrl, key };
  }

  /**
   * Generate a presigned upload URL with auto-generated key
   */
  async generateUploadUrl(
    folder: string,
    fileName: string,
    contentType?: string
  ): Promise<{ uploadUrl: string; key: string; publicUrl: string }> {
    const ext = path.extname(fileName);
    const key = `${folder}/${uuidv4()}${ext}`;

    const { uploadUrl } = await this.getSignedUploadUrl(key, { contentType });
    const publicUrl = `https://${this.bucket}.s3.${config.aws.region}.amazonaws.com/${key}`;

    return { uploadUrl, key, publicUrl };
  }

  /**
   * Delete a file from S3
   */
  async deleteFile(key: string): Promise<void> {
    if (!this.client) {
      throw new Error('S3 is not configured');
    }

    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    await this.client.send(command);
  }

  /**
   * Delete multiple files from S3
   */
  async deleteFiles(keys: string[]): Promise<void> {
    for (const key of keys) {
      await this.deleteFile(key);
    }
  }

  /**
   * List files in a folder (returns keys only)
   */
  async listFileKeys(folder: string, maxKeys: number = 1000): Promise<string[]> {
    if (!this.client) {
      throw new Error('S3 is not configured');
    }

    const command = new ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix: folder,
      MaxKeys: maxKeys,
    });

    const response = await this.client.send(command);
    return response.Contents?.map(obj => obj.Key || '') || [];
  }

  /**
   * List files with details (for cleanup service)
   */
  async listFiles(folder?: string, maxKeys: number = 1000): Promise<Array<{
    key: string;
    size?: number;
    lastModified?: Date;
  }>> {
    if (!this.client) {
      throw new Error('S3 is not configured');
    }

    const command = new ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix: folder || '',
      MaxKeys: maxKeys,
    });

    const response = await this.client.send(command);
    return response.Contents?.map(obj => ({
      key: obj.Key || '',
      size: obj.Size,
      lastModified: obj.LastModified,
    })) || [];
  }

  /**
   * Check if a file exists
   */
  async fileExists(key: string): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      await this.client.send(command);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get content type from file extension
   */
  private getContentType(ext: string): string {
    const contentTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.csv': 'text/csv',
      '.txt': 'text/plain',
      '.json': 'application/json',
      '.mp3': 'audio/mpeg',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.wav': 'audio/wav',
    };

    return contentTypes[ext.toLowerCase()] || 'application/octet-stream';
  }

  /**
   * Copy file within S3
   */
  async copyFile(sourceKey: string, destinationKey: string): Promise<void> {
    if (!this.client) {
      throw new Error('S3 is not configured');
    }

    // S3 copy requires fetching and re-uploading for cross-region
    const getCommand = new GetObjectCommand({
      Bucket: this.bucket,
      Key: sourceKey,
    });

    const response = await this.client.send(getCommand);
    const body = await response.Body?.transformToByteArray();

    if (body) {
      const putCommand = new PutObjectCommand({
        Bucket: this.bucket,
        Key: destinationKey,
        Body: body,
        ContentType: response.ContentType,
      });

      await this.client.send(putCommand);
    }
  }
}

export const s3Service = new S3Service();
