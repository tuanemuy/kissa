import { AnyError } from "@/lib/errors";
import { type Result, err, ok } from "neverthrow";
import type { Context } from "../context";
import { createBackup } from "./createBackup";

export interface BackupScheduleConfig {
  fullBackup: {
    schedule: string; // cron format
    retentionDays: number;
  };
  incrementalBackup: {
    schedule: string;
    retentionDays: number;
  };
  destinations: string[];
}

export async function scheduleBackups(
  context: Context,
  config: BackupScheduleConfig,
): Promise<Result<void, AnyError>> {
  try {
    // Schedule full backup (e.g., daily at 2 AM)
    await scheduleJob(config.fullBackup.schedule, async () => {
      await createBackup(context, {
        schedule: config.fullBackup.schedule,
        retentionDays: config.fullBackup.retentionDays,
        type: "full",
        enabled: true,
        destinations: config.destinations,
      });
    });

    // Schedule incremental backup (e.g., every 6 hours)
    await scheduleJob(config.incrementalBackup.schedule, async () => {
      await createBackup(context, {
        schedule: config.incrementalBackup.schedule,
        retentionDays: config.incrementalBackup.retentionDays,
        type: "incremental",
        enabled: true,
        destinations: config.destinations,
      });
    });

    // Schedule cleanup job (daily at 3 AM)
    await scheduleJob("0 3 * * *", async () => {
      await context.backupService.cleanupExpiredBackups(
        config.fullBackup.retentionDays,
      );
    });

    return ok(undefined);
  } catch (error) {
    return err(new AnyError("Failed to schedule backups", error));
  }
}

async function scheduleJob(
  cronExpression: string,
  job: () => Promise<void>,
): Promise<void> {
  // In a real implementation, you would use a job scheduler like node-cron
  // or integrate with a service like AWS EventBridge
  console.log(`Scheduling job with cron: ${cronExpression}`);

  // For demonstration purposes, we'll just log the scheduling
  // In production, you would use:
  // const cron = require('node-cron');
  // cron.schedule(cronExpression, job);
}

export const DEFAULT_BACKUP_SCHEDULE: BackupScheduleConfig = {
  fullBackup: {
    schedule: "0 2 * * *", // Daily at 2 AM
    retentionDays: 30, // Keep for 30 days
  },
  incrementalBackup: {
    schedule: "0 */6 * * *", // Every 6 hours
    retentionDays: 7, // Keep for 7 days
  },
  destinations: [
    "s3://kissa-backups-primary",
    "s3://kissa-backups-secondary", // Different region for DR
  ],
};
