import type { Metric } from "@/core/domain/monitoring/types";
import { metricSchema } from "@/core/domain/monitoring/types";
import { AnyError } from "@/lib/errors";
import { validate } from "@/lib/validation";
import { type Result, err } from "neverthrow";
import { z } from "zod/v4";
import type { Context } from "../context";

export const recordMetricInputSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["counter", "gauge", "histogram", "summary"]),
  value: z.number(),
  labels: z.record(z.string(), z.unknown()).optional(),
});
export type RecordMetricInput = z.infer<typeof recordMetricInputSchema>;

export async function recordMetric(
  context: Context,
  input: RecordMetricInput,
): Promise<Result<void, AnyError>> {
  const validationResult = validate(recordMetricInputSchema, input);
  if (validationResult.isErr()) {
    return err(new AnyError("Invalid metric input", validationResult.error));
  }

  const metric: Metric = {
    name: validationResult.value.name,
    type: validationResult.value.type,
    value: validationResult.value.value,
    timestamp: new Date(),
    labels: validationResult.value.labels as Record<string, string> | undefined,
  };

  const metricValidation = validate(metricSchema, metric);
  if (metricValidation.isErr()) {
    return err(new AnyError("Invalid metric data", metricValidation.error));
  }

  return context.metricsCollector.recordMetric(metric);
}
