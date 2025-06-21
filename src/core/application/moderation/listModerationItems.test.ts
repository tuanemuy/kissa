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
import { listModerationItems } from "./listModerationItems";

describe("listModerationItems", () => {
  let context: Context;
  let mockModerationRepository: MockModerationRepository;

  const mockModerationItems: ModerationItem[] = [
    {
      id: "550e8400-e29b-41d4-a716-446655440001" as ModerationItemId,
      contentType: "region",
      contentId: "region-123",
      reportedBy: "550e8400-e29b-41d4-a716-446655440002" as UserId,
      reportReason: "inappropriate_content",
      status: "pending",
      moderatedBy: null,
      moderationNote: null,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440003" as ModerationItemId,
      contentType: "location",
      contentId: "location-456",
      reportedBy: "550e8400-e29b-41d4-a716-446655440004" as UserId,
      reportReason: "spam",
      status: "approved",
      moderatedBy: "550e8400-e29b-41d4-a716-446655440005" as UserId,
      moderationNote: "Reviewed and found acceptable",
      createdAt: new Date("2024-01-02"),
      updatedAt: new Date("2024-01-02"),
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440006" as ModerationItemId,
      contentType: "checkIn",
      contentId: "checkin-789",
      reportedBy: "550e8400-e29b-41d4-a716-446655440007" as UserId,
      reportReason: "offensive language",
      status: "rejected",
      moderatedBy: "550e8400-e29b-41d4-a716-446655440008" as UserId,
      moderationNote: "Contains inappropriate content",
      createdAt: new Date("2024-01-03"),
      updatedAt: new Date("2024-01-03"),
    },
  ];

  beforeEach(() => {
    mockModerationRepository = new MockModerationRepository();
    for (const item of mockModerationItems) {
      mockModerationRepository.addItem(item);
    }

    context = createMockContext({
      moderationRepository: mockModerationRepository,
    });
  });

  describe("successful listing", () => {
    it("should list moderation items with pagination", async () => {
      // Act
      const result = await listModerationItems(context, {
        pagination: { page: 1, limit: 10 },
      });

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.items).toHaveLength(3);
        expect(result.value.count).toBe(3);
      }
    });

    it("should respect pagination limits", async () => {
      // Act
      const result = await listModerationItems(context, {
        pagination: { page: 1, limit: 2 },
      });

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.items).toHaveLength(2);
        expect(result.value.count).toBe(3); // Total count should still be 3
      }
    });

    it("should list filtered moderation items by status", async () => {
      // Act
      const result = await listModerationItems(context, {
        pagination: { page: 1, limit: 10 },
        filter: { status: "pending" },
      });

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.items).toHaveLength(1);
        expect(result.value.items[0].status).toBe("pending");
      }
    });

    it("should list filtered moderation items by content type", async () => {
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

    it("should handle sorting by creation date ascending", async () => {
      // Act
      const result = await listModerationItems(context, {
        pagination: { page: 1, limit: 10 },
        sort: { field: "createdAt", order: "asc" },
      });

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.items).toHaveLength(3);
        // Items should be sorted by creation date ascending
        expect(result.value.items[0].createdAt.getTime()).toBeLessThanOrEqual(
          result.value.items[1].createdAt.getTime(),
        );
        expect(result.value.items[1].createdAt.getTime()).toBeLessThanOrEqual(
          result.value.items[2].createdAt.getTime(),
        );
      }
    });

    it("should handle sorting by creation date descending", async () => {
      // Act
      const result = await listModerationItems(context, {
        pagination: { page: 1, limit: 10 },
        sort: { field: "createdAt", order: "desc" },
      });

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.items).toHaveLength(3);
        // Items should be sorted by creation date descending
        expect(
          result.value.items[0].createdAt.getTime(),
        ).toBeGreaterThanOrEqual(result.value.items[1].createdAt.getTime());
        expect(
          result.value.items[1].createdAt.getTime(),
        ).toBeGreaterThanOrEqual(result.value.items[2].createdAt.getTime());
      }
    });

    it("should return empty list when no items match filter", async () => {
      // Act - Filter by status that doesn't exist in our test data
      const result = await listModerationItems(context, {
        pagination: { page: 1, limit: 10 },
        filter: { contentType: "checkIn", status: "pending" },
      });

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.items).toHaveLength(0);
        expect(result.value.count).toBe(0);
      }
    });
  });

  describe("validation errors", () => {
    it("should fail with invalid pagination - zero page", async () => {
      // Act
      const result = await listModerationItems(context, {
        pagination: { page: 0, limit: 10 },
        // biome-ignore lint/suspicious/noExplicitAny: Testing invalid input requires any type
      } as any);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe(
          "Invalid list moderation items input",
        );
      }
    });

    it("should fail with invalid pagination - zero limit", async () => {
      // Act
      const result = await listModerationItems(context, {
        pagination: { page: 1, limit: 0 },
        // biome-ignore lint/suspicious/noExplicitAny: Testing invalid input requires any type
      } as any);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe(
          "Invalid list moderation items input",
        );
      }
    });

    it("should fail with invalid pagination - excessive limit", async () => {
      // Act
      const result = await listModerationItems(context, {
        pagination: { page: 1, limit: 200 },
        // biome-ignore lint/suspicious/noExplicitAny: Testing invalid input requires any type
      } as any);

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
    it("should fail when repository fails", async () => {
      // Arrange
      mockModerationRepository.setShouldFail(true);

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
  });

  describe("complex filtering", () => {
    it("should handle multiple filters", async () => {
      // Act
      const result = await listModerationItems(context, {
        pagination: { page: 1, limit: 10 },
        filter: {
          status: "approved",
          contentType: "location",
        },
      });

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.items).toHaveLength(1);
        expect(result.value.items[0].status).toBe("approved");
        expect(result.value.items[0].contentType).toBe("location");
      }
    });

    it("should filter by reported user", async () => {
      // Act
      const result = await listModerationItems(context, {
        pagination: { page: 1, limit: 10 },
        filter: {
          reportedBy: "550e8400-e29b-41d4-a716-446655440002" as UserId,
        },
      });

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.items).toHaveLength(1);
        expect(result.value.items[0].reportedBy).toBe(
          "550e8400-e29b-41d4-a716-446655440002",
        );
      }
    });

    it("should filter by moderated user", async () => {
      // Act
      const result = await listModerationItems(context, {
        pagination: { page: 1, limit: 10 },
        filter: {
          moderatedBy: "550e8400-e29b-41d4-a716-446655440005" as UserId,
        },
      });

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.items).toHaveLength(1);
        expect(result.value.items[0].moderatedBy).toBe(
          "550e8400-e29b-41d4-a716-446655440005",
        );
      }
    });
  });
});
