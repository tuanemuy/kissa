import type {
  ListLocationsQuery,
  LocationId,
  LocationWithStats,
} from "@/core/domain/location/types";
import type { Region, RegionId } from "@/core/domain/region/types";
import type { UserId } from "@/core/domain/user/types";
import { ApplicationError, RepositoryError } from "@/lib/error";
import { err, ok } from "neverthrow";
import { beforeEach, describe, expect, it } from "vitest";
import type { Context } from "../context";
import {
  discoverLocations,
  discoverLocationsByCategory,
  discoverLocationsByRegion,
  searchLocations,
} from "./discoverLocations";

describe("discoverLocations", () => {
  let context: Context;

  const publicRegion: Region = {
    id: "region-1" as RegionId,
    name: "Tokyo",
    description: "Public region",
    creatorId: "creator-1" as UserId,
    isPublic: true,
    latitude: 35.6762,
    longitude: 139.6503,
    coverPhotoUrl: null,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  };

  const privateRegion: Region = {
    id: "region-2" as RegionId,
    name: "Private Region",
    description: "Private region",
    creatorId: "creator-2" as UserId,
    isPublic: false,
    latitude: 35.6762,
    longitude: 139.6503,
    coverPhotoUrl: null,
    createdAt: new Date("2024-01-02"),
    updatedAt: new Date("2024-01-02"),
  };

  const mockLocations: LocationWithStats[] = [
    {
      id: "location-1" as LocationId,
      name: "Tokyo Station",
      description: "Central train station",
      regionId: publicRegion.id,
      category: "transportation",
      address: "1-1 Marunouchi",
      latitude: 35.6812,
      longitude: 139.7671,
      contactInfo: null,
      operatingHours: {
        monday: "24/7",
        tuesday: "24/7",
        wednesday: "24/7",
        thursday: "24/7",
        friday: "24/7",
        saturday: "24/7",
        sunday: "24/7",
      },
      isPublic: true,
      coverPhotoUrl: null,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
      checkInCount: 150,
      favoriteCount: 45,
      averageRating: 4.5,
    },
    {
      id: "location-2" as LocationId,
      name: "Shibuya Crossing",
      description: "Famous intersection",
      regionId: publicRegion.id,
      category: "landmark",
      address: "Shibuya City",
      latitude: 35.6595,
      longitude: 139.7006,
      contactInfo: null,
      operatingHours: null,
      isPublic: true,
      coverPhotoUrl: null,
      createdAt: new Date("2024-01-02"),
      updatedAt: new Date("2024-01-02"),
      checkInCount: 200,
      favoriteCount: 80,
      averageRating: 4.8,
    },
  ];

  beforeEach(() => {
    context = {
      regionRepository: {
        findById: async (id: RegionId) => {
          if (id === publicRegion.id) return ok(publicRegion);
          if (id === privateRegion.id) return ok(privateRegion);
          return ok(null);
        },
        // biome-ignore lint/suspicious/noExplicitAny: Mock context setup requires type assertion
      } as any,
      locationRepository: {
        listWithStats: async (query: ListLocationsQuery) => {
          let items = [...mockLocations];

          // Apply filters
          if (query.filter?.regionId) {
            items = items.filter(
              (item) => item.regionId === query.filter?.regionId,
            );
          }
          if (query.filter?.category) {
            items = items.filter(
              (item) => item.category === query.filter?.category,
            );
          }
          if (query.filter?.search) {
            const searchLower = query.filter.search.toLowerCase();
            items = items.filter(
              (item) =>
                item.name.toLowerCase().includes(searchLower) ||
                item.description?.toLowerCase().includes(searchLower),
            );
          }
          if (query.filter?.isPublic !== undefined) {
            // For simplicity, assume all mock locations are public
            items = query.filter.isPublic ? items : [];
          }

          // Apply pagination
          const offset = (query.pagination.page - 1) * query.pagination.limit;
          const paginatedItems = items.slice(
            offset,
            offset + query.pagination.limit,
          );

          return ok({ items: paginatedItems, count: items.length });
        },
        // biome-ignore lint/suspicious/noExplicitAny: Mock context setup requires type assertion
      } as any,
    } as Context;
  });

  describe("Basic discovery functionality", () => {
    it("should discover public locations without region filter", async () => {
      const input = {
        pagination: { page: 1, limit: 10 },
        sort: { field: "createdAt" as const, order: "desc" as const },
      };

      const result = await discoverLocations(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.items).toHaveLength(2);
        expect(result.value.count).toBe(2);
        expect(result.value.items[0].name).toBe("Tokyo Station");
        expect(result.value.items[1].name).toBe("Shibuya Crossing");
      }
    });

    it("should filter by public region", async () => {
      const input = {
        pagination: { page: 1, limit: 10 },
        sort: { field: "createdAt" as const, order: "desc" as const },
        filter: { regionId: publicRegion.id },
      };

      const result = await discoverLocations(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.items).toHaveLength(2);
        expect(
          result.value.items.every((item) => item.regionId === publicRegion.id),
        ).toBe(true);
      }
    });

    it("should enforce public visibility", async () => {
      // Mock should automatically apply isPublic: true filter
      const input = {
        pagination: { page: 1, limit: 10 },
        sort: { field: "createdAt" as const, order: "desc" as const },
      };

      const result = await discoverLocations(context, input);

      expect(result.isOk()).toBe(true);
      // All returned locations should be from public regions
    });
  });

  describe("Region validation", () => {
    it("should reject private region access", async () => {
      const input = {
        pagination: { page: 1, limit: 10 },
        sort: { field: "createdAt" as const, order: "desc" as const },
        filter: { regionId: privateRegion.id },
      };

      const result = await discoverLocations(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Region is not public");
      }
    });

    it("should reject non-existent region", async () => {
      const input = {
        pagination: { page: 1, limit: 10 },
        sort: { field: "createdAt" as const, order: "desc" as const },
        filter: { regionId: "non-existent-region" },
      };

      const result = await discoverLocations(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Region not found");
      }
    });
  });

  describe("Filtering functionality", () => {
    it("should filter by category", async () => {
      const input = {
        pagination: { page: 1, limit: 10 },
        sort: { field: "createdAt" as const, order: "desc" as const },
        filter: { category: "transportation" },
      };

      const result = await discoverLocations(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.items).toHaveLength(1);
        expect(result.value.items[0].category).toBe("transportation");
      }
    });

    it("should filter by search term", async () => {
      const input = {
        pagination: { page: 1, limit: 10 },
        sort: { field: "createdAt" as const, order: "desc" as const },
        filter: { search: "Station" },
      };

      const result = await discoverLocations(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.items).toHaveLength(1);
        expect(result.value.items[0].name).toBe("Tokyo Station");
      }
    });

    it("should handle multiple filters", async () => {
      const input = {
        pagination: { page: 1, limit: 10 },
        sort: { field: "createdAt" as const, order: "desc" as const },
        filter: {
          regionId: publicRegion.id,
          category: "landmark",
        },
      };

      const result = await discoverLocations(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.items).toHaveLength(1);
        expect(result.value.items[0].category).toBe("landmark");
      }
    });
  });

  describe("Sorting functionality", () => {
    it("should apply default sorting (createdAt desc)", async () => {
      const input = {
        pagination: { page: 1, limit: 10 },
        sort: { field: "createdAt" as const, order: "desc" as const },
      };

      const result = await discoverLocations(context, input);

      expect(result.isOk()).toBe(true);
      // Default sort should be applied
    });

    it("should accept custom sorting", async () => {
      const input = {
        pagination: { page: 1, limit: 10 },
        sort: { field: "name" as const, order: "asc" as const },
      };

      const result = await discoverLocations(context, input);

      expect(result.isOk()).toBe(true);
    });
  });

  describe("Input validation", () => {
    it("should reject invalid pagination - negative page", async () => {
      const input = {
        pagination: { page: -1, limit: 10 },
        sort: { field: "createdAt" as const, order: "desc" as const },
      };

      const result = await discoverLocations(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid input");
      }
    });

    it("should reject invalid pagination - limit too high", async () => {
      const input = {
        pagination: { page: 1, limit: 200 }, // > 100
        sort: { field: "createdAt" as const, order: "desc" as const },
      };

      const result = await discoverLocations(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid input");
      }
    });

    it("should reject invalid regionId UUID", async () => {
      const input = {
        pagination: { page: 1, limit: 10 },
        sort: { field: "createdAt" as const, order: "desc" as const },
        filter: { regionId: "invalid-uuid" },
      };

      const result = await discoverLocations(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid input");
      }
    });
  });

  describe("Error handling", () => {
    it("should handle repository region lookup failure", async () => {
      context.regionRepository = {
        findById: async () => err(new RepositoryError("Region lookup failed")),
        // biome-ignore lint/suspicious/noExplicitAny: Mock context setup requires type assertion
      } as any;

      const input = {
        pagination: { page: 1, limit: 10 },
        sort: { field: "createdAt" as const, order: "desc" as const },
        filter: { regionId: publicRegion.id },
      };

      const result = await discoverLocations(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to verify region");
      }
    });

    it("should handle repository location listing failure", async () => {
      context.locationRepository = {
        listWithStats: async () =>
          err(new RepositoryError("Location listing failed")),
        // biome-ignore lint/suspicious/noExplicitAny: Mock context setup requires type assertion
      } as any;

      const input = {
        pagination: { page: 1, limit: 10 },
        sort: { field: "createdAt" as const, order: "desc" as const },
      };

      const result = await discoverLocations(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to discover locations");
      }
    });
  });

  describe("Helper functions", () => {
    describe("discoverLocationsByRegion", () => {
      it("should discover locations by specific region", async () => {
        const result = await discoverLocationsByRegion(
          context,
          publicRegion.id,
          { page: 1, limit: 10 },
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(
            result.value.items.every(
              (item) => item.regionId === publicRegion.id,
            ),
          ).toBe(true);
        }
      });
    });

    describe("searchLocations", () => {
      it("should search locations by keyword", async () => {
        const result = await searchLocations(context, "Tokyo", undefined, {
          page: 1,
          limit: 10,
        });

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.items).toHaveLength(1);
          expect(result.value.items[0].name).toBe("Tokyo Station");
        }
      });

      it("should reject empty search term", async () => {
        const result = await searchLocations(
          context,
          "   ", // Empty/whitespace
          undefined,
          { page: 1, limit: 10 },
        );

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ApplicationError);
          expect(result.error.message).toBe("Search term cannot be empty");
        }
      });

      it("should search within specific region", async () => {
        const result = await searchLocations(
          context,
          "Station",
          publicRegion.id,
          { page: 1, limit: 10 },
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.items).toHaveLength(1);
          expect(result.value.items[0].regionId).toBe(publicRegion.id);
        }
      });
    });

    describe("discoverLocationsByCategory", () => {
      it("should discover locations by category", async () => {
        const result = await discoverLocationsByCategory(
          context,
          "landmark",
          undefined,
          { page: 1, limit: 10 },
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.items).toHaveLength(1);
          expect(result.value.items[0].category).toBe("landmark");
        }
      });

      it("should filter by category within specific region", async () => {
        const result = await discoverLocationsByCategory(
          context,
          "transportation",
          publicRegion.id,
          { page: 1, limit: 10 },
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.items).toHaveLength(1);
          expect(result.value.items[0].category).toBe("transportation");
          expect(result.value.items[0].regionId).toBe(publicRegion.id);
        }
      });
    });
  });

  describe("Business logic validation", () => {
    it("should only return locations from public regions", async () => {
      const input = {
        pagination: { page: 1, limit: 10 },
        sort: { field: "createdAt" as const, order: "desc" as const },
      };

      const result = await discoverLocations(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // All locations should be from public regions
        expect(
          result.value.items.every((item) => item.regionId === publicRegion.id),
        ).toBe(true);
      }
    });

    it("should include location statistics", async () => {
      const input = {
        pagination: { page: 1, limit: 10 },
        sort: { field: "createdAt" as const, order: "desc" as const },
      };

      const result = await discoverLocations(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const location = result.value.items[0];
        expect(location).toHaveProperty("checkInCount");
        expect(location).toHaveProperty("favoriteCount");
        expect(location).toHaveProperty("averageRating");
        expect(typeof location.checkInCount).toBe("number");
        expect(typeof location.favoriteCount).toBe("number");
        expect(typeof location.averageRating).toBe("number");
      }
    });
  });
});
