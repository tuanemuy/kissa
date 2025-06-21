import { z } from "zod/v4";
import { locationIdSchema } from "../location/types";
import { regionIdSchema } from "../region/types";
import { userIdSchema } from "../user/types";

// Branded types
export const fileUploadIdSchema = z.string().uuid().brand("FileUploadId");
export type FileUploadId = z.infer<typeof fileUploadIdSchema>;

// File upload entity types
export const entityTypeSchema = z.enum([
  "user_profile",
  "region_cover",
  "location_cover",
  "location_image",
  "check_in_photo",
]);
export type EntityType = z.infer<typeof entityTypeSchema>;

// File upload entity
export const fileUploadSchema = z.object({
  id: fileUploadIdSchema,
  uploadedBy: userIdSchema,
  fileUrl: z.string().url(),
  fileType: z.string(),
  fileSize: z.number().positive(),
  entityType: entityTypeSchema.nullable(),
  entityId: z.string().nullable(),
  createdAt: z.date(),
});
export type FileUpload = z.infer<typeof fileUploadSchema>;

// DTOs
export const createFileUploadParamsSchema = z.object({
  uploadedBy: userIdSchema,
  fileUrl: z.string().url(),
  fileType: z.string(),
  fileSize: z.number().positive(),
  entityType: entityTypeSchema.optional(),
  entityId: z.string().optional(),
});
export type CreateFileUploadParams = z.infer<
  typeof createFileUploadParamsSchema
>;

export const listFileUploadsQuerySchema = z.object({
  pagination: z.object({
    page: z.number().positive(),
    limit: z.number().positive().max(100),
  }),
  filter: z
    .object({
      uploadedBy: userIdSchema.optional(),
      entityType: entityTypeSchema.optional(),
      entityId: z.string().optional(),
    })
    .optional(),
  sort: z
    .object({
      field: z.enum(["createdAt", "fileSize"]),
      order: z.enum(["asc", "desc"]),
    })
    .optional(),
});
export type ListFileUploadsQuery = z.infer<typeof listFileUploadsQuerySchema>;

export const attachFilesToEntityParamsSchema = z.object({
  entityType: entityTypeSchema,
  entityId: z.string(),
  fileUrls: z.array(z.string().url()),
  uploadedBy: userIdSchema,
});
export type AttachFilesToEntityParams = z.infer<
  typeof attachFilesToEntityParamsSchema
>;
