import { MockNotificationRepository } from "@/core/adapters/mock/notificationRepository";
import { MockUserRepository } from "@/core/adapters/mock/userRepository";
import type {
  Notification,
  NotificationId,
} from "@/core/domain/notification/types";
import type { User, UserId } from "@/core/domain/user/types";
import { ApplicationError } from "@/lib/error";
import { RepositoryError } from "@/lib/error";
import { err, ok } from "neverthrow";
import { beforeEach, describe, expect, it } from "vitest";
import type { Context } from "../context";
import { listNotifications } from "./listNotifications";

describe("listNotifications", () => {
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

  const mockNotifications: Notification[] = [
    {
      id: "550e8400-e29b-41d4-a716-446655440003" as NotificationId,
      userId: validUser.id,
      type: "location_invitation",
      title: "Location Editor Invitation",
      message: "You have been invited to edit a location",
      data: { locationId: "loc-123" },
      isRead: false,
      createdAt: new Date(),
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440004" as NotificationId,
      userId: validUser.id,
      type: "system",
      title: "System Update",
      message: "System maintenance scheduled",
      data: {},
      isRead: true,
      createdAt: new Date(),
    },
  ];

  beforeEach(() => {
    context = {
      userRepository: new MockUserRepository(),
      notificationRepository: new MockNotificationRepository(),
    } as Context;
  });

  describe("successful listing", () => {
    it("should list user notifications with pagination", async () => {
      // Arrange
      context.userRepository.findById = async () => ok(validUser);
      context.notificationRepository.list = async () =>
        ok({ items: mockNotifications, count: 2 });
      context.notificationRepository.countUnread = async () => ok(1);

      // Act
      const result = await listNotifications(context, {
        userId: validUser.id,
        pagination: { page: 1, limit: 10 },
      });

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.items).toHaveLength(2);
        expect(result.value.count).toBe(2);
        expect(result.value.unreadCount).toBe(1);
        expect(result.value.items[0].userId).toBe(validUser.id);
      }
    });

    it("should list filtered notifications by type", async () => {
      // Arrange
      const filteredNotifications = [mockNotifications[0]];
      context.userRepository.findById = async () => ok(validUser);
      context.notificationRepository.list = async () =>
        ok({ items: filteredNotifications, count: 1 });
      context.notificationRepository.countUnread = async () => ok(1);

      // Act
      const result = await listNotifications(context, {
        userId: validUser.id,
        pagination: { page: 1, limit: 10 },
        filter: { type: "location_invitation" },
      });

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.items).toHaveLength(1);
        expect(result.value.items[0].type).toBe("location_invitation");
      }
    });

    it("should list read/unread filtered notifications", async () => {
      // Arrange
      const unreadNotifications = [mockNotifications[0]];
      context.userRepository.findById = async () => ok(validUser);
      context.notificationRepository.list = async () =>
        ok({ items: unreadNotifications, count: 1 });
      context.notificationRepository.countUnread = async () => ok(1);

      // Act
      const result = await listNotifications(context, {
        userId: validUser.id,
        pagination: { page: 1, limit: 10 },
        filter: { isRead: false },
      });

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.items).toHaveLength(1);
        expect(result.value.items[0].isRead).toBe(false);
      }
    });

    it("should return empty list when no notifications exist", async () => {
      // Arrange
      context.userRepository.findById = async () => ok(validUser);
      context.notificationRepository.list = async () =>
        ok({ items: [], count: 0 });
      context.notificationRepository.countUnread = async () => ok(0);

      // Act
      const result = await listNotifications(context, {
        userId: validUser.id,
        pagination: { page: 1, limit: 10 },
      });

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.items).toHaveLength(0);
        expect(result.value.count).toBe(0);
        expect(result.value.unreadCount).toBe(0);
      }
    });
  });

  describe("validation errors", () => {
    it("should fail with invalid userId", async () => {
      // Act
      const result = await listNotifications(context, {
        userId: "invalid-id" as UserId,
        pagination: { page: 1, limit: 10 },
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid list notifications input");
      }
    });

    it("should fail with invalid pagination", async () => {
      // Act
      const result = await listNotifications(context, {
        userId: validUser.id,
        pagination: { page: 0, limit: 10 },
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid list notifications input");
      }
    });
  });

  describe("user verification errors", () => {
    it("should fail when user not found", async () => {
      // Arrange
      context.userRepository.findById = async () => ok(null);

      // Act
      const result = await listNotifications(context, {
        userId: validUser.id,
        pagination: { page: 1, limit: 10 },
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
      const result = await listNotifications(context, {
        userId: validUser.id,
        pagination: { page: 1, limit: 10 },
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
    it("should fail when list operation fails", async () => {
      // Arrange
      context.userRepository.findById = async () => ok(validUser);
      context.notificationRepository.list = async () =>
        err(new RepositoryError("Database error"));

      // Act
      const result = await listNotifications(context, {
        userId: validUser.id,
        pagination: { page: 1, limit: 10 },
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to list notifications");
      }
    });

    it("should fail when unread count operation fails", async () => {
      // Arrange
      context.userRepository.findById = async () => ok(validUser);
      context.notificationRepository.list = async () =>
        ok({ items: mockNotifications, count: 2 });
      context.notificationRepository.countUnread = async () =>
        err(new RepositoryError("Database error"));

      // Act
      const result = await listNotifications(context, {
        userId: validUser.id,
        pagination: { page: 1, limit: 10 },
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe(
          "Failed to count unread notifications",
        );
      }
    });
  });

  describe("formal specification compliance", () => {
    it("should enforce business rules for notification listing", async () => {
      // Arrange
      context.userRepository.findById = async () => ok(validUser);
      context.notificationRepository.list = async () =>
        ok({ items: mockNotifications, count: 2 });
      context.notificationRepository.countUnread = async () => ok(1);

      // Act
      const result = await listNotifications(context, {
        userId: validUser.id,
        pagination: { page: 1, limit: 10 },
      });

      // Assert - Verify business rules are followed
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // All returned notifications should belong to the user
        for (const notification of result.value.items) {
          expect(notification.userId).toBe(validUser.id);
        }
        // Count should match items length
        expect(result.value.count).toBeGreaterThanOrEqual(
          result.value.items.length,
        );
        // Unread count should be non-negative
        expect(result.value.unreadCount).toBeGreaterThanOrEqual(0);
      }
    });

    it("should maintain system invariants during listing", async () => {
      // Arrange
      context.userRepository.findById = async () => ok(validUser);
      context.notificationRepository.list = async (query) => {
        // Verify query parameters are properly validated
        expect(query.userId).toBe(validUser.id);
        expect(query.pagination.page).toBeGreaterThan(0);
        expect(query.pagination.limit).toBeGreaterThan(0);
        return ok({ items: mockNotifications, count: 2 });
      };
      context.notificationRepository.countUnread = async () => ok(1);

      // Act
      const result = await listNotifications(context, {
        userId: validUser.id,
        pagination: { page: 1, limit: 10 },
      });

      // Assert - System state should remain consistent
      expect(result.isOk()).toBe(true);
    });
  });
});
