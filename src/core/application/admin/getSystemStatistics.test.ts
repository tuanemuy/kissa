import type { User, UserId } from "@/core/domain/user/types";
import { ApplicationError } from "@/lib/error";
import { RepositoryError } from "@/lib/error";
import { err, ok } from "neverthrow";
import { beforeEach, describe, expect, it } from "vitest";
import type { Context } from "../context";
import { createMockContext } from "../testUtils/mockContext";
import type { SystemStatistics } from "./getSystemStatistics";
import { getSystemStatistics } from "./getSystemStatistics";

describe("getSystemStatistics", () => {
  let context: Context;

  const users: User[] = [
    {
      id: "user-1" as UserId,
      name: "Active Editor",
      email: "editor@example.com",
      role: "editor",
      subscription: "basic",
      profilePhotoUrl: null,
      isActive: true,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "user-2" as UserId,
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
    },
    {
      id: "user-3" as UserId,
      name: "Inactive Visitor",
      email: "visitor@example.com",
      role: "visitor",
      subscription: "premium",
      profilePhotoUrl: null,
      isActive: false,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  beforeEach(() => {
    context = createMockContext({
      userRepository: {
        list: async () => ok({ items: users, count: users.length }),
        // biome-ignore lint/suspicious/noExplicitAny: Mock context setup requires type assertion
      } as any,
      regionRepository: {
        list: async () => ok({ items: [], count: 10 }),
        // biome-ignore lint/suspicious/noExplicitAny: Mock context setup requires type assertion
      } as any,
      locationRepository: {
        list: async () => ok({ items: [], count: 25 }),
        // biome-ignore lint/suspicious/noExplicitAny: Mock context setup requires type assertion
      } as any,
      checkInRepository: {
        list: async () => ok({ items: [], count: 50 }),
        // biome-ignore lint/suspicious/noExplicitAny: Mock context setup requires type assertion
      } as any,
      favoriteRepository: {
        countFavoritesByUser: async () => ok(5),
        // biome-ignore lint/suspicious/noExplicitAny: Mock context setup requires type assertion
      } as any,
      moderationRepository: {
        list: async () =>
          ok({
            items: [
              { status: "pending" },
              { status: "approved" },
              { status: "rejected" },
            ],
            count: 3,
          }),
        // biome-ignore lint/suspicious/noExplicitAny: Mock context setup requires type assertion
      } as any,
      billingRepository: {
        list: async () =>
          ok({
            items: [
              { amount: 1000, createdAt: new Date() },
              { amount: 500, createdAt: new Date() },
            ],
            count: 2,
          }),
        // biome-ignore lint/suspicious/noExplicitAny: Mock context setup requires type assertion
      } as any,
    });
  });

  describe("Basic functionality", () => {
    it("should generate comprehensive system statistics", async () => {
      const result = await getSystemStatistics(context);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const stats = result.value;

        // Check user statistics
        expect(stats.users.total).toBe(3);
        expect(stats.users.active).toBe(2);
        expect(stats.users.inactive).toBe(1);
        expect(stats.users.byRole.editors).toBe(1);
        expect(stats.users.byRole.admins).toBe(1);
        expect(stats.users.byRole.visitors).toBe(1);
        expect(stats.users.bySubscription.free).toBe(1);
        expect(stats.users.bySubscription.basic).toBe(1);
        expect(stats.users.bySubscription.premium).toBe(1);

        // Check content statistics
        expect(stats.content.regions).toBe(10);
        expect(stats.content.locations).toBe(25);
        expect(stats.content.checkIns).toBe(50);
        expect(stats.content.favorites).toBe(15); // 3 users * 5 favorites each

        // Check moderation statistics
        expect(stats.moderation.totalReports).toBe(3);
        expect(stats.moderation.pendingReports).toBe(1);
        expect(stats.moderation.approvedReports).toBe(1);
        expect(stats.moderation.rejectedReports).toBe(1);

        // Check billing statistics
        expect(stats.billing.totalRevenue).toBe(1500);
        expect(stats.billing.activeSubscriptions).toBe(2); // non-free subscriptions
        expect(typeof stats.billing.monthlyRevenue).toBe("number");
      }
    });

    it("should handle zero counts gracefully", async () => {
      context.userRepository = {
        list: async () => ok({ items: [], count: 0 }),
        // biome-ignore lint/suspicious/noExplicitAny: Mock context setup requires type assertion
      } as any;

      const result = await getSystemStatistics(context);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const stats = result.value;
        expect(stats.users.total).toBe(0);
        expect(stats.users.active).toBe(0);
        expect(stats.content.favorites).toBe(0); // No users to count favorites for
      }
    });
  });

  describe("Statistics accuracy", () => {
    it("should calculate user statistics correctly", async () => {
      const result = await getSystemStatistics(context);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const stats = result.value;

        // Verify user counts add up
        const totalByRole =
          stats.users.byRole.visitors +
          stats.users.byRole.editors +
          stats.users.byRole.admins;
        expect(totalByRole).toBe(stats.users.total);

        const totalBySubscription =
          stats.users.bySubscription.free +
          stats.users.bySubscription.basic +
          stats.users.bySubscription.premium;
        expect(totalBySubscription).toBe(stats.users.total);

        const totalByStatus = stats.users.active + stats.users.inactive;
        expect(totalByStatus).toBe(stats.users.total);
      }
    });

    it("should calculate monthly revenue correctly", async () => {
      const currentDate = new Date();
      const thisMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        1,
      );
      const lastMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() - 1,
        1,
      );

      context.billingRepository = {
        list: async () =>
          ok({
            items: [
              { amount: 1000, createdAt: thisMonth }, // This month
              { amount: 500, createdAt: lastMonth }, // Last month
              { amount: 300, createdAt: thisMonth }, // This month
            ],
            count: 3,
          }),
        // biome-ignore lint/suspicious/noExplicitAny: Mock context setup requires type assertion
      } as any;

      const result = await getSystemStatistics(context);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const stats = result.value;
        expect(stats.billing.totalRevenue).toBe(1800);
        expect(stats.billing.monthlyRevenue).toBe(1300); // Only this month
      }
    });
  });

  describe("Error handling", () => {
    it("should handle user repository failure", async () => {
      context.userRepository = {
        list: async () => err(new RepositoryError("User fetch failed")),
        // biome-ignore lint/suspicious/noExplicitAny: Mock context setup requires type assertion
      } as any;

      const result = await getSystemStatistics(context);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to get user statistics");
      }
    });

    it("should handle content repository failures", async () => {
      context.regionRepository = {
        list: async () => err(new RepositoryError("Region fetch failed")),
        // biome-ignore lint/suspicious/noExplicitAny: Mock context setup requires type assertion
      } as any;

      const result = await getSystemStatistics(context);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to get content statistics");
      }
    });

    it("should handle moderation repository failure", async () => {
      context.moderationRepository = {
        list: async () => err(new RepositoryError("Moderation fetch failed")),
        // biome-ignore lint/suspicious/noExplicitAny: Mock context setup requires type assertion
      } as any;

      const result = await getSystemStatistics(context);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe(
          "Failed to get moderation statistics",
        );
      }
    });

    it("should handle billing repository failure", async () => {
      context.billingRepository = {
        list: async () => err(new RepositoryError("Billing fetch failed")),
        // biome-ignore lint/suspicious/noExplicitAny: Mock context setup requires type assertion
      } as any;

      const result = await getSystemStatistics(context);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to get billing statistics");
      }
    });

    it("should handle unexpected errors", async () => {
      context.userRepository = {
        list: async () => {
          throw new Error("Unexpected error");
        },
        // biome-ignore lint/suspicious/noExplicitAny: Mock context setup requires type assertion
      } as any;

      const result = await getSystemStatistics(context);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe(
          "Failed to generate system statistics",
        );
      }
    });
  });

  describe("Business logic validation", () => {
    it("should handle favorites counting gracefully", async () => {
      // Some users have favorites, some don't
      context.favoriteRepository = {
        countFavoritesByUser: async (userId: UserId) => {
          if (userId === "user-1") return ok(10);
          if (userId === "user-2") return ok(0);
          return err(new RepositoryError("Favorites not found"));
        },
        // biome-ignore lint/suspicious/noExplicitAny: Mock context setup requires type assertion
      } as any;

      const result = await getSystemStatistics(context);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const stats = result.value;
        expect(stats.content.favorites).toBe(10); // Only user-1's favorites counted
      }
    });

    it("should calculate active subscriptions correctly", async () => {
      const result = await getSystemStatistics(context);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const stats = result.value;
        // Count non-free subscriptions
        const expectedActive = users.filter(
          (u) => u.subscription !== "free",
        ).length;
        expect(stats.billing.activeSubscriptions).toBe(expectedActive);
      }
    });
  });

  describe("Data integrity", () => {
    it("should ensure all statistics are non-negative", async () => {
      const result = await getSystemStatistics(context);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const stats = result.value;

        // User statistics
        expect(stats.users.total).toBeGreaterThanOrEqual(0);
        expect(stats.users.active).toBeGreaterThanOrEqual(0);
        expect(stats.users.inactive).toBeGreaterThanOrEqual(0);

        // Content statistics
        expect(stats.content.regions).toBeGreaterThanOrEqual(0);
        expect(stats.content.locations).toBeGreaterThanOrEqual(0);
        expect(stats.content.checkIns).toBeGreaterThanOrEqual(0);
        expect(stats.content.favorites).toBeGreaterThanOrEqual(0);

        // Moderation statistics
        expect(stats.moderation.totalReports).toBeGreaterThanOrEqual(0);
        expect(stats.moderation.pendingReports).toBeGreaterThanOrEqual(0);
        expect(stats.moderation.approvedReports).toBeGreaterThanOrEqual(0);
        expect(stats.moderation.rejectedReports).toBeGreaterThanOrEqual(0);

        // Billing statistics
        expect(stats.billing.totalRevenue).toBeGreaterThanOrEqual(0);
        expect(stats.billing.activeSubscriptions).toBeGreaterThanOrEqual(0);
        expect(stats.billing.monthlyRevenue).toBeGreaterThanOrEqual(0);
      }
    });

    it("should ensure logical consistency", async () => {
      const result = await getSystemStatistics(context);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const stats = result.value;

        // Active users should be <= total users
        expect(stats.users.active).toBeLessThanOrEqual(stats.users.total);

        // Active subscriptions should be <= total users
        expect(stats.billing.activeSubscriptions).toBeLessThanOrEqual(
          stats.users.total,
        );

        // Monthly revenue should be <= total revenue
        expect(stats.billing.monthlyRevenue).toBeLessThanOrEqual(
          stats.billing.totalRevenue,
        );

        // Moderation status counts should add up to total
        const totalModerationByStatus =
          stats.moderation.pendingReports +
          stats.moderation.approvedReports +
          stats.moderation.rejectedReports;
        expect(totalModerationByStatus).toBe(stats.moderation.totalReports);
      }
    });
  });
});
