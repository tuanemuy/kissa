import type { DeviceToken } from "@/core/domain/notification/types";
import type { UserId } from "@/core/domain/user/types";
import { AnyError } from "@/lib/errors";
import { err, ok } from "neverthrow";
import { beforeEach, describe, expect, it } from "vitest";
import type { Context } from "../context";
import { createMockContext } from "../testUtils/mockContext";
import { registerDeviceToken } from "./registerDeviceToken";

// Mock push notification service
class MockPushNotificationService {
  async registerDeviceToken(
    userId: UserId,
    token: string,
    platform: "web" | "ios" | "android",
  ) {
    return ok({
      id: "device-token-123",
      userId,
      token,
      platform,
      isActive: true,
      createdAt: new Date(),
      lastUsedAt: new Date(),
    } as DeviceToken);
  }

  async unregisterDeviceToken() {
    return ok(undefined);
  }

  async getUserDeviceTokens() {
    return ok([]);
  }

  async sendPushNotification() {
    return ok([]);
  }

  async sendToChannel(
    // biome-ignore lint/suspicious/noExplicitAny: Mock method accepts any channel for testing
    channel: any,
    userId: string,
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ) {
    return ok({
      id: "push-job-123",
      // biome-ignore lint/suspicious/noExplicitAny: Mock ID for testing
      notificationId: "notification-123" as any,
      // biome-ignore lint/suspicious/noExplicitAny: Mock user ID for testing
      userId: userId as any,
      channel,
      status: "pending" as const,
      payload: { title, body, data },
      scheduledAt: new Date(),
      retryCount: 0,
    });
  }

  async getNotificationStatus() {
    return ok({
      id: "push-job-123",
      // biome-ignore lint/suspicious/noExplicitAny: Mock ID for testing
      notificationId: "notification-123" as any,
      // biome-ignore lint/suspicious/noExplicitAny: Mock user ID for testing
      userId: "user-123" as any,
      channel: "web" as const,
      status: "pending" as const,
      payload: {},
      scheduledAt: new Date(),
      retryCount: 0,
    });
  }

  async retryFailedNotification() {
    return ok({
      id: "push-job-123",
      // biome-ignore lint/suspicious/noExplicitAny: Mock ID for testing
      notificationId: "notification-123" as any,
      // biome-ignore lint/suspicious/noExplicitAny: Mock user ID for testing
      userId: "user-123" as any,
      channel: "web" as const,
      status: "pending" as const,
      payload: {},
      scheduledAt: new Date(),
      retryCount: 1,
    });
  }

  async processNotificationQueue() {
    return ok(0);
  }

  async updateDeliveryStatus() {
    return ok(undefined);
  }
}

