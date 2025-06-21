import type { FileUploadRepository } from "@/core/domain/fileUpload/ports/fileUploadRepository";
import type {
  AttachFilesToEntityParams,
  CreateFileUploadParams,
  FileUpload,
  FileUploadId,
  ListFileUploadsQuery,
} from "@/core/domain/fileUpload/types";
import { fileUploadSchema } from "@/core/domain/fileUpload/types";
import { RepositoryError } from "@/lib/error";
import { validate } from "@/lib/validation";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { type Result, err, ok } from "neverthrow";
import type { Database } from "./client";
import { fileUploads } from "./schema";

export class DrizzleTursoFileUploadRepository implements FileUploadRepository {
  constructor(private readonly db: Database) {}

  async create(
    params: CreateFileUploadParams,
  ): Promise<Result<FileUpload, RepositoryError>> {
    try {
      const result = await this.db
        .insert(fileUploads)
        .values({
          uploadedBy: params.uploadedBy,
          fileUrl: params.fileUrl,
          fileType: params.fileType,
          fileSize: params.fileSize,
          entityType: params.entityType || null,
          entityId: params.entityId || null,
        })
        .returning();

      const fileUpload = result[0];
      if (!fileUpload) {
        return err(new RepositoryError("Failed to create file upload"));
      }

      return validate(fileUploadSchema, fileUpload).mapErr(
        (error) => new RepositoryError("Invalid file upload data", error),
      );
    } catch (error) {
      return err(new RepositoryError("Failed to create file upload", error));
    }
  }

  async findById(
    id: FileUploadId,
  ): Promise<Result<FileUpload | null, RepositoryError>> {
    try {
      const result = await this.db
        .select()
        .from(fileUploads)
        .where(eq(fileUploads.id, id))
        .limit(1);

      if (result.length === 0) {
        return ok(null);
      }

      return validate(fileUploadSchema, result[0]).mapErr(
        (error) => new RepositoryError("Invalid file upload data", error),
      );
    } catch (error) {
      return err(new RepositoryError("Failed to find file upload", error));
    }
  }

  async list(
    query: ListFileUploadsQuery,
  ): Promise<Result<{ items: FileUpload[]; count: number }, RepositoryError>> {
    const { pagination, filter, sort } = query;
    const limit = pagination.limit;
    const offset = (pagination.page - 1) * pagination.limit;

    const filters = [
      filter?.uploadedBy
        ? eq(fileUploads.uploadedBy, filter.uploadedBy)
        : undefined,
      filter?.entityType
        ? eq(fileUploads.entityType, filter.entityType)
        : undefined,
      filter?.entityId ? eq(fileUploads.entityId, filter.entityId) : undefined,
    ].filter((filter) => filter !== undefined);

    try {
      const orderBy =
        sort?.field === "fileSize"
          ? sort.order === "desc"
            ? desc(fileUploads.fileSize)
            : asc(fileUploads.fileSize)
          : sort?.order === "desc"
            ? desc(fileUploads.createdAt)
            : asc(fileUploads.createdAt);

      const [items, countResult] = await Promise.all([
        this.db
          .select()
          .from(fileUploads)
          .where(and(...filters))
          .orderBy(orderBy)
          .limit(limit)
          .offset(offset),
        this.db
          .select({ count: sql`count(*)` })
          .from(fileUploads)
          .where(and(...filters)),
      ]);

      const validatedItems = items
        .map((item) => validate(fileUploadSchema, item).unwrapOr(null))
        .filter((item) => item !== null);

      return ok({
        items: validatedItems,
        count: Number(countResult[0]?.count || 0),
      });
    } catch (error) {
      return err(new RepositoryError("Failed to list file uploads", error));
    }
  }

  async findByEntityId(
    entityType: string,
    entityId: string,
  ): Promise<Result<FileUpload[], RepositoryError>> {
    try {
      const result = await this.db
        .select()
        .from(fileUploads)
        .where(
          and(
            eq(
              fileUploads.entityType,
              entityType as
                | "user_profile"
                | "region_cover"
                | "location_cover"
                | "location_image"
                | "check_in_photo",
            ),
            eq(fileUploads.entityId, entityId),
          ),
        )
        .orderBy(asc(fileUploads.createdAt));

      const validatedItems = result
        .map((item) => validate(fileUploadSchema, item).unwrapOr(null))
        .filter((item) => item !== null);

      return ok(validatedItems);
    } catch (error) {
      return err(new RepositoryError("Failed to find files by entity", error));
    }
  }

  async attachFilesToEntity(
    params: AttachFilesToEntityParams,
  ): Promise<Result<FileUpload[], RepositoryError>> {
    try {
      const results: FileUpload[] = [];

      for (const fileUrl of params.fileUrls) {
        const createResult = await this.create({
          uploadedBy: params.uploadedBy,
          fileUrl,
          fileType: "image/jpeg", // Default, could be improved
          fileSize: 0, // Would need to be determined from file
          entityType: params.entityType,
          entityId: params.entityId,
        });

        if (createResult.isErr()) {
          return err(createResult.error);
        }

        results.push(createResult.value);
      }

      return ok(results);
    } catch (error) {
      return err(
        new RepositoryError("Failed to attach files to entity", error),
      );
    }
  }

  async delete(id: FileUploadId): Promise<Result<void, RepositoryError>> {
    try {
      await this.db.delete(fileUploads).where(eq(fileUploads.id, id));
      return ok(undefined);
    } catch (error) {
      return err(new RepositoryError("Failed to delete file upload", error));
    }
  }
}
