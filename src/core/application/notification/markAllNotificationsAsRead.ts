import { userIdSchema } from "@/core/domain/user/types";
import { ApplicationError } from "@/lib/error";
import { validate } from "@/lib/validation";
import { type Result, err, ok } from "neverthrow";
import { z } from "zod/v4";
import type { Context } from "../context";

export const markAllNotificationsAsReadInputSchema = z.object({
  userId: userIdSchema,
});
export type MarkAllNotificationsAsReadInput = z.infer<
  typeof markAllNotificationsAsReadInputSchema
>;

export async function markAllNotificationsAsRead(
  context: Context,
  input: MarkAllNotificationsAsReadInput,
): Promise<Result<number, ApplicationError>> {
  const parseResult = validate(markAllNotificationsAsReadInputSchema, input);
  if (parseResult.isErr()) {
    return err(
      new ApplicationError("Invalid mark all as read input", parseResult.error),
    );
  }

  const { userId } = parseResult.value;

  // Verify user exists
  const userResult = await context.userRepository.findById(userId);
  if (userResult.isErr()) {
    return err(new ApplicationError("Failed to verify user", userResult.error));
  }

  const user = userResult.value;
  if (!user) {
    return err(new ApplicationError("User not found"));
  }

  // Mark all notifications as read
  const markResult = await context.notificationRepository.markAllAsRead(userId);
  if (markResult.isErr()) {
    return err(
      new ApplicationError(
        "Failed to mark all notifications as read",
        markResult.error,
      ),
    );
  }

  return ok(markResult.value);
}
