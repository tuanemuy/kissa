import { z } from "zod";
import type { UserId } from "../user/types";
import { userIdSchema } from "../user/types";

// Branded types
export const regionIdSchema = z.string().uuid().brand("RegionId");
export type RegionId = z.infer<typeof regionIdSchema>;

// Region entity
export const regionSchema = z.object({
  id: regionIdSchema,
  creatorId: userIdSchema,
  name: z.string().min(1).max(100),
  description: z.string().max(1000).nullable(),
  isPublic: z.boolean(),
  coverPhotoUrl: z.string().url().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Region = z.infer<typeof regionSchema>;

// DTOs
export const createRegionParamsSchema = z.object({
  creatorId: userIdSchema,
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  isPublic: z.boolean().optional().default(false),
  coverPhotoUrl: z.string().url().optional(),
});
export type CreateRegionParams = z.infer<typeof createRegionParamsSchema>;

export const updateRegionParamsSchema = z.object({
  id: regionIdSchema,
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).nullable().optional(),
  isPublic: z.boolean().optional(),
  coverPhotoUrl: z.string().url().nullable().optional(),
});
export type UpdateRegionParams = z.infer<typeof updateRegionParamsSchema>;

// Query types
export const listRegionsQuerySchema = z.object({
  pagination: z.object({
    page: z.number().positive(),
    limit: z.number().positive().max(100),
  }),
  filter: z
    .object({
      creatorId: userIdSchema.optional(),
      isPublic: z.boolean().optional(),
      search: z.string().optional(),
    })
    .optional(),
  sort: z
    .object({
      field: z.enum(["createdAt", "updatedAt", "name"]),
      order: z.enum(["asc", "desc"]),
    })
    .optional(),
});
export type ListRegionsQuery = z.infer<typeof listRegionsQuerySchema>;

// Region with metadata
export const regionWithStatsSchema = regionSchema.extend({
  locationCount: z.number().nonnegative(),
  favoriteCount: z.number().nonnegative(),
  checkInCount: z.number().nonnegative(),
});
export type RegionWithStats = z.infer<typeof regionWithStatsSchema>;
