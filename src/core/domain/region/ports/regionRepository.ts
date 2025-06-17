import type { RepositoryError } from "@/lib/error";
import type { Result } from "neverthrow";
import type { UserId } from "../../user/types";
import type {
  CreateRegionParams,
  ListRegionsQuery,
  Region,
  RegionId,
  RegionWithStats,
  UpdateRegionParams,
} from "../types";

export interface RegionRepository {
  create(params: CreateRegionParams): Promise<Result<Region, RepositoryError>>;
  findById(id: RegionId): Promise<Result<Region | null, RepositoryError>>;
  findByIdWithStats(
    id: RegionId,
  ): Promise<Result<RegionWithStats | null, RepositoryError>>;
  update(params: UpdateRegionParams): Promise<Result<Region, RepositoryError>>;
  delete(id: RegionId): Promise<Result<void, RepositoryError>>;
  list(
    query: ListRegionsQuery,
  ): Promise<Result<{ items: Region[]; count: number }, RepositoryError>>;
  listWithStats(
    query: ListRegionsQuery,
  ): Promise<
    Result<{ items: RegionWithStats[]; count: number }, RepositoryError>
  >;
  countByCreator(creatorId: UserId): Promise<Result<number, RepositoryError>>;

  // Visibility operations
  makePublic(id: RegionId): Promise<Result<void, RepositoryError>>;
  makePrivate(id: RegionId): Promise<Result<void, RepositoryError>>;
}
