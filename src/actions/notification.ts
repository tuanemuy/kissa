"use server";

import { cleanupOldNotifications } from "@/core/application/notification/cleanupOldNotifications";
import { createNotification } from "@/core/application/notification/createNotification";
import { listNotifications } from "@/core/application/notification/listNotifications";
import { markAllNotificationsAsRead } from "@/core/application/notification/markAllNotificationsAsRead";
import { markNotificationAsRead } from "@/core/application/notification/markNotificationAsRead";
import { sendNotification } from "@/core/application/notification/sendNotification";
import {
  type NotificationId,
  type NotificationType,
  notificationIdSchema,
  notificationTypeSchema,
} from "@/core/domain/notification/types";
import { type UserId, userIdSchema } from "@/core/domain/user/types";
import { parseFormDataObject } from "@/lib/formData";
import { redirect } from "next/navigation";
import { z } from "zod/v4";
import { getContext } from "./context";

export async function createUserNotification(formData: FormData) {
  const context = await getContext();

  const inputResult = parseFormDataObject(formData, {
    userId: userIdSchema,
    type: z.string(),
    title: z.string().max(200),
    message: z.string().max(1000),
    data: z.string().optional(), // JSON string
  });

  if (inputResult.isErr()) {
    throw new Error(`Invalid form data: ${inputResult.error.message}`);
  }

  const { data, type, ...notificationData } = inputResult.value;

  // Validate notification type
  const typeResult = notificationTypeSchema.safeParse(type);
  if (!typeResult.success) {
    throw new Error("Invalid notification type");
  }

  const { userId, title, message } = notificationData;
  const input = {
    userId: userId as UserId,
    type: typeResult.data,
    title: title as string,
    message: message as string,
    data: data ? JSON.parse(data as string) : undefined,
  };

  const result = await createNotification(context, input);

  if (result.isErr()) {
    throw new Error(`Failed to create notification: ${result.error.message}`);
  }

  redirect("/dashboard/notifications");
}

export async function sendUserNotification(formData: FormData) {
  const context = await getContext();

  const inputResult = parseFormDataObject(formData, {
    userId: userIdSchema,
    type: z.string(),
    title: z.string().max(200),
    message: z.string().max(1000),
    sendEmail: z.boolean().default(false),
    sendPush: z.boolean().default(true),
    data: z.string().optional(), // JSON string
  });

  if (inputResult.isErr()) {
    throw new Error(`Invalid form data: ${inputResult.error.message}`);
  }

  const { data, type, ...notificationData } = inputResult.value;

  // Validate notification type
  const typeResult = notificationTypeSchema.safeParse(type);
  if (!typeResult.success) {
    throw new Error("Invalid notification type");
  }

  const { userId, title, message, sendEmail, sendPush } = notificationData;
  const input = {
    userId: userId as UserId,
    type: typeResult.data,
    title: title as string,
    message: message as string,
    sendEmail: sendEmail as boolean,
    sendPush: sendPush as boolean,
    data: data ? JSON.parse(data as string) : undefined,
  };

  const result = await sendNotification(context, input);

  if (result.isErr()) {
    throw new Error(`Failed to send notification: ${result.error.message}`);
  }

  redirect("/dashboard/notifications");
}

export async function markNotificationRead(formData: FormData) {
  const context = await getContext();

  const inputResult = parseFormDataObject(formData, {
    id: notificationIdSchema,
  });

  if (inputResult.isErr()) {
    throw new Error(`Invalid form data: ${inputResult.error.message}`);
  }

  const { id } = inputResult.value;
  const result = await markNotificationAsRead(context, {
    id: id as NotificationId,
  });

  if (result.isErr()) {
    throw new Error(
      `Failed to mark notification as read: ${result.error.message}`,
    );
  }
}

export async function markAllNotificationsRead(formData: FormData) {
  const context = await getContext();

  const inputResult = parseFormDataObject(formData, {
    userId: userIdSchema,
  });

  if (inputResult.isErr()) {
    throw new Error(`Invalid form data: ${inputResult.error.message}`);
  }

  const { userId } = inputResult.value;
  const result = await markAllNotificationsAsRead(context, {
    userId: userId as UserId,
  });

  if (result.isErr()) {
    throw new Error(
      `Failed to mark all notifications as read: ${result.error.message}`,
    );
  }

  redirect("/dashboard/notifications");
}

export async function getUserNotifications(
  userId: string,
  page = 1,
  limit = 20,
) {
  const context = await getContext();

  const parseResult = userIdSchema.safeParse(userId);
  if (!parseResult.success) {
    throw new Error("Invalid user ID");
  }

  const result = await listNotifications(context, {
    userId: parseResult.data,
    pagination: { page, limit },
  });

  if (result.isErr()) {
    throw new Error(`Failed to get notifications: ${result.error.message}`);
  }

  return result.value;
}

export async function cleanupUserNotifications(formData: FormData) {
  const context = await getContext();

  const inputResult = parseFormDataObject(formData, {
    userId: userIdSchema,
    days: z.number().positive().default(30),
  });

  if (inputResult.isErr()) {
    throw new Error(`Invalid form data: ${inputResult.error.message}`);
  }

  const { userId, days } = inputResult.value;
  const result = await cleanupOldNotifications(context, {
    userId: userId as UserId,
    days: days as number,
  });

  if (result.isErr()) {
    throw new Error(`Failed to cleanup notifications: ${result.error.message}`);
  }

  redirect("/dashboard/notifications");
}
