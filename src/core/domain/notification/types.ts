import { z } from "zod";
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
]);
export type NotificationType = z.infer<typeof notificationTypeSchema>;

// Notification entity
export const notificationSchema = z.object({
  id: notificationIdSchema,
  userId: userIdSchema,
  type: notificationTypeSchema,
  title: z.string().max(200),
  message: z.string().max(1000),
  data: z.record(z.unknown()).nullable(), // JSON data
  isRead: z.boolean(),
  createdAt: z.date(),
});
export type Notification = z.infer<typeof notificationSchema>;

// DTOs
export const createNotificationParamsSchema = z.object({
  userId: userIdSchema,
  type: notificationTypeSchema,
  title: z.string().max(200),
  message: z.string().max(1000),
  data: z.record(z.unknown()).optional(),
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
