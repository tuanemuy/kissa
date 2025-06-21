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
import { MockCheckInRepository } from "../../adapters/mock/checkInRepository";
import type { Context } from "../context";
import {
  listCheckIns,
  listCheckInsWithLocation,
  listCheckInsWithUser,
} from "./listCheckIns";

describe("listCheckIns", () => {
  let context: Context;

  const userId1: UserId = "12345678-1234-4123-8123-123456789012" as UserId;
  const userId2: UserId = "12345678-1234-4123-8123-123456789013" as UserId;
  const locationId1: LocationId =
    "12345678-1234-4123-8123-123456789015" as LocationId;
  const locationId2: LocationId =
    "12345678-1234-4123-8123-123456789016" as LocationId;

  const checkIn1: CheckIn = {
    id: "12345678-1234-4123-8123-123456789020" as CheckInId,
    userId: userId1,
    locationId: locationId1,
    comment: "Great place!",
    rating: 5,
    photoUrl: "https://example.com/photo1.jpg",
    isPublic: true,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  };

  const checkIn2: CheckIn = {
    id: "12345678-1234-4123-8123-123456789021" as CheckInId,
    userId: userId2,
    locationId: locationId2,
    comment: "Nice location",
    rating: 4,
    photoUrl: null,
    isPublic: true,
    createdAt: new Date("2024-01-02"),
    updatedAt: new Date("2024-01-02"),
  };

  const mockCheckIns = [checkIn1, checkIn2];

  beforeEach(() => {
    const mockCheckInRepository = new MockCheckInRepository();

    // Setup test data
    mockCheckInRepository.addCheckIn(checkIn1);
    mockCheckInRepository.addCheckIn(checkIn2);

    context = {
      checkInRepository: mockCheckInRepository,
      // Add minimal required services to satisfy Context interface
      // biome-ignore lint/suspicious/noExplicitAny: Mock context service for testing
      userRepository: {} as any,
      // biome-ignore lint/suspicious/noExplicitAny: Mock context service for testing
      passwordHasher: {} as any,
      // biome-ignore lint/suspicious/noExplicitAny: Mock context service for testing
      authService: {} as any,
      // biome-ignore lint/suspicious/noExplicitAny: Mock context service for testing
      regionRepository: {} as any,
      // biome-ignore lint/suspicious/noExplicitAny: Mock context service for testing
      locationRepository: {} as any,
      // biome-ignore lint/suspicious/noExplicitAny: Mock context service for testing
      favoriteRepository: {} as any,
      // biome-ignore lint/suspicious/noExplicitAny: Mock context service for testing
      fileUploadRepository: {} as any,
      // biome-ignore lint/suspicious/noExplicitAny: Mock context service for testing
      moderationRepository: {} as any,
      // biome-ignore lint/suspicious/noExplicitAny: Mock context service for testing
      notificationRepository: {} as any,
      // biome-ignore lint/suspicious/noExplicitAny: Mock context service for testing
      notificationService: {} as any,
      // biome-ignore lint/suspicious/noExplicitAny: Mock context service for testing
      pushNotificationService: {} as any,
      // biome-ignore lint/suspicious/noExplicitAny: Mock context service for testing
      billingRepository: {} as any,
      // biome-ignore lint/suspicious/noExplicitAny: Mock context service for testing
      paymentGateway: {} as any,
      // biome-ignore lint/suspicious/noExplicitAny: Mock context service for testing
      mapsService: {} as any,
      // biome-ignore lint/suspicious/noExplicitAny: Mock context service for testing
      fileStorageService: {} as any,
      // biome-ignore lint/suspicious/noExplicitAny: Mock context service for testing
      metricsCollector: {} as any,
      // biome-ignore lint/suspicious/noExplicitAny: Mock context service for testing
      alertManager: {} as any,
      // biome-ignore lint/suspicious/noExplicitAny: Mock context service for testing
      backupService: {} as any,
      // biome-ignore lint/suspicious/noExplicitAny: Mock context service for testing
      privacyService: {} as any,
    } satisfies Context;
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
        expect(result.value.items[0].photoUrl).not.toBeNull();
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
        expect(result.value.items[0].photoUrl).not.toBeNull();
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
      const mockRepository = context.checkInRepository as MockCheckInRepository;
      mockRepository.setShouldFailOperations(true);

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
        expect(result.value.items).toHaveLength(2);
        expect(result.value.count).toBe(2);
        expect(result.value.items[0]).toHaveProperty("user");
        expect(result.value.items[0].user.name).toBe("Mock User");
      }
    });

    it("should handle repository failure", async () => {
      const mockRepository = context.checkInRepository as MockCheckInRepository;
      mockRepository.setShouldFailOperations(true);

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
        expect(result.value.items).toHaveLength(2);
        expect(result.value.count).toBe(2);
        expect(result.value.items[0]).toHaveProperty("location");
        expect(result.value.items[0].location.name).toBe("Mock Location");
      }
    });

    it("should handle repository failure", async () => {
      const mockRepository = context.checkInRepository as MockCheckInRepository;
      mockRepository.setShouldFailOperations(true);

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
        filter: { userId: "87654321-1234-4123-8321-210987654321" as UserId }, // Valid UUID but non-existent user
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
