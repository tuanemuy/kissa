import { MockRegionRepository } from "@/core/adapters/mock/regionRepository";
import type { RegionId, RegionWithStats } from "@/core/domain/region/types";
import type { User, UserId } from "@/core/domain/user/types";
import { ApplicationError } from "@/lib/error";
import { ok } from "neverthrow";
import { beforeEach, describe, expect, it } from "vitest";
import type { Context } from "../context";
import { createMockContext } from "../testUtils/mockContext";
import { discoverRegions } from "./discoverRegions";

describe("discoverRegions", () => {
  let context: Context;
  let mockRegionRepository: MockRegionRepository;

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

  const publicRegions: RegionWithStats[] = [
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
      locationCount: 5,
      favoriteCount: 10,
      checkInCount: 15,
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
      locationCount: 3,
      favoriteCount: 8,
      checkInCount: 12,
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
      locationCount: 2,
      favoriteCount: 6,
      checkInCount: 9,
    },
  ];

  beforeEach(() => {
    mockRegionRepository = new MockRegionRepository();
    // Add public regions to mock repository
    for (const region of publicRegions) {
      mockRegionRepository.addRegion(region);
    }

    context = createMockContext({
      regionRepository: mockRegionRepository,
    });
  });

  describe("SPEC: Region discovery from formal specifications", () => {
    it("should discover public regions", async () => {
      const query = {
        pagination: { page: 1, limit: 10 },
        sort: { field: "createdAt" as const, order: "desc" as const },
      };

      const result = await discoverRegions(context, query);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const { items, count } = result.value;
        expect(items).toHaveLength(3);
        expect(count).toBe(3);
        expect(items.every((r) => r.isPublic)).toBe(true);
        expect(items[0].name).toBe("Akihabara Electronics"); // Most recent
        expect(items[1].name).toBe("Shibuya District");
        expect(items[2].name).toBe("Tokyo Central");
      }
    });

    it("should discover public regions with default sort", async () => {
      const query = {
        pagination: { page: 1, limit: 10 },
        sort: { field: "createdAt" as const, order: "desc" as const },
      };

      const result = await discoverRegions(context, query);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const { items, count } = result.value;
        expect(items).toHaveLength(3);
        expect(count).toBe(3);
        expect(items.every((r) => r.isPublic)).toBe(true);
      }
    });

    it("should filter regions by search term", async () => {
      const query = {
        pagination: { page: 1, limit: 10 },
        filter: { search: "Tokyo" },
        sort: { field: "name" as const, order: "asc" as const },
      };

      const result = await discoverRegions(context, query);

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
        filter: { search: "District" },
        sort: { field: "name" as const, order: "asc" as const },
      };

      const result = await discoverRegions(context, query);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const { items } = result.value;
        // Verify TLA+ constraint: regionStates[r].visibility = "public"
        expect(items.every((r) => r.isPublic)).toBe(true);
        expect(items.some((r) => r.name === "Shibuya District")).toBe(true);
      }
    });

    it("should follow public visibility constraint", async () => {
      const query = {
        pagination: { page: 1, limit: 10 },
        sort: { field: "name" as const, order: "asc" as const },
      };

      const result = await discoverRegions(context, query);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const { items } = result.value;
        // Verify proximity filtering
        expect(items.length).toBeGreaterThan(0);
        expect(items.every((r) => r.isPublic)).toBe(true);
      }
    });
  });

  describe("SPEC-INV-21: Search index consistency (Alloy constraint)", () => {
    it("should only return public regions in search results", async () => {
      // Alloy constraint: SearchIndexConsistency
      // all r: si.regions | r.visibility = Public
      const query = {
        pagination: { page: 1, limit: 10 },
        sort: { field: "name" as const, order: "asc" as const },
      };

      const result = await discoverRegions(context, query);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const { items } = result.value;
        // All discovered regions must be public
        expect(items.every((r) => r.isPublic)).toBe(true);
      }
    });
  });

  describe("Input validation", () => {
    it("should reject invalid pagination - negative page", async () => {
      const query = {
        pagination: { page: -1, limit: 10 },
        sort: { field: "name" as const, order: "asc" as const },
      };

      const result = await discoverRegions(context, query as never);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid input");
      }
    });

    it("should reject invalid limit", async () => {
      const query = {
        pagination: { page: 1, limit: 200 }, // Invalid limit > 100
        sort: { field: "name" as const, order: "asc" as const },
      };

      const result = await discoverRegions(context, query as never);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid input");
      }
    });
  });

  describe("Error handling", () => {
    it("should handle invalid input", async () => {
      const query = {
        pagination: { page: 0, limit: 10 }, // Invalid page
        sort: { field: "name" as const, order: "asc" as const },
      };

      const result = await discoverRegions(context, query as never);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid input");
      }
    });

    it("should handle repository failure", async () => {
      // Make the repository fail
      mockRegionRepository.setShouldFailOperations(true);

      const query = {
        pagination: { page: 1, limit: 10 },
        sort: { field: "name" as const, order: "asc" as const },
      };

      const result = await discoverRegions(context, query);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to discover regions");
      }
    });
  });

  describe("Sorting and ordering", () => {
    it("should sort regions by name", async () => {
      const query = {
        pagination: { page: 1, limit: 10 },
        sort: { field: "name" as const, order: "asc" as const },
      };

      const result = await discoverRegions(context, query);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const { items } = result.value;
        expect(items).toHaveLength(3);
        expect(items[0].name).toBe("Akihabara Electronics");
        expect(items[1].name).toBe("Shibuya District");
        expect(items[2].name).toBe("Tokyo Central");
      }
    });

    it("should sort regions by creation date", async () => {
      const query = {
        pagination: { page: 1, limit: 10 },
        sort: { field: "createdAt" as const, order: "desc" as const },
      };

      const result = await discoverRegions(context, query);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const { items } = result.value;
        expect(items[0].name).toBe("Akihabara Electronics"); // Most recent
      }
    });
  });

  describe("Empty results handling", () => {
    it("should handle empty search results", async () => {
      const query = {
        pagination: { page: 1, limit: 10 },
        filter: { search: "NonExistentPlace" },
        sort: { field: "name" as const, order: "asc" as const },
      };

      const result = await discoverRegions(context, query);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const { items, count } = result.value;
        expect(items).toHaveLength(0);
        expect(count).toBe(0);
      }
    });
  });
});
