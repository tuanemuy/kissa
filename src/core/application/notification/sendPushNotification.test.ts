import type {
  NotificationId,
  PushNotificationJob,
  SendPushNotificationParams,
} from "@/core/domain/notification/types";
import type { UserId } from "@/core/domain/user/types";
import { AnyError } from "@/lib/errors";
import { err, ok } from "neverthrow";
import { beforeEach, describe, expect, it } from "vitest";
import type { Context } from "../context";
import { sendPushNotification } from "./sendPushNotification";

// Mock push notification service
class MockPushNotificationService {
  async sendPushNotification(params: SendPushNotificationParams) {
    return ok([
      {
        id: "550e8400-e29b-41d4-a716-446655440099",
        notificationId:
          "550e8400-e29b-41d4-a716-446655440098" as NotificationId,
        userId: params.userId,
        channel: "mobile" as const,
        status: "pending" as const,
        payload: {
          title: params.title,
          body: params.body,
          data: params.data || {},
        },
        scheduledAt: new Date(),
        retryCount: 0,
      },
    ] as PushNotificationJob[]);
  }
}

describe("sendPushNotification", () => {
  let context: Context;

  const validUserId = "550e8400-e29b-41d4-a716-446655440001" as UserId;

  beforeEach(() => {
    context = {
      pushNotificationService: new MockPushNotificationService(),
    } as Context;
  });

  describe("successful push notifications", () => {
    it("should send basic push notification to single user", async () => {
      // Act
      const result = await sendPushNotification(context, {
        userId: validUserId,
        title: "Test Notification",
        body: "This is a test message",
      });

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0].userId).toBe(validUserId);
        expect(result.value[0].payload.title).toBe("Test Notification");
        expect(result.value[0].payload.body).toBe("This is a test message");
        expect(result.value[0].status).toBe("pending");
      }
    });

    it("should send push notification with priority and channels", async () => {
      // Act
      const result = await sendPushNotification(context, {
        userId: validUserId,
        title: "Broadcast Message",
        body: "This message has priority settings",
        priority: "high",
        channels: ["mobile", "web"],
      });

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0].userId).toBe(validUserId);
        expect(result.value[0].payload.title).toBe("Broadcast Message");
        expect(result.value[0].payload.body).toBe(
          "This message has priority settings",
        );
      }
    });

    it("should send push notification with additional data", async () => {
      // Act
      const result = await sendPushNotification(context, {
        userId: validUserId,
        title: "Location Invitation",
        body: "You have been invited to edit a location",
        data: { locationId: "loc-123", type: "invitation" },
      });

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value[0].payload.data).toEqual({
          locationId: "loc-123",
          type: "invitation",
        });
      }
    });

    it("should send push notification with TTL setting", async () => {
      // Act
      const result = await sendPushNotification(context, {
        userId: validUserId,
        title: "New Location Added",
        body: "Check out this new location in your area!",
        ttl: 3600, // 1 hour
      });

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value[0].payload.title).toBe("New Location Added");
        expect(result.value[0].payload.body).toBe(
          "Check out this new location in your area!",
        );
      }
    });

    it("should handle push notification with default priority", async () => {
      // Act
      const result = await sendPushNotification(context, {
        userId: validUserId,
        title: "Test Notification",
        body: "This message uses default priority",
      });

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0].userId).toBe(validUserId);
      }
    });
  });

  describe("validation errors", () => {
    it("should fail with invalid userId", async () => {
      // Act
      const result = await sendPushNotification(context, {
        userId: "invalid-id" as UserId,
        title: "Test Notification",
        body: "Test message",
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(AnyError);
        expect(result.error.message).toBe("Invalid push notification input");
      }
    });

    it("should fail with empty title", async () => {
      // Act
      const result = await sendPushNotification(context, {
        userId: validUserId,
        title: "",
        body: "Test message",
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(AnyError);
        expect(result.error.message).toBe("Invalid push notification input");
      }
    });

    it("should fail with empty body", async () => {
      // Act
      const result = await sendPushNotification(context, {
        userId: validUserId,
        title: "Test Notification",
        body: "",
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(AnyError);
        expect(result.error.message).toBe("Invalid push notification input");
      }
    });

    it("should fail with invalid priority", async () => {
      // Act
      const result = await sendPushNotification(context, {
        userId: validUserId,
        title: "Test Notification",
        body: "Test message",
        priority: "invalid" as never,
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(AnyError);
        expect(result.error.message).toBe("Invalid push notification input");
      }
    });

    it("should fail with negative TTL", async () => {
      // Act
      const result = await sendPushNotification(context, {
        userId: validUserId,
        title: "Test Notification",
        body: "Test message",
        ttl: -1,
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(AnyError);
        expect(result.error.message).toBe("Invalid push notification input");
      }
    });
  });

  describe("push notification service errors", () => {
    it("should fail when push notification service fails", async () => {
      // Arrange
      context.pushNotificationService.sendPushNotification = async () =>
        err(new AnyError("Push service unavailable"));

      // Act
      const result = await sendPushNotification(context, {
        userId: validUserId,
        title: "Test Notification",
        body: "Test message",
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(AnyError);
        expect(result.error.message).toBe("Push service unavailable");
      }
    });

    it("should fail on rate limiting", async () => {
      // Arrange
      context.pushNotificationService.sendPushNotification = async () =>
        err(new AnyError("Rate limit exceeded"));

      // Act
      const result = await sendPushNotification(context, {
        userId: validUserId,
        title: "Test Notification",
        body: "Test message",
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Rate limit exceeded");
      }
    });

    it("should fail with invalid device tokens", async () => {
      // Arrange
      context.pushNotificationService.sendPushNotification = async () =>
        err(new AnyError("Invalid device tokens"));

      // Act
      const result = await sendPushNotification(context, {
        userId: validUserId,
        title: "Test Notification",
        body: "Test message",
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Invalid device tokens");
      }
    });
  });

  describe("formal specification compliance", () => {
    it("should enforce business rules for push notifications", async () => {
      // Act
      const result = await sendPushNotification(context, {
        userId: validUserId,
        title: "System Update",
        body: "The system will be updated tonight",
        data: { priority: "high" },
      });

      // Assert - Verify business rules are followed
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // Should create one job
        expect(result.value).toHaveLength(1);
        // Job should have valid structure
        const job = result.value[0];
        expect(job.userId).toBe(validUserId);
        expect(job.payload.title).toBe("System Update");
        expect(job.payload.body).toBe("The system will be updated tonight");
        expect(job.status).toBe("pending");
        expect(job.scheduledAt).toBeInstanceOf(Date);
      }
    });

    it("should maintain system invariants during operations", async () => {
      // Arrange
      context.pushNotificationService.sendPushNotification = async (params) => {
        // Verify parameters match business logic
        expect(params.userId).toBe(validUserId);
        expect(params.title).toBeTruthy();
        expect(params.body).toBeTruthy();

        return ok([
          {
            id: "batch-job-1",
            notificationId:
              "550e8400-e29b-41d4-a716-446655440098" as NotificationId,
            userId: params.userId,
            channel: "mobile" as const,
            status: "pending" as const,
            payload: {
              title: params.title,
              body: params.body,
              data: params.data || {},
            },
            scheduledAt: new Date(),
            retryCount: 0,
          },
        ] as PushNotificationJob[]);
      };

      // Act
      const result = await sendPushNotification(context, {
        userId: validUserId,
        title: "Batch Notification",
        body: "This is a batch message",
      });

      // Assert - System should handle operations correctly
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(1);
      }
    });

    it("should ensure message content integrity", async () => {
      // Arrange
      const specialContent = {
        title: "Special Characters: àáâãäåæçèéêë",
        body: "Unicode test: 🎉🎊🎈 emoji and symbols ∑∆π",
        data: { unicode: "测试中文", emoji: "🎯" },
      };

      context.pushNotificationService.sendPushNotification = async (params) => {
        // Verify content is preserved exactly
        expect(params.title).toBe(specialContent.title);
        expect(params.body).toBe(specialContent.body);
        expect(params.data).toEqual(specialContent.data);

        return ok([
          {
            id: "unicode-job",
            notificationId:
              "550e8400-e29b-41d4-a716-446655440098" as NotificationId,
            userId: params.userId,
            channel: "mobile" as const,
            status: "pending" as const,
            payload: {
              title: params.title,
              body: params.body,
              data: params.data || {},
            },
            scheduledAt: new Date(),
            retryCount: 0,
          },
        ] as PushNotificationJob[]);
      };

      // Act
      const result = await sendPushNotification(context, {
        userId: validUserId,
        ...specialContent,
      });

      // Assert - Content should be preserved exactly
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value[0].payload.title).toBe(specialContent.title);
        expect(result.value[0].payload.body).toBe(specialContent.body);
        expect(result.value[0].payload.data).toEqual(specialContent.data);
      }
    });

    it("should handle user targeting correctly", async () => {
      // Arrange
      const targetUser = validUserId;
      const excludedUser = "550e8400-e29b-41d4-a716-446655440099" as UserId;

      context.pushNotificationService.sendPushNotification = async (params) => {
        // Should only target specified user
        expect(params.userId).toBe(targetUser);
        expect(params.userId).not.toBe(excludedUser);

        return ok([
          {
            id: `targeted-${params.userId}`,
            notificationId:
              "550e8400-e29b-41d4-a716-446655440098" as NotificationId,
            userId: params.userId,
            channel: "mobile" as const,
            status: "pending" as const,
            payload: {
              title: params.title,
              body: params.body,
              data: params.data || {},
            },
            scheduledAt: new Date(),
            retryCount: 0,
          },
        ] as PushNotificationJob[]);
      };

      // Act
      const result = await sendPushNotification(context, {
        userId: targetUser,
        title: "Targeted Message",
        body: "This message is for specific users only",
      });

      // Assert - Only targeted user should receive notification
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0].userId).toBe(targetUser);
      }
    });
  });
});
