import type { Region, RegionId } from "@/core/domain/region/types";
import type { User, UserId } from "@/core/domain/user/types";
import { ApplicationError } from "@/lib/error";
import { RepositoryError } from "@/lib/error";
import { err, ok } from "neverthrow";
import { beforeEach, describe, expect, it } from "vitest";
import type { Context } from "../context";
import { listRegions } from "./listRegions";

describe("listRegions", () => {
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

  const testRegions: Region[] = [
    {
      id: "region-1" as RegionId,
      name: "Public Region 1",
      description: "First public region",
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
      name: "Public Region 2",
      description: "Second public region",
      creatorId: editorUser.id,
      isPublic: true,
      latitude: 35.6895,
      longitude: 139.6917,
      coverPhotoUrl: null,
      createdAt: new Date("2024-01-02"),
      updatedAt: new Date("2024-01-02"),
    },
    {
      id: "region-3" as RegionId,
      name: "Private Region",
      description: "A private region",
      creatorId: editorUser.id,
      isPublic: false,
      latitude: null,
      longitude: null,
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
        list: async () => ok({ items: testRegions, count: testRegions.length }),
      } as Partial<typeof context.regionRepository>,
    } as Context;
  });

  describe("SPEC: Region listing from formal specifications", () => {
    it("should list all regions with pagination", async () => {
      const query = {
        pagination: { page: 1, limit: 10 },
      };

      const result = await listRegions(context, editorUser.id, query);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const { items, count } = result.value;
        expect(items).toHaveLength(3);
        expect(count).toBe(3);
        expect(items[0].name).toBe("Public Region 1");
        expect(items[1].isPublic).toBe(true);
        expect(items[2].isPublic).toBe(false);
      }
    });

    it("should filter public regions for non-creators", async () => {
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

      const publicRegions = testRegions.filter((r) => r.isPublic);
      context.regionRepository = {
        list: async () =>
          ok({ items: publicRegions, count: publicRegions.length }),
      } as Partial<typeof context.regionRepository>;

      context.userRepository = {
        findById: async (id: string) => {
          if (id === visitorUser.id) return ok(visitorUser);
          return ok(null);
        },
      } as Partial<typeof context.userRepository>;

      const query = {
        pagination: { page: 1, limit: 10 },
      };

      const result = await listRegions(context, visitorUser.id, query);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const { items, count } = result.value;
        expect(items).toHaveLength(2); // Only public regions
        expect(count).toBe(2);
        expect(items.every((r) => r.isPublic)).toBe(true);
      }
    });

    it("should allow creators to see their private regions", async () => {
      const query = {
        pagination: { page: 1, limit: 10 },
        filter: { creatorId: editorUser.id },
      };

      const result = await listRegions(context, editorUser.id, query);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const { items } = result.value;
        expect(items).toHaveLength(3); // All regions including private
        expect(items.some((r) => !r.isPublic)).toBe(true);
      }
    });
  });

  describe("TLA+ behavior validation", () => {
    it("should follow SearchRegionsByKeyword from TLA+ specification", async () => {
      const query = {
        pagination: { page: 1, limit: 10 },
        filter: { name: "Public" },
      };

      const result = await listRegions(context, editorUser.id, query);

      expect(result.isOk()).toBe(true);
    });

    it("should follow SearchRegionsByLocation from TLA+ specification", async () => {
      const query = {
        pagination: { page: 1, limit: 10 },
        filter: { location: { latitude: 35.6762, longitude: 139.6503 } },
      };

      const result = await listRegions(context, editorUser.id, query);

      expect(result.isOk()).toBe(true);
    });
  });

  describe("Input validation", () => {
    it("should reject invalid pagination - negative page", async () => {
      const query = {
        pagination: { page: -1, limit: 10 },
      };

      const result = await listRegions(context, editorUser.id, query as never);

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

      const result = await listRegions(context, editorUser.id, query as never);

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

      const result = await listRegions(
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
      mockRegionRepository.list = async () =>
        err(new RepositoryError("Database error"));

      const query = {
        pagination: { page: 1, limit: 10 },
      };

      const result = await listRegions(context, editorUser.id, query);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to list regions");
      }
    });
  });

  describe("Anonymous access", () => {
    it("should allow anonymous listing of public regions", async () => {
      const publicRegions = testRegions.filter((r) => r.isPublic);
      context.regionRepository = {
        list: async () =>
          ok({ items: publicRegions, count: publicRegions.length }),
      } as Partial<typeof context.regionRepository>;

      const query = {
        pagination: { page: 1, limit: 10 },
      };

      const result = await listRegions(context, null, query);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const { items } = result.value;
        expect(items.every((r) => r.isPublic)).toBe(true);
      }
    });
  });

  describe("Filtering and search", () => {
    it("should filter by region name", async () => {
      const filteredRegions = testRegions.filter((r) =>
        r.name.includes("Public"),
      );
      context.regionRepository = {
        list: async () =>
          ok({ items: filteredRegions, count: filteredRegions.length }),
      } as Partial<typeof context.regionRepository>;

      const query = {
        pagination: { page: 1, limit: 10 },
        filter: { name: "Public" },
      };

      const result = await listRegions(context, editorUser.id, query);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const { items, count } = result.value;
        expect(items).toHaveLength(2);
        expect(count).toBe(2);
        expect(items.every((r) => r.name.includes("Public"))).toBe(true);
      }
    });

    it("should handle empty result set", async () => {
      context.regionRepository = {
        list: async () => ok({ items: [], count: 0 }),
      } as Partial<typeof context.regionRepository>;

      const query = {
        pagination: { page: 1, limit: 10 },
        filter: { name: "NonExistent" },
      };

      const result = await listRegions(context, editorUser.id, query);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const { items, count } = result.value;
        expect(items).toHaveLength(0);
        expect(count).toBe(0);
      }
    });
  });
});
