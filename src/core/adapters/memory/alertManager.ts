import { randomUUID } from "node:crypto";
import type { AlertManager } from "@/core/domain/monitoring/ports/alertManager";
import type {
  Alert,
  AlertRule,
  AlertRuleId,
} from "@/core/domain/monitoring/types";
import { AnyError } from "@/lib/errors";
import { type Result, err, ok } from "neverthrow";

export class MemoryAlertManager implements AlertManager {
  private rules: AlertRule[] = [];
  private alerts: Alert[] = [];

  async createRule(
    rule: Omit<AlertRule, "id" | "createdAt">,
  ): Promise<Result<AlertRule, AnyError>> {
    try {
      const newRule: AlertRule = {
        ...rule,
        id: randomUUID() as AlertRuleId,
        createdAt: new Date(),
      };

      this.rules.push(newRule);
      return ok(newRule);
    } catch (error) {
      return err(new AnyError("Failed to create alert rule", error));
    }
  }

  async updateRule(
    id: string,
    updates: Partial<AlertRule>,
  ): Promise<Result<AlertRule, AnyError>> {
    try {
      const ruleIndex = this.rules.findIndex((rule) => rule.id === id);
      if (ruleIndex === -1) {
        return err(new AnyError("Alert rule not found"));
      }

      this.rules[ruleIndex] = { ...this.rules[ruleIndex], ...updates };
      return ok(this.rules[ruleIndex]);
    } catch (error) {
      return err(new AnyError("Failed to update alert rule", error));
    }
  }

  async deleteRule(id: string): Promise<Result<void, AnyError>> {
    try {
      const ruleIndex = this.rules.findIndex((rule) => rule.id === id);
      if (ruleIndex === -1) {
        return err(new AnyError("Alert rule not found"));
      }

      this.rules.splice(ruleIndex, 1);
      return ok(undefined);
    } catch (error) {
      return err(new AnyError("Failed to delete alert rule", error));
    }
  }

  async getRules(): Promise<Result<AlertRule[], AnyError>> {
    try {
      return ok([...this.rules]);
    } catch (error) {
      return err(new AnyError("Failed to get alert rules", error));
    }
  }

  async triggerAlert(
    ruleId: string,
    message: string,
    metadata?: Record<string, unknown>,
  ): Promise<Result<Alert, AnyError>> {
    try {
      const rule = this.rules.find((r) => r.id === ruleId);
      if (!rule) {
        return err(new AnyError("Alert rule not found"));
      }

      const alert: Alert = {
        id: randomUUID(),
        ruleId,
        message,
        severity: rule.severity,
        triggeredAt: new Date(),
        metadata,
      };

      this.alerts.push(alert);

      // Send notifications based on severity
      await this.sendNotification(alert);

      return ok(alert);
    } catch (error) {
      return err(new AnyError("Failed to trigger alert", error));
    }
  }

  async resolveAlert(alertId: string): Promise<Result<Alert, AnyError>> {
    try {
      const alertIndex = this.alerts.findIndex((alert) => alert.id === alertId);
      if (alertIndex === -1) {
        return err(new AnyError("Alert not found"));
      }

      this.alerts[alertIndex].resolvedAt = new Date();
      return ok(this.alerts[alertIndex]);
    } catch (error) {
      return err(new AnyError("Failed to resolve alert", error));
    }
  }

  async getActiveAlerts(): Promise<Result<Alert[], AnyError>> {
    try {
      const activeAlerts = this.alerts.filter((alert) => !alert.resolvedAt);
      return ok(activeAlerts);
    } catch (error) {
      return err(new AnyError("Failed to get active alerts", error));
    }
  }

  private async sendNotification(alert: Alert): Promise<void> {
    // Integration with notification service
    const channels = this.getNotificationChannels(alert.severity);

    for (const channel of channels) {
      try {
        await this.sendToChannel(channel, alert);
      } catch (error) {
        console.error(`Failed to send alert to ${channel}:`, error);
      }
    }
  }

  private getNotificationChannels(severity: Alert["severity"]): string[] {
    switch (severity) {
      case "critical":
        return ["email", "slack", "pagerduty"];
      case "warning":
        return ["email", "slack"];
      case "info":
        return ["slack"];
      default:
        return [];
    }
  }

  private async sendToChannel(channel: string, alert: Alert): Promise<void> {
    switch (channel) {
      case "email":
        // Send email notification
        break;
      case "slack":
        // Send Slack notification
        break;
      case "pagerduty":
        // Send PagerDuty notification
        break;
    }
  }
}
