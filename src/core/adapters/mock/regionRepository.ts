import type { RepositoryError } from "@/lib/error";
import { RepositoryError as RepositoryErrorClass } from "@/lib/error";
import type { Result } from "neverthrow";
import { err, ok } from "neverthrow";
import type { RegionRepository } from "../../domain/region/ports/regionRepository";
import type {
  CreateRegionParams,
  ListRegionsQuery,
  Region,
  RegionId,
  RegionWithStats,
  UpdateRegionParams,
} from "../../domain/region/types";
import type { UserId } from "../../domain/user/types";

export class MockRegionRepository implements RegionRepository {
  private regions = new Map<RegionId, Region>();
  private shouldFailOperations = false;

  setShouldFailOperations(shouldFail: boolean): void {
    this.shouldFailOperations = shouldFail;
  }

  addRegion(region: Region): void {
    this.regions.set(region.id, region);
  }

  clear(): void {
    this.regions.clear();
  }

  async create(
    params: CreateRegionParams,
  ): Promise<Result<Region, RepositoryError>> {
    if (this.shouldFailOperations) {
      return err(new RepositoryErrorClass("Mock create failure"));
    }

    const region: Region = {
      id: `region-${Date.now()}` as RegionId,
      creatorId: params.creatorId,
      name: params.name,
      description: params.description ?? null,
      latitude: params.latitude ?? null,
      longitude: params.longitude ?? null,
      isPublic: params.isPublic ?? false,
      coverPhotoUrl: params.coverPhotoUrl ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.regions.set(region.id, region);
    return ok(region);
  }

  async findById(
    id: RegionId,
  ): Promise<Result<Region | null, RepositoryError>> {
    if (this.shouldFailOperations) {
      return err(new RepositoryErrorClass("Mock findById failure"));
    }

    return ok(this.regions.get(id) ?? null);
  }

  async findByIdWithStats(
    id: RegionId,
  ): Promise<Result<RegionWithStats | null, RepositoryError>> {
    if (this.shouldFailOperations) {
      return err(new RepositoryErrorClass("Mock findByIdWithStats failure"));
    }

    const region = this.regions.get(id);
    if (!region) {
      return ok(null);
    }

    const regionWithStats: RegionWithStats = {
      ...region,
      locationCount: 0,
      favoriteCount: 0,
      checkInCount: 0,
    };

    return ok(regionWithStats);
  }

  async update(
    params: UpdateRegionParams,
  ): Promise<Result<Region, RepositoryError>> {
    if (this.shouldFailOperations) {
      return err(new RepositoryErrorClass("Mock update failure"));
    }

    const region = this.regions.get(params.id);
    if (!region) {
      return err(new RepositoryErrorClass("Region not found"));
    }

    const updatedRegion: Region = {
      ...region,
      ...(params.name && { name: params.name }),
      ...(params.description !== undefined && {
        description: params.description,
      }),
      ...(params.latitude !== undefined && { latitude: params.latitude }),
      ...(params.longitude !== undefined && { longitude: params.longitude }),
      ...(params.isPublic !== undefined && { isPublic: params.isPublic }),
      ...(params.coverPhotoUrl !== undefined && {
        coverPhotoUrl: params.coverPhotoUrl,
      }),
      updatedAt: new Date(),
    };

    this.regions.set(params.id, updatedRegion);
    return ok(updatedRegion);
  }

  async delete(id: RegionId): Promise<Result<void, RepositoryError>> {
    if (this.shouldFailOperations) {
      return err(new RepositoryErrorClass("Mock delete failure"));
    }

    if (!this.regions.has(id)) {
      return err(new RepositoryErrorClass("Region not found"));
    }

    this.regions.delete(id);
    return ok(undefined);
  }

  async list(
    query: ListRegionsQuery,
  ): Promise<Result<{ items: Region[]; count: number }, RepositoryError>> {
    if (this.shouldFailOperations) {
      return err(new RepositoryErrorClass("Mock list failure"));
    }

    let filteredRegions = Array.from(this.regions.values());

    // Apply filters
    if (query.filter) {
      if (query.filter.creatorId) {
        filteredRegions = filteredRegions.filter(
          (region) => region.creatorId === query.filter?.creatorId,
        );
      }
      if (query.filter.isPublic !== undefined) {
        filteredRegions = filteredRegions.filter(
          (region) => region.isPublic === query.filter?.isPublic,
        );
      }
      if (query.filter.search) {
        const searchTerm = query.filter.search.toLowerCase();
        filteredRegions = filteredRegions.filter(
          (region) =>
            region.name.toLowerCase().includes(searchTerm) ||
            region.description?.toLowerCase().includes(searchTerm),
        );
      }
    }

    // Apply sorting
    if (query.sort) {
      filteredRegions.sort((a, b) => {
        const field = query.sort?.field;
        const order = query.sort?.order;

        let aVal: Date | string;
        let bVal: Date | string;

        switch (field) {
          case "createdAt":
            aVal = a.createdAt;
            bVal = b.createdAt;
            break;
          case "updatedAt":
            aVal = a.updatedAt;
            bVal = b.updatedAt;
            break;
          case "name":
            aVal = a.name;
            bVal = b.name;
            break;
          default:
            aVal = a.createdAt;
            bVal = b.createdAt;
            break;
        }

        if (aVal < bVal) return order === "asc" ? -1 : 1;
        if (aVal > bVal) return order === "asc" ? 1 : -1;
        return 0;
      });
    }

    const totalCount = filteredRegions.length;

    // Apply pagination
    const offset = (query.pagination.page - 1) * query.pagination.limit;
    const paginatedRegions = filteredRegions.slice(
      offset,
      offset + query.pagination.limit,
    );

    return ok({ items: paginatedRegions, count: totalCount });
  }

  async listWithStats(
    query: ListRegionsQuery,
  ): Promise<
    Result<{ items: RegionWithStats[]; count: number }, RepositoryError>
  > {
    if (this.shouldFailOperations) {
      return err(new RepositoryErrorClass("Mock listWithStats failure"));
    }

    const listResult = await this.list(query);
    if (listResult.isErr()) {
      return err(listResult.error);
    }

    const { items, count } = listResult.value;
    const itemsWithStats: RegionWithStats[] = items.map((region) => ({
      ...region,
      locationCount: 0,
      favoriteCount: 0,
      checkInCount: 0,
    }));

    return ok({ items: itemsWithStats, count });
  }

  async countByCreator(
    creatorId: UserId,
  ): Promise<Result<number, RepositoryError>> {
    if (this.shouldFailOperations) {
      return err(new RepositoryErrorClass("Mock countByCreator failure"));
    }

    let count = 0;
    for (const region of this.regions.values()) {
      if (region.creatorId === creatorId) {
        count++;
      }
    }

    return ok(count);
  }

  async findByCreator(
    creatorId: UserId,
  ): Promise<Result<Region[], RepositoryError>> {
    if (this.shouldFailOperations) {
      return err(new RepositoryErrorClass("Mock findByCreator failure"));
    }

    const regions = Array.from(this.regions.values()).filter(
      (region) => region.creatorId === creatorId,
    );

    return ok(regions);
  }

  async findPublicRegions(): Promise<Result<Region[], RepositoryError>> {
    if (this.shouldFailOperations) {
      return err(new RepositoryErrorClass("Mock findPublicRegions failure"));
    }

    const publicRegions = Array.from(this.regions.values()).filter(
      (region) => region.isPublic,
    );

    return ok(publicRegions);
  }

  async search(
    keyword: string,
    limit?: number,
  ): Promise<Result<Region[], RepositoryError>> {
    if (this.shouldFailOperations) {
      return err(new RepositoryErrorClass("Mock search failure"));
    }

    const searchTerm = keyword.toLowerCase();
    let results = Array.from(this.regions.values()).filter(
      (region) =>
        region.isPublic &&
        (region.name.toLowerCase().includes(searchTerm) ||
          region.description?.toLowerCase().includes(searchTerm)),
    );

    if (limit) {
      results = results.slice(0, limit);
    }

    return ok(results);
  }

  async makePublic(id: RegionId): Promise<Result<void, RepositoryError>> {
    if (this.shouldFailOperations) {
      return err(new RepositoryErrorClass("Mock makePublic failure"));
    }

    const region = this.regions.get(id);
    if (!region) {
      return err(new RepositoryErrorClass("Region not found"));
    }

    const updatedRegion: Region = {
      ...region,
      isPublic: true,
      updatedAt: new Date(),
    };

    this.regions.set(id, updatedRegion);
    return ok(undefined);
  }

  async makePrivate(id: RegionId): Promise<Result<void, RepositoryError>> {
    if (this.shouldFailOperations) {
      return err(new RepositoryErrorClass("Mock makePrivate failure"));
    }

    const region = this.regions.get(id);
    if (!region) {
      return err(new RepositoryErrorClass("Region not found"));
    }

    const updatedRegion: Region = {
      ...region,
      isPublic: false,
      updatedAt: new Date(),
    };

    this.regions.set(id, updatedRegion);
    return ok(undefined);
  }
}
