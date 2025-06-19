import type { AnyError } from "@/lib/errors";
import type { Result } from "neverthrow";
import type { HealthCheck, Metric } from "../types";

export interface MetricsCollector {
  recordMetric(metric: Metric): Promise<Result<void, AnyError>>;
  getMetrics(timeRange: { start: Date; end: Date }): Promise<
    Result<Metric[], AnyError>
  >;
  recordHealthCheck(healthCheck: HealthCheck): Promise<Result<void, AnyError>>;
  getHealthStatus(): Promise<Result<HealthCheck[], AnyError>>;
}
