import type { BackupJob } from "@/core/domain/backup/types";
import { backupConfigSchema } from "@/core/domain/backup/types";
import { AnyError } from "@/lib/errors";
import { validate } from "@/lib/validation";
import { type Result, err } from "neverthrow";
import type { z } from "zod/v4";
import type { Context } from "../context";

export const createBackupInputSchema = backupConfigSchema;
export type CreateBackupInput = z.infer<typeof createBackupInputSchema>;

export async function createBackup(
  context: Context,
  input: CreateBackupInput,
): Promise<Result<BackupJob, AnyError>> {
  const validationResult = validate(createBackupInputSchema, input);
  if (validationResult.isErr()) {
    return err(new AnyError("Invalid backup input", validationResult.error));
  }

  return context.backupService.createBackup(validationResult.value);
}
