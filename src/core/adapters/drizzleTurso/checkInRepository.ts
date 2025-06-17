import type { CheckInRepository } from "@/core/domain/checkIn/ports/checkInRepository";
import type {
  CheckIn,
  CheckInId,
  CheckInWithLocation,
  CheckInWithUser,
  CreateCheckInParams,
  ListCheckInsQuery,
  UpdateCheckInParams,
} from "@/core/domain/checkIn/types";
import {
  checkInSchema,
  checkInWithLocationSchema,
  checkInWithUserSchema,
} from "@/core/domain/checkIn/types";
import type { LocationId } from "@/core/domain/location/types";
import type { UserId } from "@/core/domain/user/types";
import { RepositoryError } from "@/lib/error";
import { validate } from "@/lib/validation";
import { and, asc, desc, eq, gte, isNotNull, sql } from "drizzle-orm";
import { type Result, err, ok } from "neverthrow";
import type { Database } from "./client";
import { checkIns, locations, users } from "./schema";

export class DrizzleTursoCheckInRepository implements CheckInRepository {
  constructor(private readonly db: Database) {}

  async create(
    params: CreateCheckInParams,
  ): Promise<Result<CheckIn, RepositoryError>> {
    try {
      const result = await this.db
        .insert(checkIns)
        .values({
          userId: params.userId,
          locationId: params.locationId,
          photoUrl: params.photoUrl || null,
          comment: params.comment || null,
          rating: params.rating || null,
          isPublic: params.isPublic ?? true,
        })
        .returning();

      const checkIn = result[0];
      if (!checkIn) {
        return err(new RepositoryError("Failed to create check-in"));
      }

      return validate(checkInSchema, checkIn).mapErr(
        (error) => new RepositoryError("Invalid check-in data", error),
      );
    } catch (error) {
      return err(new RepositoryError("Failed to create check-in", error));
    }
  }

  async findById(
    id: CheckInId,
  ): Promise<Result<CheckIn | null, RepositoryError>> {
    try {
      const result = await this.db
        .select()
        .from(checkIns)
        .where(eq(checkIns.id, id))
        .limit(1);

      const checkIn = result[0];
      if (!checkIn) {
        return ok(null);
      }

      return validate(checkInSchema, checkIn).mapErr(
        (error) => new RepositoryError("Invalid check-in data", error),
      );
    } catch (error) {
      return err(new RepositoryError("Failed to find check-in", error));
    }
  }

  async findByIdWithUser(
    id: CheckInId,
  ): Promise<Result<CheckInWithUser | null, RepositoryError>> {
    try {
      const result = await this.db
        .select({
          id: checkIns.id,
          userId: checkIns.userId,
          locationId: checkIns.locationId,
          photoUrl: checkIns.photoUrl,
          comment: checkIns.comment,
          rating: checkIns.rating,
          isPublic: checkIns.isPublic,
          createdAt: checkIns.createdAt,
          updatedAt: checkIns.updatedAt,
          user: {
            id: users.id,
            name: users.name,
            profilePhotoUrl: users.profilePhotoUrl,
          },
        })
        .from(checkIns)
        .innerJoin(users, eq(checkIns.userId, users.id))
        .where(eq(checkIns.id, id))
        .limit(1);

      const checkIn = result[0];
      if (!checkIn) {
        return ok(null);
      }

      return validate(checkInWithUserSchema, checkIn).mapErr(
        (error) => new RepositoryError("Invalid check-in data", error),
      );
    } catch (error) {
      return err(
        new RepositoryError("Failed to find check-in with user", error),
      );
    }
  }

  async findByIdWithLocation(
    id: CheckInId,
  ): Promise<Result<CheckInWithLocation | null, RepositoryError>> {
    try {
      const result = await this.db
        .select({
          id: checkIns.id,
          userId: checkIns.userId,
          locationId: checkIns.locationId,
          photoUrl: checkIns.photoUrl,
          comment: checkIns.comment,
          rating: checkIns.rating,
          isPublic: checkIns.isPublic,
          createdAt: checkIns.createdAt,
          updatedAt: checkIns.updatedAt,
          location: {
            id: locations.id,
            name: locations.name,
            address: locations.address,
          },
        })
        .from(checkIns)
        .innerJoin(locations, eq(checkIns.locationId, locations.id))
        .where(eq(checkIns.id, id))
        .limit(1);

      const checkIn = result[0];
      if (!checkIn) {
        return ok(null);
      }

      return validate(checkInWithLocationSchema, checkIn).mapErr(
        (error) => new RepositoryError("Invalid check-in data", error),
      );
    } catch (error) {
      return err(
        new RepositoryError("Failed to find check-in with location", error),
      );
    }
  }

