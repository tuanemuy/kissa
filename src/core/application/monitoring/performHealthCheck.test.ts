import type { HealthCheckResult } from "@/core/domain/monitoring/types";
import { ApplicationError } from "@/lib/error";
import { RepositoryError } from "@/lib/error";
import { err, ok } from "neverthrow";
import { beforeEach, describe, expect, it } from "vitest";
import type { Context } from "../context";
import { performHealthCheck } from "./performHealthCheck";

describe("performHealthCheck", () => {
  let context: Context;

  const healthyResult: HealthCheckResult = {
    status: "healthy",
    timestamp: new Date(),
    services: {
      database: { status: "healthy", responseTime: 15 },
      redis: { status: "healthy", responseTime: 5 },
      fileStorage: { status: "healthy", responseTime: 25 },
      emailService: { status: "healthy", responseTime: 100 },
    },
    metrics: {
      memoryUsage: 65.5,
      cpuUsage: 23.2,
      diskUsage: 45.8,
      activeConnections: 120,
    },
  };

  const unhealthyResult: HealthCheckResult = {
    status: "unhealthy",
    timestamp: new Date(),
    services: {
      database: { status: "healthy", responseTime: 15 },
      redis: {
        status: "unhealthy",
        responseTime: 5000,
        error: "Connection timeout",
      },
      fileStorage: { status: "healthy", responseTime: 25 },
      emailService: { status: "degraded", responseTime: 1500 },
    },
    metrics: {
      memoryUsage: 95.2,
      cpuUsage: 87.5,
      diskUsage: 92.1,
      activeConnections: 500,
    },
  };

  beforeEach(() => {
    context = {
      healthCheckService: {
        checkHealth: async () => ok(healthyResult),
      } as Partial<typeof context.healthCheckService>,
    } as Context;
  });

  describe("SPEC: Health check functionality from formal specifications", () => {
    it("should perform basic health check and return healthy status", async () => {
      const result = await performHealthCheck(context);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const health = result.value;
        expect(health.status).toBe("healthy");
        expect(health.timestamp).toBeInstanceOf(Date);
        expect(health.services).toHaveProperty("database");
        expect(health.services).toHaveProperty("redis");
        expect(health.services).toHaveProperty("fileStorage");
        expect(health.services).toHaveProperty("emailService");
        expect(health.metrics).toHaveProperty("memoryUsage");
        expect(health.metrics).toHaveProperty("cpuUsage");
        expect(health.metrics).toHaveProperty("diskUsage");
        expect(health.metrics).toHaveProperty("activeConnections");
      }
    });

    it("should detect unhealthy system status", async () => {
      context.healthCheckService = {
        checkHealth: async () => ok(unhealthyResult),
      } as Partial<typeof context.healthCheckService>;

      const result = await performHealthCheck(context);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const health = result.value;
        expect(health.status).toBe("unhealthy");
        expect(health.services.redis.status).toBe("unhealthy");
        expect(health.services.redis.error).toBe("Connection timeout");
        expect(health.services.emailService.status).toBe("degraded");
        expect(health.metrics.memoryUsage).toBeGreaterThan(90);
        expect(health.metrics.cpuUsage).toBeGreaterThan(80);
        expect(health.metrics.diskUsage).toBeGreaterThan(90);
      }
    });

    it("should check individual service health", async () => {
      const result = await performHealthCheck(context, { service: "database" });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const health = result.value;
        expect(health.services.database.status).toBe("healthy");
        expect(health.services.database.responseTime).toBeLessThan(1000);
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
        // Verify all critical services are monitored
        expect(Object.keys(health.services)).toContain("database");
        expect(Object.keys(health.services)).toContain("redis");
        expect(Object.keys(health.services)).toContain("fileStorage");
        expect(Object.keys(health.services)).toContain("emailService");

        // Verify metrics are within expected ranges
        expect(health.metrics.memoryUsage).toBeGreaterThanOrEqual(0);
        expect(health.metrics.memoryUsage).toBeLessThanOrEqual(100);
        expect(health.metrics.cpuUsage).toBeGreaterThanOrEqual(0);
        expect(health.metrics.cpuUsage).toBeLessThanOrEqual(100);
        expect(health.metrics.diskUsage).toBeGreaterThanOrEqual(0);
        expect(health.metrics.diskUsage).toBeLessThanOrEqual(100);
        expect(health.metrics.activeConnections).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe("Service monitoring", () => {
    it("should detect database connection issues", async () => {
      const dbFailureResult: HealthCheckResult = {
        ...healthyResult,
        status: "unhealthy",
        services: {
          ...healthyResult.services,
          database: {
            status: "unhealthy",
            responseTime: 10000,
            error: "Connection refused",
          },
        },
      };

      context.healthCheckService = {
        checkHealth: async () => ok(dbFailureResult),
      } as Partial<typeof context.healthCheckService>;

      const result = await performHealthCheck(context);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const health = result.value;
        expect(health.status).toBe("unhealthy");
        expect(health.services.database.status).toBe("unhealthy");
        expect(health.services.database.error).toBe("Connection refused");
      }
    });

    it("should detect slow service responses", async () => {
      const slowResult: HealthCheckResult = {
        ...healthyResult,
        status: "degraded",
        services: {
          ...healthyResult.services,
          emailService: { status: "degraded", responseTime: 3000 },
        },
      };

      context.healthCheckService = {
        checkHealth: async () => ok(slowResult),
      } as Partial<typeof context.healthCheckService>;

      const result = await performHealthCheck(context);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const health = result.value;
        expect(health.status).toBe("degraded");
        expect(health.services.emailService.status).toBe("degraded");
        expect(health.services.emailService.responseTime).toBeGreaterThan(2000);
      }
    });
  });

  describe("Resource monitoring", () => {
    it("should monitor memory usage", async () => {
      const highMemoryResult: HealthCheckResult = {
        ...healthyResult,
        status: "degraded",
        metrics: {
          ...healthyResult.metrics,
          memoryUsage: 85.5,
        },
      };

      context.healthCheckService = {
        checkHealth: async () => ok(highMemoryResult),
      } as Partial<typeof context.healthCheckService>;

      const result = await performHealthCheck(context);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const health = result.value;
        expect(health.metrics.memoryUsage).toBe(85.5);
        expect(health.status).toBe("degraded");
      }
    });

    it("should monitor CPU usage", async () => {
      const highCpuResult: HealthCheckResult = {
        ...healthyResult,
        status: "degraded",
        metrics: {
          ...healthyResult.metrics,
          cpuUsage: 75.2,
        },
      };

      context.healthCheckService = {
        checkHealth: async () => ok(highCpuResult),
      } as Partial<typeof context.healthCheckService>;

      const result = await performHealthCheck(context);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const health = result.value;
        expect(health.metrics.cpuUsage).toBe(75.2);
      }
    });
  });

  describe("Error handling", () => {
    it("should handle health check service failure", async () => {
      // biome-ignore lint/suspicious/noExplicitAny: Testing error handling requires type assertion
      const mockHealthCheckService = context.healthCheckService as any;
      mockHealthCheckService.checkHealth = async () =>
        err(new RepositoryError("Health check failed"));

      const result = await performHealthCheck(context);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to perform health check");
      }
    });

    it("should handle partial service failures gracefully", async () => {
      const partialFailureResult: HealthCheckResult = {
        status: "degraded",
        timestamp: new Date(),
        services: {
          database: { status: "healthy", responseTime: 15 },
          redis: {
            status: "unhealthy",
            responseTime: 0,
            error: "Service unavailable",
          },
          fileStorage: { status: "healthy", responseTime: 25 },
          emailService: { status: "healthy", responseTime: 100 },
        },
        metrics: {
          memoryUsage: 65.5,
          cpuUsage: 23.2,
          diskUsage: 45.8,
          activeConnections: 120,
        },
      };

      context.healthCheckService = {
        checkHealth: async () => ok(partialFailureResult),
      } as Partial<typeof context.healthCheckService>;

      const result = await performHealthCheck(context);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const health = result.value;
        expect(health.status).toBe("degraded");
        expect(health.services.redis.status).toBe("unhealthy");
        expect(health.services.database.status).toBe("healthy");
      }
    });
  });

  describe("Performance monitoring", () => {
    it("should track response times", async () => {
      const result = await performHealthCheck(context);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const health = result.value;
        expect(health.services.database.responseTime).toBeGreaterThan(0);
        expect(health.services.redis.responseTime).toBeGreaterThan(0);
        expect(health.services.fileStorage.responseTime).toBeGreaterThan(0);
        expect(health.services.emailService.responseTime).toBeGreaterThan(0);
      }
    });

    it("should monitor connection counts", async () => {
      const result = await performHealthCheck(context);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const health = result.value;
        expect(health.metrics.activeConnections).toBeGreaterThanOrEqual(0);
        expect(typeof health.metrics.activeConnections).toBe("number");
      }
    });
  });

  describe("Health check options", () => {
    it("should perform detailed health check", async () => {
      const result = await performHealthCheck(context, { detailed: true });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const health = result.value;
        expect(health.timestamp).toBeInstanceOf(Date);
        expect(Object.keys(health.services)).toHaveLength(4);
        expect(Object.keys(health.metrics)).toHaveLength(4);
      }
    });

    it("should perform quick health check", async () => {
      const quickResult: HealthCheckResult = {
        status: "healthy",
        timestamp: new Date(),
        services: {
          database: { status: "healthy", responseTime: 15 },
          redis: { status: "healthy", responseTime: 5 },
          fileStorage: { status: "healthy", responseTime: 25 },
          emailService: { status: "healthy", responseTime: 100 },
        },
        metrics: {
          memoryUsage: 65.5,
          cpuUsage: 23.2,
          diskUsage: 45.8,
          activeConnections: 120,
        },
      };

      context.healthCheckService = {
        checkHealth: async () => ok(quickResult),
      } as Partial<typeof context.healthCheckService>;

      const result = await performHealthCheck(context, { quick: true });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const health = result.value;
        expect(health.status).toBe("healthy");
      }
    });
  });
});
