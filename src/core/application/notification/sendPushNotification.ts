import type { PushNotificationJob } from "@/core/domain/notification/types";
import { sendPushNotificationParamsSchema } from "@/core/domain/notification/types";
import { AnyError } from "@/lib/errors";
import { validate } from "@/lib/validation";
import type { Result } from "neverthrow";
import { err } from "neverthrow";
import type { z } from "zod/v4";
import type { Context } from "../context";

export const sendPushNotificationInputSchema = sendPushNotificationParamsSchema;
export type SendPushNotificationInput = z.infer<
  typeof sendPushNotificationInputSchema
>;

export async function sendPushNotification(
  context: Context,
  input: SendPushNotificationInput,
): Promise<Result<PushNotificationJob[], AnyError>> {
  const validationResult = validate(sendPushNotificationInputSchema, input);
  if (validationResult.isErr()) {
    return err(
      new AnyError("Invalid push notification input", validationResult.error),
    );
  }

  return context.pushNotificationService.sendPushNotification(
    validationResult.value,
  );
}
