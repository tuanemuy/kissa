import type { RepositoryError } from "@/lib/error";
import type { Result } from "neverthrow";
import type { LocationId } from "../../location/types";
import type { UserId } from "../../user/types";
import type {
  CheckIn,
  CheckInId,
  CheckInWithLocation,
  CheckInWithUser,
  CreateCheckInParams,
  ListCheckInsQuery,
  UpdateCheckInParams,
} from "../types";

export interface CheckInRepository {
  create(
    params: CreateCheckInParams,
  ): Promise<Result<CheckIn, RepositoryError>>;
  findById(id: CheckInId): Promise<Result<CheckIn | null, RepositoryError>>;
  findByIdWithUser(
    id: CheckInId,
  ): Promise<Result<CheckInWithUser | null, RepositoryError>>;
  findByIdWithLocation(
    id: CheckInId,
  ): Promise<Result<CheckInWithLocation | null, RepositoryError>>;
  update(
    params: UpdateCheckInParams,
  ): Promise<Result<CheckIn, RepositoryError>>;
  delete(id: CheckInId): Promise<Result<void, RepositoryError>>;
  list(
    query: ListCheckInsQuery,
  ): Promise<Result<{ items: CheckIn[]; count: number }, RepositoryError>>;
  listWithUser(
    query: ListCheckInsQuery,
  ): Promise<
    Result<{ items: CheckInWithUser[]; count: number }, RepositoryError>
  >;
  listWithLocation(
    query: ListCheckInsQuery,
  ): Promise<
    Result<{ items: CheckInWithLocation[]; count: number }, RepositoryError>
  >;

  // Statistics
  countByUser(userId: UserId): Promise<Result<number, RepositoryError>>;
  countByLocation(
    locationId: LocationId,
  ): Promise<Result<number, RepositoryError>>;
  getAverageRatingByLocation(
    locationId: LocationId,
  ): Promise<Result<number | null, RepositoryError>>;

  // User check-in history
  hasUserCheckedInToLocation(
    userId: UserId,
    locationId: LocationId,
  ): Promise<Result<boolean, RepositoryError>>;
  getLatestCheckInByUser(
    userId: UserId,
    locationId: LocationId,
  ): Promise<Result<CheckIn | null, RepositoryError>>;
}
