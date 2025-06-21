import type { MetricType } from "@/core/domain/monitoring/types";
import { AnyError } from "@/lib/errors";
import { err, ok } from "neverthrow";
import { beforeEach, describe, expect, it } from "vitest";
import type { Context } from "../context";
import { createMockContext } from "../testUtils/mockContext";
import { createMonitoringMiddleware } from "./monitoringMiddleware";

// Mock metrics collector
class MockMetricsCollector {
  recordedMetrics: Array<{
    name: string;
    type: MetricType;
    value: number;
    labels?: Record<string, string>;
    timestamp: Date;
  }> = [];

  async record(metric: {
    name: string;
    type: MetricType;
    value: number;
    labels?: Record<string, string>;
  }) {
    this.recordedMetrics.push({
      ...metric,
      timestamp: new Date(),
    });
    return ok(undefined);
  }

  async recordMetric(metric: {
    name: string;
    type: MetricType;
    value: number;
    labels?: Record<string, string>;
    timestamp: Date;
  }) {
    this.recordedMetrics.push(metric);
    return ok(undefined);
  }

  async getMetrics(timeRange: { start: Date; end: Date }) {
    return ok(
      this.recordedMetrics.filter(
        (m) => m.timestamp >= timeRange.start && m.timestamp <= timeRange.end,
      ),
    );
  }

  async recordHealthCheck(healthCheck: {
    service: string;
    status: "healthy" | "unhealthy" | "degraded";
    responseTime: number;
    timestamp: Date;
    details?: Record<string, unknown>;
  }) {
    return ok(undefined);
  }

  async getHealthStatus() {
    return ok([]);
  }

  getRecordedMetrics() {
    return this.recordedMetrics;
  }

  clearMetrics() {
    this.recordedMetrics = [];
  }
}

