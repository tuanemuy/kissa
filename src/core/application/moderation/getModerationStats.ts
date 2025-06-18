import { ApplicationError } from "@/lib/error";
import { type Result, err, ok } from "neverthrow";
import type { Context } from "../context";

export type ModerationStatsResult = {
  pendingCount: number;
  urgentCount: number; // Items older than 24 hours
  totalCount: number;
};

export async function getModerationStats(
  context: Context,
): Promise<Result<ModerationStatsResult, ApplicationError>> {
  // Get pending count
  const pendingCountResult = await context.moderationRepository.countPending();
  if (pendingCountResult.isErr()) {
    return err(
      new ApplicationError(
        "Failed to count pending items",
        pendingCountResult.error,
      ),
    );
  }

  // Get urgent count (items older than 24 hours)
  const urgentCountResult =
    await context.moderationRepository.countOlderThan24Hours();
  if (urgentCountResult.isErr()) {
    return err(
      new ApplicationError(
        "Failed to count urgent items",
        urgentCountResult.error,
      ),
    );
  }

  // Get total count by querying with no filters
  const totalCountResult = await context.moderationRepository.list({
    pagination: { page: 1, limit: 1 }, // We only need the count
  });
  if (totalCountResult.isErr()) {
    return err(
      new ApplicationError(
        "Failed to count total items",
        totalCountResult.error,
      ),
    );
  }

  return ok({
    pendingCount: pendingCountResult.value,
    urgentCount: urgentCountResult.value,
    totalCount: totalCountResult.value.count,
  });
}
