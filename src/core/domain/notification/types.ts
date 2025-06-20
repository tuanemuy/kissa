import { z } from "zod/v4";
import { userIdSchema } from "../user/types";

// Branded types
export const notificationIdSchema = z.string().uuid().brand("NotificationId");
export type NotificationId = z.infer<typeof notificationIdSchema>;

// Enums
export const notificationTypeSchema = z.enum([
  "location_invitation",
  "content_moderation",
  "check_in_activity",
  "system",
  "push_notification",
]);
export type NotificationType = z.infer<typeof notificationTypeSchema>;

// Notification entity
export const notificationSchema = z.object({
  id: notificationIdSchema,
  userId: userIdSchema,
  type: notificationTypeSchema,
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(1000),
  data: z.record(z.string(), z.unknown()).nullable(), // JSON data
  isRead: z.boolean(),
  createdAt: z.date(),
});
export type Notification = z.infer<typeof notificationSchema>;

// DTOs
export const createNotificationParamsSchema = z.object({
  userId: userIdSchema,
  type: notificationTypeSchema,
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(1000),
  data: z.record(z.string(), z.unknown()).optional(),
});
export type CreateNotificationParams = z.infer<
  typeof createNotificationParamsSchema
>;

export const markNotificationAsReadParamsSchema = z.object({
  id: notificationIdSchema,
});
export type MarkNotificationAsReadParams = z.infer<
  typeof markNotificationAsReadParamsSchema
>;

// Query types
export const listNotificationsQuerySchema = z.object({
  userId: userIdSchema,
  pagination: z.object({
    page: z.number().positive(),
    limit: z.number().positive().max(100),
  }),
  filter: z
    .object({
      type: notificationTypeSchema.optional(),
      isRead: z.boolean().optional(),
    })
    .optional(),
});
export type ListNotificationsQuery = z.infer<
  typeof listNotificationsQuerySchema
>;

// Push notification types
export const pushNotificationChannelSchema = z.enum([
  "web",
  "mobile",
  "email",
  "sms",
]);
export type PushNotificationChannel = z.infer<
  typeof pushNotificationChannelSchema
>;

export const pushNotificationStatusSchema = z.enum([
  "pending",
  "sent",
  "delivered",
  "failed",
  "expired",
]);
export type PushNotificationStatus = z.infer<
  typeof pushNotificationStatusSchema
>;

export const deviceTokenSchema = z.object({
  id: z.string().uuid(),
  userId: userIdSchema,
  token: z.string(),
  platform: z.enum(["web", "ios", "android"]),
  isActive: z.boolean(),
  createdAt: z.date(),
  lastUsedAt: z.date(),
});
export type DeviceToken = z.infer<typeof deviceTokenSchema>;

export const pushNotificationJobSchema = z.object({
  id: z.string().uuid(),
  notificationId: notificationIdSchema,
  userId: userIdSchema,
  channel: pushNotificationChannelSchema,
  status: pushNotificationStatusSchema,
  payload: z.record(z.string(), z.unknown()),
  deviceToken: z.string().optional(),
  scheduledAt: z.date(),
  sentAt: z.date().optional(),
  deliveredAt: z.date().optional(),
  failureReason: z.string().optional(),
  retryCount: z.number().default(0),
});
export type PushNotificationJob = z.infer<typeof pushNotificationJobSchema>;

export const sendPushNotificationParamsSchema = z.object({
  userId: userIdSchema,
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(1000),
  data: z.record(z.string(), z.unknown()).optional(),
  channels: z.array(pushNotificationChannelSchema).optional(),
  priority: z.enum(["low", "normal", "high"]).optional(),
  ttl: z.number().positive().optional(), // Time to live in seconds
});
export type SendPushNotificationParams = z.infer<
  typeof sendPushNotificationParamsSchema
>;

export const registerDeviceTokenParamsSchema = z.object({
  userId: userIdSchema,
  token: z.string(),
  platform: z.enum(["web", "ios", "android"]),
});
export type RegisterDeviceTokenParams = z.infer<
  typeof registerDeviceTokenParamsSchema
>;