  async update(
    params: UpdateCheckInParams,
  ): Promise<Result<CheckIn, RepositoryError>> {
    try {
      const { id, ...updateFields } = params;
      const updateData = Object.fromEntries(
        Object.entries(updateFields).filter(
          ([_, value]) => value !== undefined,
        ),
      );

      const result = await this.db
        .update(checkIns)
        .set(updateData)
        .where(eq(checkIns.id, id))
        .returning();

      const checkIn = result[0];
      if (!checkIn) {
        return err(new RepositoryError("Check-in not found"));
      }

      return validate(checkInSchema, checkIn).mapErr(
        (error) => new RepositoryError("Invalid check-in data", error),
      );
    } catch (error) {
      return err(new RepositoryError("Failed to update check-in", error));
    }
  }

  async delete(id: CheckInId): Promise<Result<void, RepositoryError>> {
    try {
      await this.db.delete(checkIns).where(eq(checkIns.id, id));
      return ok(undefined);
    } catch (error) {
      return err(new RepositoryError("Failed to delete check-in", error));
    }
  }

  async list(
    query: ListCheckInsQuery,
  ): Promise<Result<{ items: CheckIn[]; count: number }, RepositoryError>> {
    const { pagination, filter, sort } = query;
    const limit = pagination.limit;
    const offset = (pagination.page - 1) * pagination.limit;

    const conditions = [];
    if (filter?.userId) conditions.push(eq(checkIns.userId, filter.userId));
    if (filter?.locationId)
      conditions.push(eq(checkIns.locationId, filter.locationId));
    if (filter?.isPublic !== undefined)
      conditions.push(eq(checkIns.isPublic, filter.isPublic));
    if (filter?.hasPhoto) conditions.push(isNotNull(checkIns.photoUrl));
    if (filter?.minRating)
      conditions.push(gte(checkIns.rating, filter.minRating));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const orderByClause = sort
      ? sort.order === "asc"
        ? asc(checkIns[sort.field])
        : desc(checkIns[sort.field])
      : desc(checkIns.createdAt);

    try {
      const [items, countResult] = await Promise.all([
        this.db
          .select()
          .from(checkIns)
          .where(whereClause)
          .orderBy(orderByClause)
          .limit(limit)
          .offset(offset),
        this.db
          .select({ count: sql`count(*)`.as("count") })
          .from(checkIns)
          .where(whereClause),
      ]);

      const validatedItems = items
        .map((item) =>
          validate(checkInSchema, item)
            .mapErr(
              (error) => new RepositoryError("Invalid check-in data", error),
            )
            .unwrapOr(null),
        )
        .filter((item): item is CheckIn => item !== null);

      return ok({
        items: validatedItems,
        count: Number(countResult[0]?.count || 0),
      });
    } catch (error) {
      return err(new RepositoryError("Failed to list check-ins", error));
    }
  }

  async listWithUser(
    query: ListCheckInsQuery,
  ): Promise<
    Result<{ items: CheckInWithUser[]; count: number }, RepositoryError>
  > {
    const { pagination, filter, sort } = query;
    const limit = pagination.limit;
    const offset = (pagination.page - 1) * pagination.limit;

    const conditions = [];
    if (filter?.userId) conditions.push(eq(checkIns.userId, filter.userId));
    if (filter?.locationId)
      conditions.push(eq(checkIns.locationId, filter.locationId));
    if (filter?.isPublic !== undefined)
      conditions.push(eq(checkIns.isPublic, filter.isPublic));
    if (filter?.hasPhoto) conditions.push(isNotNull(checkIns.photoUrl));
    if (filter?.minRating)
      conditions.push(gte(checkIns.rating, filter.minRating));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const orderByClause = sort
      ? sort.order === "asc"
        ? asc(checkIns[sort.field])
        : desc(checkIns[sort.field])
      : desc(checkIns.createdAt);

    try {
      const [items, countResult] = await Promise.all([
        this.db
          .select({
            id: checkIns.id,
            userId: checkIns.userId,
            locationId: checkIns.locationId,
            photoUrl: checkIns.photoUrl,
            comment: checkIns.comment,
            rating: checkIns.rating,
            isPublic: checkIns.isPublic,
            createdAt: checkIns.createdAt,
            updatedAt: checkIns.updatedAt,
            user: {
              id: users.id,
              name: users.name,
              profilePhotoUrl: users.profilePhotoUrl,
            },
          })
          .from(checkIns)
          .innerJoin(users, eq(checkIns.userId, users.id))
          .where(whereClause)
          .orderBy(orderByClause)
          .limit(limit)
          .offset(offset),
        this.db
          .select({ count: sql`count(*)`.as("count") })
          .from(checkIns)
          .where(whereClause),
      ]);

      const validatedItems = items
        .map((item) =>
          validate(checkInWithUserSchema, item)
            .mapErr(
              (error) => new RepositoryError("Invalid check-in data", error),
            )
            .unwrapOr(null),
        )
        .filter((item): item is CheckInWithUser => item !== null);

      return ok({
        items: validatedItems,
        count: Number(countResult[0]?.count || 0),
      });
    } catch (error) {
      return err(
        new RepositoryError("Failed to list check-ins with user", error),
      );
    }
  }

