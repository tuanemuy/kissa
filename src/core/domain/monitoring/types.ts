import { z } from "zod/v4";

export const metricTypeSchema = z.enum([
  "counter",
  "gauge",
  "histogram",
  "summary",
]);
export type MetricType = z.infer<typeof metricTypeSchema>;

export const severityLevelSchema = z.enum(["critical", "warning", "info"]);
export type SeverityLevel = z.infer<typeof severityLevelSchema>;

export const metricSchema = z.object({
  name: z.string(),
  type: metricTypeSchema,
  value: z.number(),
  labels: z.record(z.string(), z.string()).optional(),
  timestamp: z.date(),
});
export type Metric = z.infer<typeof metricSchema>;

export const alertRuleIdSchema = z.string().uuid().brand("alertRuleId");
export type AlertRuleId = z.infer<typeof alertRuleIdSchema>;

export const alertRuleSchema = z.object({
  id: alertRuleIdSchema,
  name: z.string(),
  metric: z.string(),
  condition: z.string(),
  threshold: z.number(),
  severity: severityLevelSchema,
  enabled: z.boolean(),
  createdAt: z.date(),
});
export type AlertRule = z.infer<typeof alertRuleSchema>;

export const alertSchema = z.object({
  id: z.string().uuid(),
  ruleId: z.string().uuid(),
  message: z.string(),
  severity: severityLevelSchema,
  triggeredAt: z.date(),
  resolvedAt: z.date().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type Alert = z.infer<typeof alertSchema>;

export const healthCheckSchema = z.object({
  service: z.string(),
  status: z.enum(["healthy", "unhealthy", "degraded"]),
  responseTime: z.number(),
  timestamp: z.date(),
  details: z.record(z.string(), z.unknown()).optional(),
});
export type HealthCheck = z.infer<typeof healthCheckSchema>;

export const healthCheckResultSchema = z.object({
  status: z.enum(["healthy", "unhealthy", "degraded"]),
  timestamp: z.date(),
  services: z
    .record(
      z.string(),
      z.object({
        status: z.enum(["healthy", "unhealthy", "degraded"]),
        responseTime: z.number(),
        error: z.string().optional(),
      }),
    )
    .optional(),
  metrics: z
    .object({
      memoryUsage: z.number(),
      cpuUsage: z.number(),
      diskUsage: z.number(),
      activeConnections: z.number(),
    })
    .optional(),
});
export type HealthCheckResult = z.infer<typeof healthCheckResultSchema>;
