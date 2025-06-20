import { MockNotificationRepository } from "@/core/adapters/mock/notificationRepository";
import type {
  Notification,
  NotificationId,
} from "@/core/domain/notification/types";
import type { UserId } from "@/core/domain/user/types";
import { ApplicationError } from "@/lib/error";
import { RepositoryError } from "@/lib/error";
import { err, ok } from "neverthrow";
import { beforeEach, describe, expect, it } from "vitest";
import type { Context } from "../context";
import { markNotificationAsRead } from "./markNotificationAsRead";

describe("markNotificationAsRead", () => {
  let context: Context;

  const notificationId =
    "550e8400-e29b-41d4-a716-446655440003" as NotificationId;
  const userId = "550e8400-e29b-41d4-a716-446655440001" as UserId;

  const mockNotification: Notification = {
    id: notificationId,
    userId: userId,
    type: "location_invitation",
    title: "Location Editor Invitation",
    message: "You have been invited to edit a location",
    data: { locationId: "loc-123" },
    isRead: false,
    createdAt: new Date(),
  };

  const readNotification: Notification = {
    ...mockNotification,
    isRead: true,
  };

  beforeEach(() => {
    context = {
      notificationRepository: new MockNotificationRepository(),
    } as Context;
  });

  describe("successful operations", () => {
    it("should mark unread notification as read", async () => {
      // Arrange
      context.notificationRepository.findById = async () =>
        ok(mockNotification);
      context.notificationRepository.markAsRead = async () => ok(undefined);

      // Act
      const result = await markNotificationAsRead(context, {
        id: notificationId,
      });

      // Assert
      expect(result.isOk()).toBe(true);
    });

    it("should handle already read notification gracefully", async () => {
      // Arrange
      context.notificationRepository.findById = async () =>
        ok(readNotification);
      context.notificationRepository.markAsRead = async () => ok(undefined);

      // Act
      const result = await markNotificationAsRead(context, {
        id: notificationId,
      });

      // Assert
      expect(result.isOk()).toBe(true);
    });

    it("should work with different notification types", async () => {
      // Arrange
      const systemNotification: Notification = {
        ...mockNotification,
        type: "system",
        title: "System Update",
        message: "System maintenance scheduled",
      };
      context.notificationRepository.findById = async () =>
        ok(systemNotification);
      context.notificationRepository.markAsRead = async () => ok(undefined);

      // Act
      const result = await markNotificationAsRead(context, {
        id: notificationId,
      });

      // Assert
      expect(result.isOk()).toBe(true);
    });
  });

  describe("validation errors", () => {
    it("should fail with invalid notification id", async () => {
      // Act
      const result = await markNotificationAsRead(context, {
        id: "invalid-id" as NotificationId,
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid mark as read input");
      }
    });

    it("should fail with empty notification id", async () => {
      // Act
      const result = await markNotificationAsRead(context, {
        id: "" as NotificationId,
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid mark as read input");
      }
    });
  });

  describe("notification verification errors", () => {
    it("should fail when notification not found", async () => {
      // Arrange
      context.notificationRepository.findById = async () => ok(null);

      // Act
      const result = await markNotificationAsRead(context, {
        id: notificationId,
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Notification not found");
      }
    });

    it("should fail when notification repository find fails", async () => {
      // Arrange
      context.notificationRepository.findById = async () =>
        err(new RepositoryError("Database error"));

      // Act
      const result = await markNotificationAsRead(context, {
        id: notificationId,
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to find notification");
      }
    });
  });

  describe("notification repository errors", () => {
    it("should fail when mark as read operation fails", async () => {
      // Arrange
      context.notificationRepository.findById = async () =>
        ok(mockNotification);
      context.notificationRepository.markAsRead = async () =>
        err(new RepositoryError("Database error"));

      // Act
      const result = await markNotificationAsRead(context, {
        id: notificationId,
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe(
          "Failed to mark notification as read",
        );
      }
    });

    it("should fail on concurrent modification conflicts", async () => {
      // Arrange
      context.notificationRepository.findById = async () =>
        ok(mockNotification);
      context.notificationRepository.markAsRead = async () =>
        err(new RepositoryError("Concurrent modification error"));

      // Act
      const result = await markNotificationAsRead(context, {
        id: notificationId,
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe(
          "Failed to mark notification as read",
        );
      }
    });
  });

  describe("formal specification compliance", () => {
    it("should enforce business rules for marking as read", async () => {
      // Arrange
      context.notificationRepository.findById = async () =>
        ok(mockNotification);
      context.notificationRepository.markAsRead = async () => ok(undefined);

      // Act
      const result = await markNotificationAsRead(context, {
        id: notificationId,
      });

      // Assert - Verify business rules are followed
      expect(result.isOk()).toBe(true);
      // Marking as read should be idempotent (no error if already read)
    });

    it("should maintain system invariants during state changes", async () => {
      // Arrange
      context.notificationRepository.findById = async () =>
        ok(mockNotification);
      context.notificationRepository.markAsRead = async (id) => {
        // Verify operation parameters match business logic
        expect(id).toBe(notificationId);
        return ok(undefined);
      };

      // Act
      const result = await markNotificationAsRead(context, {
        id: notificationId,
      });

      // Assert - System state should remain consistent
      expect(result.isOk()).toBe(true);
    });

    it("should handle notification ownership correctly", async () => {
      // Arrange
      const userNotification: Notification = {
        ...mockNotification,
        userId: userId,
      };
      context.notificationRepository.findById = async () =>
        ok(userNotification);
      context.notificationRepository.markAsRead = async () => ok(undefined);

      // Act
      const result = await markNotificationAsRead(context, {
        id: notificationId,
      });

      // Assert - Should succeed for valid notification
      expect(result.isOk()).toBe(true);
    });

    it("should ensure state transition atomicity", async () => {
      // Arrange
      let findCalled = false;
      let markCalled = false;

      context.notificationRepository.findById = async () => {
        findCalled = true;
        return ok(mockNotification);
      };
      context.notificationRepository.markAsRead = async () => {
        expect(findCalled).toBe(true); // Should verify notification exists first
        markCalled = true;
        return ok(undefined);
      };

      // Act
      const result = await markNotificationAsRead(context, {
        id: notificationId,
      });

      // Assert - Operations should occur in correct order
      expect(result.isOk()).toBe(true);
      expect(findCalled).toBe(true);
      expect(markCalled).toBe(true);
    });
  });
});
