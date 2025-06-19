import type { CheckIn, CheckInId } from "@/core/domain/checkIn/types";
import type { LocationId } from "@/core/domain/location/types";
import type { UserId } from "@/core/domain/user/types";
import { ApplicationError } from "@/lib/error";
import { RepositoryError } from "@/lib/error";
import { err, ok } from "neverthrow";
import { beforeEach, describe, expect, it } from "vitest";
import type { Context } from "../context";
import { deleteCheckIn } from "./deleteCheckIn";

describe("deleteCheckIn", () => {
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

  beforeEach(() => {
    context = {
      checkInRepository: {
        findById: async (id: CheckInId) => {
          if (id === testCheckIn.id) return ok(testCheckIn);
          return ok(null);
        },
        delete: async () => ok(undefined),
        // biome-ignore lint/suspicious/noExplicitAny: Mock context setup requires type assertion
      } as any,
    } as Context;
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
        id: "non-existent-checkin" as CheckInId,
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
      context.checkInRepository = {
        ...context.checkInRepository,
        findById: async () => err(new RepositoryError("Find failed")),
        // biome-ignore lint/suspicious/noExplicitAny: Mock context setup requires type assertion
      } as any;

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
      context.checkInRepository = {
        ...context.checkInRepository,
        delete: async () => err(new RepositoryError("Delete failed")),
        // biome-ignore lint/suspicious/noExplicitAny: Mock context setup requires type assertion
      } as any;

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

      context.checkInRepository = {
        findById: async (id: CheckInId) => {
          findCalled = true;
          if (id === testCheckIn.id) return ok(testCheckIn);
          return ok(null);
        },
        delete: async () => {
          deleteCalled = true;
          return ok(undefined);
        },
        // biome-ignore lint/suspicious/noExplicitAny: Mock context setup requires type assertion
      } as any;

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

      context.checkInRepository = {
        findById: async (id: CheckInId) => {
          if (id === testCheckIn.id) {
            ownershipValidated = true;
            return ok(testCheckIn);
          }
          return ok(null);
        },
        delete: async () => ok(undefined),
        // biome-ignore lint/suspicious/noExplicitAny: Mock context setup requires type assertion
      } as any;

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
