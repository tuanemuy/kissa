import type { FileUploadRepository } from "@/core/domain/fileUpload/ports/fileUploadRepository";
import type {
  AttachFilesToEntityParams,
  CreateFileUploadParams,
  FileUpload,
  FileUploadId,
  ListFileUploadsQuery,
} from "@/core/domain/fileUpload/types";
import type { RepositoryError } from "@/lib/error";
import type { Result } from "neverthrow";
import { err, ok } from "neverthrow";

export class MockFileUploadRepository implements FileUploadRepository {
  private fileUploads: FileUpload[] = [];

  async create(
    params: CreateFileUploadParams,
  ): Promise<Result<FileUpload, RepositoryError>> {
    const fileUpload: FileUpload = {
      id: `file-${Date.now()}` as FileUploadId,
      uploadedBy: params.uploadedBy,
      fileUrl: params.fileUrl,
      fileType: params.fileType,
      fileSize: params.fileSize,
      entityType: params.entityType || null,
      entityId: params.entityId || null,
      createdAt: new Date(),
    };

    this.fileUploads.push(fileUpload);
    return ok(fileUpload);
  }

  async findById(
    id: FileUploadId,
  ): Promise<Result<FileUpload | null, RepositoryError>> {
    const fileUpload = this.fileUploads.find((f) => f.id === id);
    return ok(fileUpload || null);
  }

  async list(
    query: ListFileUploadsQuery,
  ): Promise<Result<{ items: FileUpload[]; count: number }, RepositoryError>> {
    let filtered = this.fileUploads;

    if (query.filter?.uploadedBy) {
      filtered = filtered.filter(
        (f) => f.uploadedBy === query.filter?.uploadedBy,
      );
    }
    if (query.filter?.entityType) {
      filtered = filtered.filter(
        (f) => f.entityType === query.filter?.entityType,
      );
    }
    if (query.filter?.entityId) {
      filtered = filtered.filter((f) => f.entityId === query.filter?.entityId);
    }

    const offset = (query.pagination.page - 1) * query.pagination.limit;
    const items = filtered.slice(offset, offset + query.pagination.limit);

    return ok({ items, count: filtered.length });
  }

  async findByEntityId(
    entityType: string,
    entityId: string,
  ): Promise<Result<FileUpload[], RepositoryError>> {
    const fileUploads = this.fileUploads.filter(
      (f) => f.entityType === entityType && f.entityId === entityId,
    );
    return ok(fileUploads);
  }

  async attachFilesToEntity(
    params: AttachFilesToEntityParams,
  ): Promise<Result<FileUpload[], RepositoryError>> {
    const results: FileUpload[] = [];

    for (const fileUrl of params.fileUrls) {
      const createResult = await this.create({
        uploadedBy: params.uploadedBy,
        fileUrl,
        fileType: "image/jpeg",
        fileSize: 1000,
        entityType: params.entityType,
        entityId: params.entityId,
      });

      if (createResult.isErr()) {
        return err(createResult.error);
      }

      results.push(createResult.value);
    }

    return ok(results);
  }

  async delete(id: FileUploadId): Promise<Result<void, RepositoryError>> {
    const index = this.fileUploads.findIndex((f) => f.id === id);
    if (index !== -1) {
      this.fileUploads.splice(index, 1);
    }
    return ok(undefined);
  }
}
