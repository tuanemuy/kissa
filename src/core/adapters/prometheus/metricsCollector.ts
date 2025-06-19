import type { MetricsCollector } from "@/core/domain/monitoring/ports/metricsCollector";
import type { HealthCheck, Metric } from "@/core/domain/monitoring/types";
import { AnyError } from "@/lib/errors";
import { type Result, err, ok } from "neverthrow";

export class PrometheusMetricsCollector implements MetricsCollector {
  private metrics: Metric[] = [];
  private healthChecks: HealthCheck[] = [];

  async recordMetric(metric: Metric): Promise<Result<void, AnyError>> {
    try {
      this.metrics.push(metric);

      // Send to Prometheus push gateway or expose via metrics endpoint
      if (process.env.PROMETHEUS_PUSH_GATEWAY) {
        await this.pushToGateway(metric);
      }

      return ok(undefined);
    } catch (error) {
      return err(new AnyError("Failed to record metric", error));
    }
  }

  async getMetrics(timeRange: { start: Date; end: Date }): Promise<
    Result<Metric[], AnyError>
  > {
    try {
      const filteredMetrics = this.metrics.filter(
        (metric) =>
          metric.timestamp >= timeRange.start &&
          metric.timestamp <= timeRange.end,
      );
      return ok(filteredMetrics);
    } catch (error) {
      return err(new AnyError("Failed to get metrics", error));
    }
  }

  async recordHealthCheck(
    healthCheck: HealthCheck,
  ): Promise<Result<void, AnyError>> {
    try {
      this.healthChecks.push(healthCheck);

      // Record as Prometheus metric
      await this.recordMetric({
        name: "health_check_status",
        type: "gauge",
        value: healthCheck.status === "healthy" ? 1 : 0,
        labels: { service: healthCheck.service },
        timestamp: healthCheck.timestamp,
      });

      await this.recordMetric({
        name: "health_check_response_time",
        type: "histogram",
        value: healthCheck.responseTime,
        labels: { service: healthCheck.service },
        timestamp: healthCheck.timestamp,
      });

      return ok(undefined);
    } catch (error) {
      return err(new AnyError("Failed to record health check", error));
    }
  }

  async getHealthStatus(): Promise<Result<HealthCheck[], AnyError>> {
    try {
      // Return only the latest health check for each service
      const latestChecks = new Map<string, HealthCheck>();

      for (const check of this.healthChecks) {
        const existing = latestChecks.get(check.service);
        if (!existing || check.timestamp > existing.timestamp) {
          latestChecks.set(check.service, check);
        }
      }

      return ok(Array.from(latestChecks.values()));
    } catch (error) {
      return err(new AnyError("Failed to get health status", error));
    }
  }

  private async pushToGateway(metric: Metric): Promise<void> {
    const gateway = process.env.PROMETHEUS_PUSH_GATEWAY;
    if (!gateway) return;

    const payload = this.formatPrometheusMetric(metric);

    await fetch(`${gateway}/metrics/job/kissa`, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: payload,
    });
  }

  private formatPrometheusMetric(metric: Metric): string {
    const labels = metric.labels
      ? Object.entries(metric.labels)
          .map(([k, v]) => `${k}="${v}"`)
          .join(",")
      : "";
    const labelString = labels ? `{${labels}}` : "";

    return `${metric.name}${labelString} ${metric.value} ${metric.timestamp.getTime()}`;
  }

  // Expose metrics endpoint for Prometheus scraping
  getMetricsEndpoint(): string {
    const allMetrics = this.metrics
      .map((metric) => this.formatPrometheusMetric(metric))
      .join("\n");

    return allMetrics;
  }
}
