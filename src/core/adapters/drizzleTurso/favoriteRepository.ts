import { and, count, desc, eq, sql } from "drizzle-orm";
import { type Result, err, ok } from "neverthrow";
import { v7 as uuidv7 } from "uuid";

import type { FavoriteRepository } from "@/core/domain/favorite/ports/favoriteRepository";
import {
  type AddFavoriteParams,
  type Favorite,
  type FavoriteId,
  type FavoriteWithLocation,
  type FavoriteWithRegion,
  type ListFavoritesQuery,
  type PinRegionParams,
  type PinnedRegion,
  type PinnedRegionWithDetails,
  type RemoveFavoriteParams,
  type ReorderPinnedRegionParams,
  favoriteSchema,
  favoriteWithLocationSchema,
  favoriteWithRegionSchema,
  pinnedRegionSchema,
  pinnedRegionWithDetailsSchema,
} from "@/core/domain/favorite/types";
import type { LocationId } from "@/core/domain/location/types";
import type { RegionId } from "@/core/domain/region/types";
import type { UserId } from "@/core/domain/user/types";
import { RepositoryError } from "@/lib/error";
import { validate } from "@/lib/validation";

import type { Database } from "./client";
import { favorites, locations, pinnedRegions, regions } from "./schema";

export class DrizzleTursoFavoriteRepository implements FavoriteRepository {
  constructor(private readonly db: Database) {}

  async addFavorite(
    params: AddFavoriteParams,
  ): Promise<Result<Favorite, RepositoryError>> {
    try {
      // Check if favorite already exists
      const whereConditions = [eq(favorites.userId, params.userId)];

      if (params.regionId) {
        whereConditions.push(eq(favorites.regionId, params.regionId));
      }
      if (params.locationId) {
        whereConditions.push(eq(favorites.locationId, params.locationId));
      }

      const existing = await this.db
        .select()
        .from(favorites)
        .where(and(...whereConditions));
      if (existing.length > 0) {
        return err(new RepositoryError("Favorite already exists"));
      }

      const result = await this.db
        .insert(favorites)
        .values({
          id: uuidv7(),
          userId: params.userId,
          regionId: params.regionId || null,
          locationId: params.locationId || null,
        })
        .returning();

      const favorite = result[0];
      if (!favorite) {
        return err(new RepositoryError("Failed to create favorite"));
      }

      return validate(favoriteSchema, {
        ...favorite,
        createdAt: new Date(favorite.createdAt),
      }).mapErr((error) => {
        return new RepositoryError("Invalid favorite data", error);
      });
    } catch (error) {
      return err(new RepositoryError("Failed to add favorite", error));
    }
  }

  async removeFavorite(
    params: RemoveFavoriteParams,
  ): Promise<Result<void, RepositoryError>> {
    try {
      const whereConditions = [eq(favorites.userId, params.userId)];

      if (params.regionId) {
        whereConditions.push(eq(favorites.regionId, params.regionId));
      }
      if (params.locationId) {
        whereConditions.push(eq(favorites.locationId, params.locationId));
      }

      await this.db.delete(favorites).where(and(...whereConditions));

      return ok(undefined);
    } catch (error) {
      return err(new RepositoryError("Failed to remove favorite", error));
    }
  }

  async findFavoriteById(
    id: FavoriteId,
  ): Promise<Result<Favorite | null, RepositoryError>> {
    try {
      const result = await this.db
        .select()
        .from(favorites)
        .where(eq(favorites.id, id));

      if (result.length === 0) {
        return ok(null);
      }

      const favorite = result[0];
      return validate(favoriteSchema, {
        ...favorite,
        createdAt: new Date(favorite.createdAt),
      }).mapErr((error) => {
        return new RepositoryError("Invalid favorite data", error);
      });
    } catch (error) {
      return err(new RepositoryError("Failed to find favorite", error));
    }
  }

  async isFavorited(
    userId: UserId,
    regionId?: RegionId,
    locationId?: LocationId,
  ): Promise<Result<boolean, RepositoryError>> {
    try {
      const whereConditions = [eq(favorites.userId, userId)];

      if (regionId) {
        whereConditions.push(eq(favorites.regionId, regionId));
      }
      if (locationId) {
        whereConditions.push(eq(favorites.locationId, locationId));
      }

      const result = await this.db
        .select({ count: count() })
        .from(favorites)
        .where(and(...whereConditions));

      return ok((result[0]?.count ?? 0) > 0);
    } catch (error) {
      return err(new RepositoryError("Failed to check if favorited", error));
    }
  }

