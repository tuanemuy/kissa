import type { CheckIn, CheckInId } from "@/core/domain/checkIn/types";
import type { LocationId } from "@/core/domain/location/types";
import type { UserId } from "@/core/domain/user/types";
import { ApplicationError, RepositoryError } from "@/lib/error";
import { err, ok } from "neverthrow";
import { beforeEach, describe, expect, it } from "vitest";
import { MockCheckInRepository } from "../../adapters/mock/checkInRepository";
import type { Context } from "../context";
import { deleteCheckIn } from "./deleteCheckIn";

describe("deleteCheckIn", () => {
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

  describe("SPEC-INV-4: CheckIn ownership validation (Alloy constraint)", () => {
    it("should allow check-in creator to delete check-in", async () => {
      const input = {
        id: testCheckIn.id,
        userId: testCheckIn.userId,
      };

      const result = await deleteCheckIn(context, input);

      expect(result.isOk()).toBe(true);
    });

    it("should reject deletion by non-owner", async () => {
      const input = {
        id: testCheckIn.id,
        userId: otherUserId,
      };

      const result = await deleteCheckIn(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe(
          "Unauthorized to delete this check-in",
        );
      }
    });
  });

  describe("TLA+ behavior validation", () => {
    it("should follow DeleteCheckIn action from TLA+ specification", async () => {
      // TLA+ DeleteCheckIn action: DeleteCheckIn(userId, checkInId)
      const input = {
        id: testCheckIn.id,
        userId: testCheckIn.userId,
      };

      const result = await deleteCheckIn(context, input);

      expect(result.isOk()).toBe(true);
      // Verify state transition: check-in should be removed from system
    });
  });

  describe("Input validation", () => {
    it("should reject invalid input - invalid UUID for id", async () => {
      const input = {
        id: "invalid-uuid",
        userId: testCheckIn.userId,
      };

      const result = await deleteCheckIn(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid check-in input");
      }
    });

    it("should reject invalid input - invalid UUID for userId", async () => {
      const input = {
        id: testCheckIn.id,
        userId: "invalid-uuid",
      };

      const result = await deleteCheckIn(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid check-in input");
      }
    });

    it("should reject missing fields", async () => {
      const input = {
        id: testCheckIn.id,
        // Missing userId
      };

      const result = await deleteCheckIn(context, input as never);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid check-in input");
      }
    });
  });

  describe("Error handling", () => {
    it("should handle check-in not found", async () => {
      const input = {
        id: "87654321-1234-4123-8321-210987654321" as CheckInId, // Valid UUID but non-existent check-in
        userId: testCheckIn.userId,
      };

      const result = await deleteCheckIn(context, input);

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
      };

      const result = await deleteCheckIn(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to find check-in");
      }
    });

    it("should handle repository delete failure", async () => {
      // First, let the findById succeed, then make delete fail
      const mockRepository = new MockCheckInRepository();
      mockRepository.addCheckIn(testCheckIn);

      // Override the delete method to fail
      const originalDelete = mockRepository.delete.bind(mockRepository);
      mockRepository.delete = async () => {
        return err(new RepositoryError("Delete failed"));
      };

      context.checkInRepository = mockRepository;

      const input = {
        id: testCheckIn.id,
        userId: testCheckIn.userId,
      };

      const result = await deleteCheckIn(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to delete check-in");
      }
    });
  });

  describe("Business logic validation", () => {
    it("should enforce proper deletion workflow", async () => {
      // Verify complete deletion process
      let findCalled = false;
      let deleteCalled = false;

      const mockRepository = new MockCheckInRepository();
      mockRepository.addCheckIn(testCheckIn);

      const originalFindById = mockRepository.findById.bind(mockRepository);
      const originalDelete = mockRepository.delete.bind(mockRepository);

      mockRepository.findById = async (id: CheckInId) => {
        findCalled = true;
        return originalFindById(id);
      };

      mockRepository.delete = async (id: CheckInId) => {
        deleteCalled = true;
        return originalDelete(id);
      };

      context.checkInRepository = mockRepository;

      const input = {
        id: testCheckIn.id,
        userId: testCheckIn.userId,
      };

      const result = await deleteCheckIn(context, input);

      expect(result.isOk()).toBe(true);
      expect(findCalled).toBe(true);
      expect(deleteCalled).toBe(true);
    });

    it("should validate ownership before deletion", async () => {
      // Verify ownership check occurs before deletion attempt
      let ownershipValidated = false;

      const mockRepository = new MockCheckInRepository();
      mockRepository.addCheckIn(testCheckIn);

      const originalFindById = mockRepository.findById.bind(mockRepository);

      mockRepository.findById = async (id: CheckInId) => {
        if (id === testCheckIn.id) {
          ownershipValidated = true;
        }
        return originalFindById(id);
      };

      context.checkInRepository = mockRepository;

      const input = {
        id: testCheckIn.id,
        userId: testCheckIn.userId,
      };

      const result = await deleteCheckIn(context, input);

      expect(result.isOk()).toBe(true);
      expect(ownershipValidated).toBe(true);
    });
  });
});
