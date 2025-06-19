import type { AnyError } from "@/lib/errors";
import type { Result } from "neverthrow";
import type { Alert, AlertRule } from "../types";

export interface AlertManager {
  createRule(
    rule: Omit<AlertRule, "id" | "createdAt">,
  ): Promise<Result<AlertRule, AnyError>>;
  updateRule(
    id: string,
    updates: Partial<AlertRule>,
  ): Promise<Result<AlertRule, AnyError>>;
  deleteRule(id: string): Promise<Result<void, AnyError>>;
  getRules(): Promise<Result<AlertRule[], AnyError>>;
  triggerAlert(
    ruleId: string,
    message: string,
    metadata?: Record<string, unknown>,
  ): Promise<Result<Alert, AnyError>>;
  resolveAlert(alertId: string): Promise<Result<Alert, AnyError>>;
  getActiveAlerts(): Promise<Result<Alert[], AnyError>>;
}
