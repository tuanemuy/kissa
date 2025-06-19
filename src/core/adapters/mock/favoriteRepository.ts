import type { RepositoryError } from "@/lib/error";
import { RepositoryError as RepositoryErrorClass } from "@/lib/error";
import type { Result } from "neverthrow";
import { err, ok } from "neverthrow";
import type { FavoriteRepository } from "../../domain/favorite/ports/favoriteRepository";
import type {
  AddFavoriteParams,
  Favorite,
  FavoriteId,
  ListFavoritesQuery,
  PinRegionParams,
  PinnedRegion,
  PinnedRegionId,
  PinnedRegionWithDetails,
  RemoveFavoriteParams,
  ReorderPinnedRegionParams,
} from "../../domain/favorite/types";
import type { LocationId } from "../../domain/location/types";
import type { RegionId } from "../../domain/region/types";
import type { UserId } from "../../domain/user/types";

export class MockFavoriteRepository implements FavoriteRepository {
  private favorites = new Map<FavoriteId, Favorite>();
  private pinnedRegions = new Map<PinnedRegionId, PinnedRegion>();
  private shouldFailOperations = false;
  private nextId = 1;
  private nextPinId = 1;

  setShouldFailOperations(shouldFail: boolean): void {
    this.shouldFailOperations = shouldFail;
  }

  clear(): void {
    this.favorites.clear();
    this.pinnedRegions.clear();
    this.nextId = 1;
    this.nextPinId = 1;
  }

  async addFavorite(
    params: AddFavoriteParams,
  ): Promise<Result<Favorite, RepositoryError>> {
    if (this.shouldFailOperations) {
      return err(new RepositoryErrorClass("Mock addFavorite failure"));
    }

    // Check for duplicate favorites
    for (const favorite of this.favorites.values()) {
      if (
        favorite.userId === params.userId &&
        favorite.regionId === (params.regionId || null) &&
        favorite.locationId === (params.locationId || null)
      ) {
        return err(new RepositoryErrorClass("Favorite already exists"));
      }
    }

    const favorite: Favorite = {
      id: `favorite-${this.nextId++}` as FavoriteId,
      userId: params.userId,
      regionId: params.regionId || null,
      locationId: params.locationId || null,
      createdAt: new Date(),
    };

    this.favorites.set(favorite.id, favorite);
    return ok(favorite);
  }

  async removeFavorite(
    params: RemoveFavoriteParams,
  ): Promise<Result<void, RepositoryError>> {
    if (this.shouldFailOperations) {
      return err(new RepositoryErrorClass("Mock removeFavorite failure"));
    }

    // Find and remove the favorite
    for (const [id, favorite] of this.favorites.entries()) {
      if (
        favorite.userId === params.userId &&
        favorite.regionId === (params.regionId || null) &&
        favorite.locationId === (params.locationId || null)
      ) {
        this.favorites.delete(id);
        return ok(undefined);
      }
    }

    return err(new RepositoryErrorClass("Favorite not found"));
  }

  async listFavorites(
    query: ListFavoritesQuery,
  ): Promise<Result<{ items: Favorite[]; count: number }, RepositoryError>> {
    if (this.shouldFailOperations) {
      return err(new RepositoryErrorClass("Mock listFavorites failure"));
    }

    const userFavorites = Array.from(this.favorites.values()).filter(
      (favorite) => favorite.userId === query.userId,
    );

    // Apply type filter
    let filtered = userFavorites;
    if (query.type === "region") {
      filtered = userFavorites.filter((f) => f.regionId !== null);
    } else if (query.type === "location") {
      filtered = userFavorites.filter((f) => f.locationId !== null);
    }

    // Apply pagination
    const offset = (query.pagination.page - 1) * query.pagination.limit;
    const items = filtered
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(offset, offset + query.pagination.limit);

    return ok({
      items,
      count: filtered.length,
    });
  }

  async isFavorited(
    userId: UserId,
    regionId?: RegionId,
    locationId?: LocationId,
  ): Promise<Result<boolean, RepositoryError>> {
    if (this.shouldFailOperations) {
      return err(new RepositoryErrorClass("Mock isFavorited failure"));
    }

    for (const favorite of this.favorites.values()) {
      if (
        favorite.userId === userId &&
        favorite.regionId === (regionId || null) &&
        favorite.locationId === (locationId || null)
      ) {
        return ok(true);
      }
    }

    return ok(false);
  }

  async listFavoritesWithRegion(): Promise<
    Result<{ items: never[]; count: number }, RepositoryError>
  > {
    if (this.shouldFailOperations) {
      return err(
        new RepositoryErrorClass("Mock listFavoritesWithRegion failure"),
      );
    }
    return ok({ items: [], count: 0 });
  }

  async listFavoritesWithLocation(): Promise<
    Result<{ items: never[]; count: number }, RepositoryError>
  > {
    if (this.shouldFailOperations) {
      return err(
        new RepositoryErrorClass("Mock listFavoritesWithLocation failure"),
      );
    }
    return ok({ items: [], count: 0 });
  }

