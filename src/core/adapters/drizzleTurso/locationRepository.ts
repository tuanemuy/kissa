import type { LocationRepository } from "@/core/domain/location/ports/locationRepository";
import type {
  CreateLocationParams,
  InviteLocationEditorParams,
  ListLocationsQuery,
  Location,
  LocationEditor,
  LocationEditorId,
  LocationId,
  LocationWithEditors,
  LocationWithStats,
  UpdateLocationParams,
} from "@/core/domain/location/types";
import {
  locationEditorSchema,
  locationSchema,
  locationWithEditorsSchema,
  locationWithStatsSchema,
} from "@/core/domain/location/types";
import type { RegionId } from "@/core/domain/region/types";
import type { UserId } from "@/core/domain/user/types";
import { RepositoryError } from "@/lib/error";
import { validate } from "@/lib/validation";
import { and, asc, desc, eq, like, sql } from "drizzle-orm";
import { type Result, err, ok } from "neverthrow";
import type { Database } from "./client";
import {
  checkIns,
  favorites,
  locationEditors,
  locations,
  users,
} from "./schema";

export class DrizzleTursoLocationRepository implements LocationRepository {
  constructor(private readonly db: Database) {}

  async create(
    params: CreateLocationParams,
  ): Promise<Result<Location, RepositoryError>> {
    try {
      const result = await this.db
        .insert(locations)
        .values({
          regionId: params.regionId,
          name: params.name,
          description: params.description || null,
          address: params.address || null,
          latitude: params.latitude || null,
          longitude: params.longitude || null,
          isPublic: params.isPublic ?? false,
          coverPhotoUrl: params.coverPhotoUrl || null,
        })
        .returning();

      const location = result[0];
      if (!location) {
        return err(new RepositoryError("Failed to create location"));
      }

      return validate(locationSchema, location).mapErr(
        (error) => new RepositoryError("Invalid location data", error),
      );
    } catch (error) {
      return err(new RepositoryError("Failed to create location", error));
    }
  }

  async findById(
    id: LocationId,
  ): Promise<Result<Location | null, RepositoryError>> {
    try {
      const result = await this.db
        .select()
        .from(locations)
        .where(eq(locations.id, id))
        .limit(1);

      const location = result[0];
      if (!location) {
        return ok(null);
      }

      return validate(locationSchema, location).mapErr(
        (error) => new RepositoryError("Invalid location data", error),
      );
    } catch (error) {
      return err(new RepositoryError("Failed to find location", error));
    }
  }

  async findByIdWithStats(
    id: LocationId,
  ): Promise<Result<LocationWithStats | null, RepositoryError>> {
    try {
      const [locationResult, stats] = await Promise.all([
        this.db.select().from(locations).where(eq(locations.id, id)).limit(1),
        this.db
          .select({
            favoriteCount: sql<number>`count(distinct ${favorites.id})`.as(
              "favoriteCount",
            ),
            checkInCount: sql<number>`count(distinct ${checkIns.id})`.as(
              "checkInCount",
            ),
            averageRating: sql<number>`avg(${checkIns.rating})`.as(
              "averageRating",
            ),
          })
          .from(locations)
          .leftJoin(favorites, eq(favorites.locationId, locations.id))
          .leftJoin(checkIns, eq(checkIns.locationId, locations.id))
          .where(eq(locations.id, id))
          .groupBy(locations.id),
      ]);

      const location = locationResult[0];
      if (!location) {
        return ok(null);
      }

      const locationWithStats = {
        ...location,
        favoriteCount: Number(stats[0]?.favoriteCount || 0),
        checkInCount: Number(stats[0]?.checkInCount || 0),
        averageRating: stats[0]?.averageRating
          ? Number(stats[0].averageRating)
          : null,
      };

      return validate(locationWithStatsSchema, locationWithStats).mapErr(
        (error) => new RepositoryError("Invalid location data", error),
      );
    } catch (error) {
      return err(
        new RepositoryError("Failed to find location with stats", error),
      );
    }
  }

  async findByIdWithEditors(
    id: LocationId,
  ): Promise<Result<LocationWithEditors | null, RepositoryError>> {
    try {
      const [locationResult, editorsResult] = await Promise.all([
        this.db.select().from(locations).where(eq(locations.id, id)).limit(1),
        this.db
          .select()
          .from(locationEditors)
          .where(eq(locationEditors.locationId, id)),
      ]);

      const location = locationResult[0];
      if (!location) {
        return ok(null);
      }

      const validatedEditors = editorsResult
        .map((editor) => validate(locationEditorSchema, editor).unwrapOr(null))
        .filter((editor): editor is LocationEditor => editor !== null);

      const locationWithEditors = {
        ...location,
        editors: validatedEditors,
      };

      return validate(locationWithEditorsSchema, locationWithEditors).mapErr(
        (error) => new RepositoryError("Invalid location data", error),
      );
    } catch (error) {
      return err(
        new RepositoryError("Failed to find location with editors", error),
      );
    }
  }

