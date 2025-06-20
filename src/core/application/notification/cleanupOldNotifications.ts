import { userIdSchema } from "@/core/domain/user/types";
import { ApplicationError } from "@/lib/error";
import { validate } from "@/lib/validation";
import { type Result, err, ok } from "neverthrow";
import { z } from "zod/v4";
import type { Context } from "../context";

export const cleanupOldNotificationsInputSchema = z.object({
  userId: userIdSchema,
  days: z.number().positive().optional(), // Default to 30 days
});
export type CleanupOldNotificationsInput = z.infer<
  typeof cleanupOldNotificationsInputSchema
>;

export async function cleanupOldNotifications(
  context: Context,
  input: CleanupOldNotificationsInput,
): Promise<Result<number, ApplicationError>> {
  const parseResult = validate(cleanupOldNotificationsInputSchema, input);
  if (parseResult.isErr()) {
    return err(
      new ApplicationError("Invalid cleanup input", parseResult.error),
    );
  }

  const { userId, days = 30 } = parseResult.value;

  // Verify user exists
  const userResult = await context.userRepository.findById(userId);
  if (userResult.isErr()) {
    return err(new ApplicationError("Failed to verify user", userResult.error));
  }

  const user = userResult.value;
  if (!user) {
    return err(new ApplicationError("User not found"));
  }

  // Delete old notifications
  const deleteResult = await context.notificationRepository.deleteOlderThan(
    userId,
    days,
  );
  if (deleteResult.isErr()) {
    return err(
      new ApplicationError(
        "Failed to cleanup old notifications",
        deleteResult.error,
      ),
    );
  }

  return ok(deleteResult.value);
}
