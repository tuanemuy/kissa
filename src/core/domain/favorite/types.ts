import { z } from "zod";
import { locationIdSchema } from "../location/types";
import { regionIdSchema } from "../region/types";
import { userIdSchema } from "../user/types";

// Branded types
export const favoriteIdSchema = z.string().uuid().brand("FavoriteId");
export type FavoriteId = z.infer<typeof favoriteIdSchema>;

export const pinnedRegionIdSchema = z.string().uuid().brand("PinnedRegionId");
export type PinnedRegionId = z.infer<typeof pinnedRegionIdSchema>;

// Favorite entity
export const favoriteSchema = z.object({
  id: favoriteIdSchema,
  userId: userIdSchema,
  regionId: regionIdSchema.nullable(),
  locationId: locationIdSchema.nullable(),
  createdAt: z.date(),
});
export type Favorite = z.infer<typeof favoriteSchema>;

// Pinned region entity
export const pinnedRegionSchema = z.object({
  id: pinnedRegionIdSchema,
  userId: userIdSchema,
  regionId: regionIdSchema,
  order: z.number().int().nonnegative(),
  createdAt: z.date(),
});
export type PinnedRegion = z.infer<typeof pinnedRegionSchema>;

// DTOs
export const addFavoriteParamsSchema = z
  .object({
    userId: userIdSchema,
    regionId: regionIdSchema.optional(),
    locationId: locationIdSchema.optional(),
  })
  .refine(
    (data) =>
      (data.regionId && !data.locationId) ||
      (!data.regionId && data.locationId),
    { message: "Either regionId or locationId must be provided, but not both" },
  );
export type AddFavoriteParams = z.infer<typeof addFavoriteParamsSchema>;

export const removeFavoriteParamsSchema = z
  .object({
    userId: userIdSchema,
    regionId: regionIdSchema.optional(),
    locationId: locationIdSchema.optional(),
  })
  .refine(
    (data) =>
      (data.regionId && !data.locationId) ||
      (!data.regionId && data.locationId),
    { message: "Either regionId or locationId must be provided, but not both" },
  );
export type RemoveFavoriteParams = z.infer<typeof removeFavoriteParamsSchema>;

export const pinRegionParamsSchema = z.object({
  userId: userIdSchema,
  regionId: regionIdSchema,
  order: z.number().int().nonnegative().optional(),
});
export type PinRegionParams = z.infer<typeof pinRegionParamsSchema>;

export const reorderPinnedRegionParamsSchema = z.object({
  userId: userIdSchema,
  regionId: regionIdSchema,
  newOrder: z.number().int().nonnegative(),
});
export type ReorderPinnedRegionParams = z.infer<
  typeof reorderPinnedRegionParamsSchema
>;

// Query types
export const listFavoritesQuerySchema = z.object({
  userId: userIdSchema,
  type: z.enum(["region", "location", "all"]).optional().default("all"),
  pagination: z.object({
    page: z.number().positive(),
    limit: z.number().positive().max(100),
  }),
});
export type ListFavoritesQuery = z.infer<typeof listFavoritesQuerySchema>;

// Favorite with relations
export const favoriteWithRegionSchema = favoriteSchema.extend({
  region: z
    .object({
      id: regionIdSchema,
      name: z.string(),
      description: z.string().nullable(),
      coverPhotoUrl: z.string().url().nullable(),
    })
    .nullable(),
});
export type FavoriteWithRegion = z.infer<typeof favoriteWithRegionSchema>;

export const favoriteWithLocationSchema = favoriteSchema.extend({
  location: z
    .object({
      id: locationIdSchema,
      name: z.string(),
      address: z.string().nullable(),
      coverPhotoUrl: z.string().url().nullable(),
    })
    .nullable(),
});
export type FavoriteWithLocation = z.infer<typeof favoriteWithLocationSchema>;

export const pinnedRegionWithDetailsSchema = pinnedRegionSchema.extend({
  region: z.object({
    id: regionIdSchema,
    name: z.string(),
    description: z.string().nullable(),
    coverPhotoUrl: z.string().url().nullable(),
  }),
});
export type PinnedRegionWithDetails = z.infer<
  typeof pinnedRegionWithDetailsSchema
>;
