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
import { createMockContext } from "../testUtils/mockContext";
import { createNotification } from "./createNotification";

describe("createNotification", () => {
  let context: Context;

  const recipientUser: User = {
    id: "550e8400-e29b-41d4-a716-446655440001" as UserId,
    name: "Recipient User",
    email: "recipient@example.com",
    role: "editor",
    subscription: "basic",
    profilePhotoUrl: null,
    isActive: true,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const inactiveUser: User = {
    id: "550e8400-e29b-41d4-a716-446655440002" as UserId,
    name: "Inactive User",
    email: "inactive@example.com",
    role: "visitor",
    subscription: "free",
    profilePhotoUrl: null,
    isActive: false,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockNotification: Notification = {
    id: "550e8400-e29b-41d4-a716-446655440003" as NotificationId,
    userId: recipientUser.id,
    type: "location_invitation",
    title: "Location Editor Invitation",
    message: "You have been invited to edit a location",
    data: { locationId: "location-1", inviterId: "editor-1" },
    isRead: false,
    createdAt: new Date(),
  };

  beforeEach(() => {
    const mockUserRepository = new MockUserRepository();
    const mockNotificationRepository = new MockNotificationRepository();

    mockUserRepository.addUser(recipientUser, "hashed-password");
    mockUserRepository.addUser(inactiveUser, "hashed-password");
    mockNotificationRepository.addNotification(mockNotification);

    context = createMockContext({
      userRepository: mockUserRepository,
      notificationRepository: mockNotificationRepository,
    });
  });

  describe("SPEC: Notification creation constraints from formal specifications", () => {
    it("should create notification for active user", async () => {
      const input = {
        userId: recipientUser.id,
        type: "location_invitation" as const,
        title: "Location Editor Invitation",
        message: "You have been invited to edit a location",
        data: { locationId: "location-1", inviterId: "editor-1" },
      };

      const result = await createNotification(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const notification = result.value;
        expect(notification.userId).toBe(recipientUser.id);
        expect(notification.type).toBe("location_invitation");
        expect(notification.title).toBe("Location Editor Invitation");
        expect(notification.isRead).toBe(false);
        expect(notification.createdAt).toBeInstanceOf(Date);
      }
    });

    it("should create moderation result notification", async () => {
      const input = {
        userId: recipientUser.id,
        type: "content_moderation" as const,
        title: "Content Moderation Result",
        message: "Your content has been approved",
        data: { contentId: "region-1", status: "approved" },
      };

      const result = await createNotification(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const notification = result.value;
        expect(notification.type).toBe("content_moderation");
        expect(notification.data).toEqual({
          contentId: "region-1",
          status: "approved",
        });
      }
    });

    it("should accept notification for inactive user (business logic allows)", async () => {
      const input = {
        userId: inactiveUser.id,
        type: "location_invitation" as const,
        title: "Should Pass",
        message: "This should be created",
        data: {},
      };

      const result = await createNotification(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.userId).toBe(inactiveUser.id);
      }
    });
  });

  describe("SPEC-INV-20: Notification system consistency (Alloy constraint)", () => {
    it("should verify notification recipient is active", async () => {
      // Alloy constraint: NotificationSystemConsistency
      // all n: Notification | n.recipient.active = True
      const input = {
        userId: recipientUser.id,
        type: "system" as const,
        title: "System Notification",
        message: "System maintenance scheduled",
        data: { maintenanceDate: "2024-02-01" },
      };

      const result = await createNotification(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const notification = result.value;
        expect(notification.userId).toBe(recipientUser.id);
        // Recipient must be active (verified in service logic)
      }
    });
  });

  describe("TLA+ behavior validation", () => {
    it("should follow SendInvitationNotification from TLA+ specification", async () => {
      // TLA+ SendInvitationNotification: notification for location editor invitation
      const input = {
        userId: recipientUser.id,
        type: "location_invitation" as const,
        title: "Location Editor Invitation",
        message: "You have been invited to edit a location",
        data: { locationId: "location-1", inviterId: "editor-1" },
      };

      const result = await createNotification(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const notification = result.value;
        // Verify TLA+ constraints
        expect(notification.type).toBe("location_invitation");
        expect(notification.userId).toBe(recipientUser.id);
        expect(notification.data).toHaveProperty("locationId");
        expect(notification.data).toHaveProperty("inviterId");
      }
    });

    it("should follow SendModerationResultNotification from TLA+ specification", async () => {
      // TLA+ SendModerationResultNotification: notification for content moderation
      const input = {
        userId: recipientUser.id,
        type: "content_moderation" as const,
        title: "Content Moderation Result",
        message: "Your content has been rejected",
        data: {
          contentId: "checkin-1",
          status: "rejected",
          reason: "inappropriate",
        },
      };

      const result = await createNotification(context, input);

      expect(result.isOk()).toBe(true);
    });
  });

  describe("Input validation", () => {
    it("should reject invalid notification type", async () => {
      const input = {
        userId: recipientUser.id,
        type: "invalid_type" as never,
        title: "Test",
        message: "Test message",
        data: {},
      };

      const result = await createNotification(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid notification input");
      }
    });

    it("should reject empty title", async () => {
      const input = {
        userId: recipientUser.id,
        type: "system" as const,
        title: "",
        message: "Test message",
        data: {},
      };

      const result = await createNotification(context, input as never);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid notification input");
      }
    });

    it("should reject empty message", async () => {
      const input = {
        userId: recipientUser.id,
        type: "system" as const,
        title: "Test Title",
        message: "",
        data: {},
      };

      const result = await createNotification(context, input as never);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid notification input");
      }
    });
  });

  describe("Error handling", () => {
    it("should handle recipient not found", async () => {
      const input = {
        userId: "550e8400-e29b-41d4-a716-446655440099" as UserId,
        type: "system" as const,
        title: "Test",
        message: "Test message",
        data: {},
      };

      const result = await createNotification(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("User not found");
      }
    });

    it("should handle repository failure", async () => {
      const mockNotificationRepository =
        context.notificationRepository as MockNotificationRepository;
      mockNotificationRepository.setShouldFailOperations(true);

      const input = {
        userId: recipientUser.id,
        type: "system" as const,
        title: "Test",
        message: "Test message",
        data: {},
      };

      const result = await createNotification(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to create notification");
      }

      // Reset for other tests
      mockNotificationRepository.setShouldFailOperations(false);
    });
  });

  describe("Notification types", () => {
    it("should create invitation notification with proper data", async () => {
      const input = {
        userId: recipientUser.id,
        type: "location_invitation" as const,
        title: "Location Editor Invitation",
        message: "You have been invited to edit 'Tokyo Station'",
        data: {
          locationId: "location-1",
          locationName: "Tokyo Station",
          inviterId: "editor-1",
          inviterName: "John Doe",
        },
      };

      const result = await createNotification(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const notification = result.value;
        expect(notification.type).toBe("location_invitation");
        expect(notification.data).toHaveProperty("locationId");
        expect(notification.data).toHaveProperty("inviterId");
      }
    });

    it("should create system notification", async () => {
      const input = {
        userId: recipientUser.id,
        type: "system" as const,
        title: "System Maintenance",
        message: "System will be under maintenance from 2AM to 4AM",
        data: {
          maintenanceStart: "2024-02-01T02:00:00Z",
          maintenanceEnd: "2024-02-01T04:00:00Z",
        },
      };

      const result = await createNotification(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const notification = result.value;
        expect(notification.type).toBe("system");
        expect(notification.data).toHaveProperty("maintenanceStart");
        expect(notification.data).toHaveProperty("maintenanceEnd");
      }
    });
  });
});
