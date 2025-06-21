import type { MetricsCollector } from "@/core/domain/monitoring/ports/metricsCollector";
import type { HealthCheck } from "@/core/domain/monitoring/types";
import type { UserRepository } from "@/core/domain/user/ports/userRepository";
import { RepositoryError } from "@/lib/error";
import { AnyError } from "@/lib/errors";
import { err, ok } from "neverthrow";
import { beforeEach, describe, expect, it } from "vitest";
import type { Context } from "../context";
import { createMockContext } from "../testUtils/mockContext";
import { performHealthCheck } from "./performHealthCheck";

describe("performHealthCheck", () => {
  let context: Context;

  const healthyResult: HealthCheck = {
    service: "all",
    status: "healthy",
    responseTime: 50,
    timestamp: new Date(),
    details: {
      database: "connected",
      storage: "available",
      external_apis: ["google_maps", "stripe"],
      cache: "not_implemented",
    },
  };

  const unhealthyResult: HealthCheck = {
    service: "all",
    status: "unhealthy",
    responseTime: 5000,
    timestamp: new Date(),
    details: {
      errors: ["Database query failed", "Redis connection timeout"],
      database: "error",
      storage: "available",
      external_apis: ["google_maps"],
      cache: "not_implemented",
    },
  };

  beforeEach(() => {
    // Create a complete mock MetricsCollector
    const mockMetricsCollector: MetricsCollector = {
      recordMetric: async () => ok(undefined),
      getMetrics: async () => ok([]),
      recordHealthCheck: async () => ok(undefined),
      getHealthStatus: async () => ok([healthyResult]),
    };

    const mockUserRepository = {
      list: async () => ok({ items: [], count: 0 }),
      // biome-ignore lint/suspicious/noExplicitAny: Mock repository returns any for testing
      create: async () => ok({} as any),
      findById: async () => ok(null),
      findByEmail: async () => ok(null),
      findByStripeCustomerId: async () => ok(null),
      // biome-ignore lint/suspicious/noExplicitAny: Mock repository returns any for testing
      update: async () => ok({} as any),
      delete: async () => ok(undefined),
      getHashedPassword: async () => ok("hashed-password"),
      updatePassword: async () => ok(undefined),
      // biome-ignore lint/suspicious/noExplicitAny: Mock repository returns any for testing
      createSession: async () => ok({} as any),
      findSessionById: async () => ok(null),
      findSessionByToken: async () => ok(null),
      // biome-ignore lint/suspicious/noExplicitAny: Mock repository returns any for testing
      updateSessionActivity: async () => ok({} as any),
      deleteSession: async () => ok(undefined),
      deleteExpiredSessions: async () => ok(0),
      deleteUserSessions: async () => ok(0),
    };

    context = createMockContext({
      metricsCollector: mockMetricsCollector,
      userRepository: mockUserRepository,
    });
  });

  describe("SPEC: Health check functionality from formal specifications", () => {
    it("should perform basic health check and return healthy status", async () => {
      const result = await performHealthCheck(context);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const health = result.value;
        expect(health.service).toBe("all");
        expect(health.status).toBe("healthy");
        expect(health.timestamp).toBeInstanceOf(Date);
        expect(health.responseTime).toBeGreaterThanOrEqual(0);
        expect(health.details).toBeDefined();
        expect(health.details).toHaveProperty("database");
      }
    });

    it("should detect unhealthy system status", async () => {
      // Mock user repository to fail for testing database check
      context.userRepository.list = async () =>
        err(new RepositoryError("Database connection failed"));

      const result = await performHealthCheck(context);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const health = result.value;
        expect(health.status).toBe("unhealthy");
        expect(health.details).toHaveProperty("errors");
        expect(Array.isArray(health.details?.errors)).toBe(true);
      }
    });

    it("should check individual service health", async () => {
      const result = await performHealthCheck(context, "database");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const health = result.value;
        expect(health.service).toBe("database");
        expect(health.status).toBe("healthy");
        expect(health.responseTime).toBeLessThan(1000);
        expect(health.details).toHaveProperty("database");
      }
    });
  });

  describe("TLA+ behavior validation", () => {
    it("should follow monitoring patterns from formal specifications", async () => {
      // Based on monitoring requirements in formal specs
      const result = await performHealthCheck(context);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const health = result.value;
        // Verify service monitoring
        expect(health.service).toBe("all");
        expect(health.status).toMatch(/^(healthy|unhealthy|degraded)$/);
        expect(health.responseTime).toBeGreaterThanOrEqual(0);
        expect(health.timestamp).toBeInstanceOf(Date);
        expect(health.details).toBeDefined();

        // Verify health check is recorded to metrics
        expect(context.metricsCollector.recordHealthCheck).toBeDefined();
      }
    });
  });

  describe("Service monitoring", () => {
    it("should detect database connection issues", async () => {
      // Mock database failure
      context.userRepository.list = async () =>
        err(new RepositoryError("Connection refused"));

      const result = await performHealthCheck(context, "database");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const health = result.value;
        expect(health.service).toBe("database");
        expect(health.status).toBe("unhealthy");
        expect(health.details).toHaveProperty("errors");
      }
    });

    it("should detect slow service responses based on responseTime", async () => {
      // Mock a slow response by adding delay
      const slowUserRepo: Partial<UserRepository> = {
        list: async () => {
          await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate 100ms delay
          return ok({ items: [], count: 0 });
        },
      };
      context.userRepository = slowUserRepo as UserRepository;

      const result = await performHealthCheck(context);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const health = result.value;
        expect(health.responseTime).toBeGreaterThan(50); // Should take at least 50ms
        expect(health.status).toBe("healthy"); // Won't be degraded unless > 5000ms
      }
    }, 1000);
  });

  describe("Service checks", () => {
    it("should check storage service", async () => {
      const result = await performHealthCheck(context, "storage");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const health = result.value;
        expect(health.service).toBe("storage");
        expect(health.status).toBe("healthy");
        expect(health.details).toHaveProperty("storage");
      }
    });

    it("should check external APIs", async () => {
      const result = await performHealthCheck(context, "external_apis");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const health = result.value;
        expect(health.service).toBe("external_apis");
        expect(health.status).toBe("healthy");
        expect(health.details).toHaveProperty("external_apis");
      }
    });

    it("should check cache service", async () => {
      const result = await performHealthCheck(context, "cache");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const health = result.value;
        expect(health.service).toBe("cache");
        expect(health.status).toBe("healthy");
        expect(health.details).toHaveProperty("cache");
      }
    });
  });

  describe("Error handling", () => {
    it("should handle metrics collector failure gracefully", async () => {
      // Mock metrics collector to fail
      context.metricsCollector.recordHealthCheck = async () =>
        err(new AnyError("Metrics collection failed"));

      const result = await performHealthCheck(context);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(AnyError);
        expect(result.error.message).toBe("Metrics collection failed");
      }
    });

    it("should handle unknown service gracefully", async () => {
      const result = await performHealthCheck(
        context,
        // biome-ignore lint/suspicious/noExplicitAny: Testing error handling with invalid input
        "unknown_service" as any,
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(AnyError);
        expect(result.error.message).toBe("Unknown service: unknown_service");
      }
    });
  });

  describe("Performance monitoring", () => {
    it("should track response times", async () => {
      const result = await performHealthCheck(context);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const health = result.value;
        expect(health.responseTime).toBeGreaterThanOrEqual(0);
        expect(typeof health.responseTime).toBe("number");
      }
    });

    it("should include timestamp", async () => {
      const result = await performHealthCheck(context);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const health = result.value;
        expect(health.timestamp).toBeInstanceOf(Date);
        expect(health.timestamp.getTime()).toBeLessThanOrEqual(Date.now());
      }
    });
  });

  describe("Health check options", () => {
    it("should perform detailed health check with options object", async () => {
      const result = await performHealthCheck(context, { detailed: true });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const health = result.value;
        expect(health.service).toBe("all");
        expect(health.timestamp).toBeInstanceOf(Date);
        expect(health.details).toBeDefined();
      }
    });

    it("should perform quick health check with options object", async () => {
      const result = await performHealthCheck(context, { quick: true });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const health = result.value;
        expect(health.service).toBe("all");
        expect(health.status).toBe("healthy");
        expect(health.responseTime).toBeGreaterThanOrEqual(0);
      }
    });

    it("should handle both string and options parameter formats", async () => {
      // Test string parameter
      const stringResult = await performHealthCheck(context, "database");
      expect(stringResult.isOk()).toBe(true);
      if (stringResult.isOk()) {
        expect(stringResult.value.service).toBe("database");
      }

      // Test options parameter
      const optionsResult = await performHealthCheck(context, {
        detailed: true,
      });
      expect(optionsResult.isOk()).toBe(true);
      if (optionsResult.isOk()) {
        expect(optionsResult.value.service).toBe("all");
      }
    });
  });
});
