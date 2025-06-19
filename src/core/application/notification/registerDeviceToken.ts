import type { DeviceToken } from "@/core/domain/notification/types";
import { userIdSchema } from "@/core/domain/user/types";
import { AnyError } from "@/lib/errors";
import { validate } from "@/lib/validation";
import { type Result, err } from "neverthrow";
import { z } from "zod/v4";
import type { Context } from "../context";

export const registerDeviceTokenInputSchema = z.object({
  userId: userIdSchema,
  token: z.string().min(1),
  platform: z.enum(["web", "ios", "android"]),
});
export type RegisterDeviceTokenInput = z.infer<
  typeof registerDeviceTokenInputSchema
>;

export async function registerDeviceToken(
  context: Context,
  input: RegisterDeviceTokenInput,
): Promise<Result<DeviceToken, AnyError>> {
  const validationResult = validate(registerDeviceTokenInputSchema, input);
  if (validationResult.isErr()) {
    return err(
      new AnyError("Invalid device token input", validationResult.error),
    );
  }

  return context.pushNotificationService.registerDeviceToken(
    validationResult.value.userId,
    validationResult.value.token,
    validationResult.value.platform,
  );
}
