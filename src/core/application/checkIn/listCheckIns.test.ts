import type {
  CheckIn,
  CheckInId,
  CheckInWithLocation,
  CheckInWithUser,
  ListCheckInsQuery,
} from "@/core/domain/checkIn/types";
import type { LocationId } from "@/core/domain/location/types";
import type { UserId } from "@/core/domain/user/types";
import { ApplicationError } from "@/lib/error";
import { RepositoryError } from "@/lib/error";
import { err, ok } from "neverthrow";
import { beforeEach, describe, expect, it } from "vitest";
import type { Context } from "../context";
import {
  listCheckIns,
  listCheckInsWithLocation,
  listCheckInsWithUser,
} from "./listCheckIns";

describe("listCheckIns", () => {
  let context: Context;

  const userId1: UserId = "user-1" as UserId;
  const userId2: UserId = "user-2" as UserId;
  const locationId1: LocationId = "location-1" as LocationId;
  const locationId2: LocationId = "location-2" as LocationId;

  const checkIn1: CheckIn = {
    id: "checkin-1" as CheckInId,
    userId: userId1,
    locationId: locationId1,
    comment: "Great place!",
    rating: 5,
    photoUrls: ["https://example.com/photo1.jpg"],
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  };

  const checkIn2: CheckIn = {
    id: "checkin-2" as CheckInId,
    userId: userId2,
    locationId: locationId2,
    comment: "Nice location",
    rating: 4,
    photoUrls: [],
    createdAt: new Date("2024-01-02"),
    updatedAt: new Date("2024-01-02"),
  };

  const mockCheckIns = [checkIn1, checkIn2];

  beforeEach(() => {
    context = {
      checkInRepository: {
        list: async (query: ListCheckInsQuery) => {
          let items = [...mockCheckIns];

          // Apply filters
          if (query.filter?.userId) {
            items = items.filter(
              (item) => item.userId === query.filter?.userId,
            );
          }
          if (query.filter?.locationId) {
            items = items.filter(
              (item) => item.locationId === query.filter?.locationId,
            );
          }
          if (query.filter?.hasPhoto !== undefined) {
            items = items.filter((item) =>
              query.filter?.hasPhoto
                ? item.photoUrls.length > 0
                : item.photoUrls.length === 0,
            );
          }
          if (query.filter?.minRating) {
            items = items.filter(
              (item) => item.rating >= (query.filter?.minRating || 0),
            );
          }

          // Apply pagination
          const offset = (query.pagination.page - 1) * query.pagination.limit;
          const paginatedItems = items.slice(
            offset,
            offset + query.pagination.limit,
          );

          return ok({ items: paginatedItems, count: items.length });
        },
        listWithUser: async () =>
          ok({ items: [] as CheckInWithUser[], count: 0 }),
        listWithLocation: async () =>
          ok({ items: [] as CheckInWithLocation[], count: 0 }),
        // biome-ignore lint/suspicious/noExplicitAny: Mock context setup requires type assertion
      } as any,
    } as Context;
  });

  describe("Basic listing functionality", () => {
    it("should list check-ins with pagination", async () => {
      const input = {
        pagination: { page: 1, limit: 10 },
      };

      const result = await listCheckIns(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.items).toHaveLength(2);
        expect(result.value.count).toBe(2);
        expect(result.value.items[0]).toEqual(checkIn1);
        expect(result.value.items[1]).toEqual(checkIn2);
      }
    });

    it("should handle pagination correctly", async () => {
      const input = {
        pagination: { page: 1, limit: 1 },
      };

      const result = await listCheckIns(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.items).toHaveLength(1);
        expect(result.value.count).toBe(2); // Total count
        expect(result.value.items[0]).toEqual(checkIn1);
      }
    });
  });

  describe("Filtering functionality", () => {
    it("should filter by userId", async () => {
      const input = {
        pagination: { page: 1, limit: 10 },
        filter: { userId: userId1 },
      };

      const result = await listCheckIns(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.items).toHaveLength(1);
        expect(result.value.items[0].userId).toBe(userId1);
      }
    });

    it("should filter by locationId", async () => {
      const input = {
        pagination: { page: 1, limit: 10 },
        filter: { locationId: locationId2 },
      };

      const result = await listCheckIns(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.items).toHaveLength(1);
        expect(result.value.items[0].locationId).toBe(locationId2);
      }
    });

    it("should filter by hasPhoto", async () => {
      const input = {
        pagination: { page: 1, limit: 10 },
        filter: { hasPhoto: true },
      };

      const result = await listCheckIns(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.items).toHaveLength(1);
        expect(result.value.items[0].photoUrls.length).toBeGreaterThan(0);
      }
    });

    it("should filter by minRating", async () => {
      const input = {
        pagination: { page: 1, limit: 10 },
        filter: { minRating: 5 },
      };

      const result = await listCheckIns(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.items).toHaveLength(1);
        expect(result.value.items[0].rating).toBe(5);
      }
    });

    it("should handle multiple filters", async () => {
      const input = {
        pagination: { page: 1, limit: 10 },
        filter: {
          userId: userId1,
          hasPhoto: true,
          minRating: 5,
        },
      };

      const result = await listCheckIns(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.items).toHaveLength(1);
        expect(result.value.items[0].userId).toBe(userId1);
        expect(result.value.items[0].photoUrls.length).toBeGreaterThan(0);
        expect(result.value.items[0].rating).toBe(5);
      }
    });
  });

  describe("Sorting functionality", () => {
    it("should accept sort parameters", async () => {
      const input = {
        pagination: { page: 1, limit: 10 },
        sort: { field: "createdAt" as const, order: "desc" as const },
      };

      const result = await listCheckIns(context, input);

      expect(result.isOk()).toBe(true);
    });

    it("should accept rating sort", async () => {
      const input = {
        pagination: { page: 1, limit: 10 },
        sort: { field: "rating" as const, order: "asc" as const },
      };

      const result = await listCheckIns(context, input);

      expect(result.isOk()).toBe(true);
    });
  });

  describe("Input validation", () => {
    it("should reject invalid pagination - negative page", async () => {
      const input = {
        pagination: { page: -1, limit: 10 },
      };

      const result = await listCheckIns(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid input");
      }
    });

    it("should reject invalid pagination - limit too high", async () => {
      const input = {
        pagination: { page: 1, limit: 200 }, // > 100
      };

      const result = await listCheckIns(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid input");
      }
    });

    it("should reject invalid filter - invalid UUID", async () => {
      const input = {
        pagination: { page: 1, limit: 10 },
        filter: { userId: "invalid-uuid" },
      };

      const result = await listCheckIns(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid input");
      }
    });

    it("should reject invalid rating range", async () => {
      const input = {
        pagination: { page: 1, limit: 10 },
        filter: { minRating: 6 }, // > 5
      };

      const result = await listCheckIns(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid input");
      }
    });
  });

  describe("Error handling", () => {
    it("should handle repository failure", async () => {
      context.checkInRepository = {
        ...context.checkInRepository,
        list: async () => err(new RepositoryError("List failed")),
        // biome-ignore lint/suspicious/noExplicitAny: Mock context setup requires type assertion
      } as any;

      const input = {
        pagination: { page: 1, limit: 10 },
      };

      const result = await listCheckIns(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to list check-ins");
      }
    });
  });

  describe("listCheckInsWithUser", () => {
    it("should list check-ins with user data", async () => {
      const input = {
        pagination: { page: 1, limit: 10 },
      };

      const result = await listCheckInsWithUser(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.items).toEqual([]);
        expect(result.value.count).toBe(0);
      }
    });

    it("should handle repository failure", async () => {
      context.checkInRepository = {
        ...context.checkInRepository,
        listWithUser: async () =>
          err(new RepositoryError("List with user failed")),
        // biome-ignore lint/suspicious/noExplicitAny: Mock context setup requires type assertion
      } as any;

      const input = {
        pagination: { page: 1, limit: 10 },
      };

      const result = await listCheckInsWithUser(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to list check-ins with user");
      }
    });
  });

  describe("listCheckInsWithLocation", () => {
    it("should list check-ins with location data", async () => {
      const input = {
        pagination: { page: 1, limit: 10 },
      };

      const result = await listCheckInsWithLocation(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.items).toEqual([]);
        expect(result.value.count).toBe(0);
      }
    });

    it("should handle repository failure", async () => {
      context.checkInRepository = {
        ...context.checkInRepository,
        listWithLocation: async () =>
          err(new RepositoryError("List with location failed")),
        // biome-ignore lint/suspicious/noExplicitAny: Mock context setup requires type assertion
      } as any;

      const input = {
        pagination: { page: 1, limit: 10 },
      };

      const result = await listCheckInsWithLocation(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe(
          "Failed to list check-ins with location",
        );
      }
    });
  });

  describe("Business logic validation", () => {
    it("should return empty results for non-existent filters", async () => {
      const input = {
        pagination: { page: 1, limit: 10 },
        filter: { userId: "non-existent-user" as UserId },
      };

      const result = await listCheckIns(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.items).toHaveLength(0);
        expect(result.value.count).toBe(0);
      }
    });

    it("should handle page beyond available data", async () => {
      const input = {
        pagination: { page: 10, limit: 10 }, // Way beyond available data
      };

      const result = await listCheckIns(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.items).toHaveLength(0);
        expect(result.value.count).toBe(2); // Total count still correct
      }
    });
  });
});
