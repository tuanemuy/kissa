import { MockNotificationRepository } from "@/core/adapters/mock/notificationRepository";
import { MockUserRepository } from "@/core/adapters/mock/userRepository";
import type { User, UserId } from "@/core/domain/user/types";
import { ApplicationError } from "@/lib/error";
import { RepositoryError } from "@/lib/error";
import { err, ok } from "neverthrow";
import { beforeEach, describe, expect, it } from "vitest";
import type { Context } from "../context";
import { cleanupOldNotifications } from "./cleanupOldNotifications";

describe("cleanupOldNotifications", () => {
  let context: Context;

  const validUser: User = {
    id: "550e8400-e29b-41d4-a716-446655440001" as UserId,
    name: "Valid User",
    email: "valid@example.com",
    role: "editor",
    subscription: "basic",
    profilePhotoUrl: null,
    isActive: true,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    context = {
      userRepository: new MockUserRepository(),
      notificationRepository: new MockNotificationRepository(),
    } as Context;
  });

  describe("successful cleanup", () => {
    it("should cleanup old notifications with default days", async () => {
      // Arrange
      context.userRepository.findById = async () => ok(validUser);
      context.notificationRepository.deleteOlderThan = async () => ok(5);

      // Act
      const result = await cleanupOldNotifications(context, {
        userId: validUser.id,
      });

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(5);
      }
    });

    it("should cleanup old notifications with custom days", async () => {
      // Arrange
      context.userRepository.findById = async () => ok(validUser);
      context.notificationRepository.deleteOlderThan = async () => ok(3);

      // Act
      const result = await cleanupOldNotifications(context, {
        userId: validUser.id,
        days: 7,
      });

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(3);
      }
    });

    it("should return 0 when no old notifications exist", async () => {
      // Arrange
      context.userRepository.findById = async () => ok(validUser);
      context.notificationRepository.deleteOlderThan = async () => ok(0);

      // Act
      const result = await cleanupOldNotifications(context, {
        userId: validUser.id,
        days: 30,
      });

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(0);
      }
    });
  });

  describe("validation errors", () => {
    it("should fail with invalid userId", async () => {
      // Act
      const result = await cleanupOldNotifications(context, {
        userId: "invalid-id" as UserId,
        days: 30,
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid cleanup input");
      }
    });

    it("should fail with negative days", async () => {
      // Act
      const result = await cleanupOldNotifications(context, {
        userId: validUser.id,
        days: -5,
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid cleanup input");
      }
    });

    it("should fail with zero days", async () => {
      // Act
      const result = await cleanupOldNotifications(context, {
        userId: validUser.id,
        days: 0,
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid cleanup input");
      }
    });
  });

  describe("user verification errors", () => {
    it("should fail when user not found", async () => {
      // Arrange
      context.userRepository.findById = async () => ok(null);

      // Act
      const result = await cleanupOldNotifications(context, {
        userId: validUser.id,
        days: 30,
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("User not found");
      }
    });

    it("should fail when user repository fails", async () => {
      // Arrange
      context.userRepository.findById = async () =>
        err(new RepositoryError("Database error"));

      // Act
      const result = await cleanupOldNotifications(context, {
        userId: validUser.id,
        days: 30,
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to verify user");
      }
    });
  });

  describe("notification repository errors", () => {
    it("should fail when notification repository fails", async () => {
      // Arrange
      context.userRepository.findById = async () => ok(validUser);
      context.notificationRepository.deleteOlderThan = async () =>
        err(new RepositoryError("Database error"));

      // Act
      const result = await cleanupOldNotifications(context, {
        userId: validUser.id,
        days: 30,
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe(
          "Failed to cleanup old notifications",
        );
      }
    });
  });

  describe("formal specification compliance", () => {
    it("should enforce business rules for cleanup operations", async () => {
      // Arrange
      context.userRepository.findById = async () => ok(validUser);
      context.notificationRepository.deleteOlderThan = async () => ok(10);

      // Act
      const result = await cleanupOldNotifications(context, {
        userId: validUser.id,
        days: 30,
      });

      // Assert - Verify business rules are followed
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // Cleanup should return number of deleted notifications
        expect(typeof result.value).toBe("number");
        expect(result.value).toBeGreaterThanOrEqual(0);
      }
    });

    it("should maintain system invariants during cleanup", async () => {
      // Arrange
      const cleanupDays = 30;
      context.userRepository.findById = async () => ok(validUser);
      context.notificationRepository.deleteOlderThan = async (userId, days) => {
        // Verify cleanup parameters match business logic
        expect(userId).toBe(validUser.id);
        expect(days).toBe(cleanupDays);
        return ok(2);
      };

      // Act
      const result = await cleanupOldNotifications(context, {
        userId: validUser.id,
        days: cleanupDays,
      });

      // Assert - System state should remain consistent
      expect(result.isOk()).toBe(true);
    });
  });
});
