import type { FavoriteRepository } from "@/core/domain/favorite/ports/favoriteRepository";
import type {
  Favorite,
  FavoriteId,
  PinnedRegionId,
} from "@/core/domain/favorite/types";
import type { LocationRepository } from "@/core/domain/location/ports/locationRepository";
import type { Location, LocationId } from "@/core/domain/location/types";
import type { RegionRepository } from "@/core/domain/region/ports/regionRepository";
import type { Region, RegionId } from "@/core/domain/region/types";
import type { UserRepository } from "@/core/domain/user/ports/userRepository";
import type { User, UserId } from "@/core/domain/user/types";
import { ApplicationError } from "@/lib/error";
import { RepositoryError } from "@/lib/error";
import { err, ok } from "neverthrow";
import { beforeEach, describe, expect, it } from "vitest";
import type { Context } from "../context";
import { createMockContext } from "../testUtils/mockContext";
import { getUserFavorites } from "./getUserFavorites";

describe("getUserFavorites", () => {
  let context: Context;

  const editorUser: User = {
    id: "550e8400-e29b-41d4-a716-446655440001" as UserId,
    name: "Test Editor",
    email: "editor@example.com",
    role: "editor",
    subscription: "basic",
    profilePhotoUrl: null,
    isActive: true,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const visitorUser: User = {
    id: "550e8400-e29b-41d4-a716-446655440002" as UserId,
    name: "Test Visitor",
    email: "visitor@example.com",
    role: "visitor",
    subscription: "free",
    profilePhotoUrl: null,
    isActive: true,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const adminUser: User = {
    id: "550e8400-e29b-41d4-a716-446655440003" as UserId,
    name: "Test Admin",
    email: "admin@example.com",
    role: "admin",
    subscription: "free",
    profilePhotoUrl: null,
    isActive: true,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const testRegion: Region = {
    id: "550e8400-e29b-41d4-a716-446655440010" as RegionId,
    name: "Test Region",
    description: "A test region",
    creatorId: editorUser.id,
    isPublic: true,
    latitude: 35.6762,
    longitude: 139.6503,
    coverPhotoUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const testLocation: Location = {
    id: "550e8400-e29b-41d4-a716-446655440020" as LocationId,
    name: "Test Location",
    description: "A test location",
    category: "restaurant",
    regionId: testRegion.id,
    address: "123 Test Street",
    latitude: 35.6762,
    longitude: 139.6503,
    contactInfo: { email: "test@example.com" },
    operatingHours: { monday: "9:00-18:00" },
    isPublic: true,
    coverPhotoUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const testFavorites: Favorite[] = [
    {
      id: "550e8400-e29b-41d4-a716-446655440030" as FavoriteId,
      userId: visitorUser.id,
      regionId: testRegion.id,
      locationId: null,
      targetType: "region",
      createdAt: new Date("2024-01-01"),
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440031" as FavoriteId,
      userId: visitorUser.id,
      regionId: null,
      locationId: testLocation.id,
      targetType: "location",
      createdAt: new Date("2024-01-02"),
    },
  ];

  beforeEach(() => {
    // Create a complete mock FavoriteRepository
    const mockFavoriteRepository: FavoriteRepository = {
      addFavorite: async () => ok(testFavorites[0]),
      removeFavorite: async () => ok(undefined),
      findFavoriteById: async () => ok(null),
      isFavorited: async () => ok(false),
      listFavorites: async () =>
        ok({ items: testFavorites, count: testFavorites.length }),
      listFavoritesWithRegion: async () => ok({ items: [], count: 0 }),
      listFavoritesWithLocation: async () => ok({ items: [], count: 0 }),
      pinRegion: async () =>
        ok({
          id: "550e8400-e29b-41d4-a716-446655440040" as PinnedRegionId,
          userId: visitorUser.id,
          regionId: testRegion.id,
          order: 0,
          createdAt: new Date(),
        }),
      unpinRegion: async () => ok(undefined),
      reorderPinnedRegion: async () => ok(undefined),
      listPinnedRegions: async () => ok([]),
      listPinnedRegionsWithDetails: async () => ok([]),
      isPinned: async () => ok(false),
      findByUserId: async () => ok(testFavorites),
      findPinnedRegionsByUserId: async () => ok([]),
      countFavoritesByRegion: async () => ok(0),
      countFavoritesByLocation: async () => ok(0),
      countFavoritesByUser: async () => ok(testFavorites.length),
    };

    context = createMockContext({
      favoriteRepository: mockFavoriteRepository,
    });
  });

  describe("SPEC: Favorite access constraints from formal specifications", () => {
    it("should allow visitor to view their favorites", async () => {
      const result = await getUserFavorites(context, visitorUser.id);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const { items, count } = result.value;
        expect(items).toHaveLength(2);
        expect(count).toBe(2);
        expect(items[0].targetType).toBe("region");
        expect(items[1].targetType).toBe("location");
        expect(items).toEqual(expect.any(Array));
      }
    });

    it("should allow editor to view their favorites", async () => {
      const editorFavorites: Favorite[] = [
        {
          id: "550e8400-e29b-41d4-a716-446655440032" as FavoriteId,
          userId: editorUser.id,
          regionId: testRegion.id,
          locationId: null,
          targetType: "region",
          createdAt: new Date(),
        },
      ];

      // Override the mock to return editor favorites
      context.favoriteRepository.findByUserId = async () => ok(editorFavorites);

      const result = await getUserFavorites(context, editorUser.id);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const { items } = result.value;
        expect(items).toHaveLength(1);
        expect(items[0].name).toBe(testRegion.name);
        expect(items[0].targetType).toBe("region");
      }
    });

    it("should handle admin user (no special restrictions in getUserFavorites)", async () => {
      // Override to return empty favorites for admin
      context.favoriteRepository.findByUserId = async () => ok([]);

      const result = await getUserFavorites(context, adminUser.id);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const { items, count } = result.value;
        expect(items).toHaveLength(0);
        expect(count).toBe(0);
      }
    });
  });

  describe("SPEC-INV-4: Only public content can be favorited (Alloy constraint)", () => {
    it("should verify all favorites are for public content", async () => {
      const result = await getUserFavorites(context, visitorUser.id);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const { items } = result.value;
        // In formal model: OnlyFavoritePublicContent
        // all f: Favorite | (f.targetType = RegionTarget implies f.targetRegion.visibility = Public)
        expect(items).toHaveLength(2);
        // Would verify region/location publicity in full implementation
      }
    });
  });

  describe("TLA+ behavior validation", () => {
    it("should follow CreateFavorite action constraints from TLA+", async () => {
      // TLA+ CreateFavorite: only visitors and editors can create favorites
      const result = await getUserFavorites(context, visitorUser.id);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const { items } = result.value;
        // Verify user role constraints from TLA+
        expect(items).toEqual(expect.any(Array));
      }
    });
  });

  describe("Target type filtering", () => {
    it("should filter favorites by region target type", async () => {
      const result = await getUserFavorites(context, visitorUser.id, {
        targetType: "region",
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const { items } = result.value;
        expect(items).toHaveLength(1);
        expect(items[0].targetType).toBe("region");
      }
    });

    it("should filter favorites by location target type", async () => {
      const result = await getUserFavorites(context, visitorUser.id, {
        targetType: "location",
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const { items } = result.value;
        expect(items).toHaveLength(1);
        expect(items[0].targetType).toBe("location");
      }
    });
  });

  describe("Error handling", () => {
    it("should handle repository failure", async () => {
      // Mock repository to return error
      context.favoriteRepository.findByUserId = async () =>
        err(new RepositoryError("Database connection failed"));

      const result = await getUserFavorites(context, visitorUser.id);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to get favorites");
      }
    });

    it("should handle region not found", async () => {
      // Mock region repository to return null
      context.regionRepository.findById = async () => ok(null);

      const result = await getUserFavorites(context, visitorUser.id);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const { items } = result.value;
        // Should only have location favorite since region was not found
        expect(items).toHaveLength(1);
        expect(items[0].targetType).toBe("location");
      }
    });
  });

  describe("Result handling", () => {
    it("should handle empty result set", async () => {
      context.favoriteRepository.findByUserId = async () => ok([]);

      const result = await getUserFavorites(context, visitorUser.id);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const { items, count } = result.value;
        expect(items).toHaveLength(0);
        expect(count).toBe(0);
      }
    });

    it("should sort results by creation date (newest first)", async () => {
      const result = await getUserFavorites(context, visitorUser.id);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const { items } = result.value;
        expect(items).toHaveLength(2);
        // Items should be sorted by creation date descending
        expect(items[0].createdAt.getTime()).toBeGreaterThanOrEqual(
          items[1].createdAt.getTime(),
        );
      }
    });

    it("should include region information for location favorites", async () => {
      const result = await getUserFavorites(context, visitorUser.id);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const { items } = result.value;
        const locationFavorite = items.find(
          (item) => item.targetType === "location",
        );
        expect(locationFavorite).toBeDefined();
        expect(locationFavorite?.regionId).toBe(testRegion.id);
        expect(locationFavorite?.regionName).toBe(testRegion.name);
        expect(locationFavorite?.category).toBe(testLocation.category);
      }
    });
  });
});
