import { MockModerationRepository } from "@/core/adapters/mock/moderationRepository";
import type {
  ModerationItem,
  ModerationItemId,
} from "@/core/domain/moderation/types";
import type { UserId } from "@/core/domain/user/types";
import { ApplicationError } from "@/lib/error";
import { beforeEach, describe, expect, it } from "vitest";
import type { Context } from "../context";
import { createMockContext } from "../testUtils/mockContext";
import { reportContent } from "./reportContent";

describe("reportContent", () => {
  let context: Context;
  let mockModerationRepository: MockModerationRepository;
  const reporterUserId = "reporter-user-id" as UserId;

  beforeEach(() => {
    mockModerationRepository = new MockModerationRepository();

    context = createMockContext({
      moderationRepository: mockModerationRepository,
    });
  });

  describe("successful reporting", () => {
    it("should report region content successfully", async () => {
      // Arrange
      const input = {
        contentType: "region" as const,
        contentId: "region-123",
        reportedBy: reporterUserId,
        reportReason: "Inappropriate content",
      };

      // Act
      const result = await reportContent(context, input);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.contentType).toBe("region");
        expect(result.value.contentId).toBe("region-123");
        expect(result.value.status).toBe("pending");
        expect(result.value.reportedBy).toBe(reporterUserId);
        expect(result.value.reportReason).toBe("Inappropriate content");
      }
    });

    it("should report location content successfully", async () => {
      // Arrange
      const input = {
        contentType: "location" as const,
        contentId: "location-456",
        reportedBy: reporterUserId,
        reportReason: "Spam content",
      };

      // Act
      const result = await reportContent(context, input);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.contentType).toBe("location");
        expect(result.value.contentId).toBe("location-456");
        expect(result.value.status).toBe("pending");
        expect(result.value.reportedBy).toBe(reporterUserId);
        expect(result.value.reportReason).toBe("Spam content");
      }
    });

    it("should report checkIn content successfully", async () => {
      // Arrange
      const input = {
        contentType: "checkIn" as const,
        contentId: "checkin-789",
        reportedBy: reporterUserId,
        reportReason: "Offensive language",
      };

      // Act
      const result = await reportContent(context, input);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.contentType).toBe("checkIn");
        expect(result.value.contentId).toBe("checkin-789");
        expect(result.value.status).toBe("pending");
        expect(result.value.reportedBy).toBe(reporterUserId);
        expect(result.value.reportReason).toBe("Offensive language");
      }
    });

    it("should report content without reporter", async () => {
      // Arrange
      const input = {
        contentType: "region" as const,
        contentId: "region-123",
        reportReason: "Anonymous report",
      };

      // Act
      const result = await reportContent(context, input);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.contentType).toBe("region");
        expect(result.value.contentId).toBe("region-123");
        expect(result.value.status).toBe("pending");
        expect(result.value.reportedBy).toBe(null);
        expect(result.value.reportReason).toBe("Anonymous report");
      }
    });

    it("should report content without reason", async () => {
      // Arrange
      const input = {
        contentType: "location" as const,
        contentId: "location-456",
        reportedBy: reporterUserId,
      };

      // Act
      const result = await reportContent(context, input);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.contentType).toBe("location");
        expect(result.value.contentId).toBe("location-456");
        expect(result.value.status).toBe("pending");
        expect(result.value.reportedBy).toBe(reporterUserId);
        expect(result.value.reportReason).toBe(null);
      }
    });
  });

  describe("validation errors", () => {
    it("should fail with invalid content type", async () => {
      // Arrange
      const input = {
        // biome-ignore lint/suspicious/noExplicitAny: Testing invalid input requires any type
        contentType: "invalid" as any,
        contentId: "content-123",
        reportedBy: reporterUserId,
        reportReason: "Test reason",
      };

      // Act
      const result = await reportContent(context, input);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid report content input");
      }
    });

    it("should fail with invalid content ID", async () => {
      // Arrange
      const input = {
        contentType: "region" as const,
        contentId: "invalid-uuid",
        reportedBy: reporterUserId,
        reportReason: "Test reason",
      };

      // Act
      const result = await reportContent(context, input);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid report content input");
      }
    });

    it("should fail with invalid user ID", async () => {
      // Arrange
      const input = {
        contentType: "region" as const,
        contentId: "550e8400-e29b-41d4-a716-446655440000",
        reportedBy: "invalid-user-id" as UserId,
        reportReason: "Test reason",
      };

      // Act
      const result = await reportContent(context, input);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid report content input");
      }
    });

    it("should fail with too long reason", async () => {
      // Arrange
      const longReason = "a".repeat(501); // Exceeds 500 character limit
      const input = {
        contentType: "region" as const,
        contentId: "550e8400-e29b-41d4-a716-446655440000",
        reportedBy: reporterUserId,
        reportReason: longReason,
      };

      // Act
      const result = await reportContent(context, input);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid report content input");
      }
    });
  });

  describe("duplicate reporting", () => {
    it("should allow multiple reports for same content", async () => {
      // Arrange
      const input1 = {
        contentType: "region" as const,
        contentId: "region-123",
        reportedBy: reporterUserId,
        reportReason: "First report",
      };

      const input2 = {
        contentType: "region" as const,
        contentId: "region-123",
        reportedBy: "another-user" as UserId,
        reportReason: "Second report",
      };

      // Act
      const result1 = await reportContent(context, input1);
      const result2 = await reportContent(context, input2);

      // Assert
      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.id).not.toBe(result2.value.id);
        expect(result1.value.contentId).toBe(result2.value.contentId);
      }
    });
  });

  describe("repository errors", () => {
    it("should handle repository failure", async () => {
      // Arrange
      mockModerationRepository.setShouldFail(true);
      const input = {
        contentType: "region" as const,
        contentId: "region-123",
        reportedBy: reporterUserId,
        reportReason: "Test reason",
      };

      // Act
      const result = await reportContent(context, input);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to create moderation item");
      }
    });
  });

  describe("business rules", () => {
    it("should create moderation item with pending status", async () => {
      // Arrange
      const input = {
        contentType: "region" as const,
        contentId: "region-123",
        reportedBy: reporterUserId,
        reportReason: "Test reason",
      };

      // Act
      const result = await reportContent(context, input);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.status).toBe("pending");
        expect(result.value.moderatedBy).toBe(null);
        expect(result.value.moderationNote).toBe(null);
        expect(result.value.createdAt).toBeInstanceOf(Date);
        expect(result.value.updatedAt).toBeInstanceOf(Date);
      }
    });

    it("should handle all supported content types", async () => {
      // Arrange
      const contentTypes = ["region", "location", "checkIn"] as const;

      // Act & Assert
      for (const contentType of contentTypes) {
        const input = {
          contentType,
          contentId: `${contentType}-123`,
          reportedBy: reporterUserId,
          reportReason: `Report for ${contentType}`,
        };

        const result = await reportContent(context, input);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.contentType).toBe(contentType);
        }
      }
    });
  });
});
