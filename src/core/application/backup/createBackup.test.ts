import type { BackupJob } from "@/core/domain/backup/types";
import { AnyError } from "@/lib/errors";
import { err, ok } from "neverthrow";
import { beforeEach, describe, expect, it } from "vitest";
import type { Context } from "../context";
import { createMockContext } from "../testUtils/mockContext";
import { createBackup } from "./createBackup";

describe("createBackup", () => {
  let context: Context;
  // biome-ignore lint/suspicious/noExplicitAny: Mock service doesn't have typed interface
  let mockBackupService: any;

  beforeEach(() => {
    mockBackupService = {
      // biome-ignore lint/suspicious/noExplicitAny: Mock function accepts any input for testing
      createBackup: async (input: any) => {
        const testBackupJob: BackupJob = {
          id: "backup-001",
          type: input.type,
          status: "pending",
          startedAt: new Date(),
          location: "s3://backup-bucket/",
        };
        return ok(testBackupJob);
      },
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
  });

  describe("SPEC-TLA+: ProcessBackup action validation", () => {
    it("should create full backup with valid configuration", async () => {
      const input = {
        schedule: "0 2 * * *",
        retentionDays: 30,
        type: "full" as const,
        enabled: true,
        destinations: ["s3://backup-bucket"],
      };

      const result = await createBackup(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const backupJob = result.value;
        expect(backupJob.type).toBe("full");
        expect(backupJob.status).toBe("pending");
        expect(backupJob.location).toBe("s3://backup-bucket/");
      }
    });

    it("should create incremental backup with valid configuration", async () => {
      const input = {
        schedule: "0 */6 * * *",
        retentionDays: 7,
        type: "incremental" as const,
        enabled: true,
        destinations: ["s3://backup-bucket"],
      };

      const result = await createBackup(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const backupJob = result.value;
        expect(backupJob.type).toBe("incremental");
        expect(backupJob.status).toBe("pending");
      }
    });
  });

  describe("Alloy model constraints validation", () => {
    it("should enforce backup retention consistency", async () => {
      // Alloy INV: Backup retention days must be positive
      const input = {
        schedule: "0 2 * * *",
        retentionDays: 30,
        type: "full" as const,
        enabled: true,
        destinations: ["s3://backup-bucket"],
      };

      const result = await createBackup(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.id).toBeDefined();
      }
    });

    it("should require at least one destination", async () => {
      const input = {
        schedule: "0 2 * * *",
        retentionDays: 30,
        type: "full" as const,
        enabled: true,
        destinations: [],
      };

      const result = await createBackup(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(AnyError);
        expect(result.error.message).toBe("Invalid backup input");
      }
    });
  });

  describe("Input validation", () => {
    it("should reject invalid cron schedule format", async () => {
      const input = {
        schedule: "invalid-cron",
        retentionDays: 30,
        type: "full" as const,
        enabled: true,
        destinations: ["s3://backup-bucket"],
      };

      const result = await createBackup(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(AnyError);
        expect(result.error.message).toBe("Invalid backup input");
      }
    });

    it("should reject invalid backup type", async () => {
      const input = {
        schedule: "0 2 * * *",
        retentionDays: 30,
        // biome-ignore lint/suspicious/noExplicitAny: Testing invalid input type
        type: "invalid" as any,
        enabled: true,
        destinations: ["s3://backup-bucket"],
      };

      const result = await createBackup(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(AnyError);
        expect(result.error.message).toBe("Invalid backup input");
      }
    });

    it("should reject negative retention days", async () => {
      const input = {
        schedule: "0 2 * * *",
        retentionDays: -1,
        type: "full" as const,
        enabled: true,
        destinations: ["s3://backup-bucket"],
      };

      const result = await createBackup(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(AnyError);
        expect(result.error.message).toBe("Invalid backup input");
      }
    });
  });

  describe("Error handling", () => {
    it("should handle backup service failure", async () => {
      mockBackupService.createBackup = async () => {
        return err(new AnyError("Backup service unavailable"));
      };

      const input = {
        schedule: "0 2 * * *",
        retentionDays: 30,
        type: "full" as const,
        enabled: true,
        destinations: ["s3://backup-bucket"],
      };

      const result = await createBackup(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(AnyError);
        expect(result.error.message).toBe("Backup service unavailable");
      }
    });
  });

  describe("TLA+ temporal properties", () => {
    it("should eventually create backup job", async () => {
      // TLA+ TEMP: BackupEventuallyCreated
      const input = {
        schedule: "0 2 * * *",
        retentionDays: 30,
        type: "full" as const,
        enabled: true,
        destinations: ["s3://backup-bucket"],
      };

      const result = await createBackup(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.id).toBeDefined();
        expect(result.value.startedAt).toBeInstanceOf(Date);
      }
    });
  });
});
