import type { RepositoryError } from "@/lib/error";
import type { Result } from "neverthrow";
import type { UserId } from "../../user/types";
import type {
  CreateNotificationParams,
  ListNotificationsQuery,
  Notification,
  NotificationId,
} from "../types";

export interface NotificationRepository {
  create(
    params: CreateNotificationParams,
  ): Promise<Result<Notification, RepositoryError>>;
  findById(
    id: NotificationId,
  ): Promise<Result<Notification | null, RepositoryError>>;
  markAsRead(id: NotificationId): Promise<Result<void, RepositoryError>>;
  markAllAsRead(userId: UserId): Promise<Result<number, RepositoryError>>;
  delete(id: NotificationId): Promise<Result<void, RepositoryError>>;
  deleteOlderThan(
    userId: UserId,
    days: number,
  ): Promise<Result<number, RepositoryError>>;
  list(
    query: ListNotificationsQuery,
  ): Promise<Result<{ items: Notification[]; count: number }, RepositoryError>>;
  countUnread(userId: UserId): Promise<Result<number, RepositoryError>>;
}
