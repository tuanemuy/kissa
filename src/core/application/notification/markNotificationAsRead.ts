import { markNotificationAsReadParamsSchema } from "@/core/domain/notification/types";
import { ApplicationError } from "@/lib/error";
import { validate } from "@/lib/validation";
import { type Result, err, ok } from "neverthrow";
import type { z } from "zod/v4";
import type { Context } from "../context";

export const markNotificationAsReadInputSchema =
  markNotificationAsReadParamsSchema;
export type MarkNotificationAsReadInput = z.infer<
  typeof markNotificationAsReadInputSchema
>;

export async function markNotificationAsRead(
  context: Context,
  input: MarkNotificationAsReadInput,
): Promise<Result<void, ApplicationError>> {
  const parseResult = validate(markNotificationAsReadInputSchema, input);
  if (parseResult.isErr()) {
    return err(
      new ApplicationError("Invalid mark as read input", parseResult.error),
    );
  }

  const { id } = parseResult.value;

  // Verify notification exists
  const notificationResult = await context.notificationRepository.findById(id);
  if (notificationResult.isErr()) {
    return err(
      new ApplicationError(
        "Failed to find notification",
        notificationResult.error,
      ),
    );
  }

  const notification = notificationResult.value;
  if (!notification) {
    return err(new ApplicationError("Notification not found"));
  }

  // Mark as read
  const markResult = await context.notificationRepository.markAsRead(id);
  if (markResult.isErr()) {
    return err(
      new ApplicationError(
        "Failed to mark notification as read",
        markResult.error,
      ),
    );
  }

  return ok(undefined);
}
