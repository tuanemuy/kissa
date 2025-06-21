import { MockModerationRepository } from "@/core/adapters/mock/moderationRepository";
import type {
  ModerationItem,
  ModerationItemId,
} from "@/core/domain/moderation/types";
import type { User, UserId } from "@/core/domain/user/types";
import { ApplicationError } from "@/lib/error";
import { beforeEach, describe, expect, it } from "vitest";
import type { Context } from "../context";
import { createMockContext } from "../testUtils/mockContext";
import { moderateContent } from "./moderateContent";

describe("moderateContent", () => {
  let context: Context;
  let mockModerationRepository: MockModerationRepository;
  let mockModerator: User;
  let mockModerationItem: ModerationItem;

  beforeEach(() => {
    mockModerator = {
      id: "admin-user-id" as UserId,
      name: "Admin User",
      email: "admin@example.com",
      role: "admin",
      subscription: "free",
      profilePhotoUrl: null,
      isActive: true,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockModerationItem = {
      id: "moderation-item-1" as ModerationItemId,
      contentType: "region",
      contentId: "region-1",
      status: "pending",
      reportedBy: "reporter-user-id" as UserId,
      moderatedBy: null,
      reportReason: "Inappropriate content",
      moderationNote: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockModerationRepository = new MockModerationRepository();
    mockModerationRepository.addItem(mockModerationItem);

    context = createMockContext({
      moderationRepository: mockModerationRepository,
    });
  });

  describe("successful moderation", () => {
    it("should approve content successfully", async () => {
      // Arrange
      const input = {
        id: mockModerationItem.id,
        moderatedBy: mockModerator.id,
        status: "approved" as const,
        moderationNote: "Content is appropriate",
      };

      // Act
      const result = await moderateContent(context, input);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.status).toBe("approved");
        expect(result.value.moderatedBy).toBe(mockModerator.id);
        expect(result.value.moderationNote).toBe("Content is appropriate");
      }
    });

    it("should reject content successfully", async () => {
      // Arrange
      const input = {
        id: mockModerationItem.id,
        moderatedBy: mockModerator.id,
        status: "rejected" as const,
        moderationNote: "Content violates guidelines",
      };

      // Act
      const result = await moderateContent(context, input);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.status).toBe("rejected");
        expect(result.value.moderatedBy).toBe(mockModerator.id);
        expect(result.value.moderationNote).toBe("Content violates guidelines");
      }
    });

    it("should allow moderation without note", async () => {
      // Arrange
      const input = {
        id: mockModerationItem.id,
        moderatedBy: mockModerator.id,
        status: "approved" as const,
      };

      // Act
      const result = await moderateContent(context, input);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.status).toBe("approved");
        expect(result.value.moderatedBy).toBe(mockModerator.id);
      }
    });
  });

  describe("validation errors", () => {
    it("should fail with invalid moderation item ID", async () => {
      // Arrange
      const input = {
        id: "invalid-id" as ModerationItemId,
        moderatedBy: mockModerator.id,
        status: "approved" as const,
      };

      // Act
      const result = await moderateContent(context, input);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid moderation input");
      }
    });

    it("should fail with invalid user ID", async () => {
      // Arrange
      const input = {
        id: mockModerationItem.id,
        moderatedBy: "invalid-user-id" as UserId,
        status: "approved" as const,
      };

      // Act
      const result = await moderateContent(context, input);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid moderation input");
      }
    });
  });

  describe("business rules", () => {
    it("should handle moderation item not found", async () => {
      // Arrange
      const nonExistentId = "non-existent-id" as ModerationItemId;
      const input = {
        id: nonExistentId,
        moderatedBy: mockModerator.id,
        status: "approved" as const,
      };

      // Act
      const result = await moderateContent(context, input);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Moderation item not found");
      }
    });
  });

  describe("repository errors", () => {
    it("should handle repository failure", async () => {
      // Arrange
      mockModerationRepository.setShouldFail(true);
      const input = {
        id: mockModerationItem.id,
        moderatedBy: mockModerator.id,
        status: "approved" as const,
      };

      // Act
      const result = await moderateContent(context, input);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to find moderation item");
      }
    });
  });
});
