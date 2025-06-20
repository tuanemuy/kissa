import { MockModerationRepository } from "@/core/adapters/mock/moderationRepository";
import { MockNotificationRepository } from "@/core/adapters/mock/notificationRepository";
import { MockUserRepository } from "@/core/adapters/mock/userRepository";
import type {
  ModerationItem,
  ModerationItemId,
} from "@/core/domain/moderation/types";
import type { Notification } from "@/core/domain/notification/types";
import type { User, UserId } from "@/core/domain/user/types";
import { ApplicationError } from "@/lib/error";
import { RepositoryError } from "@/lib/error";
import { err, ok } from "neverthrow";
import { beforeEach, describe, expect, it } from "vitest";
import type { Context } from "../context";
import { reportContent } from "./reportContent";

describe("reportContent", () => {
  let context: Context;

  const reporterUser: User = {
    id: "550e8400-e29b-41d4-a716-446655440001" as UserId,
    name: "Reporter User",
    email: "reporter@example.com",
    role: "editor",
    subscription: "basic",
    profilePhotoUrl: null,
    isActive: true,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockModerationItem: ModerationItem = {
    id: "550e8400-e29b-41d4-a716-446655440003" as ModerationItemId,
    contentType: "region",
    contentId: "region-123",
    reportedBy: reporterUser.id,
    reason: "inappropriate_content",
    description: "Contains offensive language",
    status: "under_review",
    priority: "medium",
    assignedTo: null,
    moderatorNotes: null,
    resolution: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    context = {
      userRepository: new MockUserRepository(),
      moderationRepository: new MockModerationRepository(),
      notificationRepository: new MockNotificationRepository(),
    } as Context;
  });

  describe("successful content reporting", () => {
    it("should report content with valid user", async () => {
      // Arrange
      context.userRepository.findById = async () => ok(reporterUser);
      context.moderationRepository.findByContent = async () => ok(null);
      context.moderationRepository.create = async () => ok(mockModerationItem);
      context.notificationRepository.create = async () => ok({} as unknown as Notification);

      // Act
      const result = await reportContent(context, {
        contentType: "region",
        contentId: "region-123",
        reportedBy: reporterUser.id,
        reason: "inappropriate_content",
        description: "Contains offensive language",
      });

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.contentType).toBe("region");
        expect(result.value.contentId).toBe("region-123");
        expect(result.value.reportedBy).toBe(reporterUser.id);
        expect(result.value.reason).toBe("inappropriate_content");
        expect(result.value.status).toBe("under_review");
      }
    });

    it("should report content without user (anonymous)", async () => {
      // Arrange
      const anonymousReport = { ...mockModerationItem, reportedBy: null };
      context.moderationRepository.findByContent = async () => ok(null);
      context.moderationRepository.create = async () => ok(anonymousReport);

      // Act
      const result = await reportContent(context, {
        contentType: "region",
        contentId: "region-123",
        reason: "spam",
        description: "Promotional spam content",
      });

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.reportedBy).toBeNull();
        expect(result.value.reason).toBe("spam");
      }
    });

    it("should return existing moderation if content already under review", async () => {
      // Arrange
      const existingModeration = {
        ...mockModerationItem,
        status: "pending" as const,
      };
      context.userRepository.findById = async () => ok(reporterUser);
      context.moderationRepository.findByContent = async () =>
        ok(existingModeration);

      // Act
      const result = await reportContent(context, {
        contentType: "region",
        contentId: "region-123",
        reportedBy: reporterUser.id,
        reason: "inappropriate_content",
        description: "Contains offensive language",
      });

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.id).toBe(existingModeration.id);
        expect(result.value.status).toBe("pending");
      }
    });

    it("should create new moderation if previous was resolved", async () => {
      // Arrange
      const resolvedModeration = {
        ...mockModerationItem,
        status: "approved" as const,
      };
      context.userRepository.findById = async () => ok(reporterUser);
      context.moderationRepository.findByContent = async () =>
        ok(resolvedModeration);
      context.moderationRepository.create = async () => ok(mockModerationItem);
      context.notificationRepository.create = async () => ok({} as unknown as Notification);

      // Act
      const result = await reportContent(context, {
        contentType: "region",
        contentId: "region-123",
        reportedBy: reporterUser.id,
        reason: "inappropriate_content",
        description: "New report on previously reviewed content",
      });

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.status).toBe("under_review");
      }
    });

    it("should handle different content types", async () => {
      // Test different content types
      const contentTypes = [
        { type: "region" as const, id: "region-123" },
        { type: "location" as const, id: "location-456" },
        { type: "checkin" as const, id: "checkin-789" },
      ];

      for (const { type, id } of contentTypes) {
        // Arrange
        const typeSpecificItem = {
          ...mockModerationItem,
          contentType: type,
          contentId: id,
        };
        context.userRepository.findById = async () => ok(reporterUser);
        context.moderationRepository.findByContent = async () => ok(null);
        context.moderationRepository.create = async () => ok(typeSpecificItem);
        context.notificationRepository.create = async () => ok({} as unknown as Notification);

        // Act
        const result = await reportContent(context, {
          contentType: type,
          contentId: id,
          reportedBy: reporterUser.id,
          reason: "inappropriate_content",
          description: `Report for ${type}`,
        });

        // Assert
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.contentType).toBe(type);
          expect(result.value.contentId).toBe(id);
        }
      }
    });

    it("should handle different report reasons", async () => {
      // Test different report reasons
      const reasons = [
        "inappropriate_content",
        "spam",
        "harassment",
        "copyright_violation",
        "false_information",
      ] as const;

      for (const reason of reasons) {
        // Arrange
        const reasonSpecificItem = { ...mockModerationItem, reason };
        context.userRepository.findById = async () => ok(reporterUser);
        context.moderationRepository.findByContent = async () => ok(null);
        context.moderationRepository.create = async () =>
          ok(reasonSpecificItem);
        context.notificationRepository.create = async () => ok({} as unknown as Notification);

        // Act
        const result = await reportContent(context, {
          contentType: "region",
          contentId: "region-123",
          reportedBy: reporterUser.id,
          reason,
          description: `Report for ${reason}`,
        });

        // Assert
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.reason).toBe(reason);
        }
      }
    });
  });

  describe("validation errors", () => {
    it("should fail with invalid content type", async () => {
      // Act
      const result = await reportContent(context, {
        contentType: "invalid_type" as unknown as "region" | "location" | "checkin",
        contentId: "content-123",
        reportedBy: reporterUser.id,
        reason: "inappropriate_content",
        description: "Test report",
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid report content input");
      }
    });

    it("should fail with empty content ID", async () => {
      // Act
      const result = await reportContent(context, {
        contentType: "region",
        contentId: "",
        reportedBy: reporterUser.id,
        reason: "inappropriate_content",
        description: "Test report",
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid report content input");
      }
    });

    it("should fail with invalid reason", async () => {
      // Act
      const result = await reportContent(context, {
        contentType: "region",
        contentId: "region-123",
        reportedBy: reporterUser.id,
        reason: "invalid_reason" as unknown as "inappropriate_content" | "spam" | "harassment" | "copyright_violation" | "false_information",
        description: "Test report",
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid report content input");
      }
    });

    it("should fail with empty description", async () => {
      // Act
      const result = await reportContent(context, {
        contentType: "region",
        contentId: "region-123",
        reportedBy: reporterUser.id,
        reason: "inappropriate_content",
        description: "",
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid report content input");
      }
    });
  });

  describe("user verification errors", () => {
    it("should fail when reporting user not found", async () => {
      // Arrange
      context.userRepository.findById = async () => ok(null);

      // Act
      const result = await reportContent(context, {
        contentType: "region",
        contentId: "region-123",
        reportedBy: reporterUser.id,
        reason: "inappropriate_content",
        description: "Test report",
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Reporting user not found");
      }
    });

    it("should fail when user repository fails", async () => {
      // Arrange
      context.userRepository.findById = async () =>
        err(new RepositoryError("Database error"));

      // Act
      const result = await reportContent(context, {
        contentType: "region",
        contentId: "region-123",
        reportedBy: reporterUser.id,
        reason: "inappropriate_content",
        description: "Test report",
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to verify reporting user");
      }
    });
  });

  describe("repository errors", () => {
    it("should fail when checking existing moderation fails", async () => {
      // Arrange
      context.userRepository.findById = async () => ok(reporterUser);
      context.moderationRepository.findByContent = async () =>
        err(new RepositoryError("Database error"));

      // Act
      const result = await reportContent(context, {
        contentType: "region",
        contentId: "region-123",
        reportedBy: reporterUser.id,
        reason: "inappropriate_content",
        description: "Test report",
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe(
          "Failed to check existing moderation",
        );
      }
    });

    it("should fail when creating moderation item fails", async () => {
      // Arrange
      context.userRepository.findById = async () => ok(reporterUser);
      context.moderationRepository.findByContent = async () => ok(null);
      context.moderationRepository.create = async () =>
        err(new RepositoryError("Database error"));

      // Act
      const result = await reportContent(context, {
        contentType: "region",
        contentId: "region-123",
        reportedBy: reporterUser.id,
        reason: "inappropriate_content",
        description: "Test report",
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to create moderation item");
      }
    });
  });

  describe("formal specification compliance", () => {
    it("should enforce business rules for content reporting", async () => {
      // Arrange
      context.userRepository.findById = async () => ok(reporterUser);
      context.moderationRepository.findByContent = async () => ok(null);
      context.moderationRepository.create = async () => ok(mockModerationItem);
      context.notificationRepository.create = async () => ok({} as unknown as Notification);

      // Act
      const result = await reportContent(context, {
        contentType: "region",
        contentId: "region-123",
        reportedBy: reporterUser.id,
        reason: "inappropriate_content",
        description: "Contains offensive language",
      });

      // Assert - Verify business rules are followed
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // New reports should start with "under_review" status
        expect(result.value.status).toBe("under_review");
        // Should have required fields
        expect(result.value.contentType).toBeDefined();
        expect(result.value.contentId).toBeDefined();
        expect(result.value.reason).toBeDefined();
        expect(result.value.description).toBeDefined();
        expect(result.value.createdAt).toBeInstanceOf(Date);
      }
    });

    it("should maintain system invariants during reporting", async () => {
      // Arrange
      context.userRepository.findById = async () => ok(reporterUser);
      context.moderationRepository.findByContent = async (
        contentType,
        contentId,
      ) => {
        // Verify content identification parameters
        expect(contentType).toBe("region");
        expect(contentId).toBe("region-123");
        return ok(null);
      };
      context.moderationRepository.create = async (params) => {
        // Verify creation parameters match input
        expect(params.contentType).toBe("region");
        expect(params.contentId).toBe("region-123");
        expect(params.reportedBy).toBe(reporterUser.id);
        return ok(mockModerationItem);
      };
      context.notificationRepository.create = async () => ok({} as unknown as Notification);

      // Act
      const result = await reportContent(context, {
        contentType: "region",
        contentId: "region-123",
        reportedBy: reporterUser.id,
        reason: "inappropriate_content",
        description: "Test report",
      });

      // Assert - System state should remain consistent
      expect(result.isOk()).toBe(true);
    });

    it("should prevent duplicate pending reports", async () => {
      // Arrange
      const pendingModeration = {
        ...mockModerationItem,
        status: "pending" as const,
      };
      context.userRepository.findById = async () => ok(reporterUser);
      context.moderationRepository.findByContent = async () =>
        ok(pendingModeration);

      // Act
      const result = await reportContent(context, {
        contentType: "region",
        contentId: "region-123",
        reportedBy: reporterUser.id,
        reason: "inappropriate_content",
        description: "Duplicate report",
      });

      // Assert - Should return existing pending moderation
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.id).toBe(pendingModeration.id);
        expect(result.value.status).toBe("pending");
      }
    });

    it("should handle notification workflow correctly", async () => {
      // Arrange
      let notificationCreated = false;
      context.userRepository.findById = async () => ok(reporterUser);
      context.moderationRepository.findByContent = async () => ok(null);
      context.moderationRepository.create = async () => ok(mockModerationItem);
      context.notificationRepository.create = async (params) => {
        // Verify notification contains correct information
        expect(params.userId).toBe(reporterUser.id);
        expect(params.type).toBe("content_moderation");
        expect(params.data.moderationItemId).toBe(mockModerationItem.id);
        expect(params.data.contentType).toBe("region");
        expect(params.data.contentId).toBe("region-123");
        notificationCreated = true;
        return ok({} as unknown as Notification);
      };

      // Act
      const result = await reportContent(context, {
        contentType: "region",
        contentId: "region-123",
        reportedBy: reporterUser.id,
        reason: "inappropriate_content",
        description: "Test report",
      });

      // Assert - Notification should be created for reporting user
      expect(result.isOk()).toBe(true);
      expect(notificationCreated).toBe(true);
    });

    it("should handle anonymous reports correctly", async () => {
      // Arrange
      let notificationAttempted = false;
      const anonymousReport = { ...mockModerationItem, reportedBy: null };
      context.moderationRepository.findByContent = async () => ok(null);
      context.moderationRepository.create = async () => ok(anonymousReport);
      context.notificationRepository.create = async () => {
        notificationAttempted = true;
        return ok({} as unknown as Notification);
      };

      // Act
      const result = await reportContent(context, {
        contentType: "region",
        contentId: "region-123",
        reason: "inappropriate_content",
        description: "Anonymous report",
      });

      // Assert - No notification should be sent for anonymous reports
      expect(result.isOk()).toBe(true);
      expect(notificationAttempted).toBe(false);
      if (result.isOk()) {
        expect(result.value.reportedBy).toBeNull();
      }
    });
  });
});
