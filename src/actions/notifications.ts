import "server-only";
import { registerDeviceToken } from "@/core/application/notification/registerDeviceToken";
import type { RegisterDeviceTokenInput } from "@/core/application/notification/registerDeviceToken";
import { sendPushNotification } from "@/core/application/notification/sendPushNotification";
import type { SendPushNotificationInput } from "@/core/application/notification/sendPushNotification";
import type {
  DeviceToken,
  PushNotificationJob,
  PushNotificationStatus,
} from "@/core/domain/notification/types";
import { createContext } from "@/lib/context";
import type { AnyError } from "@/lib/errors";
import type { Result } from "neverthrow";

export async function sendPushNotificationAction(
  input: SendPushNotificationInput,
): Promise<Result<PushNotificationJob[], AnyError>> {
  const context = await createContext();
  return sendPushNotification(context, input);
}

export async function registerDeviceTokenAction(
  input: RegisterDeviceTokenInput,
): Promise<Result<DeviceToken, AnyError>> {
  const context = await createContext();
  return registerDeviceToken(context, input);
}

export async function unregisterDeviceTokenAction(
  tokenId: string,
): Promise<Result<void, AnyError>> {
  const context = await createContext();
  return context.pushNotificationService.unregisterDeviceToken(tokenId);
}

export async function getUserDeviceTokensAction(
  userId: string,
): Promise<Result<DeviceToken[], AnyError>> {
  const context = await createContext();
  return context.pushNotificationService.getUserDeviceTokens(userId);
}

export async function getNotificationStatusAction(
  jobId: string,
): Promise<Result<PushNotificationJob, AnyError>> {
  const context = await createContext();
  return context.pushNotificationService.getNotificationStatus(jobId);
}

export async function retryFailedNotificationAction(
  jobId: string,
): Promise<Result<PushNotificationJob, AnyError>> {
  const context = await createContext();
  return context.pushNotificationService.retryFailedNotification(jobId);
}
