import { z } from "zod/v4";
import { userIdSchema } from "../user/types";

// Branded types
export const moderationItemIdSchema = z
  .string()
  .uuid()
  .brand("ModerationItemId");
export type ModerationItemId = z.infer<typeof moderationItemIdSchema>;

// Enums
export const contentTypeSchema = z.enum(["region", "location", "checkIn"]);
export type ContentType = z.infer<typeof contentTypeSchema>;

export const moderationStatusSchema = z.enum([
  "pending",
  "approved",
  "rejected",
]);
export type ModerationStatus = z.infer<typeof moderationStatusSchema>;

// Moderation item entity
export const moderationItemSchema = z.object({
  id: moderationItemIdSchema,
  contentType: contentTypeSchema,
  contentId: z.string().uuid(),
  status: moderationStatusSchema,
  reportedBy: userIdSchema.nullable(),
  reportReason: z.string().max(500).nullable(),
  moderatedBy: userIdSchema.nullable(),
  moderationNote: z.string().max(500).nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type ModerationItem = z.infer<typeof moderationItemSchema>;

// DTOs
export const createModerationItemParamsSchema = z.object({
  contentType: contentTypeSchema,
  contentId: z.string().uuid(),
  reportedBy: userIdSchema.optional(),
  reportReason: z.string().max(500).optional(),
});
export type CreateModerationItemParams = z.infer<
  typeof createModerationItemParamsSchema
>;

export const moderateContentParamsSchema = z.object({
  id: moderationItemIdSchema,
  status: z.enum(["approved", "rejected"]),
  moderatedBy: userIdSchema,
  moderationNote: z.string().max(500).optional(),
});
export type ModerateContentParams = z.infer<typeof moderateContentParamsSchema>;

// Query types
export const listModerationItemsQuerySchema = z.object({
  pagination: z.object({
    page: z.number().positive(),
    limit: z.number().positive().max(100),
  }),
  filter: z
    .object({
      status: moderationStatusSchema.optional(),
      contentType: contentTypeSchema.optional(),
      reportedBy: userIdSchema.optional(),
      moderatedBy: userIdSchema.optional(),
    })
    .optional(),
  sort: z
    .object({
      field: z.enum(["createdAt", "updatedAt"]),
      order: z.enum(["asc", "desc"]),
    })
    .optional(),
});
export type ListModerationItemsQuery = z.infer<
  typeof listModerationItemsQuerySchema
>;
