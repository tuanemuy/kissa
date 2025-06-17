import type { Result } from "neverthrow";

export interface EmailNotification {
  to: string;
  subject: string;
  body: string;
  html?: string;
}

export interface PushNotification {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export interface NotificationService {
  sendEmail(notification: EmailNotification): Promise<Result<void, Error>>;
  sendPush(notification: PushNotification): Promise<Result<void, Error>>;
}
