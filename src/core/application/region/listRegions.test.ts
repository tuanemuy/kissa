import { MockRegionRepository } from "@/core/adapters/mock/regionRepository";
import type { Region, RegionId } from "@/core/domain/region/types";
import type { User, UserId } from "@/core/domain/user/types";
import { ApplicationError } from "@/lib/error";
import { ok } from "neverthrow";
import { beforeEach, describe, expect, it } from "vitest";
import type { Context } from "../context";
import { createMockContext } from "../testUtils/mockContext";
import { listRegions } from "./listRegions";

describe("listRegions", () => {
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

  const testRegions: Region[] = [
    {
      id: "region-1" as RegionId,
      name: "Tokyo Central",
      description: "Central Tokyo area",
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
      description: "Shopping district",
      creatorId: editorUser.id,
      isPublic: false,
      latitude: 35.6598,
      longitude: 139.7006,
      coverPhotoUrl: null,
      createdAt: new Date("2024-01-02"),
      updatedAt: new Date("2024-01-02"),
    },
    {
      id: "region-3" as RegionId,
      name: "Akihabara Electronics",
      description: "Electronics district",
      creatorId: "other-user" as UserId,
      isPublic: true,
      latitude: 35.7022,
      longitude: 139.7744,
      coverPhotoUrl: null,
      createdAt: new Date("2024-01-03"),
      updatedAt: new Date("2024-01-03"),
    },
  ];

  beforeEach(() => {
    mockRegionRepository = new MockRegionRepository();

    // Add test regions
    for (const region of testRegions) {
      mockRegionRepository.addRegion(region);
    }

    context = createMockContext({
      regionRepository: mockRegionRepository,
    });
  });

  describe("Basic listing functionality", () => {
    it("should list all regions with pagination", async () => {
      const input = {
        pagination: { page: 1, limit: 10 },
      };

      const result = await listRegions(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const { items, count } = result.value;
        expect(items).toHaveLength(3);
        expect(count).toBe(3);
        expect(items.every((r) => typeof r.id === "string")).toBe(true);
      }
    });

    it("should respect pagination limits", async () => {
      const input = {
        pagination: { page: 1, limit: 2 },
      };

      const result = await listRegions(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const { items, count } = result.value;
        expect(items).toHaveLength(2);
        expect(count).toBe(3); // Total count should still be 3
      }
    });

    it("should handle pagination with second page", async () => {
      const input = {
        pagination: { page: 2, limit: 2 },
      };

      const result = await listRegions(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const { items, count } = result.value;
        expect(items).toHaveLength(1);
        expect(count).toBe(3);
      }
    });
  });

  describe("Filtering", () => {
    it("should filter by creator ID", async () => {
      const input = {
        pagination: { page: 1, limit: 10 },
        filter: { creatorId: editorUser.id },
      };

      const result = await listRegions(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const { items, count } = result.value;
        expect(items).toHaveLength(2); // Tokyo Central and Shibuya District
        expect(count).toBe(2);
        expect(items.every((r) => r.creatorId === editorUser.id)).toBe(true);
      }
    });

    it("should filter by public visibility", async () => {
      const input = {
        pagination: { page: 1, limit: 10 },
        filter: { isPublic: true },
      };

      const result = await listRegions(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const { items, count } = result.value;
        expect(items).toHaveLength(2); // Tokyo Central and Akihabara Electronics
        expect(count).toBe(2);
        expect(items.every((r) => r.isPublic === true)).toBe(true);
      }
    });

    it("should filter by private visibility", async () => {
      const input = {
        pagination: { page: 1, limit: 10 },
        filter: { isPublic: false },
      };

      const result = await listRegions(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const { items, count } = result.value;
        expect(items).toHaveLength(1); // Shibuya District
        expect(count).toBe(1);
        expect(items.every((r) => r.isPublic === false)).toBe(true);
      }
    });

    it("should filter by search term", async () => {
      const input = {
        pagination: { page: 1, limit: 10 },
        filter: { search: "Tokyo" },
      };

      const result = await listRegions(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const { items, count } = result.value;
        expect(items).toHaveLength(1); // Tokyo Central
        expect(count).toBe(1);
        expect(items[0].name).toBe("Tokyo Central");
      }
    });

    it("should filter by search term in description", async () => {
      const input = {
        pagination: { page: 1, limit: 10 },
        filter: { search: "Electronics" },
      };

      const result = await listRegions(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const { items, count } = result.value;
        expect(items).toHaveLength(1); // Akihabara Electronics
        expect(count).toBe(1);
        expect(items[0].name).toBe("Akihabara Electronics");
      }
    });

    it("should combine multiple filters", async () => {
      const input = {
        pagination: { page: 1, limit: 10 },
        filter: {
          creatorId: editorUser.id,
          isPublic: true,
        },
      };

      const result = await listRegions(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const { items, count } = result.value;
        expect(items).toHaveLength(1); // Only Tokyo Central
        expect(count).toBe(1);
        expect(items[0].name).toBe("Tokyo Central");
        expect(items[0].creatorId).toBe(editorUser.id);
        expect(items[0].isPublic).toBe(true);
      }
    });
  });

  describe("Sorting", () => {
    it("should sort by name ascending", async () => {
      const input = {
        pagination: { page: 1, limit: 10 },
        sort: { field: "name" as const, order: "asc" as const },
      };

      const result = await listRegions(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const { items } = result.value;
        expect(items[0].name).toBe("Akihabara Electronics");
        expect(items[1].name).toBe("Shibuya District");
        expect(items[2].name).toBe("Tokyo Central");
      }
    });

    it("should sort by name descending", async () => {
      const input = {
        pagination: { page: 1, limit: 10 },
        sort: { field: "name" as const, order: "desc" as const },
      };

      const result = await listRegions(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const { items } = result.value;
        expect(items[0].name).toBe("Tokyo Central");
        expect(items[1].name).toBe("Shibuya District");
        expect(items[2].name).toBe("Akihabara Electronics");
      }
    });

    it("should sort by creation date descending", async () => {
      const input = {
        pagination: { page: 1, limit: 10 },
        sort: { field: "createdAt" as const, order: "desc" as const },
      };

      const result = await listRegions(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const { items } = result.value;
        expect(items[0].name).toBe("Akihabara Electronics"); // Most recent
        expect(items[1].name).toBe("Shibuya District");
        expect(items[2].name).toBe("Tokyo Central");
      }
    });
  });

  describe("Input validation", () => {
    it("should reject invalid pagination - negative page", async () => {
      const input = {
        pagination: { page: -1, limit: 10 },
      };

      const result = await listRegions(context, input as never);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid input");
      }
    });

    it("should reject invalid pagination - zero page", async () => {
      const input = {
        pagination: { page: 0, limit: 10 },
      };

      const result = await listRegions(context, input as never);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid input");
      }
    });

    it("should reject invalid pagination - excessive limit", async () => {
      const input = {
        pagination: { page: 1, limit: 200 },
      };

      const result = await listRegions(context, input as never);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid input");
      }
    });
  });

  describe("Error handling", () => {
    it("should handle repository failure", async () => {
      mockRegionRepository.setShouldFailOperations(true);

      const input = {
        pagination: { page: 1, limit: 10 },
      };

      const result = await listRegions(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to list regions");
      }
    });
  });

  describe("Empty results", () => {
    it("should handle empty results", async () => {
      mockRegionRepository.clear();

      const input = {
        pagination: { page: 1, limit: 10 },
      };

      const result = await listRegions(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const { items, count } = result.value;
        expect(items).toHaveLength(0);
        expect(count).toBe(0);
      }
    });

    it("should handle no matches for search", async () => {
      const input = {
        pagination: { page: 1, limit: 10 },
        filter: { search: "NonExistentPlace" },
      };

      const result = await listRegions(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const { items, count } = result.value;
        expect(items).toHaveLength(0);
        expect(count).toBe(0);
      }
    });
  });
});
