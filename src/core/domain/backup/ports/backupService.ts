import type { AnyError } from "@/lib/errors";
import type { Result } from "neverthrow";
import type { BackupConfig, BackupJob, RestoreJob } from "../types";

export interface BackupService {
  createBackup(config: BackupConfig): Promise<Result<BackupJob, AnyError>>;
  getBackupStatus(jobId: string): Promise<Result<BackupJob, AnyError>>;
  listBackups(limit?: number): Promise<Result<BackupJob[], AnyError>>;
  deleteBackup(jobId: string): Promise<Result<void, AnyError>>;
  restoreBackup(
    backupId: string,
    targetLocation: string,
  ): Promise<Result<RestoreJob, AnyError>>;
  getRestoreStatus(jobId: string): Promise<Result<RestoreJob, AnyError>>;
  validateBackup(backupId: string): Promise<Result<boolean, AnyError>>;
  cleanupExpiredBackups(
    retentionDays: number,
  ): Promise<Result<number, AnyError>>;
}
