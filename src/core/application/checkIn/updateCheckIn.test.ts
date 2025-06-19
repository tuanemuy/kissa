import type {
  CheckIn,
  CheckInId,
  UpdateCheckInParams,
} from "@/core/domain/checkIn/types";
import type { LocationId } from "@/core/domain/location/types";
import type { UserId } from "@/core/domain/user/types";
import { ApplicationError } from "@/lib/error";
import { RepositoryError } from "@/lib/error";
import { err, ok } from "neverthrow";
import { beforeEach, describe, expect, it } from "vitest";
import type { Context } from "../context";
import { updateCheckIn } from "./updateCheckIn";

describe("updateCheckIn", () => {
  let context: Context;

  const userId: UserId = "user-1" as UserId;
  const otherUserId: UserId = "other-user" as UserId;
  const locationId: LocationId = "location-1" as LocationId;

  const testCheckIn: CheckIn = {
    id: "checkin-1" as CheckInId,
    userId,
    locationId,
    comment: "Great place!",
    rating: 5,
    photoUrls: [],
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
    context = {
      checkInRepository: {
        findById: async (id: CheckInId) => {
          if (id === testCheckIn.id) return ok(testCheckIn);
          return ok(null);
        },
        update: async (params: UpdateCheckInParams) => ok(updatedCheckIn),
        // biome-ignore lint/suspicious/noExplicitAny: Mock context setup requires type assertion
      } as any,
    } as Context;
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
        id: "non-existent-checkin" as CheckInId,
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
      context.checkInRepository = {
        ...context.checkInRepository,
        findById: async () => err(new RepositoryError("Find failed")),
        // biome-ignore lint/suspicious/noExplicitAny: Mock context setup requires type assertion
      } as any;

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
      context.checkInRepository = {
        ...context.checkInRepository,
        update: async () => err(new RepositoryError("Update failed")),
        // biome-ignore lint/suspicious/noExplicitAny: Mock context setup requires type assertion
      } as any;

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

      context.checkInRepository = {
        findById: async (id: CheckInId) => {
          findCalled = true;
          if (id === testCheckIn.id) return ok(testCheckIn);
          return ok(null);
        },
        update: async () => {
          updateCalled = true;
          return ok(updatedCheckIn);
        },
        // biome-ignore lint/suspicious/noExplicitAny: Mock context setup requires type assertion
      } as any;

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