  async listFavorites(
    query: ListFavoritesQuery,
  ): Promise<Result<{ items: Favorite[]; count: number }, RepositoryError>> {
    const { userId, type, pagination } = query;
    const limit = pagination.limit;
    const offset = (pagination.page - 1) * pagination.limit;

    try {
      const whereConditions = [eq(favorites.userId, userId)];

      if (type === "region") {
        whereConditions.push(sql`${favorites.regionId} IS NOT NULL`);
      } else if (type === "location") {
        whereConditions.push(sql`${favorites.locationId} IS NOT NULL`);
      }

      const [items, countResult] = await Promise.all([
        this.db
          .select()
          .from(favorites)
          .where(and(...whereConditions))
          .orderBy(desc(favorites.createdAt))
          .limit(limit)
          .offset(offset),
        this.db
          .select({ count: count() })
          .from(favorites)
          .where(and(...whereConditions)),
      ]);

      const validatedItems = items
        .map((item: any) =>
          validate(favoriteSchema, {
            ...item,
            createdAt: new Date(item.createdAt),
          }).unwrapOr(null),
        )
        .filter((item): item is Favorite => item !== null);

      return ok({
        items: validatedItems,
        count: countResult[0]?.count ?? 0,
      });
    } catch (error) {
      return err(new RepositoryError("Failed to list favorites", error));
    }
  }

  async listFavoritesWithRegion(
    query: ListFavoritesQuery,
  ): Promise<
    Result<{ items: FavoriteWithRegion[]; count: number }, RepositoryError>
  > {
    const { userId, pagination } = query;
    const limit = pagination.limit;
    const offset = (pagination.page - 1) * pagination.limit;

    try {
      const whereConditions = [
        eq(favorites.userId, userId),
        sql`${favorites.regionId} IS NOT NULL`,
      ];

      const [items, countResult] = await Promise.all([
        this.db
          .select({
            id: favorites.id,
            userId: favorites.userId,
            regionId: favorites.regionId,
            locationId: favorites.locationId,
            createdAt: favorites.createdAt,
            region: {
              id: regions.id,
              name: regions.name,
              description: regions.description,
              coverPhotoUrl: regions.coverPhotoUrl,
            },
          })
          .from(favorites)
          .leftJoin(regions, eq(favorites.regionId, regions.id))
          .where(and(...whereConditions))
          .orderBy(desc(favorites.createdAt))
          .limit(limit)
          .offset(offset),
        this.db
          .select({ count: count() })
          .from(favorites)
          .where(and(...whereConditions)),
      ]);

      const validatedItems = items
        .map((item: any) =>
          validate(favoriteWithRegionSchema, {
            ...item,
            createdAt: new Date(item.createdAt),
          }).unwrapOr(null),
        )
        .filter((item): item is any => item !== null);

      return ok({
        items: validatedItems,
        count: countResult[0]?.count ?? 0,
      });
    } catch (error) {
      return err(
        new RepositoryError("Failed to list favorites with region", error),
      );
    }
  }

  async listFavoritesWithLocation(
    query: ListFavoritesQuery,
  ): Promise<
    Result<{ items: FavoriteWithLocation[]; count: number }, RepositoryError>
  > {
    const { userId, pagination } = query;
    const limit = pagination.limit;
    const offset = (pagination.page - 1) * pagination.limit;

    try {
      const whereConditions = [
        eq(favorites.userId, userId),
        sql`${favorites.locationId} IS NOT NULL`,
      ];

      const [items, countResult] = await Promise.all([
        this.db
          .select({
            id: favorites.id,
            userId: favorites.userId,
            regionId: favorites.regionId,
            locationId: favorites.locationId,
            createdAt: favorites.createdAt,
            location: {
              id: locations.id,
              name: locations.name,
              address: locations.address,
              coverPhotoUrl: locations.coverPhotoUrl,
            },
          })
          .from(favorites)
          .leftJoin(locations, eq(favorites.locationId, locations.id))
          .where(and(...whereConditions))
          .orderBy(desc(favorites.createdAt))
          .limit(limit)
          .offset(offset),
        this.db
          .select({ count: count() })
          .from(favorites)
          .where(and(...whereConditions)),
      ]);

      const validatedItems = items
        .map((item: any) =>
          validate(favoriteWithLocationSchema, {
            ...item,
            createdAt: new Date(item.createdAt),
          }).unwrapOr(null),
        )
        .filter((item): item is any => item !== null);

      return ok({
        items: validatedItems,
        count: countResult[0]?.count ?? 0,
      });
    } catch (error) {
      return err(
        new RepositoryError("Failed to list favorites with location", error),
      );
    }
  }

  async pinRegion(
    params: PinRegionParams,
  ): Promise<Result<PinnedRegion, RepositoryError>> {
    try {
      // Check if already pinned
      const existing = await this.db
        .select()
        .from(pinnedRegions)
        .where(
          and(
            eq(pinnedRegions.userId, params.userId),
            eq(pinnedRegions.regionId, params.regionId),
          ),
        );

      if (existing.length > 0) {
        return err(new RepositoryError("Region already pinned"));
      }

      // If no order specified, set to next available order
      let order = params.order;
      if (order === undefined) {
        const maxOrderResult = await this.db
          .select({ maxOrder: sql<number>`MAX(${pinnedRegions.order})` })
          .from(pinnedRegions)
          .where(eq(pinnedRegions.userId, params.userId));

        order = (maxOrderResult[0]?.maxOrder ?? -1) + 1;
      }

      const result = await this.db
        .insert(pinnedRegions)
        .values({
          id: uuidv7(),
          userId: params.userId,
          regionId: params.regionId,
          order,
        })
        .returning();

      const pinnedRegion = result[0];
      if (!pinnedRegion) {
        return err(new RepositoryError("Failed to pin region"));
      }

      return validate(pinnedRegionSchema, {
        ...pinnedRegion,
        createdAt: new Date(pinnedRegion.createdAt),
      }).mapErr((error) => {
        return new RepositoryError("Invalid pinned region data", error);
      });
    } catch (error) {
      return err(new RepositoryError("Failed to pin region", error));
    }
  }

