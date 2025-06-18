import { type Result, err, ok } from "neverthrow";
import nodemailer from "nodemailer";
import type {
  EmailNotification,
  NotificationService,
  PushNotification,
} from "../../domain/notification/ports/notificationService";

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  fromEmail?: string;
  fromName?: string;
}

export class NodemailerNotificationService implements NotificationService {
  private transporter: nodemailer.Transporter;
  private config: SmtpConfig;

  constructor(config: SmtpConfig) {
    this.config = config;
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.password,
      },
    });
  }

  async sendEmail(
    notification: EmailNotification,
  ): Promise<Result<void, Error>> {
    try {
      const fromEmail = this.config.fromEmail || this.config.user;
      const fromName = this.config.fromName || "Kissa";

      const mailOptions = {
        from: `"${fromName}" <${fromEmail}>`,
        to: notification.to,
        subject: notification.subject,
        text: notification.body,
        html: notification.html || this.convertTextToHtml(notification.body),
      };

      await this.transporter.sendMail(mailOptions);
      return ok(undefined);
    } catch (error) {
      return err(new Error(`Failed to send email: ${error}`));
    }
  }

  async sendPush(notification: PushNotification): Promise<Result<void, Error>> {
    // Push notifications are not implemented yet
    // This would typically integrate with Firebase Cloud Messaging, Apple Push Notification Service, etc.
    console.log(
      "[NodemailerNotificationService] Push notification not implemented:",
      {
        userId: notification.userId,
        title: notification.title,
        body: notification.body,
        data: notification.data,
      },
    );

    // For now, return success but log that it's not implemented
    return ok(undefined);
  }

  private convertTextToHtml(text: string): string {
    // Simple text to HTML conversion
    return text
      .split("\n")
      .map((line) => `<p>${line}</p>`)
      .join("");
  }

  // Test email connection
  async testConnection(): Promise<Result<void, Error>> {
    try {
      await this.transporter.verify();
      return ok(undefined);
    } catch (error) {
      return err(new Error(`SMTP connection test failed: ${error}`));
    }
  }
}
