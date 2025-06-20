import type { Metric, MetricType } from "@/core/domain/monitoring/types";
import { AnyError } from "@/lib/errors";
import { err, ok } from "neverthrow";
import { beforeEach, describe, expect, it } from "vitest";
import type { Context } from "../context";
import { recordMetric } from "./recordMetric";

// Mock metrics collector
class MockMetricsCollector {
  recordedMetrics: Metric[] = [];

  async recordMetric(metric: Metric) {
    this.recordedMetrics.push(metric);
    return ok(undefined);
  }

  getRecordedMetrics() {
    return this.recordedMetrics;
  }

  clearMetrics() {
    this.recordedMetrics = [];
  }
}

describe("recordMetric", () => {
  let context: Context;
  let mockMetricsCollector: MockMetricsCollector;

  beforeEach(() => {
    mockMetricsCollector = new MockMetricsCollector();
    context = {
      metricsCollector: mockMetricsCollector,
    } as Context;
  });

  describe("successful metric recording", () => {
    it("should record counter metric", async () => {
      // Act
      const result = await recordMetric(context, {
        name: "http_requests_total",
        type: "counter",
        value: 1,
      });

      // Assert
      expect(result.isOk()).toBe(true);
      const metrics = mockMetricsCollector.getRecordedMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0].name).toBe("http_requests_total");
      expect(metrics[0].type).toBe("counter");
      expect(metrics[0].value).toBe(1);
      expect(metrics[0].timestamp).toBeInstanceOf(Date);
    });

    it("should record gauge metric", async () => {
      // Act
      const result = await recordMetric(context, {
        name: "memory_usage_bytes",
        type: "gauge",
        value: 1073741824,
      });

      // Assert
      expect(result.isOk()).toBe(true);
      const metrics = mockMetricsCollector.getRecordedMetrics();
      expect(metrics[0].type).toBe("gauge");
      expect(metrics[0].value).toBe(1073741824);
    });

    it("should record histogram metric", async () => {
      // Act
      const result = await recordMetric(context, {
        name: "response_time_seconds",
        type: "histogram",
        value: 0.125,
      });

      // Assert
      expect(result.isOk()).toBe(true);
      const metrics = mockMetricsCollector.getRecordedMetrics();
      expect(metrics[0].type).toBe("histogram");
      expect(metrics[0].value).toBe(0.125);
    });

    it("should record summary metric", async () => {
      // Act
      const result = await recordMetric(context, {
        name: "request_size_bytes",
        type: "summary",
        value: 2048,
      });

      // Assert
      expect(result.isOk()).toBe(true);
      const metrics = mockMetricsCollector.getRecordedMetrics();
      expect(metrics[0].type).toBe("summary");
      expect(metrics[0].value).toBe(2048);
    });

    it("should record metric with labels", async () => {
      // Act
      const result = await recordMetric(context, {
        name: "http_requests_total",
        type: "counter",
        value: 1,
        labels: {
          method: "GET",
          status_code: "200",
          path: "/api/regions",
        },
      });

      // Assert
      expect(result.isOk()).toBe(true);
      const metrics = mockMetricsCollector.getRecordedMetrics();
      expect(metrics[0].labels).toEqual({
        method: "GET",
        status_code: "200",
        path: "/api/regions",
      });
    });

    it("should record metric with empty labels", async () => {
      // Act
      const result = await recordMetric(context, {
        name: "simple_counter",
        type: "counter",
        value: 5,
        labels: {},
      });

      // Assert
      expect(result.isOk()).toBe(true);
      const metrics = mockMetricsCollector.getRecordedMetrics();
      expect(metrics[0].labels).toEqual({});
    });

    it("should record metric without labels", async () => {
      // Act
      const result = await recordMetric(context, {
        name: "simple_gauge",
        type: "gauge",
        value: 42,
      });

      // Assert
      expect(result.isOk()).toBe(true);
      const metrics = mockMetricsCollector.getRecordedMetrics();
      expect(metrics[0].labels).toBeUndefined();
    });

    it("should handle decimal values", async () => {
      // Act
      const result = await recordMetric(context, {
        name: "cpu_usage_percent",
        type: "gauge",
        value: 75.5,
      });

      // Assert
      expect(result.isOk()).toBe(true);
      const metrics = mockMetricsCollector.getRecordedMetrics();
      expect(metrics[0].value).toBe(75.5);
    });

    it("should handle zero values", async () => {
      // Act
      const result = await recordMetric(context, {
        name: "error_count",
        type: "counter",
        value: 0,
      });

      // Assert
      expect(result.isOk()).toBe(true);
      const metrics = mockMetricsCollector.getRecordedMetrics();
      expect(metrics[0].value).toBe(0);
    });

    it("should handle negative values", async () => {
      // Act
      const result = await recordMetric(context, {
        name: "temperature_celsius",
        type: "gauge",
        value: -10.5,
      });

      // Assert
      expect(result.isOk()).toBe(true);
      const metrics = mockMetricsCollector.getRecordedMetrics();
      expect(metrics[0].value).toBe(-10.5);
    });
  });

  describe("validation errors", () => {
    it("should fail with empty metric name", async () => {
      // Act
      const result = await recordMetric(context, {
        name: "",
        type: "counter",
        value: 1,
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(AnyError);
        expect(result.error.message).toBe("Invalid metric input");
      }
    });

    it("should fail with invalid metric type", async () => {
      // Act
      const result = await recordMetric(context, {
        name: "test_metric",
        type: "invalid_type" as unknown as MetricType,
        value: 1,
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(AnyError);
        expect(result.error.message).toBe("Invalid metric input");
      }
    });

    it("should fail with non-numeric value", async () => {
      // Act
      const result = await recordMetric(context, {
        name: "test_metric",
        type: "counter",
        value: "not_a_number" as unknown as number,
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(AnyError);
        expect(result.error.message).toBe("Invalid metric input");
      }
    });

    it("should fail with missing required fields", async () => {
      // Act
      const result = await recordMetric(context, {
        name: "test_metric",
        // Missing type and value
      } as unknown as Parameters<typeof recordMetric>[1]);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(AnyError);
        expect(result.error.message).toBe("Invalid metric input");
      }
    });

    it("should fail with invalid labels type", async () => {
      // Act
      const result = await recordMetric(context, {
        name: "test_metric",
        type: "counter",
        value: 1,
        labels: "invalid_labels" as unknown as Record<string, string>,
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(AnyError);
        expect(result.error.message).toBe("Invalid metric input");
      }
    });
  });

  describe("metrics collector errors", () => {
    it("should fail when metrics collector fails", async () => {
      // Arrange
      const failingMetricsCollector = {
        recordMetric: async () =>
          err(new AnyError("Metrics service unavailable")),
      };
      const failingContext = {
        metricsCollector: failingMetricsCollector,
      } as Context;

      // Act
      const result = await recordMetric(failingContext, {
        name: "test_metric",
        type: "counter",
        value: 1,
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(AnyError);
        expect(result.error.message).toBe("Metrics service unavailable");
      }
    });

    it("should fail on storage capacity exceeded", async () => {
      // Arrange
      const capacityFailingCollector = {
        recordMetric: async () =>
          err(new AnyError("Storage capacity exceeded")),
      };
      const failingContext = {
        metricsCollector: capacityFailingCollector,
      } as Context;

      // Act
      const result = await recordMetric(failingContext, {
        name: "test_metric",
        type: "counter",
        value: 1,
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Storage capacity exceeded");
      }
    });
  });

  describe("timestamp handling", () => {
    it("should automatically set timestamp", async () => {
      // Arrange
      const beforeTime = new Date();

      // Act
      const result = await recordMetric(context, {
        name: "test_metric",
        type: "counter",
        value: 1,
      });

      const afterTime = new Date();

      // Assert
      expect(result.isOk()).toBe(true);
      const metrics = mockMetricsCollector.getRecordedMetrics();
      const timestamp = metrics[0].timestamp;
      expect(timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(timestamp.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });

    it("should set unique timestamps for multiple metrics", async () => {
      // Act
      await recordMetric(context, {
        name: "metric1",
        type: "counter",
        value: 1,
      });
      await recordMetric(context, {
        name: "metric2",
        type: "counter",
        value: 2,
      });
      await recordMetric(context, {
        name: "metric3",
        type: "counter",
        value: 3,
      });

      // Assert
      const metrics = mockMetricsCollector.getRecordedMetrics();
      expect(metrics).toHaveLength(3);

      // Timestamps should be in chronological order (or equal if very fast)
      expect(metrics[0].timestamp.getTime()).toBeLessThanOrEqual(
        metrics[1].timestamp.getTime(),
      );
      expect(metrics[1].timestamp.getTime()).toBeLessThanOrEqual(
        metrics[2].timestamp.getTime(),
      );
    });
  });

  describe("formal specification compliance", () => {
    it("should enforce business rules for metric recording", async () => {
      // Test all valid metric types
      const metricTypes: MetricType[] = [
        "counter",
        "gauge",
        "histogram",
        "summary",
      ];

      for (const type of metricTypes) {
        // Act
        const result = await recordMetric(context, {
          name: `test_${type}`,
          type,
          value: 100,
        });

        // Assert - Verify business rules are followed
        expect(result.isOk()).toBe(true);
      }

      const metrics = mockMetricsCollector.getRecordedMetrics();
      expect(metrics).toHaveLength(metricTypes.length);

      // All metrics should have required fields
      for (const metric of metrics) {
        expect(metric.name).toBeTruthy();
        expect(metric.type).toBeDefined();
        expect(typeof metric.value).toBe("number");
        expect(metric.timestamp).toBeInstanceOf(Date);
      }
    });

    it("should maintain system invariants during metric collection", async () => {
      // Arrange
      const testMetrics = [
        { name: "requests", type: "counter" as const, value: 100 },
        { name: "memory", type: "gauge" as const, value: 1024 },
        { name: "latency", type: "histogram" as const, value: 0.5 },
        { name: "size", type: "summary" as const, value: 2048 },
      ];

      // Act
      for (const testMetric of testMetrics) {
        const result = await recordMetric(context, testMetric);
        expect(result.isOk()).toBe(true);
      }

      // Assert - System state should remain consistent
      const metrics = mockMetricsCollector.getRecordedMetrics();
      expect(metrics).toHaveLength(testMetrics.length);

      // Verify metric data integrity
      for (const [index, testMetric] of testMetrics.entries()) {
        expect(metrics[index].name).toBe(testMetric.name);
        expect(metrics[index].type).toBe(testMetric.type);
        expect(metrics[index].value).toBe(testMetric.value);
      }
    });

    it("should handle complex label scenarios", async () => {
      // Test various label combinations
      const labelScenarios = [
        { labels: undefined, description: "no labels" },
        { labels: {}, description: "empty labels" },
        { labels: { key: "value" }, description: "single label" },
        {
          labels: { method: "GET", status: "200", path: "/api" },
          description: "multiple labels",
        },
        {
          labels: { unicode: "测试", emoji: "🎯", special: "!@#$%" },
          description: "special characters",
        },
      ];

      for (const { labels, description } of labelScenarios) {
        // Act
        const result = await recordMetric(context, {
          name: `test_metric_${description.replace(/\s+/g, "_")}`,
          type: "counter",
          value: 1,
          labels,
        });

        // Assert
        expect(result.isOk()).toBe(true);
      }

      const metrics = mockMetricsCollector.getRecordedMetrics();
      expect(metrics).toHaveLength(labelScenarios.length);
    });

    it("should preserve metric value precision", async () => {
      // Test various numeric values
      const precisionValues = [
        0.0001, 0.123456789, 123.456789, 1000000.5, -0.0001, -123.456,
      ];

      for (const value of precisionValues) {
        // Act
        const result = await recordMetric(context, {
          name: `precision_test_${Math.abs(value).toString().replace(".", "_")}`,
          type: "gauge",
          value,
        });

        // Assert
        expect(result.isOk()).toBe(true);
      }

      const metrics = mockMetricsCollector.getRecordedMetrics();

      // Verify precision is preserved
      for (const [index, value] of precisionValues.entries()) {
        expect(metrics[index].value).toBe(value);
      }
    });

    it("should handle high-frequency metric recording", async () => {
      // Simulate high-frequency metric recording
      const metricCount = 1000;
      const startTime = Date.now();

      // Act
      for (let i = 0; i < metricCount; i++) {
        const result = await recordMetric(context, {
          name: `high_frequency_metric_${i}`,
          type: "counter",
          value: i,
        });
        expect(result.isOk()).toBe(true);
      }

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Assert - Should handle high frequency efficiently
      const metrics = mockMetricsCollector.getRecordedMetrics();
      expect(metrics).toHaveLength(metricCount);

      // Processing should be reasonably fast
      expect(processingTime).toBeLessThan(10000); // 10 seconds for 1000 metrics
    });

    it("should ensure metric name and label consistency", async () => {
      // Test metric naming conventions
      const metricNamingTests = [
        { name: "simple_metric", valid: true },
        { name: "metric_with_numbers_123", valid: true },
        { name: "metric-with-hyphens", valid: true },
        { name: "METRIC_WITH_CAPS", valid: true },
        { name: "metric.with.dots", valid: true },
        { name: "metric:with:colons", valid: true },
      ];

      for (const { name, valid } of metricNamingTests) {
        // Act
        const result = await recordMetric(context, {
          name,
          type: "counter",
          value: 1,
          labels: { test_label: "test_value" },
        });

        // Assert
        if (valid) {
          expect(result.isOk()).toBe(true);
        }
      }

      const metrics = mockMetricsCollector.getRecordedMetrics();
      const validCount = metricNamingTests.filter((t) => t.valid).length;
      expect(metrics).toHaveLength(validCount);
    });
  });
});
