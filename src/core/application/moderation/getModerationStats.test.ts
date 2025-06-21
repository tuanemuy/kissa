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
import { getModerationStats } from "./getModerationStats";

describe("getModerationStats", () => {
  let context: Context;
  let mockModerationRepository: MockModerationRepository;

  beforeEach(() => {
    mockModerationRepository = new MockModerationRepository();
    context = createMockContext({
      moderationRepository: mockModerationRepository,
    });
  });

  describe("successful stats retrieval", () => {
    it("should get moderation stats with all counts", async () => {
      // Arrange - Add some test data
      const pendingItem: ModerationItem = {
        id: "item-1" as ModerationItemId,
        contentType: "region",
        contentId: "region-1",
        status: "pending",
        reportedBy: "user-1" as UserId,
        reportReason: "Test reason",
        moderatedBy: null,
        moderationNote: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const approvedItem: ModerationItem = {
        id: "item-2" as ModerationItemId,
        contentType: "location",
        contentId: "location-1",
        status: "approved",
        reportedBy: "user-2" as UserId,
        reportReason: "Another reason",
        moderatedBy: "mod-1" as UserId,
        moderationNote: "Approved",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockModerationRepository.addItem(pendingItem);
      mockModerationRepository.addItem(approvedItem);

      // Act
      const result = await getModerationStats(context);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.totalCount).toBe(2);
        expect(result.value.pendingCount).toBe(1);
        expect(result.value.urgentCount).toBe(0); // No items older than 24 hours
      }
    });

    it("should handle zero counts correctly", async () => {
      // Act
      const result = await getModerationStats(context);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.totalCount).toBe(0);
        expect(result.value.pendingCount).toBe(0);
        expect(result.value.urgentCount).toBe(0);
      }
    });

    it("should count different statuses correctly", async () => {
      // Arrange - Add items with different statuses
      const items: ModerationItem[] = [
        {
          id: "item-1" as ModerationItemId,
          contentType: "region",
          contentId: "region-1",
          status: "pending",
          reportedBy: "user-1" as UserId,
          reportReason: "Test",
          moderatedBy: null,
          moderationNote: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "item-2" as ModerationItemId,
          contentType: "region",
          contentId: "region-2",
          status: "pending",
          reportedBy: "user-2" as UserId,
          reportReason: "Test",
          moderatedBy: null,
          moderationNote: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "item-3" as ModerationItemId,
          contentType: "location",
          contentId: "location-1",
          status: "approved",
          reportedBy: "user-3" as UserId,
          reportReason: "Test",
          moderatedBy: "mod-1" as UserId,
          moderationNote: "Approved",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "item-4" as ModerationItemId,
          contentType: "checkIn",
          contentId: "checkin-1",
          status: "rejected",
          reportedBy: "user-4" as UserId,
          reportReason: "Test",
          moderatedBy: "mod-2" as UserId,
          moderationNote: "Rejected",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      for (const item of items) {
        mockModerationRepository.addItem(item);
      }

      // Act
      const result = await getModerationStats(context);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.totalCount).toBe(4);
        expect(result.value.pendingCount).toBe(2);
        expect(result.value.urgentCount).toBe(0); // No items older than 24 hours
      }
    });
  });

  describe("repository errors", () => {
    it("should fail when repository fails", async () => {
      // Arrange
      mockModerationRepository.setShouldFail(true);

      // Act
      const result = await getModerationStats(context);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to get moderation stats");
      }
    });
  });

  describe("business rules validation", () => {
    it("should provide accurate pending count", async () => {
      // Arrange
      const items: ModerationItem[] = [
        {
          id: "item-1" as ModerationItemId,
          contentType: "region",
          contentId: "region-1",
          status: "pending",
          reportedBy: "user-1" as UserId,
          reportReason: "Test",
          moderatedBy: null,
          moderationNote: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "item-2" as ModerationItemId,
          contentType: "location",
          contentId: "location-1",
          status: "approved",
          reportedBy: "user-2" as UserId,
          reportReason: "Test",
          moderatedBy: "mod-1" as UserId,
          moderationNote: "OK",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "item-3" as ModerationItemId,
          contentType: "checkIn",
          contentId: "checkin-1",
          status: "rejected",
          reportedBy: "user-3" as UserId,
          reportReason: "Test",
          moderatedBy: "mod-2" as UserId,
          moderationNote: "Not OK",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      for (const item of items) {
        mockModerationRepository.addItem(item);
      }

      // Act
      const result = await getModerationStats(context);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.totalCount).toBe(3);
        expect(result.value.pendingCount).toBe(1);
        expect(result.value.urgentCount).toBeGreaterThanOrEqual(0);
      }
    });

    it("should handle urgent items correctly", async () => {
      // Arrange - Create items with old timestamps
      const oneDayAgo = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
      const items: ModerationItem[] = [
        {
          id: "item-1" as ModerationItemId,
          contentType: "region",
          contentId: "region-1",
          status: "pending",
          reportedBy: "user-1" as UserId,
          reportReason: "Test",
          moderatedBy: null,
          moderationNote: null,
          createdAt: oneDayAgo, // Old item
          updatedAt: oneDayAgo,
        },
        {
          id: "item-2" as ModerationItemId,
          contentType: "region",
          contentId: "region-2",
          status: "pending",
          reportedBy: "user-2" as UserId,
          reportReason: "Test",
          moderatedBy: null,
          moderationNote: null,
          createdAt: new Date(), // Recent item
          updatedAt: new Date(),
        },
      ];

      for (const item of items) {
        mockModerationRepository.addItem(item);
      }

      // Act
      const result = await getModerationStats(context);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.totalCount).toBe(2);
        expect(result.value.pendingCount).toBe(2);
        expect(result.value.urgentCount).toBe(1); // One item older than 24 hours
      }
    });
  });
});
