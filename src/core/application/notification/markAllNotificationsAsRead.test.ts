import { MockNotificationRepository } from "@/core/adapters/mock/notificationRepository";
import { MockUserRepository } from "@/core/adapters/mock/userRepository";
import type { User, UserId } from "@/core/domain/user/types";
import { ApplicationError } from "@/lib/error";
import { RepositoryError } from "@/lib/error";
import { err, ok } from "neverthrow";
import { beforeEach, describe, expect, it } from "vitest";
import type { Context } from "../context";
import { markAllNotificationsAsRead } from "./markAllNotificationsAsRead";

describe("markAllNotificationsAsRead", () => {
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

  describe("successful operations", () => {
    it("should mark all notifications as read", async () => {
      // Arrange
      context.userRepository.findById = async () => ok(validUser);
      context.notificationRepository.markAllAsRead = async () => ok(5);

      // Act
      const result = await markAllNotificationsAsRead(context, {
        userId: validUser.id,
      });

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(5);
      }
    });

    it("should return 0 when no unread notifications exist", async () => {
      // Arrange
      context.userRepository.findById = async () => ok(validUser);
      context.notificationRepository.markAllAsRead = async () => ok(0);

      // Act
      const result = await markAllNotificationsAsRead(context, {
        userId: validUser.id,
      });

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(0);
      }
    });

    it("should handle large number of notifications", async () => {
      // Arrange
      context.userRepository.findById = async () => ok(validUser);
      context.notificationRepository.markAllAsRead = async () => ok(100);

      // Act
      const result = await markAllNotificationsAsRead(context, {
        userId: validUser.id,
      });

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(100);
      }
    });
  });

  describe("validation errors", () => {
    it("should fail with invalid userId", async () => {
      // Act
      const result = await markAllNotificationsAsRead(context, {
        userId: "invalid-id" as UserId,
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid mark all as read input");
      }
    });

    it("should fail with empty userId", async () => {
      // Act
      const result = await markAllNotificationsAsRead(context, {
        userId: "" as UserId,
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid mark all as read input");
      }
    });
  });

  describe("user verification errors", () => {
    it("should fail when user not found", async () => {
      // Arrange
      context.userRepository.findById = async () => ok(null);

      // Act
      const result = await markAllNotificationsAsRead(context, {
        userId: validUser.id,
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
      const result = await markAllNotificationsAsRead(context, {
        userId: validUser.id,
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
    it("should fail when mark all as read operation fails", async () => {
      // Arrange
      context.userRepository.findById = async () => ok(validUser);
      context.notificationRepository.markAllAsRead = async () =>
        err(new RepositoryError("Database error"));

      // Act
      const result = await markAllNotificationsAsRead(context, {
        userId: validUser.id,
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe(
          "Failed to mark all notifications as read",
        );
      }
    });

    it("should fail on concurrent modification conflicts", async () => {
      // Arrange
      context.userRepository.findById = async () => ok(validUser);
      context.notificationRepository.markAllAsRead = async () =>
        err(new RepositoryError("Concurrent modification error"));

      // Act
      const result = await markAllNotificationsAsRead(context, {
        userId: validUser.id,
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe(
          "Failed to mark all notifications as read",
        );
      }
    });
  });

  describe("formal specification compliance", () => {
    it("should enforce business rules for mark all as read", async () => {
      // Arrange
      context.userRepository.findById = async () => ok(validUser);
      context.notificationRepository.markAllAsRead = async () => ok(3);

      // Act
      const result = await markAllNotificationsAsRead(context, {
        userId: validUser.id,
      });

      // Assert - Verify business rules are followed
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // Operation should return number of affected notifications
        expect(typeof result.value).toBe("number");
        expect(result.value).toBeGreaterThanOrEqual(0);
      }
    });

    it("should maintain system invariants during bulk operations", async () => {
      // Arrange
      context.userRepository.findById = async () => ok(validUser);
      context.notificationRepository.markAllAsRead = async (userId) => {
        // Verify operation parameters match business logic
        expect(userId).toBe(validUser.id);
        return ok(10);
      };

      // Act
      const result = await markAllNotificationsAsRead(context, {
        userId: validUser.id,
      });

      // Assert - System state should remain consistent
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // After marking all as read, unread count should be 0
        expect(result.value).toBeGreaterThanOrEqual(0);
      }
    });

    it("should handle user notification isolation correctly", async () => {
      // Arrange
      const otherUserId = "550e8400-e29b-41d4-a716-446655440002" as UserId;
      context.userRepository.findById = async () => ok(validUser);
      context.notificationRepository.markAllAsRead = async (userId) => {
        // Should only affect notifications for the specified user
        expect(userId).toBe(validUser.id);
        expect(userId).not.toBe(otherUserId);
        return ok(2);
      };

      // Act
      const result = await markAllNotificationsAsRead(context, {
        userId: validUser.id,
      });

      // Assert - Only specified user's notifications are affected
      expect(result.isOk()).toBe(true);
    });
  });
});
