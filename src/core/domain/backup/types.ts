import { z } from "zod/v4";

export const backupTypeSchema = z.enum(["full", "incremental", "differential"]);
export type BackupType = z.infer<typeof backupTypeSchema>;

export const backupStatusSchema = z.enum([
  "pending",
  "in_progress",
  "completed",
  "failed",
]);
export type BackupStatus = z.infer<typeof backupStatusSchema>;

export const backupJobSchema = z.object({
  id: z.string().uuid(),
  type: backupTypeSchema,
  status: backupStatusSchema,
  startedAt: z.date(),
  completedAt: z.date().optional(),
  size: z.number().optional(),
  location: z.string(),
  checksum: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  error: z.string().optional(),
});
export type BackupJob = z.infer<typeof backupJobSchema>;

export const restoreJobSchema = z.object({
  id: z.string().uuid(),
  backupId: z.string().uuid(),
  status: backupStatusSchema,
  startedAt: z.date(),
  completedAt: z.date().optional(),
  targetLocation: z.string(),
  error: z.string().optional(),
});
export type RestoreJob = z.infer<typeof restoreJobSchema>;

export const backupConfigSchema = z.object({
  schedule: z.string(),
  retentionDays: z.number(),
  type: backupTypeSchema,
  enabled: z.boolean(),
  destinations: z.array(z.string()),
});
export type BackupConfig = z.infer<typeof backupConfigSchema>;
