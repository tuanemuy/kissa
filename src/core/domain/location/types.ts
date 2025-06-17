import { z } from "zod";
import { regionIdSchema } from "../region/types";
import { userIdSchema } from "../user/types";

// Branded types
export const locationIdSchema = z.string().uuid().brand("LocationId");
export type LocationId = z.infer<typeof locationIdSchema>;

export const locationEditorIdSchema = z
  .string()
  .uuid()
  .brand("LocationEditorId");
export type LocationEditorId = z.infer<typeof locationEditorIdSchema>;

// Location entity
export const locationSchema = z.object({
  id: locationIdSchema,
  regionId: regionIdSchema,
  name: z.string().min(1).max(100),
  description: z.string().max(1000).nullable(),
  address: z.string().max(500).nullable(),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
  isPublic: z.boolean(),
  coverPhotoUrl: z.string().url().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Location = z.infer<typeof locationSchema>;

// Location editor entity
export const locationEditorSchema = z.object({
  id: locationEditorIdSchema,
  locationId: locationIdSchema,
  editorId: userIdSchema,
  invitedBy: userIdSchema,
  invitedAt: z.date(),
  acceptedAt: z.date().nullable(),
});
export type LocationEditor = z.infer<typeof locationEditorSchema>;

// DTOs
export const createLocationParamsSchema = z.object({
  regionId: regionIdSchema,
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  address: z.string().max(500).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  isPublic: z.boolean().optional().default(false),
  coverPhotoUrl: z.string().url().optional(),
});
export type CreateLocationParams = z.infer<typeof createLocationParamsSchema>;

export const updateLocationParamsSchema = z.object({
  id: locationIdSchema,
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  isPublic: z.boolean().optional(),
  coverPhotoUrl: z.string().url().nullable().optional(),
});
export type UpdateLocationParams = z.infer<typeof updateLocationParamsSchema>;

export const inviteLocationEditorParamsSchema = z.object({
  locationId: locationIdSchema,
  editorEmail: z.string().email(),
  invitedBy: userIdSchema,
});
export type InviteLocationEditorParams = z.infer<
  typeof inviteLocationEditorParamsSchema
>;

export const acceptLocationInvitationParamsSchema = z.object({
  locationEditorId: locationEditorIdSchema,
});
export type AcceptLocationInvitationParams = z.infer<
  typeof acceptLocationInvitationParamsSchema
>;

// Query types
export const listLocationsQuerySchema = z.object({
  pagination: z.object({
    page: z.number().positive(),
    limit: z.number().positive().max(100),
  }),
  filter: z
    .object({
      regionId: regionIdSchema.optional(),
      isPublic: z.boolean().optional(),
      search: z.string().optional(),
      nearbyCoordinates: z
        .object({
          latitude: z.number().min(-90).max(90),
          longitude: z.number().min(-180).max(180),
          radiusKm: z.number().positive(),
        })
        .optional(),
    })
    .optional(),
  sort: z
    .object({
      field: z.enum(["createdAt", "updatedAt", "name"]),
      order: z.enum(["asc", "desc"]),
    })
    .optional(),
});
export type ListLocationsQuery = z.infer<typeof listLocationsQuerySchema>;

// Location with metadata
export const locationWithStatsSchema = locationSchema.extend({
  favoriteCount: z.number().nonnegative(),
  checkInCount: z.number().nonnegative(),
  averageRating: z.number().min(0).max(5).nullable(),
});
export type LocationWithStats = z.infer<typeof locationWithStatsSchema>;

export const locationWithEditorsSchema = locationSchema.extend({
  editors: z.array(locationEditorSchema),
});
export type LocationWithEditors = z.infer<typeof locationWithEditorsSchema>;
