import { listModerationItemsQuerySchema } from "@/core/domain/moderation/types";
import type { ModerationItem } from "@/core/domain/moderation/types";
import { ApplicationError } from "@/lib/error";
import { validate } from "@/lib/validation";
import { type Result, err, ok } from "neverthrow";
import type { z } from "zod/v4";
import type { Context } from "../context";

export const listModerationItemsInputSchema = listModerationItemsQuerySchema;
export type ListModerationItemsInput = z.infer<
  typeof listModerationItemsInputSchema
>;

export type ListModerationItemsResult = {
  items: ModerationItem[];
  count: number;
  pendingCount: number;
  urgentCount: number; // Items older than 24 hours
};

export async function listModerationItems(
  context: Context,
  input: ListModerationItemsInput,
): Promise<Result<ListModerationItemsResult, ApplicationError>> {
  const parseResult = validate(listModerationItemsInputSchema, input);
  if (parseResult.isErr()) {
    return err(
      new ApplicationError(
        "Invalid list moderation items input",
        parseResult.error,
      ),
    );
  }

  const query = parseResult.value;

  // Get moderation items list
  const listResult = await context.moderationRepository.list(query);
  if (listResult.isErr()) {
    return err(
      new ApplicationError("Failed to list moderation items", listResult.error),
    );
  }

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

  return ok({
    items: listResult.value.items,
    count: listResult.value.count,
    pendingCount: pendingCountResult.value,
    urgentCount: urgentCountResult.value,
  });
}
