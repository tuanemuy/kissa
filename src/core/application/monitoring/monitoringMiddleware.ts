import type { Context } from "../context";
import { recordMetric } from "./recordMetric";

export function createMonitoringMiddleware(context: Context) {
  return {
    // Request monitoring
    async recordRequest(
      method: string,
      path: string,
      statusCode: number,
      responseTime: number,
      userId?: string,
    ): Promise<void> {
      // Record request count
      await recordMetric(context, {
        name: "http_requests_total",
        type: "counter",
        value: 1,
        labels: {
          method,
          path,
          status_code: statusCode.toString(),
        },
      });

      // Record response time
      await recordMetric(context, {
        name: "http_request_duration_seconds",
        type: "histogram",
        value: responseTime / 1000,
        labels: {
          method,
          path,
        },
      });

      // Record user activity if authenticated
      if (userId) {
        await recordMetric(context, {
          name: "user_activity_total",
          type: "counter",
          value: 1,
          labels: {
            user_id: userId,
            action: `${method}_${path}`,
          },
        });
      }
    },

    // Database monitoring
    async recordDatabaseQuery(
      operation: string,
      table: string,
      duration: number,
      success: boolean,
    ): Promise<void> {
      await recordMetric(context, {
        name: "database_queries_total",
        type: "counter",
        value: 1,
        labels: {
          operation,
          table,
          status: success ? "success" : "error",
        },
      });

      await recordMetric(context, {
        name: "database_query_duration_seconds",
        type: "histogram",
        value: duration / 1000,
        labels: {
          operation,
          table,
        },
      });
    },

    // Business metrics
    async recordBusinessMetric(
      event: string,
      value = 1,
      labels?: Record<string, string>,
    ): Promise<void> {
      await recordMetric(context, {
        name: `business_${event}_total`,
        type: "counter",
        value,
        labels,
      });
    },

    // System metrics
    async recordSystemMetric(
      name: string,
      value: number,
      labels?: Record<string, string>,
    ): Promise<void> {
      await recordMetric(context, {
        name: `system_${name}`,
        type: "gauge",
        value,
        labels,
      });
    },
  };
}