describe("monitoringMiddleware", () => {
  let context: Context;
  let mockMetricsCollector: MockMetricsCollector;
  let middleware: ReturnType<typeof createMonitoringMiddleware>;

  beforeEach(() => {
    mockMetricsCollector = new MockMetricsCollector();
    context = createMockContext({
      metricsCollector: mockMetricsCollector,
    });
    middleware = createMonitoringMiddleware(context);
  });

  describe("request monitoring", () => {
    it("should record HTTP request metrics", async () => {
      // Act
      await middleware.recordRequest("GET", "/api/regions", 200, 150);

      // Assert
      const metrics = mockMetricsCollector.getRecordedMetrics();
      expect(metrics).toHaveLength(2);

      // Check request count metric
      const requestCountMetric = metrics.find(
        (m) => m.name === "http_requests_total",
      );
      expect(requestCountMetric).toBeDefined();
      expect(requestCountMetric?.type).toBe("counter");
      expect(requestCountMetric?.value).toBe(1);
      expect(requestCountMetric?.labels).toEqual({
        method: "GET",
        path: "/api/regions",
        status_code: "200",
      });

      // Check response time metric
      const responseTimeMetric = metrics.find(
        (m) => m.name === "http_request_duration_seconds",
      );
      expect(responseTimeMetric).toBeDefined();
      expect(responseTimeMetric?.type).toBe("histogram");
      expect(responseTimeMetric?.value).toBe(0.15); // 150ms -> 0.15s
      expect(responseTimeMetric?.labels).toEqual({
        method: "GET",
        path: "/api/regions",
      });
    });

    it("should record authenticated user activity", async () => {
      // Act
      await middleware.recordRequest(
        "POST",
        "/api/locations",
        201,
        250,
        "user-123",
      );

      // Assert
      const metrics = mockMetricsCollector.getRecordedMetrics();
      expect(metrics).toHaveLength(3);

      // Check user activity metric
      const userActivityMetric = metrics.find(
        (m) => m.name === "user_activity_total",
      );
      expect(userActivityMetric).toBeDefined();
      expect(userActivityMetric?.type).toBe("counter");
      expect(userActivityMetric?.value).toBe(1);
      expect(userActivityMetric?.labels).toEqual({
        user_id: "user-123",
        action: "POST_/api/locations",
      });
    });

    it("should handle different HTTP methods and status codes", async () => {
      // Test different HTTP scenarios
      const scenarios = [
        { method: "GET", path: "/api/users", status: 200, time: 100 },
        { method: "POST", path: "/api/regions", status: 201, time: 300 },
        { method: "PUT", path: "/api/locations/123", status: 200, time: 200 },
        { method: "DELETE", path: "/api/regions/456", status: 204, time: 150 },
        { method: "GET", path: "/api/nonexistent", status: 404, time: 50 },
        { method: "POST", path: "/api/invalid", status: 500, time: 1000 },
      ];

      // Act
      for (const scenario of scenarios) {
        await middleware.recordRequest(
          scenario.method,
          scenario.path,
          scenario.status,
          scenario.time,
        );
      }

      // Assert
      const metrics = mockMetricsCollector.getRecordedMetrics();
      expect(metrics).toHaveLength(scenarios.length * 2); // Each request generates 2 metrics

      // Verify all status codes are recorded
      const requestMetrics = metrics.filter(
        (m) => m.name === "http_requests_total",
      );
      const statusCodes = requestMetrics.map((m) => m.labels?.status_code);
      expect(statusCodes).toContain("200");
      expect(statusCodes).toContain("201");
      expect(statusCodes).toContain("204");
      expect(statusCodes).toContain("404");
      expect(statusCodes).toContain("500");
    });
  });

  describe("database monitoring", () => {
    it("should record successful database query", async () => {
      // Act
      await middleware.recordDatabaseQuery("SELECT", "users", 25, true);

      // Assert
      const metrics = mockMetricsCollector.getRecordedMetrics();
      expect(metrics).toHaveLength(2);

      // Check query count metric
      const queryCountMetric = metrics.find(
        (m) => m.name === "database_queries_total",
      );
      expect(queryCountMetric).toBeDefined();
      expect(queryCountMetric?.type).toBe("counter");
      expect(queryCountMetric?.value).toBe(1);
      expect(queryCountMetric?.labels).toEqual({
        operation: "SELECT",
        table: "users",
        status: "success",
      });

      // Check query duration metric
      const queryDurationMetric = metrics.find(
        (m) => m.name === "database_query_duration_seconds",
      );
      expect(queryDurationMetric).toBeDefined();
      expect(queryDurationMetric?.type).toBe("histogram");
      expect(queryDurationMetric?.value).toBe(0.025); // 25ms -> 0.025s
    });

    it("should record failed database query", async () => {
      // Act
      await middleware.recordDatabaseQuery("UPDATE", "regions", 100, false);

      // Assert
      const metrics = mockMetricsCollector.getRecordedMetrics();
      const queryCountMetric = metrics.find(
        (m) => m.name === "database_queries_total",
      );
      expect(queryCountMetric?.labels?.status).toBe("error");
    });

    it("should handle different database operations", async () => {
      // Test different database operations
      const operations = [
        { op: "SELECT", table: "users", duration: 15, success: true },
        { op: "INSERT", table: "regions", duration: 45, success: true },
        { op: "UPDATE", table: "locations", duration: 30, success: true },
        { op: "DELETE", table: "checkins", duration: 20, success: true },
        {
          op: "SELECT",
          table: "invalid_table",
          duration: 5000,
          success: false,
        },
      ];

      // Act
      for (const operation of operations) {
        await middleware.recordDatabaseQuery(
          operation.op,
          operation.table,
          operation.duration,
          operation.success,
        );
      }

      // Assert
      const metrics = mockMetricsCollector.getRecordedMetrics();
      expect(metrics).toHaveLength(operations.length * 2);

      // Verify all operations are recorded
      const queryMetrics = metrics.filter(
        (m) => m.name === "database_queries_total",
      );
      const recordedOps = queryMetrics.map((m) => m.labels?.operation);
      expect(recordedOps).toContain("SELECT");
      expect(recordedOps).toContain("INSERT");
      expect(recordedOps).toContain("UPDATE");
      expect(recordedOps).toContain("DELETE");
    });
  });

  describe("business metrics", () => {
    it("should record business event with default value", async () => {
      // Act
      await middleware.recordBusinessMetric("user_registration");

      // Assert
      const metrics = mockMetricsCollector.getRecordedMetrics();
      expect(metrics).toHaveLength(1);

      const businessMetric = metrics[0];
      expect(businessMetric.name).toBe("business_user_registration_total");
      expect(businessMetric.type).toBe("counter");
      expect(businessMetric.value).toBe(1);
    });

    it("should record business event with custom value", async () => {
      // Act
      await middleware.recordBusinessMetric("location_views", 5);

      // Assert
      const metrics = mockMetricsCollector.getRecordedMetrics();
      const businessMetric = metrics[0];
      expect(businessMetric.name).toBe("business_location_views_total");
      expect(businessMetric.value).toBe(5);
    });

    it("should record business event with labels", async () => {
      // Act
      await middleware.recordBusinessMetric("subscription_upgrade", 1, {
        from_plan: "free",
        to_plan: "premium",
        region: "tokyo",
      });

      // Assert
      const metrics = mockMetricsCollector.getRecordedMetrics();
      const businessMetric = metrics[0];
      expect(businessMetric.name).toBe("business_subscription_upgrade_total");
      expect(businessMetric.labels).toEqual({
        from_plan: "free",
        to_plan: "premium",
        region: "tokyo",
      });
    });

    it("should handle various business events", async () => {
      // Test different business events
      const events: Array<{
        event: string;
        value: number;
        labels: Record<string, string>;
      }> = [
        { event: "user_login", value: 1, labels: { method: "email" } },
        { event: "content_shared", value: 3, labels: { type: "location" } },
        {
          event: "search_performed",
          value: 1,
          labels: { query_type: "location" },
        },
        {
          event: "favorite_added",
          value: 2,
          labels: { content_type: "region" },
        },
        {
          event: "checkin_created",
          value: 1,
          labels: { location_type: "restaurant" },
        },
      ];

      // Act
      for (const { event, value, labels } of events) {
        await middleware.recordBusinessMetric(event, value, labels);
      }

      // Assert
      const metrics = mockMetricsCollector.getRecordedMetrics();
      expect(metrics).toHaveLength(events.length);

      // Verify all events are recorded with correct naming
      const eventNames = metrics.map((m) => m.name);
      expect(eventNames).toContain("business_user_login_total");
      expect(eventNames).toContain("business_content_shared_total");
      expect(eventNames).toContain("business_search_performed_total");
      expect(eventNames).toContain("business_favorite_added_total");
      expect(eventNames).toContain("business_checkin_created_total");
    });
  });

  describe("system metrics", () => {
    it("should record system metric", async () => {
      // Act
      await middleware.recordSystemMetric("cpu_usage_percent", 75.5);

      // Assert
      const metrics = mockMetricsCollector.getRecordedMetrics();
      expect(metrics).toHaveLength(1);

      const systemMetric = metrics[0];
      expect(systemMetric.name).toBe("system_cpu_usage_percent");
      expect(systemMetric.type).toBe("gauge");
      expect(systemMetric.value).toBe(75.5);
    });

    it("should record system metric with labels", async () => {
      // Act
      await middleware.recordSystemMetric("memory_usage_bytes", 1073741824, {
        component: "application",
        instance: "web-1",
      });

      // Assert
      const metrics = mockMetricsCollector.getRecordedMetrics();
      const systemMetric = metrics[0];
      expect(systemMetric.name).toBe("system_memory_usage_bytes");
      expect(systemMetric.labels).toEqual({
        component: "application",
        instance: "web-1",
      });
    });

    it("should handle various system metrics", async () => {
      // Test different system metrics
      const systemMetrics: Array<{
        name: string;
        value: number;
        labels?: Record<string, string>;
      }> = [
        { name: "cpu_usage_percent", value: 65.2, labels: { core: "0" } },
        { name: "memory_usage_percent", value: 78.9 },
        {
          name: "disk_usage_bytes",
          value: 21474836480,
          labels: { mount: "/" },
        },
        {
          name: "network_bytes_sent",
          value: 1048576,
          labels: { interface: "eth0" },
        },
        { name: "active_connections", value: 150 },
      ];

      // Act
      for (const { name, value, labels } of systemMetrics) {
        await middleware.recordSystemMetric(name, value, labels);
      }

      // Assert
      const metrics = mockMetricsCollector.getRecordedMetrics();
      expect(metrics).toHaveLength(systemMetrics.length);

      // Verify all metrics are recorded with system_ prefix
      const metricNames = metrics.map((m) => m.name);
      expect(metricNames).toContain("system_cpu_usage_percent");
      expect(metricNames).toContain("system_memory_usage_percent");
      expect(metricNames).toContain("system_disk_usage_bytes");
      expect(metricNames).toContain("system_network_bytes_sent");
      expect(metricNames).toContain("system_active_connections");
    });
  });

  describe("error handling", () => {
    it("should handle metrics collector failures gracefully", async () => {
      // Arrange
      const failingMetricsCollector = {
        record: async () => err(new AnyError("Metrics service unavailable")),
        recordMetric: async () =>
          err(new AnyError("Metrics service unavailable")),
        getMetrics: async () =>
          err(new AnyError("Metrics service unavailable")),
        recordHealthCheck: async () =>
          err(new AnyError("Metrics service unavailable")),
        getHealthStatus: async () =>
          err(new AnyError("Metrics service unavailable")),
      };
      const failingContext = createMockContext({
        metricsCollector: failingMetricsCollector,
      });
      const failingMiddleware = createMonitoringMiddleware(failingContext);

      // Act & Assert - Should not throw errors
      await expect(
        failingMiddleware.recordRequest("GET", "/test", 200, 100),
      ).resolves.not.toThrow();
      await expect(
        failingMiddleware.recordDatabaseQuery("SELECT", "test", 50, true),
      ).resolves.not.toThrow();
      await expect(
        failingMiddleware.recordBusinessMetric("test_event"),
      ).resolves.not.toThrow();
      await expect(
        failingMiddleware.recordSystemMetric("test_metric", 100),
      ).resolves.not.toThrow();
    });
  });

  describe("formal specification compliance", () => {
    it("should enforce business rules for metric recording", async () => {
      // Act - Record various types of metrics
      await middleware.recordRequest("GET", "/api/test", 200, 150, "user-123");
      await middleware.recordDatabaseQuery("SELECT", "users", 25, true);
      await middleware.recordBusinessMetric("user_action", 1, {
        type: "click",
      });
      await middleware.recordSystemMetric("cpu_usage", 65.5);

      // Assert - Verify business rules are followed
      const metrics = mockMetricsCollector.getRecordedMetrics();

      // All metrics should have required fields
      for (const metric of metrics) {
        expect(metric.name).toBeTruthy();
        expect(metric.type).toBeDefined();
        expect(typeof metric.value).toBe("number");
        expect(metric.timestamp).toBeInstanceOf(Date);
      }

      // Verify metric naming conventions
      const metricNames = metrics.map((m) => m.name);
      expect(metricNames.some((name) => name.startsWith("http_"))).toBe(true);
      expect(metricNames.some((name) => name.startsWith("database_"))).toBe(
        true,
      );
      expect(metricNames.some((name) => name.startsWith("business_"))).toBe(
        true,
      );
      expect(metricNames.some((name) => name.startsWith("system_"))).toBe(true);
    });

    it("should maintain system invariants during monitoring", async () => {
      // Arrange - Track middleware behavior
      const requestCount = 10;
      const dbQueryCount = 5;
      const businessEventCount = 3;
      const systemMetricCount = 2;

      // Act - Generate various metrics
      for (let i = 0; i < requestCount; i++) {
        await middleware.recordRequest("GET", `/api/test${i}`, 200, 100);
      }
      for (let i = 0; i < dbQueryCount; i++) {
        await middleware.recordDatabaseQuery("SELECT", "table", 50, true);
      }
      for (let i = 0; i < businessEventCount; i++) {
        await middleware.recordBusinessMetric("event", 1);
      }
      for (let i = 0; i < systemMetricCount; i++) {
        await middleware.recordSystemMetric("metric", 100);
      }

      // Assert - System state should remain consistent
      const metrics = mockMetricsCollector.getRecordedMetrics();
      const expectedMetricCount =
        requestCount * 2 +
        dbQueryCount * 2 +
        businessEventCount +
        systemMetricCount;
      expect(metrics).toHaveLength(expectedMetricCount);
    });

    it("should handle high-frequency metric recording", async () => {
      // Simulate high-frequency monitoring scenario
      const highFrequencyRequests = 100;
      const startTime = Date.now();

      // Act
      for (let i = 0; i < highFrequencyRequests; i++) {
        await middleware.recordRequest("GET", "/api/high-frequency", 200, 10);
      }

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Assert - Should handle high frequency efficiently
      const metrics = mockMetricsCollector.getRecordedMetrics();
      expect(metrics).toHaveLength(highFrequencyRequests * 2);

      // Processing should be reasonably fast (adjust threshold as needed)
      expect(processingTime).toBeLessThan(5000); // 5 seconds for 100 requests
    });

    it("should preserve metric data integrity", async () => {
      // Arrange - Specific metric values
      const testData = {
        responseTime: 12.345,
        statusCode: 418, // I'm a teapot
        userId: "specific-user-id",
        customValue: 42.789,
      };

      // Act
      await middleware.recordRequest(
        "POST",
        "/api/specific",
        testData.statusCode,
        testData.responseTime,
        testData.userId,
      );
      await middleware.recordBusinessMetric(
        "specific_event",
        testData.customValue,
        {
          custom_label: "specific_value",
        },
      );

      // Assert - Data should be preserved exactly
      const metrics = mockMetricsCollector.getRecordedMetrics();

      // Check response time conversion
      const responseTimeMetric = metrics.find(
        (m) => m.name === "http_request_duration_seconds",
      );
      expect(responseTimeMetric?.value).toBe(testData.responseTime / 1000);

      // Check status code preservation
      const requestMetric = metrics.find(
        (m) => m.name === "http_requests_total",
      );
      expect(requestMetric?.labels?.status_code).toBe(
        testData.statusCode.toString(),
      );

      // Check user ID preservation
      const userActivityMetric = metrics.find(
        (m) => m.name === "user_activity_total",
      );
      expect(userActivityMetric?.labels?.user_id).toBe(testData.userId);

      // Check custom value preservation
      const businessMetric = metrics.find(
        (m) => m.name === "business_specific_event_total",
      );
      expect(businessMetric?.value).toBe(testData.customValue);
      expect(businessMetric?.labels?.custom_label).toBe("specific_value");
    });
  });
});
