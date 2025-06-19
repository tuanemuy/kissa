import type { AlertRule } from "@/core/domain/monitoring/types";
import { AnyError } from "@/lib/errors";
import { validate } from "@/lib/validation";
import { type Result, err } from "neverthrow";
import { z } from "zod/v4";
import type { Context } from "../context";

export const createAlertRuleInputSchema = z.object({
  name: z.string().min(1),
  metric: z.string().min(1),
  condition: z.string().min(1),
  threshold: z.number(),
  severity: z.enum(["critical", "warning", "info"]),
  enabled: z.boolean().default(true),
});
export type CreateAlertRuleInput = z.infer<typeof createAlertRuleInputSchema>;

export async function createAlertRule(
  context: Context,
  input: CreateAlertRuleInput,
): Promise<Result<AlertRule, AnyError>> {
  const validationResult = validate(createAlertRuleInputSchema, input);
  if (validationResult.isErr()) {
    return err(
      new AnyError("Invalid alert rule input", validationResult.error),
    );
  }

  return context.alertManager.createRule(validationResult.value);
}