  async unpinRegion(
    userId: UserId,
    regionId: RegionId,
  ): Promise<Result<void, RepositoryError>> {
    try {
      await this.db
        .delete(pinnedRegions)
        .where(
          and(
            eq(pinnedRegions.userId, userId),
            eq(pinnedRegions.regionId, regionId),
          ),
        );

      return ok(undefined);
    } catch (error) {
      return err(new RepositoryError("Failed to unpin region", error));
    }
  }

  async reorderPinnedRegion(
    params: ReorderPinnedRegionParams,
  ): Promise<Result<void, RepositoryError>> {
    try {
      await this.db
        .update(pinnedRegions)
        .set({ order: params.newOrder })
        .where(
          and(
            eq(pinnedRegions.userId, params.userId),
            eq(pinnedRegions.regionId, params.regionId),
          ),
        );

      return ok(undefined);
    } catch (error) {
      return err(new RepositoryError("Failed to reorder pinned region", error));
    }
  }

  async listPinnedRegions(
    userId: UserId,
  ): Promise<Result<PinnedRegion[], RepositoryError>> {
    try {
      const items = await this.db
        .select()
        .from(pinnedRegions)
        .where(eq(pinnedRegions.userId, userId))
        .orderBy(pinnedRegions.order);

      const validatedItems = items
        .map((item: any) =>
          validate(pinnedRegionSchema, {
            ...item,
            createdAt: new Date(item.createdAt),
          }).unwrapOr(null),
        )
        .filter((item): item is any => item !== null);

      return ok(validatedItems);
    } catch (error) {
      return err(new RepositoryError("Failed to list pinned regions", error));
    }
  }

  async listPinnedRegionsWithDetails(
    userId: UserId,
  ): Promise<Result<PinnedRegionWithDetails[], RepositoryError>> {
    try {
      const items = await this.db
        .select({
          id: pinnedRegions.id,
          userId: pinnedRegions.userId,
          regionId: pinnedRegions.regionId,
          order: pinnedRegions.order,
          createdAt: pinnedRegions.createdAt,
          region: {
            id: regions.id,
            name: regions.name,
            description: regions.description,
            coverPhotoUrl: regions.coverPhotoUrl,
          },
        })
        .from(pinnedRegions)
        .innerJoin(regions, eq(pinnedRegions.regionId, regions.id))
        .where(eq(pinnedRegions.userId, userId))
        .orderBy(pinnedRegions.order);

      const validatedItems = items
        .map((item: any) =>
          validate(pinnedRegionWithDetailsSchema, {
            ...item,
            createdAt: new Date(item.createdAt),
          }).unwrapOr(null),
        )
        .filter((item): item is any => item !== null);

      return ok(validatedItems);
    } catch (error) {
      return err(
        new RepositoryError(
          "Failed to list pinned regions with details",
          error,
        ),
      );
    }
  }

  async isPinned(
    userId: UserId,
    regionId: RegionId,
  ): Promise<Result<boolean, RepositoryError>> {
    try {
      const result = await this.db
        .select({ count: count() })
        .from(pinnedRegions)
        .where(
          and(
            eq(pinnedRegions.userId, userId),
            eq(pinnedRegions.regionId, regionId),
          ),
        );

      return ok((result[0]?.count ?? 0) > 0);
    } catch (error) {
      return err(new RepositoryError("Failed to check if pinned", error));
    }
  }

  async countFavoritesByRegion(
    regionId: RegionId,
  ): Promise<Result<number, RepositoryError>> {
    try {
      const result = await this.db
        .select({ count: count() })
        .from(favorites)
        .where(eq(favorites.regionId, regionId));

      return ok(result[0]?.count ?? 0);
    } catch (error) {
      return err(
        new RepositoryError("Failed to count favorites by region", error),
      );
    }
  }

  async countFavoritesByLocation(
    locationId: LocationId,
  ): Promise<Result<number, RepositoryError>> {
    try {
      const result = await this.db
        .select({ count: count() })
        .from(favorites)
        .where(eq(favorites.locationId, locationId));

      return ok(result[0]?.count ?? 0);
    } catch (error) {
      return err(
        new RepositoryError("Failed to count favorites by location", error),
      );
    }
  }

  async countFavoritesByUser(
    userId: UserId,
  ): Promise<Result<number, RepositoryError>> {
    try {
      const result = await this.db
        .select({ count: count() })
        .from(favorites)
        .where(eq(favorites.userId, userId));

      return ok(result[0]?.count ?? 0);
    } catch (error) {
      return err(
        new RepositoryError("Failed to count favorites by user", error),
      );
    }
  }
}
