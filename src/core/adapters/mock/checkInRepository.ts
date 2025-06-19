import type { RepositoryError } from "@/lib/error";
import { RepositoryError as RepositoryErrorClass } from "@/lib/error";
import type { Result } from "neverthrow";
import { err, ok } from "neverthrow";
import type { CheckInRepository } from "../../domain/checkIn/ports/checkInRepository";
import type {
  CheckIn,
  CheckInId,
  CheckInWithLocation,
  CheckInWithUser,
  CreateCheckInParams,
  ListCheckInsQuery,
  UpdateCheckInParams,
} from "../../domain/checkIn/types";
import type { LocationId } from "../../domain/location/types";
import type { UserId } from "../../domain/user/types";

export class MockCheckInRepository implements CheckInRepository {
  private checkIns = new Map<CheckInId, CheckIn>();
  private shouldFailOperations = false;

  setShouldFailOperations(shouldFail: boolean): void {
    this.shouldFailOperations = shouldFail;
  }

  addCheckIn(checkIn: CheckIn): void {
    this.checkIns.set(checkIn.id, checkIn);
  }

  clear(): void {
    this.checkIns.clear();
  }

  async create(
    params: CreateCheckInParams,
  ): Promise<Result<CheckIn, RepositoryError>> {
    if (this.shouldFailOperations) {
      return err(new RepositoryErrorClass("Mock create failure"));
    }

    const checkIn: CheckIn = {
      id: `checkin-${Date.now()}` as CheckInId,
      userId: params.userId,
      locationId: params.locationId,
      photoUrl: params.photoUrl ?? null,
      comment: params.comment ?? null,
      rating: params.rating ?? null,
      isPublic: params.isPublic ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.checkIns.set(checkIn.id, checkIn);
    return ok(checkIn);
  }

  async findById(
    id: CheckInId,
  ): Promise<Result<CheckIn | null, RepositoryError>> {
    if (this.shouldFailOperations) {
      return err(new RepositoryErrorClass("Mock findById failure"));
    }

    return ok(this.checkIns.get(id) ?? null);
  }

  async findByIdWithUser(
    id: CheckInId,
  ): Promise<Result<CheckInWithUser | null, RepositoryError>> {
    if (this.shouldFailOperations) {
      return err(new RepositoryErrorClass("Mock findByIdWithUser failure"));
    }

    const checkIn = this.checkIns.get(id);
    if (!checkIn) {
      return ok(null);
    }

    const checkInWithUser: CheckInWithUser = {
      ...checkIn,
      user: {
        id: checkIn.userId,
        name: "Mock User",
        profilePhotoUrl: null,
      },
    };

    return ok(checkInWithUser);
  }

  async findByIdWithLocation(
    id: CheckInId,
  ): Promise<Result<CheckInWithLocation | null, RepositoryError>> {
    if (this.shouldFailOperations) {
      return err(new RepositoryErrorClass("Mock findByIdWithLocation failure"));
    }

    const checkIn = this.checkIns.get(id);
    if (!checkIn) {
      return ok(null);
    }

    const checkInWithLocation: CheckInWithLocation = {
      ...checkIn,
      location: {
        id: checkIn.locationId,
        name: "Mock Location",
        address: null,
      },
    };

    return ok(checkInWithLocation);
  }

  async update(
    params: UpdateCheckInParams,
  ): Promise<Result<CheckIn, RepositoryError>> {
    if (this.shouldFailOperations) {
      return err(new RepositoryErrorClass("Mock update failure"));
    }

    const checkIn = this.checkIns.get(params.id);
    if (!checkIn) {
      return err(new RepositoryErrorClass("Check-in not found"));
    }

    const updatedCheckIn: CheckIn = {
      ...checkIn,
      ...(params.photoUrl !== undefined && { photoUrl: params.photoUrl }),
      ...(params.comment !== undefined && { comment: params.comment }),
      ...(params.rating !== undefined && { rating: params.rating }),
      ...(params.isPublic !== undefined && { isPublic: params.isPublic }),
      updatedAt: new Date(),
    };

    this.checkIns.set(params.id, updatedCheckIn);
    return ok(updatedCheckIn);
  }

  async delete(id: CheckInId): Promise<Result<void, RepositoryError>> {
    if (this.shouldFailOperations) {
      return err(new RepositoryErrorClass("Mock delete failure"));
    }

    if (!this.checkIns.has(id)) {
      return err(new RepositoryErrorClass("Check-in not found"));
    }

    this.checkIns.delete(id);
    return ok(undefined);
  }

  async list(
    query: ListCheckInsQuery,
  ): Promise<Result<{ items: CheckIn[]; count: number }, RepositoryError>> {
    if (this.shouldFailOperations) {
      return err(new RepositoryErrorClass("Mock list failure"));
    }

    let filteredCheckIns = Array.from(this.checkIns.values());

    // Apply filters
    if (query.filter) {
      if (query.filter.userId) {
        filteredCheckIns = filteredCheckIns.filter(
          (checkIn) => checkIn.userId === query.filter?.userId,
        );
      }
      if (query.filter.locationId) {
        filteredCheckIns = filteredCheckIns.filter(
          (checkIn) => checkIn.locationId === query.filter?.locationId,
        );
      }
      if (query.filter.isPublic !== undefined) {
        filteredCheckIns = filteredCheckIns.filter(
          (checkIn) => checkIn.isPublic === query.filter?.isPublic,
        );
      }
      if (query.filter.hasPhoto !== undefined) {
        const hasPhoto = query.filter.hasPhoto;
        filteredCheckIns = filteredCheckIns.filter((checkIn) =>
          hasPhoto ? checkIn.photoUrl !== null : checkIn.photoUrl === null,
        );
      }
      if (query.filter.minRating) {
        filteredCheckIns = filteredCheckIns.filter(
          (checkIn) =>
            checkIn.rating !== null &&
            // biome-ignore lint/style/noNonNullAssertion: Safe due to outer condition check
            checkIn.rating >= query.filter?.minRating!,
        );
      }
    }

    // Apply sorting
    if (query.sort) {
      filteredCheckIns.sort((a, b) => {
        const field = query.sort?.field;
        const order = query.sort?.order;

        let aVal: Date | number | null;
        let bVal: Date | number | null;

        switch (field) {
          case "createdAt":
            aVal = a.createdAt;
            bVal = b.createdAt;
            break;
          case "updatedAt":
            aVal = a.updatedAt;
            bVal = b.updatedAt;
            break;
          case "rating":
            aVal = a.rating ?? 0;
            bVal = b.rating ?? 0;
            break;
          default:
            aVal = a.createdAt;
            bVal = b.createdAt;
            break;
        }

        if (aVal === null && bVal === null) return 0;
        if (aVal === null) return order === "asc" ? -1 : 1;
        if (bVal === null) return order === "asc" ? 1 : -1;

        if (aVal < bVal) return order === "asc" ? -1 : 1;
        if (aVal > bVal) return order === "asc" ? 1 : -1;
        return 0;
      });
    }

    const totalCount = filteredCheckIns.length;

    // Apply pagination
    const offset = (query.pagination.page - 1) * query.pagination.limit;
    const paginatedCheckIns = filteredCheckIns.slice(
      offset,
      offset + query.pagination.limit,
    );

    return ok({ items: paginatedCheckIns, count: totalCount });
  }

  async listWithUser(
    query: ListCheckInsQuery,
  ): Promise<
    Result<{ items: CheckInWithUser[]; count: number }, RepositoryError>
  > {
    if (this.shouldFailOperations) {
      return err(new RepositoryErrorClass("Mock listWithUser failure"));
    }

    const listResult = await this.list(query);
    if (listResult.isErr()) {
      return err(listResult.error);
    }

    const { items, count } = listResult.value;
    const itemsWithUser: CheckInWithUser[] = items.map((checkIn) => ({
      ...checkIn,
      user: {
        id: checkIn.userId,
        name: "Mock User",
        profilePhotoUrl: null,
      },
    }));

    return ok({ items: itemsWithUser, count });
  }

  async listWithLocation(
    query: ListCheckInsQuery,
  ): Promise<
    Result<{ items: CheckInWithLocation[]; count: number }, RepositoryError>
  > {
    if (this.shouldFailOperations) {
      return err(new RepositoryErrorClass("Mock listWithLocation failure"));
    }

    const listResult = await this.list(query);
    if (listResult.isErr()) {
      return err(listResult.error);
    }

    const { items, count } = listResult.value;
    const itemsWithLocation: CheckInWithLocation[] = items.map((checkIn) => ({
      ...checkIn,
      location: {
        id: checkIn.locationId,
        name: "Mock Location",
        address: null,
      },
    }));

    return ok({ items: itemsWithLocation, count });
  }

  async countByUser(userId: UserId): Promise<Result<number, RepositoryError>> {
    if (this.shouldFailOperations) {
      return err(new RepositoryErrorClass("Mock countByUser failure"));
    }

    let count = 0;
    for (const checkIn of this.checkIns.values()) {
      if (checkIn.userId === userId) {
        count++;
      }
    }

    return ok(count);
  }

  async countByLocation(
    locationId: LocationId,
  ): Promise<Result<number, RepositoryError>> {
    if (this.shouldFailOperations) {
      return err(new RepositoryErrorClass("Mock countByLocation failure"));
    }

    let count = 0;
    for (const checkIn of this.checkIns.values()) {
      if (checkIn.locationId === locationId) {
        count++;
      }
    }

    return ok(count);
  }

  async getAverageRatingByLocation(
    locationId: LocationId,
  ): Promise<Result<number | null, RepositoryError>> {
    if (this.shouldFailOperations) {
      return err(
        new RepositoryErrorClass("Mock getAverageRatingByLocation failure"),
      );
    }

    const locationCheckIns = Array.from(this.checkIns.values()).filter(
      (checkIn) => checkIn.locationId === locationId && checkIn.rating !== null,
    );

    if (locationCheckIns.length === 0) {
      return ok(null);
    }

    const totalRating = locationCheckIns.reduce(
      (sum, checkIn) => sum + (checkIn.rating ?? 0),
      0,
    );
    const averageRating = totalRating / locationCheckIns.length;

    return ok(Math.round(averageRating * 100) / 100); // Round to 2 decimal places
  }

  async hasUserCheckedInToLocation(
    userId: UserId,
    locationId: LocationId,
  ): Promise<Result<boolean, RepositoryError>> {
    if (this.shouldFailOperations) {
      return err(
        new RepositoryErrorClass("Mock hasUserCheckedInToLocation failure"),
      );
    }

    for (const checkIn of this.checkIns.values()) {
      if (checkIn.userId === userId && checkIn.locationId === locationId) {
        return ok(true);
      }
    }

    return ok(false);
  }

  async getLatestCheckInByUser(
    userId: UserId,
    locationId: LocationId,
  ): Promise<Result<CheckIn | null, RepositoryError>> {
    if (this.shouldFailOperations) {
      return err(
        new RepositoryErrorClass("Mock getLatestCheckInByUser failure"),
      );
    }

    const userLocationCheckIns = Array.from(this.checkIns.values()).filter(
      (checkIn) =>
        checkIn.userId === userId && checkIn.locationId === locationId,
    );

    if (userLocationCheckIns.length === 0) {
      return ok(null);
    }

    // Sort by createdAt descending and return the first (latest)
    userLocationCheckIns.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
    return ok(userLocationCheckIns[0]);
  }
}
