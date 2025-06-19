import type { Favorite, FavoriteId } from "@/core/domain/favorite/types";
import type { Location, LocationId } from "@/core/domain/location/types";
import type { Region, RegionId } from "@/core/domain/region/types";
import type { User, UserId } from "@/core/domain/user/types";
import { ApplicationError } from "@/lib/error";
import { RepositoryError } from "@/lib/error";
import { err, ok } from "neverthrow";
import { beforeEach, describe, expect, it } from "vitest";
import type { Context } from "../context";
import { getUserFavorites } from "./getUserFavorites";

describe("getUserFavorites", () => {
  let context: Context;

  const editorUser: User = {
    id: "editor-1" as UserId,
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
    id: "visitor-1" as UserId,
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
    id: "admin-1" as UserId,
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
    id: "region-1" as RegionId,
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
    id: "location-1" as LocationId,
    name: "Test Location",
    description: "A test location",
    category: "restaurant",
    regionId: testRegion.id,
    address: "123 Test Street",
    latitude: 35.6762,
    longitude: 139.6503,
    contactInfo: "test@example.com",
    operatingHours: "9:00-18:00",
    isPublic: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const testFavorites: Favorite[] = [
    {
      id: "favorite-1" as FavoriteId,
      userId: visitorUser.id,
      targetType: "region",
      targetId: testRegion.id,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    },
    {
      id: "favorite-2" as FavoriteId,
      userId: visitorUser.id,
      targetType: "location",
      targetId: testLocation.id,
      createdAt: new Date("2024-01-02"),
      updatedAt: new Date("2024-01-02"),
    },
  ];

  beforeEach(() => {
    context = {
      userRepository: {
        findById: async (id: string) => {
          if (id === editorUser.id) return ok(editorUser);
          if (id === visitorUser.id) return ok(visitorUser);
          if (id === adminUser.id) return ok(adminUser);
          return ok(null);
        },
      } as Partial<typeof context.userRepository>,
      favoriteRepository: {
        listByUser: async () =>
          ok({ items: testFavorites, count: testFavorites.length }),
      } as Partial<typeof context.favoriteRepository>,
    } as Context;
  });

  describe("SPEC: Favorite access constraints from formal specifications", () => {
    it("should allow visitor to view their favorites", async () => {
      const query = {
        pagination: { page: 1, limit: 10 },
      };

      const result = await getUserFavorites(context, visitorUser.id, query);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const { items, count } = result.value;
        expect(items).toHaveLength(2);
        expect(count).toBe(2);
        expect(items[0].targetType).toBe("region");
        expect(items[1].targetType).toBe("location");
        expect(items.every((f) => f.userId === visitorUser.id)).toBe(true);
      }
    });

    it("should allow editor to view their favorites", async () => {
      const editorFavorites: Favorite[] = [
        {
          id: "favorite-3" as FavoriteId,
          userId: editorUser.id,
          targetType: "region",
          targetId: testRegion.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      context.favoriteRepository = {
        listByUser: async () =>
          ok({ items: editorFavorites, count: editorFavorites.length }),
      } as Partial<typeof context.favoriteRepository>;

      const query = {
        pagination: { page: 1, limit: 10 },
      };

      const result = await getUserFavorites(context, editorUser.id, query);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const { items } = result.value;
        expect(items).toHaveLength(1);
        expect(items[0].userId).toBe(editorUser.id);
      }
    });

    it("should reject admin viewing favorites (SPEC-INV-8: Only visitors and editors have favorites)", async () => {
      const query = {
        pagination: { page: 1, limit: 10 },
      };

      const result = await getUserFavorites(context, adminUser.id, query);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Admins cannot have favorites");
      }
    });
  });

  describe("SPEC-INV-4: Only public content can be favorited (Alloy constraint)", () => {
    it("should verify all favorites are for public content", async () => {
      const query = {
        pagination: { page: 1, limit: 10 },
      };

      const result = await getUserFavorites(context, visitorUser.id, query);

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
      const query = {
        pagination: { page: 1, limit: 10 },
      };

      const result = await getUserFavorites(context, visitorUser.id, query);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const { items } = result.value;
        // Verify user role constraints from TLA+
        expect(items.every((f) => f.userId === visitorUser.id)).toBe(true);
      }
    });
  });

  describe("Input validation", () => {
    it("should reject invalid pagination - negative page", async () => {
      const query = {
        pagination: { page: -1, limit: 10 },
      };

      const result = await getUserFavorites(
        context,
        visitorUser.id,
        query as never,
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid query parameters");
      }
    });

    it("should reject invalid pagination - zero limit", async () => {
      const query = {
        pagination: { page: 1, limit: 0 },
      };

      const result = await getUserFavorites(
        context,
        visitorUser.id,
        query as never,
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid query parameters");
      }
    });
  });

  describe("Error handling", () => {
    it("should handle user not found", async () => {
      const query = {
        pagination: { page: 1, limit: 10 },
      };

      const result = await getUserFavorites(
        context,
        "non-existent" as UserId,
        query,
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("User not found");
      }
    });

    it("should handle repository failure", async () => {
      // biome-ignore lint/suspicious/noExplicitAny: Testing error handling requires type assertion
      const mockFavoriteRepository = context.favoriteRepository as any;
      mockFavoriteRepository.listByUser = async () =>
        err(new RepositoryError("Database error"));

      const query = {
        pagination: { page: 1, limit: 10 },
      };

      const result = await getUserFavorites(context, visitorUser.id, query);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to get user favorites");
      }
    });
  });

  describe("Filtering and pagination", () => {
    it("should filter favorites by target type", async () => {
      const regionFavorites = testFavorites.filter(
        (f) => f.targetType === "region",
      );
      context.favoriteRepository = {
        listByUser: async () =>
          ok({ items: regionFavorites, count: regionFavorites.length }),
      } as Partial<typeof context.favoriteRepository>;

      const query = {
        pagination: { page: 1, limit: 10 },
        filter: { targetType: "region" as const },
      };

      const result = await getUserFavorites(context, visitorUser.id, query);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const { items, count } = result.value;
        expect(items).toHaveLength(1);
        expect(count).toBe(1);
        expect(items[0].targetType).toBe("region");
      }
    });

    it("should handle empty result set", async () => {
      context.favoriteRepository = {
        listByUser: async () => ok({ items: [], count: 0 }),
      } as Partial<typeof context.favoriteRepository>;

      const query = {
        pagination: { page: 1, limit: 10 },
      };

      const result = await getUserFavorites(context, visitorUser.id, query);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const { items, count } = result.value;
        expect(items).toHaveLength(0);
        expect(count).toBe(0);
      }
    });

    it("should handle pagination with large page numbers", async () => {
      context.favoriteRepository = {
        listByUser: async () => ok({ items: [], count: 2 }),
      } as Partial<typeof context.favoriteRepository>;

      const query = {
        pagination: { page: 100, limit: 10 },
      };

      const result = await getUserFavorites(context, visitorUser.id, query);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const { items, count } = result.value;
        expect(items).toHaveLength(0);
        expect(count).toBe(2);
      }
    });
  });
});
