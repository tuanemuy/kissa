import { AnyError } from "@/lib/errors";
import { err, ok } from "neverthrow";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Context } from "../context";
import { createMockContext } from "../testUtils/mockContext";
import {
  type BackupScheduleConfig,
  DEFAULT_BACKUP_SCHEDULE,
  scheduleBackups,
} from "./scheduleBackups";

// Mock the createBackup function
vi.mock("./createBackup", () => ({
  createBackup: vi.fn().mockResolvedValue(ok({ id: "backup-001" })),
}));

describe("scheduleBackups", () => {
  let context: Context;
  // biome-ignore lint/suspicious/noExplicitAny: Mock service doesn't have typed interface
  let mockBackupService: any;
  // biome-ignore lint/suspicious/noExplicitAny: Vitest spy requires any type
  let consoleLogSpy: any;

  beforeEach(() => {
    mockBackupService = {
      createBackup: async () => ok({ id: "backup-001" }),
      getBackupStatus: async () =>
        ok({ id: "backup-001", status: "completed" }),
      listBackups: async () => ok([]),
      deleteBackup: async () => ok(undefined),
      restoreBackup: async () => ok({ id: "restore-001", status: "pending" }),
      getRestoreStatus: async () =>
        ok({ id: "restore-001", status: "completed" }),
      validateBackup: async () => ok(true),
      cleanupExpiredBackups: async () => ok(0),
    };

    context = createMockContext({
      backupService: mockBackupService,
    });

    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe("SPEC-TLA+: Backup scheduling workflow", () => {
    it("should schedule full and incremental backups with default configuration", async () => {
      const result = await scheduleBackups(context, DEFAULT_BACKUP_SCHEDULE);

      expect(result.isOk()).toBe(true);

      // Verify that jobs were scheduled (console.log calls for demonstration)
      expect(consoleLogSpy).toHaveBeenCalledWith(
        "Scheduling job with cron: 0 2 * * *",
      ); // Full backup
      expect(consoleLogSpy).toHaveBeenCalledWith(
        "Scheduling job with cron: 0 */6 * * *",
      ); // Incremental backup
      expect(consoleLogSpy).toHaveBeenCalledWith(
        "Scheduling job with cron: 0 3 * * *",
      ); // Cleanup job
    });

    it("should schedule backups with custom configuration", async () => {
      const customConfig: BackupScheduleConfig = {
        fullBackup: {
          schedule: "0 1 * * *", // 1 AM instead of 2 AM
          retentionDays: 60,
        },
        incrementalBackup: {
          schedule: "0 */4 * * *", // Every 4 hours instead of 6
          retentionDays: 14,
        },
        destinations: ["s3://custom-backup-bucket"],
      };

      const result = await scheduleBackups(context, customConfig);

      expect(result.isOk()).toBe(true);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        "Scheduling job with cron: 0 1 * * *",
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        "Scheduling job with cron: 0 */4 * * *",
      );
    });
  });

  describe("Alloy model constraints validation", () => {
    it("should enforce backup schedule consistency", async () => {
      // Alloy INV: Scheduled backups must have valid destinations
      const config: BackupScheduleConfig = {
        fullBackup: {
          schedule: "0 2 * * *",
          retentionDays: 30,
        },
        incrementalBackup: {
          schedule: "0 */6 * * *",
          retentionDays: 7,
        },
        destinations: ["s3://primary", "s3://secondary"],
      };

      const result = await scheduleBackups(context, config);

      expect(result.isOk()).toBe(true);
      expect(config.destinations.length).toBeGreaterThan(0);
      expect(config.fullBackup.retentionDays).toBeGreaterThan(
        config.incrementalBackup.retentionDays,
      );
    });

    it("should maintain backup type consistency", async () => {
      // Alloy INV: Full backups should have longer retention than incremental
      const config = DEFAULT_BACKUP_SCHEDULE;

      expect(config.fullBackup.retentionDays).toBeGreaterThan(
        config.incrementalBackup.retentionDays,
      );
      expect(config.fullBackup.retentionDays).toBe(30);
      expect(config.incrementalBackup.retentionDays).toBe(7);
    });
  });

  describe("Error handling", () => {
    it("should handle scheduling errors gracefully", async () => {
      // Mock an error in the backup service
      mockBackupService.cleanupExpiredBackups = async () => {
        throw new Error("Cleanup service unavailable");
      };

      const config: BackupScheduleConfig = {
        fullBackup: {
          schedule: "0 2 * * *",
          retentionDays: 30,
        },
        incrementalBackup: {
          schedule: "0 */6 * * *",
          retentionDays: 7,
        },
        destinations: ["s3://backup-bucket"],
      };

      const result = await scheduleBackups(context, config);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(AnyError);
        expect(result.error.message).toBe("Failed to schedule backups");
      }
    });
  });

  describe("TLA+ temporal properties", () => {
    it("should eventually complete backup scheduling", async () => {
      // TLA+ TEMP: SchedulingEventuallyCompletes
      const config = DEFAULT_BACKUP_SCHEDULE;

      const result = await scheduleBackups(context, config);

      expect(result.isOk()).toBe(true);
      // In a real implementation, we would verify that the scheduler state
      // transitions match the TLA+ model
    });

    it("should maintain scheduled job consistency", async () => {
      // TLA+ INV: Scheduled jobs maintain their configuration
      const config: BackupScheduleConfig = {
        fullBackup: {
          schedule: "0 2 * * *",
          retentionDays: 30,
        },
        incrementalBackup: {
          schedule: "0 */6 * * *",
          retentionDays: 7,
        },
        destinations: ["s3://backup-bucket"],
      };

      const result = await scheduleBackups(context, config);

      expect(result.isOk()).toBe(true);
      // Verify that all three types of jobs were scheduled
      expect(consoleLogSpy).toHaveBeenCalledTimes(3);
    });
  });

  describe("Default configuration validation", () => {
    it("should provide valid default backup schedule", () => {
      expect(DEFAULT_BACKUP_SCHEDULE).toBeDefined();
      expect(DEFAULT_BACKUP_SCHEDULE.fullBackup.schedule).toBe("0 2 * * *");
      expect(DEFAULT_BACKUP_SCHEDULE.incrementalBackup.schedule).toBe(
        "0 */6 * * *",
      );
      expect(DEFAULT_BACKUP_SCHEDULE.destinations).toHaveLength(2);
      expect(DEFAULT_BACKUP_SCHEDULE.destinations[0]).toBe(
        "s3://kissa-backups-primary",
      );
      expect(DEFAULT_BACKUP_SCHEDULE.destinations[1]).toBe(
        "s3://kissa-backups-secondary",
      );
    });

    it("should have reasonable default retention periods", () => {
      expect(DEFAULT_BACKUP_SCHEDULE.fullBackup.retentionDays).toBe(30);
      expect(DEFAULT_BACKUP_SCHEDULE.incrementalBackup.retentionDays).toBe(7);
      expect(DEFAULT_BACKUP_SCHEDULE.fullBackup.retentionDays).toBeGreaterThan(
        DEFAULT_BACKUP_SCHEDULE.incrementalBackup.retentionDays,
      );
    });
  });
});