describe("registerDeviceToken", () => {
  let context: Context;

  const validUserId = "550e8400-e29b-41d4-a716-446655440001" as UserId;
  const validToken = "FCM_TOKEN_ABCD1234567890";

  beforeEach(() => {
    context = createMockContext({
      pushNotificationService: new MockPushNotificationService(),
    });
  });

  describe("successful registrations", () => {
    it("should register web device token", async () => {
      // Act
      const result = await registerDeviceToken(context, {
        userId: validUserId,
        token: validToken,
        platform: "web",
      });

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.userId).toBe(validUserId);
        expect(result.value.token).toBe(validToken);
        expect(result.value.platform).toBe("web");
        expect(result.value.isActive).toBe(true);
      }
    });

    it("should register iOS device token", async () => {
      // Act
      const result = await registerDeviceToken(context, {
        userId: validUserId,
        token: "APNS_TOKEN_ABCD1234567890",
        platform: "ios",
      });

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.platform).toBe("ios");
      }
    });

    it("should register Android device token", async () => {
      // Act
      const result = await registerDeviceToken(context, {
        userId: validUserId,
        token: "FCM_ANDROID_TOKEN_ABCD1234567890",
        platform: "android",
      });

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.platform).toBe("android");
      }
    });

    it("should handle long device tokens", async () => {
      // Arrange
      const longToken = "A".repeat(500);

      // Act
      const result = await registerDeviceToken(context, {
        userId: validUserId,
        token: longToken,
        platform: "web",
      });

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.token).toBe(longToken);
      }
    });
  });

  describe("validation errors", () => {
    it("should fail with invalid userId", async () => {
      // Act
      const result = await registerDeviceToken(context, {
        userId: "invalid-id" as UserId,
        token: validToken,
        platform: "web",
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(AnyError);
        expect(result.error.message).toBe("Invalid device token input");
      }
    });

    it("should fail with empty token", async () => {
      // Act
      const result = await registerDeviceToken(context, {
        userId: validUserId,
        token: "",
        platform: "web",
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(AnyError);
        expect(result.error.message).toBe("Invalid device token input");
      }
    });

    it("should fail with invalid platform", async () => {
      // Act
      const result = await registerDeviceToken(context, {
        userId: validUserId,
        token: validToken,
        platform: "invalid" as unknown as "web" | "ios" | "android",
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(AnyError);
        expect(result.error.message).toBe("Invalid device token input");
      }
    });

    it("should fail with missing required fields", async () => {
      // Act
      const result = await registerDeviceToken(context, {
        userId: validUserId,
        platform: "web",
      } as unknown as Parameters<typeof registerDeviceToken>[1]);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(AnyError);
        expect(result.error.message).toBe("Invalid device token input");
      }
    });
  });

  describe("push notification service errors", () => {
    it("should fail when push notification service fails", async () => {
      // Arrange
      context.pushNotificationService.registerDeviceToken = async () =>
        err(new AnyError("Push service error"));

      // Act
      const result = await registerDeviceToken(context, {
        userId: validUserId,
        token: validToken,
        platform: "web",
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(AnyError);
        expect(result.error.message).toBe("Push service error");
      }
    });

    it("should fail on duplicate token registration", async () => {
      // Arrange
      context.pushNotificationService.registerDeviceToken = async () =>
        err(new AnyError("Token already registered"));

      // Act
      const result = await registerDeviceToken(context, {
        userId: validUserId,
        token: validToken,
        platform: "web",
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Token already registered");
      }
    });

    it("should fail on invalid token format", async () => {
      // Arrange
      context.pushNotificationService.registerDeviceToken = async () =>
        err(new AnyError("Invalid token format"));

      // Act
      const result = await registerDeviceToken(context, {
        userId: validUserId,
        token: "invalid-format-token",
        platform: "ios",
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Invalid token format");
      }
    });
  });

  describe("formal specification compliance", () => {
    it("should enforce business rules for device token registration", async () => {
      // Act
      const result = await registerDeviceToken(context, {
        userId: validUserId,
        token: validToken,
        platform: "web",
      });

      // Assert - Verify business rules are followed
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // Token should be associated with correct user
        expect(result.value.userId).toBe(validUserId);
        // Token should be active upon registration
        expect(result.value.isActive).toBe(true);
        // Platform should match input
        expect(result.value.platform).toBe("web");
        // Should have timestamps
        expect(result.value.createdAt).toBeInstanceOf(Date);
        expect(result.value.lastUsedAt).toBeInstanceOf(Date);
      }
    });

    it("should maintain system invariants during registration", async () => {
      // Arrange
      context.pushNotificationService.registerDeviceToken = async (
        userId,
        token,
        platform,
      ) => {
        // Verify registration parameters match business logic
        expect(userId).toBe(validUserId);
        expect(token).toBe(validToken);
        expect(["web", "ios", "android"]).toContain(platform);

        return ok({
          id: "device-token-456",
          userId: userId as UserId,
          token,
          platform,
          isActive: true,
          createdAt: new Date(),
          lastUsedAt: new Date(),
        } as DeviceToken);
      };

      // Act
      const result = await registerDeviceToken(context, {
        userId: validUserId,
        token: validToken,
        platform: "web",
      });

      // Assert - System state should remain consistent
      expect(result.isOk()).toBe(true);
    });

    it("should handle platform-specific token formats", async () => {
      // Test different platforms with appropriate token formats
      const platforms = [
        { platform: "web" as const, tokenPrefix: "WEB_" },
        { platform: "ios" as const, tokenPrefix: "APNS_" },
        { platform: "android" as const, tokenPrefix: "FCM_" },
      ];

      for (const { platform, tokenPrefix } of platforms) {
        const platformToken = `${tokenPrefix}TOKEN_123456789`;

        // Act
        const result = await registerDeviceToken(context, {
          userId: validUserId,
          token: platformToken,
          platform,
        });

        // Assert
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.platform).toBe(platform);
          expect(result.value.token).toBe(platformToken);
        }
      }
    });

    it("should ensure user-token association integrity", async () => {
      // Arrange
      const otherUserId = "550e8400-e29b-41d4-a716-446655440002" as UserId;

      context.pushNotificationService.registerDeviceToken = async (userId) => {
        // Each token should be properly associated with the requesting user
        expect([validUserId, otherUserId]).toContain(userId);

        return ok({
          id: `device-token-${userId}`,
          userId: userId as UserId,
          token: validToken,
          platform: "web",
          isActive: true,
          createdAt: new Date(),
          lastUsedAt: new Date(),
        } as DeviceToken);
      };

      // Act - Register tokens for different users
      const result1 = await registerDeviceToken(context, {
        userId: validUserId,
        token: validToken,
        platform: "web",
      });

      const result2 = await registerDeviceToken(context, {
        userId: otherUserId,
        token: validToken,
        platform: "web",
      });

      // Assert - Each registration should be isolated per user
      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.userId).toBe(validUserId);
        expect(result2.value.userId).toBe(otherUserId);
      }
    });
  });
});
