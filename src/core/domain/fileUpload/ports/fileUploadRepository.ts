import type { RepositoryError } from "@/lib/error";
import type { Result } from "neverthrow";
import type {
  AttachFilesToEntityParams,
  CreateFileUploadParams,
  FileUpload,
  FileUploadId,
  ListFileUploadsQuery,
} from "../types";

export interface FileUploadRepository {
  create(
    params: CreateFileUploadParams,
  ): Promise<Result<FileUpload, RepositoryError>>;
  findById(
    id: FileUploadId,
  ): Promise<Result<FileUpload | null, RepositoryError>>;
  list(
    query: ListFileUploadsQuery,
  ): Promise<Result<{ items: FileUpload[]; count: number }, RepositoryError>>;
  findByEntityId(
    entityType: string,
    entityId: string,
  ): Promise<Result<FileUpload[], RepositoryError>>;
  attachFilesToEntity(
    params: AttachFilesToEntityParams,
  ): Promise<Result<FileUpload[], RepositoryError>>;
  delete(id: FileUploadId): Promise<Result<void, RepositoryError>>;
}
