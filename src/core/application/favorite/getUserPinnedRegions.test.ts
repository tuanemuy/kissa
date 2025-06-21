import type { Favorite, FavoriteId } from "@/core/domain/favorite/types";
import type { Region, RegionId } from "@/core/domain/region/types";
import type { UserId } from "@/core/domain/user/types";
import { ApplicationError, RepositoryError } from "@/lib/error";
import { err, ok } from "neverthrow";
import { beforeEach, describe, expect, it } from "vitest";
import type { Context } from "../context";
import { createMockContext } from "../testUtils/mockContext";
import {
  type PinnedRegion,
  getUserPinnedRegions,
} from "./getUserPinnedRegions";

describe("getUserPinnedRegions", () => {
  let context: Context;

  const userId: UserId = "user-1" as UserId;
  const regionId1: RegionId = "region-1" as RegionId;
  const regionId2: RegionId = "region-2" as RegionId;

  const testRegion1: Region = {
    id: regionId1,
    name: "Tokyo",
    description: "Capital of Japan",
    creatorId: "creator-1" as UserId,
    isPublic: true,
    latitude: 35.6762,
    longitude: 139.6503,
    coverPhotoUrl: null,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  };

  const testRegion2: Region = {
    id: regionId2,
    name: "Osaka",
    description: "Commercial hub",
    creatorId: "creator-2" as UserId,
    isPublic: true,
    latitude: 34.6937,
    longitude: 135.5023,
    coverPhotoUrl: null,
    createdAt: new Date("2024-01-02"),
    updatedAt: new Date("2024-01-02"),
  };

  const pinnedFavorite1: Favorite = {
    id: "fav-1" as FavoriteId,
    userId: userId,
    targetType: "region",
    regionId: regionId1,
    locationId: null,
    createdAt: new Date("2024-01-15"),
  };

  const pinnedFavorite2: Favorite = {
    id: "fav-2" as FavoriteId,
    userId: userId,
    targetType: "region",
    regionId: regionId2,
    locationId: null,
    createdAt: new Date("2024-01-16"),
  };

  beforeEach(() => {
    context = createMockContext({
      favoriteRepository: {
        findPinnedRegionsByUserId: async (uid: UserId) => {
          if (uid === userId) {
            return ok([pinnedFavorite1, pinnedFavorite2]);
          }
          return ok([]);
        },
        // biome-ignore lint/suspicious/noExplicitAny: Mock context setup requires type assertion
      } as any,
      regionRepository: {
        findById: async (id: RegionId) => {
          if (id === regionId1) return ok(testRegion1);
          if (id === regionId2) return ok(testRegion2);
          return ok(null);
        },
        // biome-ignore lint/suspicious/noExplicitAny: Mock context setup requires type assertion
      } as any,
    });
  });

  describe("Basic functionality", () => {
    it("should return user's pinned regions in order", async () => {
      const result = await getUserPinnedRegions(context, userId);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const pinnedRegions = result.value;
        expect(pinnedRegions).toHaveLength(2);

        // Check first region (order 1)
        expect(pinnedRegions[0]).toEqual({
          id: regionId1,
          name: "Tokyo",
          description: "Capital of Japan",
          isPublic: true,
          createdAt: testRegion1.createdAt,
          pinnedAt: pinnedFavorite1.createdAt,
          order: 1,
        });

        // Check second region (order 2)
        expect(pinnedRegions[1]).toEqual({
          id: regionId2,
          name: "Osaka",
          description: "Commercial hub",
          isPublic: true,
          createdAt: testRegion2.createdAt,
          pinnedAt: pinnedFavorite2.createdAt,
          order: 2,
        });
      }
    });

    it("should return empty array for user with no pinned regions", async () => {
      const result = await getUserPinnedRegions(
        context,
        "no-pins-user" as UserId,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual([]);
      }
    });

    it("should sort pinned regions by order", async () => {
      // Mock with reversed order to test sorting
      const reversedFavorites = [pinnedFavorite2, pinnedFavorite1];

      context.favoriteRepository = {
        findPinnedRegionsByUserId: async () => ok(reversedFavorites),
        // biome-ignore lint/suspicious/noExplicitAny: Mock context setup requires type assertion
      } as any;

      const result = await getUserPinnedRegions(context, userId);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const pinnedRegions = result.value;
        expect(pinnedRegions).toHaveLength(2);
        expect(pinnedRegions[0].id).toBe(regionId2);
        expect(pinnedRegions[1].id).toBe(regionId1);
      }
    });
  });

  describe("Edge cases", () => {
    it("should handle pinned regions where region no longer exists", async () => {
      // Mock one region not found
      context.regionRepository = {
        findById: async (id: RegionId) => {
          if (id === regionId1) return ok(testRegion1);
          return ok(null); // regionId2 not found
        },
        // biome-ignore lint/suspicious/noExplicitAny: Mock context setup requires type assertion
      } as any;

      const result = await getUserPinnedRegions(context, userId);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const pinnedRegions = result.value;
        expect(pinnedRegions).toHaveLength(1); // Only one region found
        expect(pinnedRegions[0].id).toBe(regionId1);
      }
    });

    it("should handle all pinned regions deleted", async () => {
      context.regionRepository = {
        findById: async () => ok(null), // All regions not found
        // biome-ignore lint/suspicious/noExplicitAny: Mock context setup requires type assertion
      } as any;

      const result = await getUserPinnedRegions(context, userId);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual([]); // No regions found
      }
    });

    it("should handle region repository error gracefully", async () => {
      context.regionRepository = {
        findById: async () => err(new RepositoryError("Region fetch failed")),
        // biome-ignore lint/suspicious/noExplicitAny: Mock context setup requires type assertion
      } as any;

      const result = await getUserPinnedRegions(context, userId);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual([]); // Gracefully handle errors
      }
    });
  });

  describe("Error handling", () => {
    it("should handle favorite repository failure", async () => {
      context.favoriteRepository = {
        findPinnedRegionsByUserId: async () =>
          err(new RepositoryError("Favorite fetch failed")),
        // biome-ignore lint/suspicious/noExplicitAny: Mock context setup requires type assertion
      } as any;

      const result = await getUserPinnedRegions(context, userId);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to get pinned regions");
      }
    });

    it("should handle unexpected errors", async () => {
      context.favoriteRepository = {
        findPinnedRegionsByUserId: async () => {
          throw new Error("Unexpected error");
        },
        // biome-ignore lint/suspicious/noExplicitAny: Mock context setup requires type assertion
      } as any;

      const result = await getUserPinnedRegions(context, userId);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to get user pinned regions");
      }
    });
  });

  describe("Data transformation", () => {
    it("should correctly transform region data to PinnedRegion interface", async () => {
      const result = await getUserPinnedRegions(context, userId);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const pinnedRegion = result.value[0];

        // Check all required fields are present
        expect(pinnedRegion).toHaveProperty("id");
        expect(pinnedRegion).toHaveProperty("name");
        expect(pinnedRegion).toHaveProperty("description");
        expect(pinnedRegion).toHaveProperty("isPublic");
        expect(pinnedRegion).toHaveProperty("createdAt");

        // Check types
        expect(typeof pinnedRegion.id).toBe("string");
        expect(typeof pinnedRegion.name).toBe("string");
        expect(typeof pinnedRegion.isPublic).toBe("boolean");
        expect(pinnedRegion.createdAt).toBeInstanceOf(Date);
      }
    });

    it("should handle null description correctly", async () => {
      const regionWithNullDesc = { ...testRegion1, description: null };
      context.regionRepository = {
        findById: async () => ok(regionWithNullDesc),
        // biome-ignore lint/suspicious/noExplicitAny: Mock context setup requires type assertion
      } as any;

      const result = await getUserPinnedRegions(context, userId);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value[0].description).toBeNull();
      }
    });
  });

  describe("Business logic validation", () => {
    it("should preserve region data correctly", async () => {
      const result = await getUserPinnedRegions(context, userId);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const pinnedRegions = result.value;
        expect(pinnedRegions[0].createdAt).toEqual(testRegion1.createdAt);
        expect(pinnedRegions[1].createdAt).toEqual(testRegion2.createdAt);
      }
    });

    it("should maintain region consistency", async () => {
      const result = await getUserPinnedRegions(context, userId);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const pinnedRegions = result.value;

        // Verify regions are returned in expected order
        expect(pinnedRegions).toHaveLength(2);
        expect(pinnedRegions[0].id).toBe(regionId1);
        expect(pinnedRegions[1].id).toBe(regionId2);
      }
    });
  });
});
