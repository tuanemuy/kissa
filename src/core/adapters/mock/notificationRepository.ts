import type { RepositoryError } from "@/lib/error";
import { RepositoryError as RepositoryErrorClass } from "@/lib/error";
import type { Result } from "neverthrow";
import { err, ok } from "neverthrow";
import type { NotificationRepository } from "../../domain/notification/ports/notificationRepository";
import type {
  CreateNotificationParams,
  ListNotificationsQuery,
  Notification,
  NotificationId,
} from "../../domain/notification/types";
import type { UserId } from "../../domain/user/types";

export class MockNotificationRepository implements NotificationRepository {
  private notifications = new Map<NotificationId, Notification>();
  private shouldFailOperations = false;

  setShouldFailOperations(shouldFail: boolean): void {
    this.shouldFailOperations = shouldFail;
  }

  addNotification(notification: Notification): void {
    this.notifications.set(notification.id, notification);
  }

  clear(): void {
    this.notifications.clear();
  }

  async create(
    params: CreateNotificationParams,
  ): Promise<Result<Notification, RepositoryError>> {
    if (this.shouldFailOperations) {
      return err(new RepositoryErrorClass("Mock create failure"));
    }

    const notification: Notification = {
      id: `notification-${Date.now()}` as NotificationId,
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      data: params.data ?? null,
      isRead: false,
      createdAt: new Date(),
    };

    this.notifications.set(notification.id, notification);
    return ok(notification);
  }

  async findById(
    id: NotificationId,
  ): Promise<Result<Notification | null, RepositoryError>> {
    if (this.shouldFailOperations) {
      return err(new RepositoryErrorClass("Mock findById failure"));
    }

    return ok(this.notifications.get(id) ?? null);
  }

  async markAsRead(id: NotificationId): Promise<Result<void, RepositoryError>> {
    if (this.shouldFailOperations) {
      return err(new RepositoryErrorClass("Mock markAsRead failure"));
    }

    const notification = this.notifications.get(id);
    if (!notification) {
      return err(new RepositoryErrorClass("Notification not found"));
    }

    const updatedNotification: Notification = {
      ...notification,
      isRead: true,
    };

    this.notifications.set(id, updatedNotification);
    return ok(undefined);
  }

  async markAllAsRead(
    userId: UserId,
  ): Promise<Result<number, RepositoryError>> {
    if (this.shouldFailOperations) {
      return err(new RepositoryErrorClass("Mock markAllAsRead failure"));
    }

    let markedCount = 0;
    for (const [id, notification] of this.notifications.entries()) {
      if (notification.userId === userId && !notification.isRead) {
        const updatedNotification: Notification = {
          ...notification,
          isRead: true,
        };
        this.notifications.set(id, updatedNotification);
        markedCount++;
      }
    }

    return ok(markedCount);
  }

  async delete(id: NotificationId): Promise<Result<void, RepositoryError>> {
    if (this.shouldFailOperations) {
      return err(new RepositoryErrorClass("Mock delete failure"));
    }

    this.notifications.delete(id);
    return ok(undefined);
  }

  async deleteOlderThan(
    userId: UserId,
    days: number,
  ): Promise<Result<number, RepositoryError>> {
    if (this.shouldFailOperations) {
      return err(new RepositoryErrorClass("Mock deleteOlderThan failure"));
    }

    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    let deletedCount = 0;

    for (const [id, notification] of this.notifications.entries()) {
      if (
        notification.userId === userId &&
        notification.createdAt < cutoffDate
      ) {
        this.notifications.delete(id);
        deletedCount++;
      }
    }

    return ok(deletedCount);
  }

  async list(
    query: ListNotificationsQuery,
  ): Promise<
    Result<{ items: Notification[]; count: number }, RepositoryError>
  > {
    if (this.shouldFailOperations) {
      return err(new RepositoryErrorClass("Mock list failure"));
    }

    let filteredNotifications = Array.from(this.notifications.values());

    // Filter by userId
    filteredNotifications = filteredNotifications.filter(
      (notification) => notification.userId === query.userId,
    );

    // Apply filters
    if (query.filter) {
      if (query.filter.type) {
        filteredNotifications = filteredNotifications.filter(
          (notification) => notification.type === query.filter?.type,
        );
      }
      if (query.filter.isRead !== undefined) {
        filteredNotifications = filteredNotifications.filter(
          (notification) => notification.isRead === query.filter?.isRead,
        );
      }
    }

    const totalCount = filteredNotifications.length;

    // Apply pagination
    const offset = (query.pagination.page - 1) * query.pagination.limit;
    const paginatedNotifications = filteredNotifications.slice(
      offset,
      offset + query.pagination.limit,
    );

    return ok({ items: paginatedNotifications, count: totalCount });
  }

  async countUnread(userId: UserId): Promise<Result<number, RepositoryError>> {
    if (this.shouldFailOperations) {
      return err(new RepositoryErrorClass("Mock countUnread failure"));
    }

    let count = 0;
    for (const notification of this.notifications.values()) {
      if (notification.userId === userId && !notification.isRead) {
        count++;
      }
    }

    return ok(count);
  }
}
