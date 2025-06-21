import type {
  CheckIn,
  CheckInId,
  UpdateCheckInParams,
} from "@/core/domain/checkIn/types";
import type { LocationId } from "@/core/domain/location/types";
import type { UserId } from "@/core/domain/user/types";
import { ApplicationError, RepositoryError } from "@/lib/error";
import { err, ok } from "neverthrow";
import { beforeEach, describe, expect, it } from "vitest";
import { MockCheckInRepository } from "../../adapters/mock/checkInRepository";
import type { Context } from "../context";
import { updateCheckIn } from "./updateCheckIn";

describe("updateCheckIn", () => {
  let context: Context;

  const userId: UserId = "12345678-1234-4123-8123-123456789012" as UserId;
  const otherUserId: UserId = "12345678-1234-4123-8123-123456789013" as UserId;
  const locationId: LocationId =
    "12345678-1234-4123-8123-123456789015" as LocationId;

  const testCheckIn: CheckIn = {
    id: "12345678-1234-4123-8123-123456789020" as CheckInId,
    userId,
    locationId,
    comment: "Great place!",
    rating: 5,
    photoUrl: null,
    isPublic: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const updatedCheckIn: CheckIn = {
    ...testCheckIn,
    comment: "Updated comment",
    rating: 4,
    updatedAt: new Date(),
  };

  beforeEach(() => {
    const mockCheckInRepository = new MockCheckInRepository();
    mockCheckInRepository.addCheckIn(testCheckIn);

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

  describe("SPEC-INV-5: CheckIn ownership validation (Alloy constraint)", () => {
    it("should allow check-in creator to update check-in", async () => {
      const input = {
        id: testCheckIn.id,
        userId: testCheckIn.userId,
        comment: "Updated comment",
        rating: 4,
      };

      const result = await updateCheckIn(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.comment).toBe("Updated comment");
        expect(result.value.rating).toBe(4);
      }
    });

    it("should reject update by non-owner", async () => {
      const input = {
        id: testCheckIn.id,
        userId: otherUserId,
        comment: "Unauthorized update",
      };

      const result = await updateCheckIn(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe(
          "Unauthorized to update this check-in",
        );
      }
    });
  });

  describe("TLA+ behavior validation", () => {
    it("should follow UpdateCheckIn action from TLA+ specification", async () => {
      // TLA+ UpdateCheckIn action: UpdateCheckIn(userId, checkInId, newComment, newRating)
      const input = {
        id: testCheckIn.id,
        userId: testCheckIn.userId,
        comment: "TLA+ Updated",
        rating: 3,
      };

      const result = await updateCheckIn(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // Verify state changes match TLA+ model
        expect(result.value.id).toBe(testCheckIn.id);
        expect(result.value.userId).toBe(testCheckIn.userId);
      }
    });
  });

  describe("Input validation", () => {
    it("should reject invalid input - invalid UUID for id", async () => {
      const input = {
        id: "invalid-uuid",
        userId: testCheckIn.userId,
        comment: "Valid comment",
      };

      const result = await updateCheckIn(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid check-in input");
      }
    });

    it("should reject invalid rating - out of range", async () => {
      const input = {
        id: testCheckIn.id,
        userId: testCheckIn.userId,
        rating: 6, // Invalid: > 5
      };

      const result = await updateCheckIn(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid check-in input");
      }
    });

    it("should reject invalid comment - too long", async () => {
      const input = {
        id: testCheckIn.id,
        userId: testCheckIn.userId,
        comment: "x".repeat(501), // Invalid: > 500 characters
      };

      const result = await updateCheckIn(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid check-in input");
      }
    });

    it("should accept partial updates", async () => {
      const input = {
        id: testCheckIn.id,
        userId: testCheckIn.userId,
        rating: 3, // Only updating rating
      };

      const result = await updateCheckIn(context, input);

      expect(result.isOk()).toBe(true);
    });
  });

  describe("Error handling", () => {
    it("should handle check-in not found", async () => {
      const input = {
        id: "87654321-1234-4123-8321-210987654321" as CheckInId, // Valid UUID but non-existent check-in
        userId: testCheckIn.userId,
        comment: "Update attempt",
      };

      const result = await updateCheckIn(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Check-in not found");
      }
    });

    it("should handle repository findById failure", async () => {
      const mockRepository = context.checkInRepository as MockCheckInRepository;
      mockRepository.setShouldFailOperations(true);

      const input = {
        id: testCheckIn.id,
        userId: testCheckIn.userId,
        comment: "Update attempt",
      };

      const result = await updateCheckIn(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to find check-in");
      }
    });

    it("should handle repository update failure", async () => {
      // First, let the findById succeed, then make update fail
      const mockRepository = new MockCheckInRepository();
      mockRepository.addCheckIn(testCheckIn);

      // Override the update method to fail
      const originalUpdate = mockRepository.update.bind(mockRepository);
      mockRepository.update = async () => {
        return err(new RepositoryError("Update failed"));
      };

      context.checkInRepository = mockRepository;

      const input = {
        id: testCheckIn.id,
        userId: testCheckIn.userId,
        comment: "Update attempt",
      };

      const result = await updateCheckIn(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to update check-in");
      }
    });
  });

  describe("Business logic validation", () => {
    it("should enforce proper update workflow", async () => {
      // Verify complete update process
      let findCalled = false;
      let updateCalled = false;

      const mockRepository = new MockCheckInRepository();
      mockRepository.addCheckIn(testCheckIn);

      const originalFindById = mockRepository.findById.bind(mockRepository);
      const originalUpdate = mockRepository.update.bind(mockRepository);

      mockRepository.findById = async (id: CheckInId) => {
        findCalled = true;
        return originalFindById(id);
      };

      mockRepository.update = async (params: UpdateCheckInParams) => {
        updateCalled = true;
        return originalUpdate(params);
      };

      context.checkInRepository = mockRepository;

      const input = {
        id: testCheckIn.id,
        userId: testCheckIn.userId,
        comment: "Updated comment",
      };

      const result = await updateCheckIn(context, input);

      expect(result.isOk()).toBe(true);
      expect(findCalled).toBe(true);
      expect(updateCalled).toBe(true);
    });

    it("should preserve required fields during update", async () => {
      const input = {
        id: testCheckIn.id,
        userId: testCheckIn.userId,
        comment: "New comment only",
      };

      const result = await updateCheckIn(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // Verify that core fields are preserved
        expect(result.value.id).toBe(testCheckIn.id);
        expect(result.value.userId).toBe(testCheckIn.userId);
        expect(result.value.locationId).toBe(testCheckIn.locationId);
      }
    });

    it("should handle nullable field updates", async () => {
      const input = {
        id: testCheckIn.id,
        userId: testCheckIn.userId,
        comment: null, // Setting to null
        rating: null,
      };

      const result = await updateCheckIn(context, input);

      expect(result.isOk()).toBe(true);
    });
  });
});
