import type { AnyError } from "@/lib/errors";
import type { Result } from "neverthrow";
import type {
  DeviceToken,
  PushNotificationChannel,
  PushNotificationJob,
  SendPushNotificationParams,
} from "../types";

export interface PushNotificationService {
  registerDeviceToken(
    userId: string,
    token: string,
    platform: "web" | "ios" | "android",
  ): Promise<Result<DeviceToken, AnyError>>;

  unregisterDeviceToken(tokenId: string): Promise<Result<void, AnyError>>;

  getUserDeviceTokens(userId: string): Promise<Result<DeviceToken[], AnyError>>;

  sendPushNotification(
    params: SendPushNotificationParams,
  ): Promise<Result<PushNotificationJob[], AnyError>>;

  sendToChannel(
    channel: PushNotificationChannel,
    userId: string,
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ): Promise<Result<PushNotificationJob, AnyError>>;

  getNotificationStatus(
    jobId: string,
  ): Promise<Result<PushNotificationJob, AnyError>>;

  retryFailedNotification(
    jobId: string,
  ): Promise<Result<PushNotificationJob, AnyError>>;

  processNotificationQueue(): Promise<Result<number, AnyError>>;

  updateDeliveryStatus(
    jobId: string,
    status: "delivered" | "failed",
    reason?: string,
  ): Promise<Result<void, AnyError>>;
}
