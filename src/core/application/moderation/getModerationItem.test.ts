// Mock moderation repository will be created inline
import type {
  ModerationItem,
  ModerationItemId,
} from "@/core/domain/moderation/types";
import type { UserId } from "@/core/domain/user/types";
import { ApplicationError } from "@/lib/error";
import { RepositoryError } from "@/lib/error";
import { err, ok } from "neverthrow";
import { beforeEach, describe, expect, it } from "vitest";
import type { Context } from "../context";
import { getModerationItem } from "./getModerationItem";

describe("getModerationItem", () => {
  let context: Context;

  const validModerationItemId =
    "550e8400-e29b-41d4-a716-446655440001" as ModerationItemId;
  const reporterUserId = "550e8400-e29b-41d4-a716-446655440002" as UserId;

  const mockModerationItem: ModerationItem = {
    id: validModerationItemId,
    contentType: "region",
    contentId: "region-123",
    status: "pending",
    reportedBy: reporterUserId,
    reportReason: "Contains offensive language",
    moderatedBy: null,
    moderationNote: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    context = {
      moderationRepository: {
        findById: async () => ok(mockModerationItem),
        create: async () => ok(mockModerationItem),
        update: async () => ok(mockModerationItem),
        list: async () => ok({ items: [mockModerationItem], count: 1 }),
        findByContent: async () => ok(null),
      },
    } as Partial<Context> as Context;
  });

  describe("successful retrieval", () => {
    it("should get existing moderation item", async () => {
      // Arrange
      context.moderationRepository.findById = async () =>
        ok(mockModerationItem);

      // Act
      const result = await getModerationItem(context, validModerationItemId);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual(mockModerationItem);
        expect(result.value?.id).toBe(validModerationItemId);
        expect(result.value?.status).toBe("under_review");
      }
    });

    it("should return null for non-existent moderation item", async () => {
      // Arrange
      context.moderationRepository.findById = async () => ok(null);

      // Act
      const result = await getModerationItem(context, validModerationItemId);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBeNull();
      }
    });

    it("should get approved moderation item", async () => {
      // Arrange
      const approvedItem: ModerationItem = {
        ...mockModerationItem,
        status: "approved",
        moderationNote: "Content reviewed and deemed appropriate",
      };
      context.moderationRepository.findById = async () => ok(approvedItem);

      // Act
      const result = await getModerationItem(context, validModerationItemId);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value?.status).toBe("approved");
        expect(result.value?.moderationNote).toBe(
          "Content reviewed and deemed appropriate",
        );
      }
    });

    it("should get rejected moderation item", async () => {
      // Arrange
      const rejectedItem: ModerationItem = {
        ...mockModerationItem,
        status: "rejected",
        moderationNote: "Violated community guidelines section 3.2",
      };
      context.moderationRepository.findById = async () => ok(rejectedItem);

      // Act
      const result = await getModerationItem(context, validModerationItemId);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value?.status).toBe("rejected");
        expect(result.value?.moderationNote).toBe(
          "Violated community guidelines section 3.2",
        );
      }
    });
  });

  describe("validation errors", () => {
    it("should fail with invalid moderation item ID", async () => {
      // Act
      const result = await getModerationItem(
        context,
        "invalid-id" as ModerationItemId,
      );

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid moderation item ID");
      }
    });

    it("should fail with empty moderation item ID", async () => {
      // Act
      const result = await getModerationItem(context, "" as ModerationItemId);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid moderation item ID");
      }
    });
  });

  describe("repository errors", () => {
    it("should fail when repository throws error", async () => {
      // Arrange
      context.moderationRepository.findById = async () =>
        err(new RepositoryError("Database connection failed"));

      // Act
      const result = await getModerationItem(context, validModerationItemId);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to get moderation item");
      }
    });

    it("should fail when repository is unavailable", async () => {
      // Arrange
      context.moderationRepository.findById = async () =>
        err(new RepositoryError("Service temporarily unavailable"));

      // Act
      const result = await getModerationItem(context, validModerationItemId);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to get moderation item");
      }
    });
  });

  describe("formal specification compliance", () => {
    it("should enforce business rules for moderation item retrieval", async () => {
      // Arrange
      context.moderationRepository.findById = async () =>
        ok(mockModerationItem);

      // Act
      const result = await getModerationItem(context, validModerationItemId);

      // Assert - Verify business rules are followed
      expect(result.isOk()).toBe(true);
      if (result.isOk() && result.value) {
        // Should contain all required fields
        expect(result.value.id).toBeDefined();
        expect(result.value.contentType).toBeDefined();
        expect(result.value.contentId).toBeDefined();
        expect(result.value.reportedBy).toBeDefined();
        expect(result.value.reportReason).toBeDefined();
        expect(result.value.status).toBeDefined();
        expect(result.value.status).toBeDefined();
        expect(result.value.createdAt).toBeInstanceOf(Date);
        expect(result.value.updatedAt).toBeInstanceOf(Date);
      }
    });

    it("should maintain system invariants during retrieval", async () => {
      // Arrange
      context.moderationRepository.findById = async (id) => {
        // Verify query parameters match business logic
        expect(id).toBe(validModerationItemId);
        return ok(mockModerationItem);
      };

      // Act
      const result = await getModerationItem(context, validModerationItemId);

      // Assert - System state should remain consistent
      expect(result.isOk()).toBe(true);
    });

    it("should handle different content types correctly", async () => {
      // Test different content types
      const contentTypes = ["region", "location", "checkIn"] as const;

      for (const contentType of contentTypes) {
        // Arrange
        const typeSpecificItem: ModerationItem = {
          ...mockModerationItem,
          contentType,
          contentId: `${contentType}-123`,
        };
        context.moderationRepository.findById = async () =>
          ok(typeSpecificItem);

        // Act
        const result = await getModerationItem(context, validModerationItemId);

        // Assert
        expect(result.isOk()).toBe(true);
        if (result.isOk() && result.value) {
          expect(result.value.contentType).toBe(contentType);
          expect(result.value.contentId).toBe(`${contentType}-123`);
        }
      }
    });

    it("should preserve moderation workflow states", async () => {
      // Test different workflow states
      const workflowStates = [
        { status: "pending" as const, moderatedBy: null },
        { status: "approved" as const, moderatedBy: "mod-123" as UserId },
        { status: "rejected" as const, moderatedBy: "mod-456" as UserId },
      ];

      for (const { status, moderatedBy } of workflowStates) {
        // Arrange
        const stateSpecificItem: ModerationItem = {
          ...mockModerationItem,
          status,
          moderatedBy,
        };
        context.moderationRepository.findById = async () =>
          ok(stateSpecificItem);

        // Act
        const result = await getModerationItem(context, validModerationItemId);

        // Assert
        expect(result.isOk()).toBe(true);
        if (result.isOk() && result.value) {
          expect(result.value.status).toBe(status);
          expect(result.value.moderatedBy).toBe(moderatedBy);
        }
      }
    });

    it("should ensure data integrity for retrieved items", async () => {
      // Arrange
      const completeItem: ModerationItem = {
        ...mockModerationItem,
        status: "rejected",
        moderatedBy: "moderator-789" as UserId,
        moderationNote: "Detailed moderation notes",
      };
      context.moderationRepository.findById = async () => ok(completeItem);

      // Act
      const result = await getModerationItem(context, validModerationItemId);

      // Assert - All data should be preserved correctly
      expect(result.isOk()).toBe(true);
      if (result.isOk() && result.value) {
        expect(result.value.id).toBe(completeItem.id);
        expect(result.value.contentType).toBe(completeItem.contentType);
        expect(result.value.contentId).toBe(completeItem.contentId);
        expect(result.value.reportedBy).toBe(completeItem.reportedBy);
        expect(result.value.reason).toBe(completeItem.reason);
        expect(result.value.status).toBe(completeItem.status);
        expect(result.value.assignedTo).toBe(completeItem.assignedTo);
        expect(result.value.moderatorNotes).toBe(completeItem.moderatorNotes);
        expect(result.value.resolution).toBe(completeItem.resolution);
      }
    });
  });
});
