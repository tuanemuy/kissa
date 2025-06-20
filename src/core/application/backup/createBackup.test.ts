import type { BackupJob } from "@/core/domain/backup/types";
import { AnyError } from "@/lib/errors";
import { err, ok } from "neverthrow";
import { beforeEach, describe, expect, it } from "vitest";
import type { Context } from "../context";
import { createBackup } from "./createBackup";

describe("createBackup", () => {
  let context: Context;
  let mockBackupService: {
    // biome-ignore lint/suspicious/noExplicitAny: Mock service requires flexible typing for tests
    createBackup: (input: any) => Promise<any>;
    // biome-ignore lint/suspicious/noExplicitAny: Mock service requires flexible typing for tests
    cleanupExpiredBackups: (retentionDays: number) => Promise<any>;
  };

  beforeEach(() => {
    mockBackupService = {
      createBackup: async (input) => {
        const testBackupJob: BackupJob = {
          id: "backup-001",
          type: input.type,
          status: "pending",
          startedAt: new Date(),
          location: "s3://backup-bucket/",
        };
        return ok(testBackupJob);
      },
      cleanupExpiredBackups: async () => ok(undefined),
    };

    context = {
      backupService: mockBackupService,
    } as unknown as Context;
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
