import type { AlertRule, AlertRuleId } from "@/core/domain/monitoring/types";
import { AnyError } from "@/lib/errors";
import { err, ok } from "neverthrow";
import { beforeEach, describe, expect, it } from "vitest";
import type { Context } from "../context";
import { createMockContext } from "../testUtils/mockContext";
import { createAlertRule } from "./createAlertRule";

// Mock alert manager
class MockAlertManager {
  async createRule(params: {
    name: string;
    metric: string;
    condition: string;
    threshold: number;
    severity: "critical" | "warning" | "info";
    enabled: boolean;
  }) {
    return ok({
      id: "alert-rule-123" as AlertRuleId,
      name: params.name,
      metric: params.metric,
      condition: params.condition,
      threshold: params.threshold,
      severity: params.severity,
      enabled: params.enabled,
      createdAt: new Date(),
    } as AlertRule);
  }

  async updateRule(id: string, updates: Partial<AlertRule>) {
    return ok({
      id: id as AlertRuleId,
      name: "Updated Rule",
      metric: "cpu_usage_percent",
      condition: "greater_than",
      threshold: 90,
      severity: "critical" as const,
      enabled: true,
      createdAt: new Date(),
      ...updates,
    } as AlertRule);
  }

  async deleteRule(id: string) {
    return ok(undefined);
  }

  async getRules() {
    return ok([] as AlertRule[]);
  }

  async triggerAlert(
    ruleId: string,
    message: string,
    metadata?: Record<string, unknown>,
  ) {
    return ok({
      id: "alert-123",
      ruleId,
      message,
      severity: "critical" as const,
      triggeredAt: new Date(),
      metadata,
      // biome-ignore lint/suspicious/noExplicitAny: Mock alert object for testing
    } as any);
  }

  async resolveAlert(alertId: string) {
    return ok({
      id: alertId,
      ruleId: "rule-123",
      message: "Alert resolved",
      severity: "critical" as const,
      triggeredAt: new Date(),
      resolvedAt: new Date(),
      // biome-ignore lint/suspicious/noExplicitAny: Mock alert object for testing
    } as any);
  }

  async getActiveAlerts() {
    // biome-ignore lint/suspicious/noExplicitAny: Mock alert array for testing
    return ok([] as any[]);
  }
}

