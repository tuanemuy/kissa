import { MockModerationRepository } from "@/core/adapters/mock/moderationRepository";
import { ApplicationError } from "@/lib/error";
import { RepositoryError } from "@/lib/error";
import { err, ok } from "neverthrow";
import { beforeEach, describe, expect, it } from "vitest";
import type { Context } from "../context";
import { getModerationStats } from "./getModerationStats";

describe("getModerationStats", () => {
  let context: Context;

  beforeEach(() => {
    context = {
      moderationRepository: new MockModerationRepository(),
    } as Context;
  });

  describe("successful stats retrieval", () => {
    it("should get moderation stats with all counts", async () => {
      // Arrange
      context.moderationRepository.countPending = async () => ok(15);
      context.moderationRepository.countOlderThan24Hours = async () => ok(3);
      context.moderationRepository.list = async () =>
        ok({ items: [], count: 45 });

      // Act
      const result = await getModerationStats(context);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.pendingCount).toBe(15);
        expect(result.value.urgentCount).toBe(3);
        expect(result.value.totalCount).toBe(45);
      }
    });

    it("should handle zero counts correctly", async () => {
      // Arrange
      context.moderationRepository.countPending = async () => ok(0);
      context.moderationRepository.countOlderThan24Hours = async () => ok(0);
      context.moderationRepository.list = async () =>
        ok({ items: [], count: 0 });

      // Act
      const result = await getModerationStats(context);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.pendingCount).toBe(0);
        expect(result.value.urgentCount).toBe(0);
        expect(result.value.totalCount).toBe(0);
      }
    });

    it("should handle large numbers correctly", async () => {
      // Arrange
      context.moderationRepository.countPending = async () => ok(1000);
      context.moderationRepository.countOlderThan24Hours = async () => ok(50);
      context.moderationRepository.list = async () =>
        ok({ items: [], count: 5000 });

      // Act
      const result = await getModerationStats(context);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.pendingCount).toBe(1000);
        expect(result.value.urgentCount).toBe(50);
        expect(result.value.totalCount).toBe(5000);
      }
    });

    it("should handle typical workload scenario", async () => {
      // Arrange - Realistic moderation queue scenario
      const pendingCount = 25;
      const urgentCount = 8;
      const totalCount = 150;

      context.moderationRepository.countPending = async () => ok(pendingCount);
      context.moderationRepository.countOlderThan24Hours = async () =>
        ok(urgentCount);
      context.moderationRepository.list = async () =>
        ok({ items: [], count: totalCount });

      // Act
      const result = await getModerationStats(context);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.pendingCount).toBe(pendingCount);
        expect(result.value.urgentCount).toBe(urgentCount);
        expect(result.value.totalCount).toBe(totalCount);
        // Urgent count should be subset of pending (business logic)
        expect(result.value.urgentCount).toBeLessThanOrEqual(
          result.value.pendingCount,
        );
      }
    });
  });

  describe("repository errors", () => {
    it("should fail when pending count fails", async () => {
      // Arrange
      context.moderationRepository.countPending = async () =>
        err(new RepositoryError("Database error"));
      context.moderationRepository.countOlderThan24Hours = async () => ok(3);
      context.moderationRepository.list = async () =>
        ok({ items: [], count: 45 });

      // Act
      const result = await getModerationStats(context);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to count pending items");
      }
    });

    it("should fail when urgent count fails", async () => {
      // Arrange
      context.moderationRepository.countPending = async () => ok(15);
      context.moderationRepository.countOlderThan24Hours = async () =>
        err(new RepositoryError("Database error"));
      context.moderationRepository.list = async () =>
        ok({ items: [], count: 45 });

      // Act
      const result = await getModerationStats(context);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to count urgent items");
      }
    });

    it("should fail when total count fails", async () => {
      // Arrange
      context.moderationRepository.countPending = async () => ok(15);
      context.moderationRepository.countOlderThan24Hours = async () => ok(3);
      context.moderationRepository.list = async () =>
        err(new RepositoryError("Database error"));

      // Act
      const result = await getModerationStats(context);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to count total items");
      }
    });

    it("should fail when multiple operations fail", async () => {
      // Arrange
      context.moderationRepository.countPending = async () =>
        err(new RepositoryError("Connection timeout"));
      context.moderationRepository.countOlderThan24Hours = async () =>
        err(new RepositoryError("Connection timeout"));
      context.moderationRepository.list = async () =>
        err(new RepositoryError("Connection timeout"));

      // Act
      const result = await getModerationStats(context);

      // Assert - Should fail on first error (pending count)
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to count pending items");
      }
    });
  });

  describe("performance considerations", () => {
    it("should handle concurrent stat requests efficiently", async () => {
      // Arrange
      let pendingCalls = 0;
      let urgentCalls = 0;
      let totalCalls = 0;

      context.moderationRepository.countPending = async () => {
        pendingCalls++;
        return ok(10);
      };
      context.moderationRepository.countOlderThan24Hours = async () => {
        urgentCalls++;
        return ok(2);
      };
      context.moderationRepository.list = async () => {
        totalCalls++;
        return ok({ items: [], count: 30 });
      };

      // Act - Multiple concurrent requests
      const requests = Promise.all([
        getModerationStats(context),
        getModerationStats(context),
        getModerationStats(context),
      ]);

      const results = await requests;

      // Assert - All requests should succeed
      for (const result of results) {
        expect(result.isOk()).toBe(true);
      }

      // Each repository method should be called for each request
      expect(pendingCalls).toBe(3);
      expect(urgentCalls).toBe(3);
      expect(totalCalls).toBe(3);
    });
  });

  describe("formal specification compliance", () => {
    it("should enforce business rules for moderation statistics", async () => {
      // Arrange
      context.moderationRepository.countPending = async () => ok(20);
      context.moderationRepository.countOlderThan24Hours = async () => ok(5);
      context.moderationRepository.list = async () =>
        ok({ items: [], count: 100 });

      // Act
      const result = await getModerationStats(context);

      // Assert - Verify business rules are followed
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // All counts should be non-negative integers
        expect(result.value.pendingCount).toBeGreaterThanOrEqual(0);
        expect(result.value.urgentCount).toBeGreaterThanOrEqual(0);
        expect(result.value.totalCount).toBeGreaterThanOrEqual(0);

        // Pending count should not exceed total count
        expect(result.value.pendingCount).toBeLessThanOrEqual(
          result.value.totalCount,
        );

        // Urgent count should not exceed pending count (urgent items are subset of pending)
        expect(result.value.urgentCount).toBeLessThanOrEqual(
          result.value.pendingCount,
        );
      }
    });

    it("should maintain system invariants during stats calculation", async () => {
      // Arrange
      context.moderationRepository.countPending = async () => ok(12);
      context.moderationRepository.countOlderThan24Hours = async () => ok(4);
      context.moderationRepository.list = async (query) => {
        // Verify list query is minimal (only needs count)
        expect(query.pagination.page).toBe(1);
        expect(query.pagination.limit).toBe(1);
        return ok({ items: [], count: 35 });
      };

      // Act
      const result = await getModerationStats(context);

      // Assert - System state should remain consistent
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // Stats should reflect current system state accurately
        expect(typeof result.value.pendingCount).toBe("number");
        expect(typeof result.value.urgentCount).toBe("number");
        expect(typeof result.value.totalCount).toBe("number");
      }
    });

    it("should handle edge cases in moderation workflow", async () => {
      // Test edge cases
      const edgeCases = [
        // No pending items, but some total items (all resolved)
        { pending: 0, urgent: 0, total: 50 },
        // All items are pending and urgent
        { pending: 10, urgent: 10, total: 10 },
        // Some pending, no urgent items
        { pending: 15, urgent: 0, total: 100 },
      ];

      for (const { pending, urgent, total } of edgeCases) {
        // Arrange
        context.moderationRepository.countPending = async () => ok(pending);
        context.moderationRepository.countOlderThan24Hours = async () =>
          ok(urgent);
        context.moderationRepository.list = async () =>
          ok({ items: [], count: total });

        // Act
        const result = await getModerationStats(context);

        // Assert
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.pendingCount).toBe(pending);
          expect(result.value.urgentCount).toBe(urgent);
          expect(result.value.totalCount).toBe(total);

          // Business logic invariants should hold
          expect(result.value.urgentCount).toBeLessThanOrEqual(
            result.value.pendingCount,
          );
          expect(result.value.pendingCount).toBeLessThanOrEqual(
            result.value.totalCount,
          );
        }
      }
    });

    it("should provide accurate metrics for moderation dashboard", async () => {
      // Arrange - Realistic dashboard scenario
      const stats = {
        pending: 33,
        urgent: 7,
        total: 250,
      };

      context.moderationRepository.countPending = async () => ok(stats.pending);
      context.moderationRepository.countOlderThan24Hours = async () =>
        ok(stats.urgent);
      context.moderationRepository.list = async () =>
        ok({ items: [], count: stats.total });

      // Act
      const result = await getModerationStats(context);

      // Assert - Should provide dashboard-ready metrics
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // All metrics should be present and accurate
        expect(result.value).toEqual({
          pendingCount: stats.pending,
          urgentCount: stats.urgent,
          totalCount: stats.total,
        });

        // Calculated ratios should make sense
        const urgentRatio =
          result.value.urgentCount / result.value.pendingCount;
        const pendingRatio =
          result.value.pendingCount / result.value.totalCount;

        expect(urgentRatio).toBeGreaterThanOrEqual(0);
        expect(urgentRatio).toBeLessThanOrEqual(1);
        expect(pendingRatio).toBeGreaterThanOrEqual(0);
        expect(pendingRatio).toBeLessThanOrEqual(1);
      }
    });
  });
});
