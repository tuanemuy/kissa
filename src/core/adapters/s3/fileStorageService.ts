import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { type Result, err, ok } from "neverthrow";
import type {
  FileMetadata,
  FileStorageService,
  UploadOptions,
  UploadResult,
} from "../../domain/common/ports/fileStorageService";

export interface S3Config {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  defaultBucket: string;
  endpoint?: string;
  forcePathStyle?: boolean;
}

export class S3FileStorageService implements FileStorageService {
  private s3Client: S3Client;
  private defaultBucket: string;
  private config: S3Config;

  constructor(config: S3Config) {
    this.config = config;
    this.defaultBucket = config.defaultBucket;

    const clientConfig: {
      region: string;
      credentials: { accessKeyId: string; secretAccessKey: string };
      endpoint?: string;
      forcePathStyle?: boolean;
    } = {
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    };

    if (config.endpoint) {
      clientConfig.endpoint = config.endpoint;
      clientConfig.forcePathStyle = config.forcePathStyle || true;
    }

    this.s3Client = new S3Client(clientConfig);
  }

  async uploadFile(
    fileBuffer: Buffer,
    metadata: FileMetadata,
    options?: UploadOptions,
  ): Promise<Result<UploadResult, Error>> {
    try {
      const bucket = options?.bucket || this.defaultBucket;
      const folder = options?.folder ? `${options.folder}/` : "";
      const filename =
        options?.filename || this.generateFilename(metadata.name);
      const key = `${folder}${filename}`;

      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: fileBuffer,
        ContentType: options?.contentType || metadata.mimeType,
        ContentLength: metadata.size,
        Metadata: {
          originalName: metadata.name,
          uploadedAt: new Date().toISOString(),
          ...options?.metadata,
        },
      });

      await this.s3Client.send(command);

      // Generate public URL (adjust based on your S3 configuration)
      const url = this.generatePublicUrl(bucket, key);

      return ok({
        url,
        key,
        bucket,
      });
    } catch (error) {
      return err(new Error(`Failed to upload file: ${error}`));
    }
  }

  async deleteFile(key: string, bucket?: string): Promise<Result<void, Error>> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: bucket || this.defaultBucket,
        Key: key,
      });

      await this.s3Client.send(command);
      return ok(undefined);
    } catch (error) {
      return err(new Error(`Failed to delete file: ${error}`));
    }
  }

  async getSignedUrl(
    key: string,
    bucket?: string,
    expiresInSeconds = 3600,
  ): Promise<Result<string, Error>> {
    try {
      const command = new GetObjectCommand({
        Bucket: bucket || this.defaultBucket,
        Key: key,
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: expiresInSeconds,
      });

      return ok(signedUrl);
    } catch (error) {
      return err(new Error(`Failed to generate signed URL: ${error}`));
    }
  }

  async getFileMetadata(
    key: string,
    bucket?: string,
  ): Promise<Result<FileMetadata, Error>> {
    try {
      const command = new HeadObjectCommand({
        Bucket: bucket || this.defaultBucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);

      return ok({
        name: response.Metadata?.originalName || key.split("/").pop() || key,
        size: response.ContentLength || 0,
        mimeType: response.ContentType || "application/octet-stream",
        lastModified: response.LastModified,
      });
    } catch (error) {
      return err(new Error(`Failed to get file metadata: ${error}`));
    }
  }

  async fileExists(
    key: string,
    bucket?: string,
  ): Promise<Result<boolean, Error>> {
    try {
      const command = new HeadObjectCommand({
        Bucket: bucket || this.defaultBucket,
        Key: key,
      });

      await this.s3Client.send(command);
      return ok(true);
    } catch (error: unknown) {
      const awsError = error as {
        name?: string;
        $metadata?: { httpStatusCode?: number };
      };
      if (
        awsError.name === "NotFound" ||
        awsError.$metadata?.httpStatusCode === 404
      ) {
        return ok(false);
      }
      return err(new Error(`Failed to check file existence: ${error}`));
    }
  }

  private generateFilename(originalName: string): string {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = originalName.split(".").pop();
    return `${timestamp}_${randomString}.${extension}`;
  }

  private generatePublicUrl(bucket: string, key: string): string {
    if (this.config.endpoint) {
      // Custom endpoint (e.g., Minio)
      return `${this.config.endpoint}/${bucket}/${key}`;
    }

    // Standard AWS S3 URL
    return `https://${bucket}.s3.${this.config.region}.amazonaws.com/${key}`;
  }
}