  async update(
    params: UpdateLocationParams,
  ): Promise<Result<Location, RepositoryError>> {
    try {
      const { id, ...updateFields } = params;
      const updateData = Object.fromEntries(
        Object.entries(updateFields).filter(
          ([_, value]) => value !== undefined,
        ),
      );

      const result = await this.db
        .update(locations)
        .set(updateData)
        .where(eq(locations.id, id))
        .returning();

      const location = result[0];
      if (!location) {
        return err(new RepositoryError("Location not found"));
      }

      return validate(locationSchema, location).mapErr(
        (error) => new RepositoryError("Invalid location data", error),
      );
    } catch (error) {
      return err(new RepositoryError("Failed to update location", error));
    }
  }

  async delete(id: LocationId): Promise<Result<void, RepositoryError>> {
    try {
      await this.db.delete(locations).where(eq(locations.id, id));
      return ok(undefined);
    } catch (error) {
      return err(new RepositoryError("Failed to delete location", error));
    }
  }

  async list(
    query: ListLocationsQuery,
  ): Promise<Result<{ items: Location[]; count: number }, RepositoryError>> {
    const { pagination, filter, sort } = query;
    const limit = pagination.limit;
    const offset = (pagination.page - 1) * pagination.limit;

    const conditions = [];
    if (filter?.regionId)
      conditions.push(eq(locations.regionId, filter.regionId));
    if (filter?.isPublic !== undefined)
      conditions.push(eq(locations.isPublic, filter.isPublic));
    if (filter?.search)
      conditions.push(like(locations.name, `%${filter.search}%`));

    // TODO: Implement nearby coordinates search with proper spatial query
    if (filter?.nearbyCoordinates) {
      // For now, just filter by non-null coordinates
      // This should be replaced with proper spatial query using PostGIS or similar
      conditions.push(sql`${locations.latitude} IS NOT NULL`);
      conditions.push(sql`${locations.longitude} IS NOT NULL`);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const orderByClause = sort
      ? sort.order === "asc"
        ? asc(locations[sort.field])
        : desc(locations[sort.field])
      : desc(locations.createdAt);

    try {
      const [items, countResult] = await Promise.all([
        this.db
          .select()
          .from(locations)
          .where(whereClause)
          .orderBy(orderByClause)
          .limit(limit)
          .offset(offset),
        this.db
          .select({ count: sql`count(*)`.as("count") })
          .from(locations)
          .where(whereClause),
      ]);

      const validatedItems = items
        .map((item) =>
          validate(locationSchema, item)
            .mapErr(
              (error) => new RepositoryError("Invalid location data", error),
            )
            .unwrapOr(null),
        )
        .filter((item): item is Location => item !== null);

      return ok({
        items: validatedItems,
        count: Number(countResult[0]?.count || 0),
      });
    } catch (error) {
      return err(new RepositoryError("Failed to list locations", error));
    }
  }

  async listWithStats(
    query: ListLocationsQuery,
  ): Promise<
    Result<{ items: LocationWithStats[]; count: number }, RepositoryError>
  > {
    const { pagination, filter, sort } = query;
    const limit = pagination.limit;
    const offset = (pagination.page - 1) * pagination.limit;

    const conditions = [];
    if (filter?.regionId)
      conditions.push(eq(locations.regionId, filter.regionId));
    if (filter?.isPublic !== undefined)
      conditions.push(eq(locations.isPublic, filter.isPublic));
    if (filter?.search)
      conditions.push(like(locations.name, `%${filter.search}%`));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const orderByClause = sort
      ? sort.order === "asc"
        ? asc(locations[sort.field])
        : desc(locations[sort.field])
      : desc(locations.createdAt);

    try {
      const [items, countResult] = await Promise.all([
        this.db
          .select({
            id: locations.id,
            regionId: locations.regionId,
            name: locations.name,
            description: locations.description,
            address: locations.address,
            latitude: locations.latitude,
            longitude: locations.longitude,
            isPublic: locations.isPublic,
            coverPhotoUrl: locations.coverPhotoUrl,
            createdAt: locations.createdAt,
            updatedAt: locations.updatedAt,
            favoriteCount: sql<number>`count(distinct ${favorites.id})`.as(
              "favoriteCount",
            ),
            checkInCount: sql<number>`count(distinct ${checkIns.id})`.as(
              "checkInCount",
            ),
            averageRating: sql<number>`avg(${checkIns.rating})`.as(
              "averageRating",
            ),
          })
          .from(locations)
          .leftJoin(favorites, eq(favorites.locationId, locations.id))
          .leftJoin(checkIns, eq(checkIns.locationId, locations.id))
          .where(whereClause)
          .groupBy(locations.id)
          .orderBy(orderByClause)
          .limit(limit)
          .offset(offset),
        this.db
          .select({ count: sql`count(*)`.as("count") })
          .from(locations)
          .where(whereClause),
      ]);

      const validatedItems = items
        .map((item) => {
          const locationWithStats = {
            ...item,
            favoriteCount: Number(item.favoriteCount || 0),
            checkInCount: Number(item.checkInCount || 0),
            averageRating: item.averageRating
              ? Number(item.averageRating)
              : null,
          };
          return validate(locationWithStatsSchema, locationWithStats)
            .mapErr(
              (error) => new RepositoryError("Invalid location data", error),
            )
            .unwrapOr(null);
        })
        .filter((item): item is LocationWithStats => item !== null);

      return ok({
        items: validatedItems,
        count: Number(countResult[0]?.count || 0),
      });
    } catch (error) {
      return err(new RepositoryError("Failed to list locations", error));
    }
  }

  async countByRegion(
    regionId: RegionId,
  ): Promise<Result<number, RepositoryError>> {
    try {
      const result = await this.db
        .select({ count: sql`count(*)`.as("count") })
        .from(locations)
        .where(eq(locations.regionId, regionId));

      return ok(Number(result[0]?.count || 0));
    } catch (error) {
      return err(new RepositoryError("Failed to count locations", error));
    }
  }

  // Editor operations
  async inviteEditor(
    params: InviteLocationEditorParams & { editorId: UserId },
  ): Promise<Result<LocationEditor, RepositoryError>> {
    try {
      const result = await this.db
        .insert(locationEditors)
        .values({
          locationId: params.locationId,
          editorId: params.editorId,
          invitedBy: params.invitedBy,
        })
        .returning();

      const locationEditor = result[0];
      if (!locationEditor) {
        return err(new RepositoryError("Failed to invite editor"));
      }

      return validate(locationEditorSchema, locationEditor).mapErr(
        (error) => new RepositoryError("Invalid location editor data", error),
      );
    } catch (error) {
      return err(new RepositoryError("Failed to invite editor", error));
    }
  }

  async acceptInvitation(
    id: LocationEditorId,
  ): Promise<Result<LocationEditor, RepositoryError>> {
    try {
      const result = await this.db
        .update(locationEditors)
        .set({ acceptedAt: new Date() })
        .where(eq(locationEditors.id, id))
        .returning();

      const locationEditor = result[0];
      if (!locationEditor) {
        return err(new RepositoryError("Location editor invitation not found"));
      }

      return validate(locationEditorSchema, locationEditor).mapErr(
        (error) => new RepositoryError("Invalid location editor data", error),
      );
    } catch (error) {
      return err(new RepositoryError("Failed to accept invitation", error));
    }
  }

  async removeEditor(
    locationId: LocationId,
    editorId: UserId,
  ): Promise<Result<void, RepositoryError>> {
    try {
      await this.db
        .delete(locationEditors)
        .where(
          and(
            eq(locationEditors.locationId, locationId),
            eq(locationEditors.editorId, editorId),
          ),
        );
      return ok(undefined);
    } catch (error) {
      return err(new RepositoryError("Failed to remove editor", error));
    }
  }

  async findEditorsByLocation(
    locationId: LocationId,
  ): Promise<Result<LocationEditor[], RepositoryError>> {
    try {
      const result = await this.db
        .select()
        .from(locationEditors)
        .where(eq(locationEditors.locationId, locationId));

      const validatedEditors = result
        .map((editor) => validate(locationEditorSchema, editor).unwrapOr(null))
        .filter((editor): editor is LocationEditor => editor !== null);

      return ok(validatedEditors);
    } catch (error) {
      return err(
        new RepositoryError("Failed to find editors by location", error),
      );
    }
  }

  async findEditorsByUser(
    userId: UserId,
  ): Promise<Result<LocationEditor[], RepositoryError>> {
    try {
      const result = await this.db
        .select()
        .from(locationEditors)
        .where(eq(locationEditors.editorId, userId));

      const validatedEditors = result
        .map((editor) => validate(locationEditorSchema, editor).unwrapOr(null))
        .filter((editor): editor is LocationEditor => editor !== null);

      return ok(validatedEditors);
    } catch (error) {
      return err(new RepositoryError("Failed to find editors by user", error));
    }
  }

  async isUserEditor(
    locationId: LocationId,
    userId: UserId,
  ): Promise<Result<boolean, RepositoryError>> {
    try {
      const result = await this.db
        .select({ id: locationEditors.id })
        .from(locationEditors)
        .where(
          and(
            eq(locationEditors.locationId, locationId),
            eq(locationEditors.editorId, userId),
          ),
        )
        .limit(1);

      return ok(result.length > 0);
    } catch (error) {
      return err(new RepositoryError("Failed to check user editor", error));
    }
  }

  // Visibility operations
  async makePublic(id: LocationId): Promise<Result<void, RepositoryError>> {
    try {
      await this.db
        .update(locations)
        .set({ isPublic: true })
        .where(eq(locations.id, id));
      return ok(undefined);
    } catch (error) {
      return err(new RepositoryError("Failed to make location public", error));
    }
  }

  async makePrivate(id: LocationId): Promise<Result<void, RepositoryError>> {
    try {
      await this.db
        .update(locations)
        .set({ isPublic: false })
        .where(eq(locations.id, id));
      return ok(undefined);
    } catch (error) {
      return err(new RepositoryError("Failed to make location private", error));
    }
  }
}
