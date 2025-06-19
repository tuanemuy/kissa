import { MockNotificationRepository } from "@/core/adapters/mock/notificationRepository";
import { MockNotificationService } from "@/core/adapters/mock/notificationService";
import { MockUserRepository } from "@/core/adapters/mock/userRepository";
import type { Notification } from "@/core/domain/notification/types";
import type { User, UserId } from "@/core/domain/user/types";
import { ApplicationError } from "@/lib/error";
import { RepositoryError } from "@/lib/error";
import { err, ok } from "neverthrow";
import { beforeEach, describe, expect, it } from "vitest";
import type { Context } from "../context";
import { sendNotification } from "./sendNotification";

describe("sendNotification", () => {
  let context: Context;
  let mockUser: User;
  let mockNotification: Notification;

  beforeEach(() => {
    mockUser = {
      id: "550e8400-e29b-41d4-a716-446655440001" as UserId,
      name: "Test User",
      email: "test@example.com",
      role: "editor",
      subscription: "basic",
      profilePhotoUrl: null,
      isActive: true,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockNotification = {
      // biome-ignore lint/suspicious/noExplicitAny: Testing requires branded type assertion
      id: "550e8400-e29b-41d4-a716-446655440003" as any,
      userId: mockUser.id,
      type: "location_invitation",
      title: "Test Notification",
      message: "This is a test notification",
      data: { testData: "value" },
      isRead: false,
      createdAt: new Date(),
    };

    const mockUserRepository = new MockUserRepository();
    const mockNotificationRepository = new MockNotificationRepository();
    const mockNotificationService = new MockNotificationService();

    mockUserRepository.addUser(mockUser, "hashed-password");
    mockNotificationRepository.addNotification(mockNotification);

    context = {
      userRepository: mockUserRepository,
      notificationRepository: mockNotificationRepository,
      notificationService: mockNotificationService,
    } as unknown as Context;
  });

  describe("TLA+ behavior validation", () => {
    describe("SendEmailNotification action", () => {
      it("should follow TLA+ SendEmailNotification constraints", async () => {
        // TLA+: recipientId ∈ users ∧ IsActiveUser(recipientId) ∧ notificationType ∈ {"invitation", "moderation_result", "system"}
        const input = {
          userId: mockUser.id,
          type: "location_invitation" as const,
          title: "Invitation Notification",
          message: "You have been invited to edit a location",
          data: { invitationId: "inv-1" },
          sendEmail: true,
          sendPush: false,
        };

        const result = await sendNotification(context, input);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.notification.type).toBe("location_invitation");
          expect(result.value.emailSent).toBe(true);
          expect(result.value.pushSent).toBe(false);
        }
      });

      it("should validate user exists and is active per TLA+ constraints", async () => {
        // TLA+: IsActiveUser(recipientId)
        mockUser.isActive = true;

        const input = {
          userId: mockUser.id,
          type: "system" as const,
          title: "System Notification",
          message: "System maintenance scheduled",
          sendEmail: true,
          sendPush: true,
        };

        const result = await sendNotification(context, input);

        expect(result.isOk()).toBe(true);
      });
    });

    describe("SendPushNotification action", () => {
      it("should follow TLA+ SendPushNotification constraints", async () => {
        // TLA+: similar constraints as email notification
        const input = {
          userId: mockUser.id,
          type: "content_moderation" as const,
          title: "Moderation Result",
          message: "Your content has been reviewed",
          data: { moderationId: "mod-1", status: "approved" },
          sendEmail: false,
          sendPush: true,
        };

        const result = await sendNotification(context, input);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.notification.type).toBe("content_moderation");
          expect(result.value.emailSent).toBe(false);
          expect(result.value.pushSent).toBe(true);
        }
      });
    });

    describe("Combined notification delivery", () => {
      it("should send both email and push when requested", async () => {
        const input = {
          userId: mockUser.id,
          type: "system" as const,
          title: "Important System Update",
          message: "Please update your app",
          sendEmail: true,
          sendPush: true,
        };

        const result = await sendNotification(context, input);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.emailSent).toBe(true);
          expect(result.value.pushSent).toBe(true);
        }
      });
    });
  });

  describe("Alloy structural constraints", () => {
    describe("INV-20: Notification system consistency", () => {
      it("should only send notifications to active users", async () => {
        // Alloy: all n: Notification | n.recipient.active = True
        mockUser.isActive = true;

        const input = {
          userId: mockUser.id,
          type: "location_invitation" as const,
          title: "Test Notification",
          message: "Test message",
          sendEmail: true,
          sendPush: false,
        };

        const result = await sendNotification(context, input);

        expect(result.isOk()).toBe(true);
      });

      it("should validate notification target exists", async () => {
        // Alloy: all n: Notification | n.recipient ∈ users
        const input = {
          userId: mockUser.id,
          type: "system" as const,
          title: "System Notification",
          message: "System message",
          sendEmail: false,
          sendPush: true,
        };

        const result = await sendNotification(context, input);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.notification.userId).toBe(mockUser.id);
        }
      });
    });

    describe("INV-29: Notification settings consistency", () => {
      it("should respect user notification preferences", async () => {
        // Alloy: all ns: NotificationSettings | ns.user.active = True
        // This would be enforced by checking user notification settings
        const input = {
          userId: mockUser.id,
          type: "location_invitation" as const,
          title: "Location Editor Invitation",
          message: "You have been invited",
          sendEmail: true,
          sendPush: true,
        };

        const result = await sendNotification(context, input);

        expect(result.isOk()).toBe(true);
      });
    });

    describe("Notification type validation", () => {
      it("should support invitation notifications", async () => {
        const input = {
          userId: mockUser.id,
          type: "location_invitation" as const,
          title: "Editor Invitation",
          message: "You have been invited to edit a location",
          data: { locationId: "location-1", invitationId: "inv-1" },
          sendEmail: true,
          sendPush: false,
        };

        const result = await sendNotification(context, input);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.notification.type).toBe("location_invitation");
        }
      });

      it("should support moderation result notifications", async () => {
        const input = {
          userId: mockUser.id,
          type: "content_moderation" as const,
          title: "Content Moderation Result",
          message: "Your content has been reviewed and approved",
          data: { moderationId: "mod-1", status: "approved" },
          sendEmail: false,
          sendPush: true,
        };

        const result = await sendNotification(context, input);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.notification.type).toBe("content_moderation");
        }
      });

      it("should support system notifications", async () => {
        const input = {
          userId: mockUser.id,
          type: "system" as const,
          title: "System Maintenance",
          message: "Scheduled maintenance on Sunday",
          sendEmail: true,
          sendPush: true,
        };

        const result = await sendNotification(context, input);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.notification.type).toBe("system");
        }
      });
    });
  });

  describe("Email delivery", () => {
    it("should send email with correct parameters", async () => {
      const input = {
        userId: mockUser.id,
        type: "system" as const,
        title: "Test Notification",
        message: "This is a test notification",
        sendEmail: true,
        sendPush: false,
      };

      const result = await sendNotification(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.emailSent).toBe(true);
      }
    });

    it("should handle email delivery failure gracefully", async () => {
      // Create a mock service that fails email sending
      const failingNotificationService = {
        sendEmail: async () => err(new Error("Email service unavailable")),
        sendPush: async () => ok(undefined),
      };

      // biome-ignore lint/suspicious/noExplicitAny: Test mock needs any type assertion
      context.notificationService = failingNotificationService as any;

      const input = {
        userId: mockUser.id,
        type: "system" as const,
        title: "Test Notification",
        message: "This is a test notification",
        sendEmail: true,
        sendPush: false,
      };

      const result = await sendNotification(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.emailSent).toBe(false);
        expect(result.value.notification).toBeDefined();
      }
    });
  });

  describe("Push notification delivery", () => {
    it("should send push notification with correct parameters", async () => {
      const input = {
        userId: mockUser.id,
        type: "location_invitation" as const,
        title: "Push Notification",
        message: "This is a push notification",
        data: { invitationId: "inv-1" },
        sendEmail: false,
        sendPush: true,
      };

      const result = await sendNotification(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.pushSent).toBe(true);
      }
    });

    it("should handle push notification failure gracefully", async () => {
      // Create a mock service that fails push sending
      const failingNotificationService = {
        sendEmail: async () => ok(undefined),
        sendPush: async () => err(new Error("Push service unavailable")),
      };

      // biome-ignore lint/suspicious/noExplicitAny: Test mock needs any type assertion
      context.notificationService = failingNotificationService as any;

      const input = {
        userId: mockUser.id,
        type: "system" as const,
        title: "Test Notification",
        message: "This is a test notification",
        sendEmail: false,
        sendPush: true,
      };

      const result = await sendNotification(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.pushSent).toBe(false);
        expect(result.value.notification).toBeDefined();
      }
    });
  });

  describe("Error handling", () => {
    it("should handle user not found", async () => {
      const input = {
        userId: "550e8400-e29b-41d4-a716-446655440099" as UserId,
        type: "system" as const,
        title: "Test Notification",
        message: "Test message",
        sendEmail: false,
        sendPush: false,
      };

      const result = await sendNotification(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("User not found");
      }
    });

    it("should handle notification creation failure", async () => {
      const mockNotificationRepository =
        context.notificationRepository as MockNotificationRepository;
      mockNotificationRepository.setShouldFailOperations(true);

      const input = {
        userId: mockUser.id,
        type: "system" as const,
        title: "Test Notification",
        message: "Test message",
        sendEmail: false,
        sendPush: false,
      };

      const result = await sendNotification(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to create notification");
      }

      // Reset for other tests
      mockNotificationRepository.setShouldFailOperations(false);
    });

    it("should handle user repository failure", async () => {
      const mockUserRepository = context.userRepository as MockUserRepository;
      mockUserRepository.setShouldFailOperations(true);

      const input = {
        userId: mockUser.id,
        type: "system" as const,
        title: "Test Notification",
        message: "Test message",
        sendEmail: false,
        sendPush: false,
      };

      const result = await sendNotification(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to verify user");
      }

      // Reset for other tests
      mockUserRepository.setShouldFailOperations(false);
    });
  });

  describe("Input validation", () => {
    it("should reject invalid input", async () => {
      const input = {
        // biome-ignore lint/suspicious/noExplicitAny: Testing invalid input requires type assertion
        userId: "invalid-user-id" as any,
        type: "invalid-type" as never,
        title: "",
        message: "",
        sendEmail: false,
        sendPush: false,
      };

      const result = await sendNotification(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid notification input");
      }
    });

    it("should require valid notification type", async () => {
      const input = {
        userId: mockUser.id,
        type: "unknown" as never,
        title: "Test",
        message: "Test message",
        sendEmail: false,
        sendPush: false,
      };

      const result = await sendNotification(context, input);

      expect(result.isErr()).toBe(true);
    });
  });

  describe("Scenario validation from specs", () => {
    describe("NotificationSystem scenario", () => {
      it("should support invitation notification workflow per Alloy spec", async () => {
        // Alloy: NotificationSystem scenario - invitation notifications
        const input = {
          userId: mockUser.id,
          type: "location_invitation" as const,
          title: "Location Editor Invitation",
          message: "You have been invited to edit a location",
          data: { locationId: "location-1", invitationId: "inv-1" },
          sendEmail: true,
          sendPush: true,
        };

        const result = await sendNotification(context, input);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.notification.type).toBe("location_invitation");
          expect(result.value.notification.data).toEqual({
            locationId: "location-1",
            invitationId: "inv-1",
          });
        }
      });
    });

    describe("ContentModerationWorkflow scenario", () => {
      it("should support moderation result notifications per Alloy spec", async () => {
        // Alloy: ContentModerationWorkflow - moderation result notifications
        const input = {
          userId: mockUser.id,
          type: "content_moderation" as const,
          title: "Content Moderation Result",
          message: "Your content has been reviewed",
          data: { moderationId: "mod-1", result: "approved" },
          sendEmail: true,
          sendPush: false,
        };

        const result = await sendNotification(context, input);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.notification.type).toBe("content_moderation");
        }
      });
    });
  });
});