  async pinRegion(
    params: PinRegionParams,
  ): Promise<Result<PinnedRegion, RepositoryError>> {
    if (this.shouldFailOperations) {
      return err(new RepositoryErrorClass("Mock pinRegion failure"));
    }

    // Check for duplicate pins
    for (const pin of this.pinnedRegions.values()) {
      if (pin.userId === params.userId && pin.regionId === params.regionId) {
        return err(new RepositoryErrorClass("Region already pinned"));
      }
    }

    const pinnedRegion: PinnedRegion = {
      id: `pin-${this.nextPinId++}` as PinnedRegionId,
      userId: params.userId,
      regionId: params.regionId,
      order: params.order || 0,
      createdAt: new Date(),
    };

    this.pinnedRegions.set(pinnedRegion.id, pinnedRegion);
    return ok(pinnedRegion);
  }

  async unpinRegion(
    userId: UserId,
    regionId: RegionId,
  ): Promise<Result<void, RepositoryError>> {
    if (this.shouldFailOperations) {
      return err(new RepositoryErrorClass("Mock unpinRegion failure"));
    }

    // Find and remove the pinned region
    for (const [id, pin] of this.pinnedRegions.entries()) {
      if (pin.userId === userId && pin.regionId === regionId) {
        this.pinnedRegions.delete(id);
        return ok(undefined);
      }
    }

    return err(new RepositoryErrorClass("Pinned region not found"));
  }

  async listPinnedRegions(
    userId: UserId,
  ): Promise<Result<PinnedRegion[], RepositoryError>> {
    if (this.shouldFailOperations) {
      return err(new RepositoryErrorClass("Mock listPinnedRegions failure"));
    }

    const userPins = Array.from(this.pinnedRegions.values())
      .filter((pin) => pin.userId === userId)
      .sort((a, b) => a.order - b.order);

    return ok(userPins);
  }

  async listPinnedRegionsWithDetails(): Promise<
    Result<PinnedRegionWithDetails[], RepositoryError>
  > {
    if (this.shouldFailOperations) {
      return err(
        new RepositoryErrorClass("Mock listPinnedRegionsWithDetails failure"),
      );
    }
    return ok([]);
  }

  async reorderPinnedRegion(): Promise<Result<void, RepositoryError>> {
    if (this.shouldFailOperations) {
      return err(new RepositoryErrorClass("Mock reorderPinnedRegion failure"));
    }
    return ok(undefined);
  }

  async isPinned(
    userId: UserId,
    regionId: RegionId,
  ): Promise<Result<boolean, RepositoryError>> {
    if (this.shouldFailOperations) {
      return err(new RepositoryErrorClass("Mock isPinned failure"));
    }

    for (const pin of this.pinnedRegions.values()) {
      if (pin.userId === userId && pin.regionId === regionId) {
        return ok(true);
      }
    }

    return ok(false);
  }

  async findFavoriteById(
    id: FavoriteId,
  ): Promise<Result<Favorite | null, RepositoryError>> {
    if (this.shouldFailOperations) {
      return err(new RepositoryErrorClass("Mock findFavoriteById failure"));
    }

    const favorite = this.favorites.get(id);
    return ok(favorite || null);
  }

  async findByUserId(
    userId: UserId,
  ): Promise<Result<Favorite[], RepositoryError>> {
    if (this.shouldFailOperations) {
      return err(new RepositoryErrorClass("Mock findByUserId failure"));
    }

    const userFavorites = Array.from(this.favorites.values()).filter(
      (favorite) => favorite.userId === userId,
    );

    return ok(userFavorites);
  }

  async findPinnedRegionsByUserId(
    userId: UserId,
  ): Promise<Result<PinnedRegion[], RepositoryError>> {
    if (this.shouldFailOperations) {
      return err(
        new RepositoryErrorClass("Mock findPinnedRegionsByUserId failure"),
      );
    }

    const userPins = Array.from(this.pinnedRegions.values())
      .filter((pin) => pin.userId === userId)
      .sort((a, b) => a.order - b.order);

    return ok(userPins);
  }

  async countFavoritesByRegion(
    regionId: RegionId,
  ): Promise<Result<number, RepositoryError>> {
    if (this.shouldFailOperations) {
      return err(
        new RepositoryErrorClass("Mock countFavoritesByRegion failure"),
      );
    }

    const count = Array.from(this.favorites.values()).filter(
      (favorite) => favorite.regionId === regionId,
    ).length;

    return ok(count);
  }

  async countFavoritesByLocation(
    locationId: LocationId,
  ): Promise<Result<number, RepositoryError>> {
    if (this.shouldFailOperations) {
      return err(
        new RepositoryErrorClass("Mock countFavoritesByLocation failure"),
      );
    }

    const count = Array.from(this.favorites.values()).filter(
      (favorite) => favorite.locationId === locationId,
    ).length;

    return ok(count);
  }

  async countFavoritesByUser(
    userId: UserId,
  ): Promise<Result<number, RepositoryError>> {
    if (this.shouldFailOperations) {
      return err(new RepositoryErrorClass("Mock countFavoritesByUser failure"));
    }

    const count = Array.from(this.favorites.values()).filter(
      (favorite) => favorite.userId === userId,
    ).length;

    return ok(count);
  }
}
