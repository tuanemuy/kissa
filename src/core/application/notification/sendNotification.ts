import { createNotificationParamsSchema } from "@/core/domain/notification/types";
import type { Notification } from "@/core/domain/notification/types";
import { ApplicationError } from "@/lib/error";
import { validate } from "@/lib/validation";
import { type Result, err, ok } from "neverthrow";
import { z } from "zod/v4";
import type { Context } from "../context";

export const sendNotificationInputSchema =
  createNotificationParamsSchema.extend({
    sendEmail: z.boolean().default(false),
    sendPush: z.boolean().default(true),
  });
export type SendNotificationInput = z.infer<typeof sendNotificationInputSchema>;

export type SendNotificationResult = {
  notification: Notification;
  emailSent: boolean;
  pushSent: boolean;
};

export async function sendNotification(
  context: Context,
  input: SendNotificationInput,
): Promise<Result<SendNotificationResult, ApplicationError>> {
  const parseResult = validate(sendNotificationInputSchema, input);
  if (parseResult.isErr()) {
    return err(
      new ApplicationError("Invalid notification input", parseResult.error),
    );
  }

  const { sendEmail, sendPush, ...notificationParams } = parseResult.value;

  // Verify user exists and get user data
  const userResult = await context.userRepository.findById(
    notificationParams.userId,
  );
  if (userResult.isErr()) {
    return err(new ApplicationError("Failed to verify user", userResult.error));
  }

  const user = userResult.value;
  if (!user) {
    return err(new ApplicationError("User not found"));
  }

  // Create notification record
  const createResult =
    await context.notificationRepository.create(notificationParams);
  if (createResult.isErr()) {
    return err(
      new ApplicationError("Failed to create notification", createResult.error),
    );
  }

  const notification = createResult.value;
  let emailSent = false;
  let pushSent = false;

  // Send email notification if requested
  if (sendEmail) {
    const emailResult = await context.notificationService.sendEmail({
      to: user.email,
      subject: notification.title,
      body: notification.message,
    });
    emailSent = emailResult.isOk();
  }

  // Send push notification if requested
  if (sendPush) {
    const pushResult = await context.notificationService.sendPush({
      userId: user.id,
      title: notification.title,
      body: notification.message,
      data: notification.data || undefined,
    });
    pushSent = pushResult.isOk();
  }

  return ok({
    notification,
    emailSent,
    pushSent,
  });
}
