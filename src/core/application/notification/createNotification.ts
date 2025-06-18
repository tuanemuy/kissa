import { createNotificationParamsSchema } from "@/core/domain/notification/types";
import type { Notification } from "@/core/domain/notification/types";
import { ApplicationError } from "@/lib/error";
import { validate } from "@/lib/validation";
import { type Result, err, ok } from "neverthrow";
import type { z } from "zod/v4";
import type { Context } from "../context";

export const createNotificationInputSchema = createNotificationParamsSchema;
export type CreateNotificationInput = z.infer<
  typeof createNotificationInputSchema
>;

export async function createNotification(
  context: Context,
  input: CreateNotificationInput,
): Promise<Result<Notification, ApplicationError>> {
  const parseResult = validate(createNotificationInputSchema, input);
  if (parseResult.isErr()) {
    return err(
      new ApplicationError("Invalid notification input", parseResult.error),
    );
  }

  const params = parseResult.value;

  // Verify user exists
  const userResult = await context.userRepository.findById(params.userId);
  if (userResult.isErr()) {
    return err(new ApplicationError("Failed to verify user", userResult.error));
  }

  const user = userResult.value;
  if (!user) {
    return err(new ApplicationError("User not found"));
  }

  // Create notification
  const createResult = await context.notificationRepository.create(params);
  if (createResult.isErr()) {
    return err(
      new ApplicationError("Failed to create notification", createResult.error),
    );
  }

  return ok(createResult.value);
}
