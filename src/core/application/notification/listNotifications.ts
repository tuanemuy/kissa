import { listNotificationsQuerySchema } from "@/core/domain/notification/types";
import type { Notification } from "@/core/domain/notification/types";
import { ApplicationError } from "@/lib/error";
import { validate } from "@/lib/validation";
import { type Result, err, ok } from "neverthrow";
import type { z } from "zod/v4";
import type { Context } from "../context";

export const listNotificationsInputSchema = listNotificationsQuerySchema;
export type ListNotificationsInput = z.infer<
  typeof listNotificationsInputSchema
>;

export type ListNotificationsResult = {
  items: Notification[];
  count: number;
  unreadCount: number;
};

export async function listNotifications(
  context: Context,
  input: ListNotificationsInput,
): Promise<Result<ListNotificationsResult, ApplicationError>> {
  const parseResult = validate(listNotificationsInputSchema, input);
  if (parseResult.isErr()) {
    return err(
      new ApplicationError(
        "Invalid list notifications input",
        parseResult.error,
      ),
    );
  }

  const query = parseResult.value;

  // Verify user exists
  const userResult = await context.userRepository.findById(query.userId);
  if (userResult.isErr()) {
    return err(new ApplicationError("Failed to verify user", userResult.error));
  }

  const user = userResult.value;
  if (!user) {
    return err(new ApplicationError("User not found"));
  }

  // Get notifications list
  const listResult = await context.notificationRepository.list(query);
  if (listResult.isErr()) {
    return err(
      new ApplicationError("Failed to list notifications", listResult.error),
    );
  }

  // Get unread count
  const unreadCountResult = await context.notificationRepository.countUnread(
    query.userId,
  );
  if (unreadCountResult.isErr()) {
    return err(
      new ApplicationError(
        "Failed to count unread notifications",
        unreadCountResult.error,
      ),
    );
  }

  return ok({
    items: listResult.value.items,
    count: listResult.value.count,
    unreadCount: unreadCountResult.value,
  });
}
