import { MockModerationRepository } from "@/core/adapters/mock/moderationRepository";
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
import { listModerationItems } from "./listModerationItems";

describe("listModerationItems", () => {
  let context: Context;

  const mockModerationItems: ModerationItem[] = [
    {
      id: "550e8400-e29b-41d4-a716-446655440001" as ModerationItemId,
      contentType: "region",
      contentId: "region-123",
      reportedBy: "550e8400-e29b-41d4-a716-446655440002" as UserId,
      reason: "inappropriate_content",
      description: "Contains offensive language",
      status: "under_review",
      priority: "high",
      assignedTo: null,
      moderatorNotes: null,
      resolution: null,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440003" as ModerationItemId,
      contentType: "location",
      contentId: "location-456",
      reportedBy: "550e8400-e29b-41d4-a716-446655440004" as UserId,
      reason: "spam",
      description: "Repeated promotional content",
      status: "approved",
      priority: "medium",
      assignedTo: "550e8400-e29b-41d4-a716-446655440005" as UserId,
      moderatorNotes: "Reviewed and found acceptable",
      resolution: "No action required",
      createdAt: new Date("2024-01-02"),
      updatedAt: new Date("2024-01-02"),
    },
  ];

  beforeEach(() => {
    context = {
      moderationRepository: new MockModerationRepository(),
    } as Context;
  });

  describe("successful listing", () => {
    it("should list moderation items with pagination", async () => {
      // Arrange
      context.moderationRepository.list = async () =>
        ok({ items: mockModerationItems, count: 2 });
      context.moderationRepository.countPending = async () => ok(5);
      context.moderationRepository.countOlderThan24Hours = async () => ok(2);

      // Act
      const result = await listModerationItems(context, {
        pagination: { page: 1, limit: 10 },
      });

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.items).toHaveLength(2);
        expect(result.value.count).toBe(2);
        expect(result.value.pendingCount).toBe(5);
        expect(result.value.urgentCount).toBe(2);
      }
    });

    it("should list filtered moderation items by status", async () => {
      // Arrange
      const pendingItems = [mockModerationItems[0]];
      context.moderationRepository.list = async () =>
        ok({ items: pendingItems, count: 1 });
      context.moderationRepository.countPending = async () => ok(1);
      context.moderationRepository.countOlderThan24Hours = async () => ok(1);

      // Act
      const result = await listModerationItems(context, {
        pagination: { page: 1, limit: 10 },
        filter: { status: "under_review" },
      });

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.items).toHaveLength(1);
        expect(result.value.items[0].status).toBe("under_review");
      }
    });

    it("should list filtered moderation items by content type", async () => {
      // Arrange
      const regionItems = [mockModerationItems[0]];
      context.moderationRepository.list = async () =>
        ok({ items: regionItems, count: 1 });
      context.moderationRepository.countPending = async () => ok(3);
      context.moderationRepository.countOlderThan24Hours = async () => ok(1);

      // Act
      const result = await listModerationItems(context, {
        pagination: { page: 1, limit: 10 },
        filter: { contentType: "region" },
      });

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.items).toHaveLength(1);
        expect(result.value.items[0].contentType).toBe("region");
      }
    });

    it("should list filtered moderation items by priority", async () => {
      // Arrange
      const highPriorityItems = [mockModerationItems[0]];
      context.moderationRepository.list = async () =>
        ok({ items: highPriorityItems, count: 1 });
      context.moderationRepository.countPending = async () => ok(2);
      context.moderationRepository.countOlderThan24Hours = async () => ok(1);

      // Act
      const result = await listModerationItems(context, {
        pagination: { page: 1, limit: 10 },
        filter: { priority: "high" },
      });

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.items).toHaveLength(1);
        expect(result.value.items[0].priority).toBe("high");
      }
    });

    it("should return empty list when no items exist", async () => {
      // Arrange
      context.moderationRepository.list = async () =>
        ok({ items: [], count: 0 });
      context.moderationRepository.countPending = async () => ok(0);
      context.moderationRepository.countOlderThan24Hours = async () => ok(0);

      // Act
      const result = await listModerationItems(context, {
        pagination: { page: 1, limit: 10 },
      });

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.items).toHaveLength(0);
        expect(result.value.count).toBe(0);
        expect(result.value.pendingCount).toBe(0);
        expect(result.value.urgentCount).toBe(0);
      }
    });

    it("should handle sorting by creation date", async () => {
      // Arrange
      const sortedItems = [...mockModerationItems].reverse();
      context.moderationRepository.list = async () =>
        ok({ items: sortedItems, count: 2 });
      context.moderationRepository.countPending = async () => ok(1);
      context.moderationRepository.countOlderThan24Hours = async () => ok(0);

      // Act
      const result = await listModerationItems(context, {
        pagination: { page: 1, limit: 10 },
        sort: { field: "createdAt", direction: "desc" },
      });

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.items).toHaveLength(2);
        // Items should be sorted by creation date descending
        expect(result.value.items[0].createdAt.getTime()).toBeGreaterThan(
          result.value.items[1].createdAt.getTime(),
        );
      }
    });
  });

  describe("validation errors", () => {
    it("should fail with invalid pagination", async () => {
      // Act
      const result = await listModerationItems(context, {
        pagination: { page: 0, limit: 10 },
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe(
          "Invalid list moderation items input",
        );
      }
    });

    it("should fail with invalid limit", async () => {
      // Act
      const result = await listModerationItems(context, {
        pagination: { page: 1, limit: 0 },
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe(
          "Invalid list moderation items input",
        );
      }
    });

    it("should fail with invalid status filter", async () => {
      // Act
      const result = await listModerationItems(context, {
        pagination: { page: 1, limit: 10 },
        // biome-ignore lint/suspicious/noExplicitAny: Testing invalid input
        filter: { status: "invalid_status" as any },
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe(
          "Invalid list moderation items input",
        );
      }
    });
  });

  describe("repository errors", () => {
    it("should fail when list operation fails", async () => {
      // Arrange
      context.moderationRepository.list = async () =>
        err(new RepositoryError("Database error"));

      // Act
      const result = await listModerationItems(context, {
        pagination: { page: 1, limit: 10 },
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to list moderation items");
      }
    });

    it("should fail when pending count operation fails", async () => {
      // Arrange
      context.moderationRepository.list = async () =>
        ok({ items: mockModerationItems, count: 2 });
      context.moderationRepository.countPending = async () =>
        err(new RepositoryError("Database error"));

      // Act
      const result = await listModerationItems(context, {
        pagination: { page: 1, limit: 10 },
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to count pending items");
      }
    });

    it("should fail when urgent count operation fails", async () => {
      // Arrange
      context.moderationRepository.list = async () =>
        ok({ items: mockModerationItems, count: 2 });
      context.moderationRepository.countPending = async () => ok(5);
      context.moderationRepository.countOlderThan24Hours = async () =>
        err(new RepositoryError("Database error"));

      // Act
      const result = await listModerationItems(context, {
        pagination: { page: 1, limit: 10 },
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to count urgent items");
      }
    });
  });

  describe("formal specification compliance", () => {
    it("should enforce business rules for moderation item listing", async () => {
      // Arrange
      context.moderationRepository.list = async () =>
        ok({ items: mockModerationItems, count: 2 });
      context.moderationRepository.countPending = async () => ok(1);
      context.moderationRepository.countOlderThan24Hours = async () => ok(1);

      // Act
      const result = await listModerationItems(context, {
        pagination: { page: 1, limit: 10 },
      });

      // Assert - Verify business rules are followed
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // All items should have required fields
        for (const item of result.value.items) {
          expect(item.id).toBeDefined();
          expect(item.contentType).toBeDefined();
          expect(item.contentId).toBeDefined();
          expect(item.reportedBy).toBeDefined();
          expect(item.reportReason).toBeDefined();
          expect(item.status).toBeDefined();
          expect(item.createdAt).toBeInstanceOf(Date);
        }

        // Counts should be consistent
        expect(result.value.count).toBeGreaterThanOrEqual(0);
        expect(result.value.pendingCount).toBeGreaterThanOrEqual(0);
        expect(result.value.urgentCount).toBeGreaterThanOrEqual(0);
        expect(result.value.urgentCount).toBeLessThanOrEqual(
          result.value.pendingCount,
        );
      }
    });

    it("should maintain system invariants during listing operations", async () => {
      // Arrange
      context.moderationRepository.list = async (query) => {
        // Verify query parameters are properly validated
        expect(query.pagination.page).toBeGreaterThan(0);
        expect(query.pagination.limit).toBeGreaterThan(0);
        return ok({ items: mockModerationItems, count: 2 });
      };
      context.moderationRepository.countPending = async () => ok(1);
      context.moderationRepository.countOlderThan24Hours = async () => ok(1);

      // Act
      const result = await listModerationItems(context, {
        pagination: { page: 1, limit: 10 },
      });

      // Assert - System state should remain consistent
      expect(result.isOk()).toBe(true);
    });

    it("should handle different moderation workflows correctly", async () => {
      // Test different workflow states
      const workflowItems = [
        { ...mockModerationItems[0], status: "under_review" as const },
        { ...mockModerationItems[1], status: "approved" as const },
        {
          ...mockModerationItems[0],
          id: "550e8400-e29b-41d4-a716-446655440006" as ModerationItemId,
          status: "rejected" as const,
        },
      ];

      context.moderationRepository.list = async () =>
        ok({ items: workflowItems, count: 3 });
      context.moderationRepository.countPending = async () => ok(1);
      context.moderationRepository.countOlderThan24Hours = async () => ok(0);

      // Act
      const result = await listModerationItems(context, {
        pagination: { page: 1, limit: 10 },
      });

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.items).toHaveLength(3);
        // Should contain items in different workflow states
        const statuses = result.value.items.map((item) => item.status);
        expect(statuses).toContain("under_review");
        expect(statuses).toContain("approved");
        expect(statuses).toContain("rejected");
      }
    });

    it("should ensure pagination consistency", async () => {
      // Test pagination boundaries
      const allItems = Array.from({ length: 25 }, (_, i) => ({
        ...mockModerationItems[0],
        id: `550e8400-e29b-41d4-a716-44665544${String(i).padStart(4, "0")}` as ModerationItemId,
        contentId: `content-${i}`,
      }));

      // Test first page
      context.moderationRepository.list = async (query) => {
        const start = (query.pagination.page - 1) * query.pagination.limit;
        const end = start + query.pagination.limit;
        return ok({
          items: allItems.slice(start, end),
          count: allItems.length,
        });
      };
      context.moderationRepository.countPending = async () => ok(10);
      context.moderationRepository.countOlderThan24Hours = async () => ok(3);

      // Act
      const result = await listModerationItems(context, {
        pagination: { page: 1, limit: 10 },
      });

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.items).toHaveLength(10);
        expect(result.value.count).toBe(25);
        // First page should contain first 10 items
        expect(result.value.items[0].contentId).toBe("content-0");
        expect(result.value.items[9].contentId).toBe("content-9");
      }
    });

    it("should handle complex filtering scenarios", async () => {
      // Test multiple filters combined
      const filteredItems = mockModerationItems.filter(
        (item) => item.status === "under_review" && item.priority === "high",
      );

      context.moderationRepository.list = async (query) => {
        // Verify filters are applied correctly
        expect(query.filter?.status).toBe("under_review");
        expect(query.filter?.priority).toBe("high");
        return ok({ items: filteredItems, count: filteredItems.length });
      };
      context.moderationRepository.countPending = async () => ok(1);
      context.moderationRepository.countOlderThan24Hours = async () => ok(1);

      // Act
      const result = await listModerationItems(context, {
        pagination: { page: 1, limit: 10 },
        filter: {
          status: "under_review",
          priority: "high",
        },
      });

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.items).toHaveLength(1);
        expect(result.value.items[0].status).toBe("under_review");
        expect(result.value.items[0].priority).toBe("high");
      }
    });
  });
});
