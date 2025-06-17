import type { RepositoryError } from "@/lib/error";
import type { Result } from "neverthrow";
import type { LocationId } from "../../location/types";
import type { RegionId } from "../../region/types";
import type { UserId } from "../../user/types";
import type {
  AddFavoriteParams,
  Favorite,
  FavoriteId,
  FavoriteWithLocation,
  FavoriteWithRegion,
  ListFavoritesQuery,
  PinRegionParams,
  PinnedRegion,
  PinnedRegionId,
  PinnedRegionWithDetails,
  RemoveFavoriteParams,
  ReorderPinnedRegionParams,
} from "../types";

export interface FavoriteRepository {
  // Favorite operations
  addFavorite(
    params: AddFavoriteParams,
  ): Promise<Result<Favorite, RepositoryError>>;
  removeFavorite(
    params: RemoveFavoriteParams,
  ): Promise<Result<void, RepositoryError>>;
  findFavoriteById(
    id: FavoriteId,
  ): Promise<Result<Favorite | null, RepositoryError>>;
  isFavorited(
    userId: UserId,
    regionId?: RegionId,
    locationId?: LocationId,
  ): Promise<Result<boolean, RepositoryError>>;
  listFavorites(
    query: ListFavoritesQuery,
  ): Promise<Result<{ items: Favorite[]; count: number }, RepositoryError>>;
  listFavoritesWithRegion(
    query: ListFavoritesQuery,
  ): Promise<
    Result<{ items: FavoriteWithRegion[]; count: number }, RepositoryError>
  >;
  listFavoritesWithLocation(
    query: ListFavoritesQuery,
  ): Promise<
    Result<{ items: FavoriteWithLocation[]; count: number }, RepositoryError>
  >;

  // Pinned region operations
  pinRegion(
    params: PinRegionParams,
  ): Promise<Result<PinnedRegion, RepositoryError>>;
  unpinRegion(
    userId: UserId,
    regionId: RegionId,
  ): Promise<Result<void, RepositoryError>>;
  reorderPinnedRegion(
    params: ReorderPinnedRegionParams,
  ): Promise<Result<void, RepositoryError>>;
  listPinnedRegions(
    userId: UserId,
  ): Promise<Result<PinnedRegion[], RepositoryError>>;
  listPinnedRegionsWithDetails(
    userId: UserId,
  ): Promise<Result<PinnedRegionWithDetails[], RepositoryError>>;
  isPinned(
    userId: UserId,
    regionId: RegionId,
  ): Promise<Result<boolean, RepositoryError>>;

  // Statistics
  countFavoritesByRegion(
    regionId: RegionId,
  ): Promise<Result<number, RepositoryError>>;
  countFavoritesByLocation(
    locationId: LocationId,
  ): Promise<Result<number, RepositoryError>>;
  countFavoritesByUser(
    userId: UserId,
  ): Promise<Result<number, RepositoryError>>;
}