  async listWithLocation(
    query: ListCheckInsQuery,
  ): Promise<
    Result<{ items: CheckInWithLocation[]; count: number }, RepositoryError>
  > {
    const { pagination, filter, sort } = query;
    const limit = pagination.limit;
    const offset = (pagination.page - 1) * pagination.limit;

    const conditions = [];
    if (filter?.userId) conditions.push(eq(checkIns.userId, filter.userId));
    if (filter?.locationId)
      conditions.push(eq(checkIns.locationId, filter.locationId));
    if (filter?.isPublic !== undefined)
      conditions.push(eq(checkIns.isPublic, filter.isPublic));
    if (filter?.hasPhoto) conditions.push(isNotNull(checkIns.photoUrl));
    if (filter?.minRating)
      conditions.push(gte(checkIns.rating, filter.minRating));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const orderByClause = sort
      ? sort.order === "asc"
        ? asc(checkIns[sort.field])
        : desc(checkIns[sort.field])
      : desc(checkIns.createdAt);

    try {
      const [items, countResult] = await Promise.all([
        this.db
          .select({
            id: checkIns.id,
            userId: checkIns.userId,
            locationId: checkIns.locationId,
            photoUrl: checkIns.photoUrl,
            comment: checkIns.comment,
            rating: checkIns.rating,
            isPublic: checkIns.isPublic,
            createdAt: checkIns.createdAt,
            updatedAt: checkIns.updatedAt,
            location: {
              id: locations.id,
              name: locations.name,
              address: locations.address,
            },
          })
          .from(checkIns)
          .innerJoin(locations, eq(checkIns.locationId, locations.id))
          .where(whereClause)
          .orderBy(orderByClause)
          .limit(limit)
          .offset(offset),
        this.db
          .select({ count: sql`count(*)`.as("count") })
          .from(checkIns)
          .where(whereClause),
      ]);

      const validatedItems = items
        .map((item) =>
          validate(checkInWithLocationSchema, item)
            .mapErr(
              (error) => new RepositoryError("Invalid check-in data", error),
            )
            .unwrapOr(null),
        )
        .filter((item): item is CheckInWithLocation => item !== null);

      return ok({
        items: validatedItems,
        count: Number(countResult[0]?.count || 0),
      });
    } catch (error) {
      return err(
        new RepositoryError("Failed to list check-ins with location", error),
      );
    }
  }

  // Statistics
  async countByUser(userId: UserId): Promise<Result<number, RepositoryError>> {
    try {
      const result = await this.db
        .select({ count: sql`count(*)`.as("count") })
        .from(checkIns)
        .where(eq(checkIns.userId, userId));

      return ok(Number(result[0]?.count || 0));
    } catch (error) {
      return err(
        new RepositoryError("Failed to count check-ins by user", error),
      );
    }
  }

  async countByLocation(
    locationId: LocationId,
  ): Promise<Result<number, RepositoryError>> {
    try {
      const result = await this.db
        .select({ count: sql`count(*)`.as("count") })
        .from(checkIns)
        .where(eq(checkIns.locationId, locationId));

      return ok(Number(result[0]?.count || 0));
    } catch (error) {
      return err(
        new RepositoryError("Failed to count check-ins by location", error),
      );
    }
  }

  async getAverageRatingByLocation(
    locationId: LocationId,
  ): Promise<Result<number | null, RepositoryError>> {
    try {
      const result = await this.db
        .select({
          averageRating: sql<number>`avg(${checkIns.rating})`.as(
            "averageRating",
          ),
        })
        .from(checkIns)
        .where(
          and(eq(checkIns.locationId, locationId), isNotNull(checkIns.rating)),
        );

      const averageRating = result[0]?.averageRating;
      return ok(averageRating ? Number(averageRating) : null);
    } catch (error) {
      return err(
        new RepositoryError("Failed to get average rating by location", error),
      );
    }
  }

  // User check-in history
  async hasUserCheckedInToLocation(
    userId: UserId,
    locationId: LocationId,
  ): Promise<Result<boolean, RepositoryError>> {
    try {
      const result = await this.db
        .select({ id: checkIns.id })
        .from(checkIns)
        .where(
          and(eq(checkIns.userId, userId), eq(checkIns.locationId, locationId)),
        )
        .limit(1);

      return ok(result.length > 0);
    } catch (error) {
      return err(
        new RepositoryError("Failed to check user check-in status", error),
      );
    }
  }

  async getLatestCheckInByUser(
    userId: UserId,
    locationId: LocationId,
  ): Promise<Result<CheckIn | null, RepositoryError>> {
    try {
      const result = await this.db
        .select()
        .from(checkIns)
        .where(
          and(eq(checkIns.userId, userId), eq(checkIns.locationId, locationId)),
        )
        .orderBy(desc(checkIns.createdAt))
        .limit(1);

      const checkIn = result[0];
      if (!checkIn) {
        return ok(null);
      }

      return validate(checkInSchema, checkIn).mapErr(
        (error) => new RepositoryError("Invalid check-in data", error),
      );
    } catch (error) {
      return err(
        new RepositoryError("Failed to get latest check-in by user", error),
      );
    }
  }
}
