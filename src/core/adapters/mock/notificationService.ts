import { type Result, ok } from "neverthrow";
import type {
  EmailNotification,
  NotificationService,
  PushNotification,
} from "../../domain/notification/ports/notificationService";

export class MockNotificationService implements NotificationService {
  async sendEmail(
    notification: EmailNotification,
  ): Promise<Result<void, Error>> {
    console.log("[MockNotificationService] Sending email:", {
      to: notification.to,
      subject: notification.subject,
      body: notification.body.substring(0, 100),
    });
    return ok(undefined);
  }

  async sendPush(notification: PushNotification): Promise<Result<void, Error>> {
    console.log("[MockNotificationService] Sending push notification:", {
      userId: notification.userId,
      title: notification.title,
      body: notification.body,
    });
    return ok(undefined);
  }
}
