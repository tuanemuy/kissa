import type { NotificationRepository } from "@/core/domain/notification/ports/notificationRepository";
import type {
  CreateNotificationParams,
  ListNotificationsQuery,
  Notification,
  NotificationId,
} from "@/core/domain/notification/types";
import { notificationSchema } from "@/core/domain/notification/types";
import type { UserId } from "@/core/domain/user/types";
import { RepositoryError } from "@/lib/error";
import { validate } from "@/lib/validation";
import { and, desc, eq, lt, sql } from "drizzle-orm";
import { type Result, err, ok } from "neverthrow";
import { v7 as uuidv7 } from "uuid";
import type { Database } from "./client";
import { notifications } from "./schema";

export class DrizzleTursoNotificationRepository
  implements NotificationRepository
{
  constructor(private readonly db: Database) {}

  async create(
    params: CreateNotificationParams,
  ): Promise<Result<Notification, RepositoryError>> {
    try {
      const notificationId = uuidv7();
      const result = await this.db
        .insert(notifications)
        .values({
          id: notificationId,
          userId: params.userId,
          type: params.type,
          title: params.title,
          message: params.message,
          data: params.data ? JSON.stringify(params.data) : null,
          isRead: false,
          createdAt: new Date(),
        })
        .returning();

      const notification = result[0];
      if (!notification) {
        return err(new RepositoryError("Failed to create notification"));
      }

      // Parse JSON data if present
      const notificationData = {
        ...notification,
        data: notification.data ? JSON.parse(notification.data) : null,
      };

      return validate(notificationSchema, notificationData).mapErr((error) => {
        return new RepositoryError("Invalid notification data", error);
      });
    } catch (error) {
      return err(new RepositoryError("Failed to create notification", error));
    }
  }

  async findById(
    id: NotificationId,
  ): Promise<Result<Notification | null, RepositoryError>> {
    try {
      const result = await this.db
        .select()
        .from(notifications)
        .where(eq(notifications.id, id))
        .limit(1);

      const notification = result[0];
      if (!notification) {
        return ok(null);
      }

      // Parse JSON data if present
      const notificationData = {
        ...notification,
        data: notification.data ? JSON.parse(notification.data) : null,
      };

      return validate(notificationSchema, notificationData)
        .map((notif) => notif as Notification | null)
        .mapErr((error) => {
          return new RepositoryError("Invalid notification data", error);
        });
    } catch (error) {
      return err(new RepositoryError("Failed to find notification", error));
    }
  }

  async markAsRead(id: NotificationId): Promise<Result<void, RepositoryError>> {
    try {
      await this.db
        .update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.id, id));

      return ok(undefined);
    } catch (error) {
      return err(
        new RepositoryError("Failed to mark notification as read", error),
      );
    }
  }

  async markAllAsRead(
    userId: UserId,
  ): Promise<Result<number, RepositoryError>> {
    try {
      const result = await this.db
        .update(notifications)
        .set({ isRead: true })
        .where(
          and(
            eq(notifications.userId, userId),
            eq(notifications.isRead, false),
          ),
        )
        .returning({ id: notifications.id });

      return ok(result.length);
    } catch (error) {
      return err(
        new RepositoryError("Failed to mark all notifications as read", error),
      );
    }
  }

  async delete(id: NotificationId): Promise<Result<void, RepositoryError>> {
    try {
      await this.db.delete(notifications).where(eq(notifications.id, id));
      return ok(undefined);
    } catch (error) {
      return err(new RepositoryError("Failed to delete notification", error));
    }
  }

  async deleteOlderThan(
    userId: UserId,
    days: number,
  ): Promise<Result<number, RepositoryError>> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const result = await this.db
        .delete(notifications)
        .where(
          and(
            eq(notifications.userId, userId),
            lt(notifications.createdAt, cutoffDate),
          ),
        )
        .returning({ id: notifications.id });

      return ok(result.length);
    } catch (error) {
      return err(
        new RepositoryError("Failed to delete old notifications", error),
      );
    }
  }

  async list(
    query: ListNotificationsQuery,
  ): Promise<
    Result<{ items: Notification[]; count: number }, RepositoryError>
  > {
    const { userId, pagination, filter } = query;
    const limit = pagination.limit;
    const offset = (pagination.page - 1) * pagination.limit;

    const filters = [
      eq(notifications.userId, userId),
      filter?.type ? eq(notifications.type, filter.type) : undefined,
      filter?.isRead !== undefined
        ? eq(notifications.isRead, filter.isRead)
        : undefined,
    ].filter((filter) => filter !== undefined);

    try {
      const [items, countResult] = await Promise.all([
        this.db
          .select()
          .from(notifications)
          .where(and(...filters))
          .orderBy(desc(notifications.createdAt))
          .limit(limit)
          .offset(offset),
        this.db
          .select({ count: sql`count(*)` })
          .from(notifications)
          .where(and(...filters)),
      ]);

      const parsedItems = items
        .map((item) => {
          const notificationData = {
            ...item,
            data: item.data ? JSON.parse(item.data) : null,
          };
          return validate(notificationSchema, notificationData).unwrapOr(null);
        })
        .filter((item): item is Notification => item !== null);

      return ok({
        items: parsedItems,
        count: Number(countResult[0]?.count || 0),
      });
    } catch (error) {
      return err(new RepositoryError("Failed to list notifications", error));
    }
  }

  async countUnread(userId: UserId): Promise<Result<number, RepositoryError>> {
    try {
      const result = await this.db
        .select({ count: sql`count(*)` })
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, userId),
            eq(notifications.isRead, false),
          ),
        );

      return ok(Number(result[0]?.count || 0));
    } catch (error) {
      return err(
        new RepositoryError("Failed to count unread notifications", error),
      );
    }
  }
}
