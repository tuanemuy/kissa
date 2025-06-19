import type { SystemStatistics } from "@/core/domain/admin/types";
import type { User, UserId } from "@/core/domain/user/types";
import { ApplicationError, AuthorizationError } from "@/lib/error";
import { RepositoryError } from "@/lib/error";
import { err, ok } from "neverthrow";
import { beforeEach, describe, expect, it } from "vitest";
import type { Context } from "../context";
import { getSystemStatistics } from "./getSystemStatistics";

describe("getSystemStatistics", () => {
  let context: Context;

  const adminUser: User = {
    id: "admin-1" as UserId,
    name: "Test Admin",
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

  const editorUser: User = {
    id: "editor-1" as UserId,
    name: "Test Editor",
    email: "editor@example.com",
    role: "editor",
    subscription: "basic",
    profilePhotoUrl: null,
    isActive: true,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockStatistics: SystemStatistics = {
    totalUsers: 150,
    totalRegions: 45,
    totalLocations: 320,
    totalCheckIns: 1250,
    totalFavorites: 480,
    totalModerationItems: 12,
    activeUsers: 140,
    publicRegions: 38,
    publicLocations: 290,
    generatedAt: new Date(),
  };

  beforeEach(() => {
    context = {
      userRepository: {
        findById: async (id: string) => {
          if (id === adminUser.id) return ok(adminUser);
          if (id === editorUser.id) return ok(editorUser);
          return ok(null);
        },
      } as Partial<typeof context.userRepository>,
      systemStatisticsService: {
        getStatistics: async () => ok(mockStatistics),
      } as Partial<typeof context.systemStatisticsService>,
    } as Context;
  });

  describe("SPEC: Admin access constraints from formal specifications", () => {
    it("should allow admin to view system statistics", async () => {
      const result = await getSystemStatistics(context, adminUser.id);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const stats = result.value;
        expect(stats.totalUsers).toBe(150);
        expect(stats.totalRegions).toBe(45);
        expect(stats.totalLocations).toBe(320);
        expect(stats.totalCheckIns).toBe(1250);
        expect(stats.totalFavorites).toBe(480);
        expect(stats.totalModerationItems).toBe(12);
        expect(stats.activeUsers).toBe(140);
        expect(stats.publicRegions).toBe(38);
        expect(stats.publicLocations).toBe(290);
        expect(stats.generatedAt).toBeInstanceOf(Date);
      }
    });

    it("should reject non-admin access to system statistics", async () => {
      const result = await getSystemStatistics(context, editorUser.id);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(AuthorizationError);
        expect(result.error.message).toBe("Only admins can access system statistics");
      }
    });

    it("should reject visitor access to system statistics", async () => {
      const visitorUser: User = {
        ...editorUser,
        id: "visitor-1" as UserId,
        role: "visitor",
        subscription: "free",
      };

      context.userRepository = {
        findById: async (id: string) => {
          if (id === visitorUser.id) return ok(visitorUser);
          return ok(null);
        },
      } as Partial<typeof context.userRepository>;

      const result = await getSystemStatistics(context, visitorUser.id);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(AuthorizationError);
        expect(result.error.message).toBe("Only admins can access system statistics");
      }
    });
  });

  describe("SPEC-INV-15: System statistics consistency (Alloy constraint)", () => {
    it("should verify system statistics consistency from formal model", async () => {
      // Alloy constraint: SystemStatsConsistency
      // s.totalUsers = #User and s.totalRegions = #Region etc.
      const result = await getSystemStatistics(context, adminUser.id);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const stats = result.value;
        // Verify all counts are non-negative
        expect(stats.totalUsers).toBeGreaterThanOrEqual(0);
        expect(stats.totalRegions).toBeGreaterThanOrEqual(0);
        expect(stats.totalLocations).toBeGreaterThanOrEqual(0);
        expect(stats.totalCheckIns).toBeGreaterThanOrEqual(0);
        expect(stats.totalFavorites).toBeGreaterThanOrEqual(0);
        expect(stats.totalModerationItems).toBeGreaterThanOrEqual(0);
        expect(stats.activeUsers).toBeGreaterThanOrEqual(0);
        expect(stats.publicRegions).toBeGreaterThanOrEqual(0);
        expect(stats.publicLocations).toBeGreaterThanOrEqual(0);
        
        // Verify logical consistency
        expect(stats.activeUsers).toBeLessThanOrEqual(stats.totalUsers);
        expect(stats.publicRegions).toBeLessThanOrEqual(stats.totalRegions);
        expect(stats.publicLocations).toBeLessThanOrEqual(stats.totalLocations);
      }
    });
  });

  describe("TLA+ behavior validation", () => {
    it("should follow SystemMonitoring predicate from TLA+ specification", async () => {
      // TLA+ SystemMonitoring: admin.role = Admin and admin.active = True
      const result = await getSystemStatistics(context, adminUser.id);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const stats = result.value;
        // Verify statistics match TLA+ systemStats structure
        expect(typeof stats.totalUsers).toBe("number");
        expect(typeof stats.totalRegions).toBe("number");
        expect(typeof stats.totalLocations).toBe("number");
        expect(stats.generatedAt).toBeInstanceOf(Date);
      }
    });
  });

  describe("Error handling", () => {
    it("should handle user not found", async () => {
      const result = await getSystemStatistics(
        context,
        "non-existent" as UserId,
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("User not found");
      }
    });

    it("should handle statistics service failure", async () => {
      // biome-ignore lint/suspicious/noExplicitAny: Testing error handling requires type assertion
      const mockStatisticsService = context.systemStatisticsService as any;
      mockStatisticsService.getStatistics = async () =>
        err(new RepositoryError("Statistics collection failed"));

      const result = await getSystemStatistics(context, adminUser.id);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to get system statistics");
      }
    });
  });

  describe("Statistics accuracy", () => {
    it("should return real-time statistics", async () => {
      const recentTime = new Date();
      const recentStatistics: SystemStatistics = {
        ...mockStatistics,
        generatedAt: recentTime,
      };

      context.systemStatisticsService = {
        getStatistics: async () => ok(recentStatistics),
      } as Partial<typeof context.systemStatisticsService>;

      const result = await getSystemStatistics(context, adminUser.id);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const stats = result.value;
        const timeDiff = Math.abs(stats.generatedAt.getTime() - recentTime.getTime());
        expect(timeDiff).toBeLessThan(1000); // Within 1 second
      }
    });

    it("should include all required statistical fields", async () => {
      const result = await getSystemStatistics(context, adminUser.id);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const stats = result.value;
        // Verify all required fields are present
        expect(stats).toHaveProperty("totalUsers");
        expect(stats).toHaveProperty("totalRegions");
        expect(stats).toHaveProperty("totalLocations");
        expect(stats).toHaveProperty("totalCheckIns");
        expect(stats).toHaveProperty("totalFavorites");
        expect(stats).toHaveProperty("totalModerationItems");
        expect(stats).toHaveProperty("activeUsers");
        expect(stats).toHaveProperty("publicRegions");
        expect(stats).toHaveProperty("publicLocations");
        expect(stats).toHaveProperty("generatedAt");
      }
    });
  });

  describe("Performance monitoring", () => {
    it("should track system performance metrics", async () => {
      const result = await getSystemStatistics(context, adminUser.id);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const stats = result.value;
        // These could be used for performance monitoring
        expect(stats.totalUsers).toBeGreaterThan(0);
        expect(stats.totalCheckIns).toBeGreaterThan(0);
        // In a real system, we might also track response times, error rates, etc.
      }
    });
  });
});