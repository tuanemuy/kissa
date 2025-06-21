import type { ModerationRepository } from "@/core/domain/moderation/ports/moderationRepository";
import type {
  CreateModerationItemParams,
  ListModerationItemsQuery,
  ModerateContentParams,
  ModerationItem,
  ModerationItemId,
} from "@/core/domain/moderation/types";
import { RepositoryError } from "@/lib/error";
import type { Result } from "neverthrow";
import { err, ok } from "neverthrow";

export class MockModerationRepository implements ModerationRepository {
  private items: Map<string, ModerationItem> = new Map();
  private shouldFail = false;

  setShouldFail(shouldFail: boolean): void {
    this.shouldFail = shouldFail;
  }

  async create(
    params: CreateModerationItemParams,
  ): Promise<Result<ModerationItem, RepositoryError>> {
    if (this.shouldFail) {
      return err(new RepositoryError("Mock repository failure"));
    }

    const item: ModerationItem = {
      id: crypto.randomUUID() as ModerationItemId,
      contentType: params.contentType,
      contentId: params.contentId,
      status: "pending",
      reportedBy: params.reportedBy ?? null,
      reportReason: params.reportReason ?? null,
      moderatedBy: null,
      moderationNote: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.items.set(item.id, item);
    return ok(item);
  }

  async findById(
    id: ModerationItemId,
  ): Promise<Result<ModerationItem | null, RepositoryError>> {
    if (this.shouldFail) {
      return err(new RepositoryError("Mock repository failure"));
    }

    const item = this.items.get(id);
    return ok(item ?? null);
  }

  async update(
    params: ModerateContentParams,
  ): Promise<Result<ModerationItem, RepositoryError>> {
    if (this.shouldFail) {
      return err(new RepositoryError("Mock repository failure"));
    }

    const item = this.items.get(params.id);
    if (!item) {
      return err(new RepositoryError("Moderation item not found"));
    }

    const updated: ModerationItem = {
      ...item,
      status: params.status,
      moderatedBy: params.moderatedBy,
      moderationNote: params.moderationNote ?? item.moderationNote,
      updatedAt: new Date(),
    };

    this.items.set(params.id, updated);
    return ok(updated);
  }

  async list(
    query: ListModerationItemsQuery,
  ): Promise<
    Result<{ items: ModerationItem[]; count: number }, RepositoryError>
  > {
    if (this.shouldFail) {
      return err(new RepositoryError("Mock repository failure"));
    }

    let items = Array.from(this.items.values());

    // Apply filters
    if (query.filter) {
      if (query.filter.status) {
        items = items.filter((item) => item.status === query.filter?.status);
      }
      if (query.filter.contentType) {
        items = items.filter(
          (item) => item.contentType === query.filter?.contentType,
        );
      }
      if (query.filter.reportedBy) {
        items = items.filter(
          (item) => item.reportedBy === query.filter?.reportedBy,
        );
      }
      if (query.filter.moderatedBy) {
        items = items.filter(
          (item) => item.moderatedBy === query.filter?.moderatedBy,
        );
      }
    }

    // Apply sorting
    if (query.sort) {
      const { field, order } = query.sort;
      items.sort((a, b) => {
        const aValue = a[field].getTime();
        const bValue = b[field].getTime();
        return order === "asc" ? aValue - bValue : bValue - aValue;
      });
    }

    // Apply pagination
    const offset = (query.pagination.page - 1) * query.pagination.limit;
    const paginatedItems = items.slice(offset, offset + query.pagination.limit);

    return ok({
      items: paginatedItems,
      count: items.length,
    });
  }

  async delete(id: ModerationItemId): Promise<Result<void, RepositoryError>> {
    if (this.shouldFail) {
      return err(new RepositoryError("Mock repository failure"));
    }

    this.items.delete(id);
    return ok(undefined);
  }

  async findByContent(
    contentType: "region" | "location" | "checkIn",
    contentId: string,
  ): Promise<Result<ModerationItem | null, RepositoryError>> {
    if (this.shouldFail) {
      return err(new RepositoryError("Mock repository failure"));
    }

    const item = Array.from(this.items.values()).find(
      (item) =>
        item.contentType === contentType && item.contentId === contentId,
    );
    return ok(item ?? null);
  }

  async moderate(
    params: ModerateContentParams,
  ): Promise<Result<ModerationItem, RepositoryError>> {
    return this.update(params);
  }

  async countPending(): Promise<Result<number, RepositoryError>> {
    if (this.shouldFail) {
      return err(new RepositoryError("Mock repository failure"));
    }

    const count = Array.from(this.items.values()).filter(
      (item) => item.status === "pending",
    ).length;
    return ok(count);
  }

  async countOlderThan24Hours(): Promise<Result<number, RepositoryError>> {
    if (this.shouldFail) {
      return err(new RepositoryError("Mock repository failure"));
    }

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const count = Array.from(this.items.values()).filter(
      (item) => item.status === "pending" && item.createdAt < oneDayAgo,
    ).length;
    return ok(count);
  }

  async getStats(): Promise<
    Result<
      {
        total: number;
        pending: number;
        approved: number;
        rejected: number;
        byContentType: Record<string, number>;
      },
      RepositoryError
    >
  > {
    if (this.shouldFail) {
      return err(new RepositoryError("Mock repository failure"));
    }

    const items = Array.from(this.items.values());
    const stats = {
      total: items.length,
      pending: items.filter((item) => item.status === "pending").length,
      approved: items.filter((item) => item.status === "approved").length,
      rejected: items.filter((item) => item.status === "rejected").length,
      byContentType: {} as Record<string, number>,
    };

    for (const item of items) {
      stats.byContentType[item.contentType] =
        (stats.byContentType[item.contentType] || 0) + 1;
    }

    return ok(stats);
  }

  // Test helper methods
  addItem(item: ModerationItem): void {
    this.items.set(item.id, item);
  }

  clear(): void {
    this.items.clear();
  }
}
