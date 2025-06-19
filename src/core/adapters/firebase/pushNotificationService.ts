import { randomUUID } from "node:crypto";
import type { PushNotificationService } from "@/core/domain/notification/ports/pushNotificationService";
import type {
  DeviceToken,
  NotificationId,
  PushNotificationChannel,
  PushNotificationJob,
  SendPushNotificationParams,
} from "@/core/domain/notification/types";
import type { UserId } from "@/core/domain/user/types";
import { AnyError } from "@/lib/errors";
import { type Result, err, ok } from "neverthrow";

export class FirebasePushNotificationService
  implements PushNotificationService
{
  private deviceTokens: DeviceToken[] = [];
  private notificationJobs: PushNotificationJob[] = [];

  async registerDeviceToken(
    userId: UserId,
    token: string,
    platform: "web" | "ios" | "android",
  ): Promise<Result<DeviceToken, AnyError>> {
    try {
      // Deactivate existing tokens for this user/platform
      for (const token of this.deviceTokens) {
        if (token.userId === userId && token.platform === platform) {
          token.isActive = false;
        }
      }

      const deviceToken: DeviceToken = {
        id: randomUUID(),
        userId,
        token,
        platform,
        isActive: true,
        createdAt: new Date(),
        lastUsedAt: new Date(),
      };

      this.deviceTokens.push(deviceToken);
      return ok(deviceToken);
    } catch (error) {
      return err(new AnyError("Failed to register device token", error));
    }
  }

  async unregisterDeviceToken(
    tokenId: string,
  ): Promise<Result<void, AnyError>> {
    try {
      const tokenIndex = this.deviceTokens.findIndex((t) => t.id === tokenId);
      if (tokenIndex === -1) {
        return err(new AnyError("Device token not found"));
      }

      this.deviceTokens[tokenIndex].isActive = false;
      return ok(undefined);
    } catch (error) {
      return err(new AnyError("Failed to unregister device token", error));
    }
  }

  async getUserDeviceTokens(
    userId: string,
  ): Promise<Result<DeviceToken[], AnyError>> {
    try {
      const userTokens = this.deviceTokens.filter(
        (t) => t.userId === userId && t.isActive,
      );
      return ok(userTokens);
    } catch (error) {
      return err(new AnyError("Failed to get user device tokens", error));
    }
  }

  async sendPushNotification(
    params: SendPushNotificationParams,
  ): Promise<Result<PushNotificationJob[], AnyError>> {
    try {
      const channels = params.channels || ["web", "mobile"];
      const jobs: PushNotificationJob[] = [];

      for (const channel of channels) {
        const jobResult = await this.sendToChannel(
          channel,
          params.userId,
          params.title,
          params.body,
          params.data,
        );

        if (jobResult.isOk()) {
          jobs.push(jobResult.value);
        }
      }

      return ok(jobs);
    } catch (error) {
      return err(new AnyError("Failed to send push notification", error));
    }
  }

  async sendToChannel(
    channel: PushNotificationChannel,
    userId: UserId,
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ): Promise<Result<PushNotificationJob, AnyError>> {
    try {
      const job: PushNotificationJob = {
        id: randomUUID(),
        notificationId: randomUUID() as NotificationId, // Would be actual notification ID
        userId,
        channel,
        status: "pending",
        payload: {
          title,
          body,
          data: data || {},
        },
        scheduledAt: new Date(),
        retryCount: 0,
      };

      this.notificationJobs.push(job);

      // Process immediately for real-time notifications
      this.processNotificationJob(job).catch((error) => {
        console.error("Failed to process notification job:", error);
        job.status = "failed";
        job.failureReason =
          error instanceof Error ? error.message : "Unknown error";
      });

      return ok(job);
    } catch (error) {
      return err(new AnyError("Failed to send to channel", error));
    }
  }

  async getNotificationStatus(
    jobId: string,
  ): Promise<Result<PushNotificationJob, AnyError>> {
    try {
      const job = this.notificationJobs.find((j) => j.id === jobId);
      if (!job) {
        return err(new AnyError("Notification job not found"));
      }
      return ok(job);
    } catch (error) {
      return err(new AnyError("Failed to get notification status", error));
    }
  }

  async retryFailedNotification(
    jobId: string,
  ): Promise<Result<PushNotificationJob, AnyError>> {
    try {
      const job = this.notificationJobs.find((j) => j.id === jobId);
      if (!job) {
        return err(new AnyError("Notification job not found"));
      }

      if (job.status !== "failed") {
        return err(new AnyError("Job is not in failed state"));
      }

      if (job.retryCount >= 3) {
        return err(new AnyError("Maximum retry attempts reached"));
      }

      job.status = "pending";
      job.retryCount += 1;
      job.failureReason = undefined;

      // Process the retry
      this.processNotificationJob(job).catch((error) => {
        console.error("Failed to retry notification job:", error);
        job.status = "failed";
        job.failureReason =
          error instanceof Error ? error.message : "Unknown error";
      });

      return ok(job);
    } catch (error) {
      return err(new AnyError("Failed to retry notification", error));
    }
  }

  async processNotificationQueue(): Promise<Result<number, AnyError>> {
    try {
      const pendingJobs = this.notificationJobs.filter(
        (j) => j.status === "pending",
      );
      let processedCount = 0;

      for (const job of pendingJobs) {
        try {
          await this.processNotificationJob(job);
          processedCount++;
        } catch (error) {
          console.error(`Failed to process job ${job.id}:`, error);
          job.status = "failed";
          job.failureReason =
            error instanceof Error ? error.message : "Unknown error";
        }
      }

      return ok(processedCount);
    } catch (error) {
      return err(new AnyError("Failed to process notification queue", error));
    }
  }

  async updateDeliveryStatus(
    jobId: string,
    status: "delivered" | "failed",
    reason?: string,
  ): Promise<Result<void, AnyError>> {
    try {
      const job = this.notificationJobs.find((j) => j.id === jobId);
      if (!job) {
        return err(new AnyError("Notification job not found"));
      }

      job.status = status;
      if (status === "delivered") {
        job.deliveredAt = new Date();
      } else {
        job.failureReason = reason;
      }

      return ok(undefined);
    } catch (error) {
      return err(new AnyError("Failed to update delivery status", error));
    }
  }

  private async processNotificationJob(
    job: PushNotificationJob,
  ): Promise<void> {
    job.status = "sent";
    job.sentAt = new Date();

    switch (job.channel) {
      case "web":
        await this.sendWebPushNotification(job);
        break;
      case "mobile":
        await this.sendMobilePushNotification(job);
        break;
      case "email":
        await this.sendEmailNotification(job);
        break;
      case "sms":
        await this.sendSMSNotification(job);
        break;
      default:
        throw new Error(`Unsupported channel: ${job.channel}`);
    }

    job.status = "delivered";
    job.deliveredAt = new Date();
  }

  private async sendWebPushNotification(
    job: PushNotificationJob,
  ): Promise<void> {
    // Get web push tokens for the user
    const userTokensResult = await this.getUserDeviceTokens(job.userId);
    if (userTokensResult.isErr()) {
      throw new Error("Failed to get user device tokens");
    }

    const webTokens = userTokensResult.value.filter(
      (t) => t.platform === "web",
    );
    if (webTokens.length === 0) {
      throw new Error("No web push tokens found for user");
    }

    // Send to each web token using Web Push Protocol
    for (const token of webTokens) {
      try {
        await this.sendWebPushToToken(token.token, job.payload);
        job.deviceToken = token.token;
      } catch (error) {
        console.error(`Failed to send web push to token ${token.id}:`, error);
        // Continue with other tokens
      }
    }
  }

  private async sendMobilePushNotification(
    job: PushNotificationJob,
  ): Promise<void> {
    // Get mobile tokens for the user
    const userTokensResult = await this.getUserDeviceTokens(job.userId);
    if (userTokensResult.isErr()) {
      throw new Error("Failed to get user device tokens");
    }

    const mobileTokens = userTokensResult.value.filter(
      (t) => t.platform === "ios" || t.platform === "android",
    );

    if (mobileTokens.length === 0) {
      throw new Error("No mobile tokens found for user");
    }

    // Send using Firebase Cloud Messaging
    for (const token of mobileTokens) {
      try {
        await this.sendFirebaseMessage(token.token, job.payload);
        job.deviceToken = token.token;
      } catch (error) {
        console.error(`Failed to send FCM to token ${token.id}:`, error);
        // Continue with other tokens
      }
    }
  }

  private async sendEmailNotification(job: PushNotificationJob): Promise<void> {
    // Integration with email service (already implemented in EmailNotificationService)
    console.log(`Sending email notification to user ${job.userId}`);

    // This would integrate with the existing email notification service
    // For now, we'll just mark as sent
  }

  private async sendSMSNotification(job: PushNotificationJob): Promise<void> {
    // Integration with SMS service (e.g., Twilio, AWS SNS)
    console.log(`Sending SMS notification to user ${job.userId}`);

    // This would require phone number lookup and SMS service integration
    // For now, we'll just mark as sent
  }

  private async sendWebPushToToken(
    token: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    // Implementation using web-push library
    // This would require VAPID keys and proper web push setup
    console.log(`Sending web push to token: ${token.substring(0, 20)}...`);
    console.log("Payload:", payload);

    // Simulate network request
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  private async sendFirebaseMessage(
    token: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    // Implementation using Firebase Admin SDK
    console.log(`Sending FCM to token: ${token.substring(0, 20)}...`);
    console.log("Payload:", payload);

    // In real implementation, this would use Firebase Admin SDK:
    // const message = {
    //   notification: {
    //     title: payload.title as string,
    //     body: payload.body as string,
    //   },
    //   data: payload.data as Record<string, string>,
    //   token: token,
    // };
    //
    // await admin.messaging().send(message);

    // Simulate network request
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}
