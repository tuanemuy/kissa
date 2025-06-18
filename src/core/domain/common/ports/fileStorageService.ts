import type { Result } from "neverthrow";

export interface UploadResult {
  url: string;
  key: string;
  bucket: string;
}

export interface FileMetadata {
  name: string;
  size: number;
  mimeType: string;
  lastModified?: Date;
}

export interface UploadOptions {
  bucket?: string;
  folder?: string;
  filename?: string;
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface FileStorageService {
  /**
   * Upload a file to storage
   */
  uploadFile(
    fileBuffer: Buffer,
    metadata: FileMetadata,
    options?: UploadOptions,
  ): Promise<Result<UploadResult, Error>>;

  /**
   * Delete a file from storage
   */
  deleteFile(key: string, bucket?: string): Promise<Result<void, Error>>;

  /**
   * Get a signed URL for temporary access to a file
   */
  getSignedUrl(
    key: string,
    bucket?: string,
    expiresInSeconds?: number,
  ): Promise<Result<string, Error>>;

  /**
   * Get file metadata
   */
  getFileMetadata(
    key: string,
    bucket?: string,
  ): Promise<Result<FileMetadata, Error>>;

  /**
   * Check if a file exists
   */
  fileExists(key: string, bucket?: string): Promise<Result<boolean, Error>>;
}