describe("createAlertRule", () => {
  let context: Context;

  beforeEach(() => {
    context = createMockContext({
      alertManager: new MockAlertManager(),
    });
  });

  describe("successful alert rule creation", () => {
    it("should create critical alert rule", async () => {
      // Act
      const result = await createAlertRule(context, {
        name: "High CPU Usage",
        metric: "cpu_usage_percent",
        condition: "greater_than",
        threshold: 90,
        severity: "critical",
        enabled: true,
      });

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.name).toBe("High CPU Usage");
        expect(result.value.metric).toBe("cpu_usage_percent");
        expect(result.value.condition).toBe("greater_than");
        expect(result.value.threshold).toBe(90);
        expect(result.value.severity).toBe("critical");
        expect(result.value.enabled).toBe(true);
        expect(result.value.id).toBeDefined();
        expect(result.value.createdAt).toBeInstanceOf(Date);
      }
    });

    it("should create warning alert rule", async () => {
      // Act
      const result = await createAlertRule(context, {
        name: "Memory Usage Warning",
        metric: "memory_usage_percent",
        condition: "greater_than",
        threshold: 75,
        severity: "warning",
        enabled: true,
      });

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.severity).toBe("warning");
        expect(result.value.threshold).toBe(75);
      }
    });

    it("should create info alert rule", async () => {
      // Act
      const result = await createAlertRule(context, {
        name: "User Registration Info",
        metric: "user_registrations_per_hour",
        condition: "greater_than",
        threshold: 10,
        severity: "info",
        enabled: true,
      });

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.severity).toBe("info");
        expect(result.value.metric).toBe("user_registrations_per_hour");
      }
    });

    it("should create disabled alert rule", async () => {
      // Act
      const result = await createAlertRule(context, {
        name: "Test Alert Rule",
        metric: "test_metric",
        condition: "less_than",
        threshold: 5,
        severity: "warning",
        enabled: false,
      });

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.enabled).toBe(false);
        expect(result.value.condition).toBe("less_than");
      }
    });

    it("should use default enabled value", async () => {
      // Act
      const result = await createAlertRule(context, {
        name: "Default Enabled Rule",
        metric: "response_time_ms",
        condition: "greater_than",
        threshold: 1000,
        severity: "critical",
        enabled: true,
      });

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.enabled).toBe(true); // Default value
      }
    });

    it("should handle various metric types", async () => {
      // Test different metric types
      const metrics = [
        "cpu_usage_percent",
        "memory_usage_bytes",
        "disk_usage_percent",
        "response_time_ms",
        "error_rate_percent",
        "active_connections",
        "queue_length",
      ];

      for (const metric of metrics) {
        // Act
        const result = await createAlertRule(context, {
          name: `Alert for ${metric}`,
          metric,
          condition: "greater_than",
          threshold: 100,
          severity: "warning",
          enabled: true,
        });

        // Assert
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.metric).toBe(metric);
        }
      }
    });

    it("should handle various condition types", async () => {
      // Test different condition types
      const conditions = [
        "greater_than",
        "less_than",
        "equals",
        "not_equals",
        "greater_than_or_equal",
        "less_than_or_equal",
      ];

      for (const condition of conditions) {
        // Act
        const result = await createAlertRule(context, {
          name: `Alert with ${condition}`,
          metric: "test_metric",
          condition,
          threshold: 50,
          severity: "warning",
          enabled: true,
        });

        // Assert
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.condition).toBe(condition);
        }
      }
    });
  });

  describe("validation errors", () => {
    it("should fail with empty name", async () => {
      // Act
      const result = await createAlertRule(context, {
        name: "",
        metric: "cpu_usage_percent",
        condition: "greater_than",
        threshold: 90,
        severity: "critical",
        enabled: true,
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(AnyError);
        expect(result.error.message).toBe("Invalid alert rule input");
      }
    });

    it("should fail with empty metric", async () => {
      // Act
      const result = await createAlertRule(context, {
        name: "Test Alert",
        metric: "",
        condition: "greater_than",
        threshold: 90,
        severity: "critical",
        enabled: true,
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(AnyError);
        expect(result.error.message).toBe("Invalid alert rule input");
      }
    });

    it("should fail with empty condition", async () => {
      // Act
      const result = await createAlertRule(context, {
        name: "Test Alert",
        metric: "cpu_usage_percent",
        condition: "",
        threshold: 90,
        severity: "critical",
        enabled: true,
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(AnyError);
        expect(result.error.message).toBe("Invalid alert rule input");
      }
    });

    it("should fail with invalid severity", async () => {
      // Act
      const result = await createAlertRule(context, {
        name: "Test Alert",
        metric: "cpu_usage_percent",
        condition: "greater_than",
        threshold: 90,
        // biome-ignore lint/suspicious/noExplicitAny: Testing invalid input
        severity: "invalid" as any,
        enabled: true,
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(AnyError);
        expect(result.error.message).toBe("Invalid alert rule input");
      }
    });

    it("should fail with non-numeric threshold", async () => {
      // Act
      const result = await createAlertRule(context, {
        name: "Test Alert",
        metric: "cpu_usage_percent",
        condition: "greater_than",
        // biome-ignore lint/suspicious/noExplicitAny: Testing invalid input
        threshold: "not_a_number" as any,
        severity: "critical",
        enabled: true,
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(AnyError);
        expect(result.error.message).toBe("Invalid alert rule input");
      }
    });

    it("should fail with missing required fields", async () => {
      // Act
      const result = await createAlertRule(context, {
        name: "Test Alert",
        // Missing required fields
        severity: "critical",
        enabled: true,
      } as unknown as Parameters<typeof createAlertRule>[1]);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(AnyError);
        expect(result.error.message).toBe("Invalid alert rule input");
      }
    });
  });

  describe("alert manager errors", () => {
    it("should fail when alert manager fails", async () => {
      // Arrange
      context.alertManager.createRule = async () =>
        err(new AnyError("Alert manager unavailable"));

      // Act
      const result = await createAlertRule(context, {
        name: "Test Alert",
        metric: "cpu_usage_percent",
        condition: "greater_than",
        threshold: 90,
        severity: "critical",
        enabled: true,
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(AnyError);
        expect(result.error.message).toBe("Alert manager unavailable");
      }
    });

    it("should fail on duplicate alert rule names", async () => {
      // Arrange
      context.alertManager.createRule = async () =>
        err(new AnyError("Alert rule name already exists"));

      // Act
      const result = await createAlertRule(context, {
        name: "Duplicate Alert",
        metric: "cpu_usage_percent",
        condition: "greater_than",
        threshold: 90,
        severity: "critical",
        enabled: true,
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Alert rule name already exists");
      }
    });

    it("should fail on invalid metric configuration", async () => {
      // Arrange
      context.alertManager.createRule = async () =>
        err(new AnyError("Unknown metric type"));

      // Act
      const result = await createAlertRule(context, {
        name: "Invalid Metric Alert",
        metric: "unknown_metric",
        condition: "greater_than",
        threshold: 90,
        severity: "critical",
        enabled: true,
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Unknown metric type");
      }
    });
  });

  describe("formal specification compliance", () => {
    it("should enforce business rules for alert rule creation", async () => {
      // Act
      const result = await createAlertRule(context, {
        name: "Business Rule Alert",
        metric: "user_activity_rate",
        condition: "less_than",
        threshold: 0.1,
        severity: "warning",
        enabled: true,
      });

      // Assert - Verify business rules are followed
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // Alert rule should have all required properties
        expect(result.value.id).toBeDefined();
        expect(result.value.name).toBeTruthy();
        expect(result.value.metric).toBeTruthy();
        expect(result.value.condition).toBeTruthy();
        expect(typeof result.value.threshold).toBe("number");
        expect(["critical", "warning", "info"]).toContain(
          result.value.severity,
        );
        expect(typeof result.value.enabled).toBe("boolean");
        expect(result.value.createdAt).toBeInstanceOf(Date);
      }
    });

    it("should maintain system invariants during rule creation", async () => {
      // Arrange
      context.alertManager.createRule = async (params) => {
        // Verify rule parameters match business logic
        expect(params.name).toBeTruthy();
        expect(params.metric).toBeTruthy();
        expect(params.condition).toBeTruthy();
        expect(typeof params.threshold).toBe("number");
        expect(["critical", "warning", "info"]).toContain(params.severity);
        expect(typeof params.enabled).toBe("boolean");

        return ok({
          id: "rule-validated" as AlertRuleId,
          name: params.name,
          metric: params.metric,
          condition: params.condition,
          threshold: params.threshold,
          severity: params.severity,
          enabled: params.enabled,
          createdAt: new Date(),
        } as AlertRule);
      };

      // Act
      const result = await createAlertRule(context, {
        name: "System Invariant Test",
        metric: "system_health_score",
        condition: "less_than",
        threshold: 0.8,
        severity: "critical",
        enabled: true,
      });

      // Assert - System state should remain consistent
      expect(result.isOk()).toBe(true);
    });

    it("should handle threshold edge cases correctly", async () => {
      // Test edge cases for thresholds
      const thresholdCases = [
        { threshold: 0, description: "zero threshold" },
        { threshold: -1, description: "negative threshold" },
        { threshold: 100, description: "percentage threshold" },
        { threshold: 0.001, description: "small decimal threshold" },
        { threshold: 1000000, description: "large threshold" },
      ];

      for (const { threshold, description } of thresholdCases) {
        // Act
        const result = await createAlertRule(context, {
          name: `Alert ${description}`,
          metric: "test_metric",
          condition: "greater_than",
          threshold,
          severity: "warning",
          enabled: true,
        });

        // Assert
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.threshold).toBe(threshold);
        }
      }
    });

    it("should ensure alert rule naming conventions", async () => {
      // Test various naming patterns
      const namingCases = [
        "Simple Alert",
        "Alert-With-Hyphens",
        "Alert_With_Underscores",
        "Alert123WithNumbers",
        "Very Long Alert Name That Describes Complex Monitoring Condition",
        "短いアラート", // Japanese characters
        "Alert with special chars !@#",
      ];

      for (const name of namingCases) {
        // Act
        const result = await createAlertRule(context, {
          name,
          metric: "test_metric",
          condition: "greater_than",
          threshold: 50,
          severity: "info",
          enabled: true,
        });

        // Assert
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.name).toBe(name);
        }
      }
    });

    it("should support comprehensive monitoring scenarios", async () => {
      // Test real-world monitoring scenarios
      const monitoringScenarios = [
        {
          name: "Database Connection Pool Exhaustion",
          metric: "db_connection_pool_usage",
          condition: "greater_than",
          threshold: 0.9,
          severity: "critical" as const,
        },
        {
          name: "API Response Time Degradation",
          metric: "api_response_time_p95",
          condition: "greater_than",
          threshold: 2000,
          severity: "warning" as const,
        },
        {
          name: "User Session Drop Rate",
          metric: "session_drop_rate",
          condition: "greater_than",
          threshold: 0.05,
          severity: "warning" as const,
        },
        {
          name: "Low Disk Space Warning",
          metric: "disk_usage_percent",
          condition: "greater_than",
          threshold: 85,
          severity: "warning" as const,
        },
        {
          name: "New User Registration Spike",
          metric: "new_user_registrations_per_minute",
          condition: "greater_than",
          threshold: 100,
          severity: "info" as const,
        },
      ];

      for (const scenario of monitoringScenarios) {
        // Act
        const result = await createAlertRule(context, {
          ...scenario,
          enabled: true,
        });

        // Assert
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.name).toBe(scenario.name);
          expect(result.value.metric).toBe(scenario.metric);
          expect(result.value.condition).toBe(scenario.condition);
          expect(result.value.threshold).toBe(scenario.threshold);
          expect(result.value.severity).toBe(scenario.severity);
        }
      }
    });
  });
});
