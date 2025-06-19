import type { Region, RegionId } from "@/core/domain/region/types";
import type { User, UserId } from "@/core/domain/user/types";
import { ApplicationError } from "@/lib/error";
import { RepositoryError } from "@/lib/error";
import { err, ok } from "neverthrow";
import { beforeEach, describe, expect, it } from "vitest";
import type { Context } from "../context";
import { discoverRegions } from "./discoverRegions";

describe("discoverRegions", () => {
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

  const publicRegions: Region[] = [
    {
      id: "region-1" as RegionId,
      name: "Tokyo Central",
      description: "Central Tokyo area with many attractions",
      creatorId: editorUser.id,
      isPublic: true,
      latitude: 35.6762,
      longitude: 139.6503,
      coverPhotoUrl: null,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    },
    {
      id: "region-2" as RegionId,
      name: "Shibuya District",
      description: "Famous shopping and entertainment district",
      creatorId: editorUser.id,
      isPublic: true,
      latitude: 35.6598,
      longitude: 139.7006,
      coverPhotoUrl: null,
      createdAt: new Date("2024-01-02"),
      updatedAt: new Date("2024-01-02"),
    },
    {
      id: "region-3" as RegionId,
      name: "Akihabara Electronics",
      description: "Electronics and anime culture district",
      creatorId: editorUser.id,
      isPublic: true,
      latitude: 35.7022,
      longitude: 139.7744,
      coverPhotoUrl: null,
      createdAt: new Date("2024-01-03"),
      updatedAt: new Date("2024-01-03"),
    },
  ];

  beforeEach(() => {
    context = {
      userRepository: {
        findById: async (id: string) => {
          if (id === editorUser.id) return ok(editorUser);
          return ok(null);
        },
      } as Partial<typeof context.userRepository>,
      regionRepository: {
        discover: async () => ok({ items: publicRegions, count: publicRegions.length }),
      } as Partial<typeof context.regionRepository>,
    } as Context;
  });

  describe("SPEC: Region discovery from formal specifications", () => {
    it("should discover public regions for authenticated users", async () => {
      const query = {
        pagination: { page: 1, limit: 10 },
      };

      const result = await discoverRegions(context, editorUser.id, query);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const { items, count } = result.value;
        expect(items).toHaveLength(3);
        expect(count).toBe(3);
        expect(items.every(r => r.isPublic)).toBe(true);
        expect(items[0].name).toBe("Tokyo Central");
        expect(items[1].name).toBe("Shibuya District");
        expect(items[2].name).toBe("Akihabara Electronics");
      }
    });

    it("should discover public regions for anonymous users", async () => {
      const query = {
        pagination: { page: 1, limit: 10 },
      };

      const result = await discoverRegions(context, null, query);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const { items, count } = result.value;
        expect(items).toHaveLength(3);
        expect(count).toBe(3);
        expect(items.every(r => r.isPublic)).toBe(true);
      }
    });

    it("should filter regions by keyword", async () => {
      const tokyoRegions = publicRegions.filter(r => r.name.includes("Tokyo"));
      context.regionRepository = {
        discover: async () => ok({ items: tokyoRegions, count: tokyoRegions.length }),
      } as Partial<typeof context.regionRepository>;

      const query = {
        pagination: { page: 1, limit: 10 },
        filter: { keyword: "Tokyo" },
      };

      const result = await discoverRegions(context, editorUser.id, query);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const { items, count } = result.value;
        expect(items).toHaveLength(1);
        expect(count).toBe(1);
        expect(items[0].name).toBe("Tokyo Central");
      }
    });
  });

  describe("TLA+ behavior validation", () => {
    it("should follow SearchRegionsByKeyword from TLA+ specification", async () => {
      // TLA+ SearchRegionsByKeyword: search results are public and active
      const query = {
        pagination: { page: 1, limit: 10 },
        filter: { keyword: "District" },
      };

      const districtRegions = publicRegions.filter(r => r.name.includes("District"));
      context.regionRepository = {
        discover: async () => ok({ items: districtRegions, count: districtRegions.length }),
      } as Partial<typeof context.regionRepository>;

      const result = await discoverRegions(context, editorUser.id, query);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const { items } = result.value;
        // Verify TLA+ constraint: regionStates[r].visibility = "public"
        expect(items.every(r => r.isPublic)).toBe(true);
        expect(items[0].name).toBe("Shibuya District");
      }
    });

    it("should follow SearchRegionsByLocation from TLA+ specification", async () => {
      // TLA+ SearchRegionsByLocation: filter by proximity
      const query = {
        pagination: { page: 1, limit: 10 },
        filter: {
          location: {
            latitude: 35.6762,
            longitude: 139.6503,
            radiusKm: 5,
          },
        },
      };

      const nearbyRegions = publicRegions.filter(r => 
        r.latitude !== null && Math.abs(r.latitude - 35.6762) < 0.1
      );
      context.regionRepository = {
        discover: async () => ok({ items: nearbyRegions, count: nearbyRegions.length }),
      } as Partial<typeof context.regionRepository>;

      const result = await discoverRegions(context, editorUser.id, query);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const { items } = result.value;
        // Verify proximity filtering
        expect(items.length).toBeGreaterThan(0);
        expect(items.every(r => r.latitude !== null)).toBe(true);
      }
    });
  });

  describe("SPEC-INV-21: Search index consistency (Alloy constraint)", () => {
    it("should only return public regions in search results", async () => {
      // Alloy constraint: SearchIndexConsistency
      // all r: si.regions | r.visibility = Public
      const query = {
        pagination: { page: 1, limit: 10 },
      };

      const result = await discoverRegions(context, editorUser.id, query);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const { items } = result.value;
        // All discovered regions must be public
        expect(items.every(r => r.isPublic)).toBe(true);
      }
    });
  });

  describe("Input validation", () => {
    it("should reject invalid pagination - negative page", async () => {
      const query = {
        pagination: { page: -1, limit: 10 },
      };

      const result = await discoverRegions(context, editorUser.id, query as never);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid query parameters");
      }
    });

    it("should reject invalid location coordinates", async () => {
      const query = {
        pagination: { page: 1, limit: 10 },
        filter: {
          location: {
            latitude: 200, // Invalid latitude
            longitude: 139.6503,
            radiusKm: 5,
          },
        },
      };

      const result = await discoverRegions(context, editorUser.id, query as never);

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

      const result = await discoverRegions(
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
      const mockRegionRepository = context.regionRepository as any;
      mockRegionRepository.discover = async () =>
        err(new RepositoryError("Search service error"));

      const query = {
        pagination: { page: 1, limit: 10 },
      };

      const result = await discoverRegions(context, editorUser.id, query);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to discover regions");
      }
    });
  });

  describe("Sorting and ordering", () => {
    it("should sort regions by relevance", async () => {
      const query = {
        pagination: { page: 1, limit: 10 },
        sort: { field: "relevance" as const, order: "desc" as const },
      };

      const result = await discoverRegions(context, editorUser.id, query);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const { items } = result.value;
        expect(items).toHaveLength(3);
        // In a real implementation, relevance would be calculated
      }
    });

    it("should sort regions by creation date", async () => {
      const sortedRegions = [...publicRegions].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      );
      context.regionRepository = {
        discover: async () => ok({ items: sortedRegions, count: sortedRegions.length }),
      } as Partial<typeof context.regionRepository>;

      const query = {
        pagination: { page: 1, limit: 10 },
        sort: { field: "createdAt" as const, order: "desc" as const },
      };

      const result = await discoverRegions(context, editorUser.id, query);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const { items } = result.value;
        expect(items[0].name).toBe("Akihabara Electronics"); // Most recent
      }
    });
  });

  describe("Empty results handling", () => {
    it("should handle empty search results", async () => {
      context.regionRepository = {
        discover: async () => ok({ items: [], count: 0 }),
      } as Partial<typeof context.regionRepository>;

      const query = {
        pagination: { page: 1, limit: 10 },
        filter: { keyword: "NonExistentPlace" },
      };

      const result = await discoverRegions(context, editorUser.id, query);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const { items, count } = result.value;
        expect(items).toHaveLength(0);
        expect(count).toBe(0);
      }
    });
  });
});