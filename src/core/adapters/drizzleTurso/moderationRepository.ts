import type { ModerationRepository } from "@/core/domain/moderation/ports/moderationRepository";
import type {
  CreateModerationItemParams,
  ListModerationItemsQuery,
  ModerateContentParams,
  ModerationItem,
  ModerationItemId,
} from "@/core/domain/moderation/types";
import { moderationItemSchema } from "@/core/domain/moderation/types";
import { RepositoryError } from "@/lib/error";
import { validate } from "@/lib/validation";
import { and, asc, desc, eq, lt, sql } from "drizzle-orm";
import { type Result, err, ok } from "neverthrow";
import { v7 as uuidv7 } from "uuid";
import type { Database } from "./client";
import { moderationItems } from "./schema";

export class DrizzleTursoModerationRepository implements ModerationRepository {
  constructor(private readonly db: Database) {}

  async create(
    params: CreateModerationItemParams,
  ): Promise<Result<ModerationItem, RepositoryError>> {
    try {
      const moderationItemId = uuidv7();
      const result = await this.db
        .insert(moderationItems)
        .values({
          id: moderationItemId,
          contentType: params.contentType,
          contentId: params.contentId,
          status: "pending",
          reportedBy: params.reportedBy || null,
          reportReason: params.reportReason || null,
          moderatedBy: null,
          moderationNote: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      const moderationItem = result[0];
      if (!moderationItem) {
        return err(new RepositoryError("Failed to create moderation item"));
      }

      return validate(moderationItemSchema, moderationItem).mapErr((error) => {
        return new RepositoryError("Invalid moderation item data", error);
      });
    } catch (error) {
      return err(
        new RepositoryError("Failed to create moderation item", error),
      );
    }
  }

  async findById(
    id: ModerationItemId,
  ): Promise<Result<ModerationItem | null, RepositoryError>> {
    try {
      const result = await this.db
        .select()
        .from(moderationItems)
        .where(eq(moderationItems.id, id))
        .limit(1);

      const moderationItem = result[0];
      if (!moderationItem) {
        return ok(null);
      }

      return validate(moderationItemSchema, moderationItem)
        .map((item) => item as ModerationItem | null)
        .mapErr((error) => {
          return new RepositoryError("Invalid moderation item data", error);
        });
    } catch (error) {
      return err(new RepositoryError("Failed to find moderation item", error));
    }
  }

  async findByContent(
    contentType: "region" | "location" | "checkIn",
    contentId: string,
  ): Promise<Result<ModerationItem | null, RepositoryError>> {
    try {
      const result = await this.db
        .select()
        .from(moderationItems)
        .where(
          and(
            eq(moderationItems.contentType, contentType),
            eq(moderationItems.contentId, contentId),
          ),
        )
        .limit(1);

      const moderationItem = result[0];
      if (!moderationItem) {
        return ok(null);
      }

      return validate(moderationItemSchema, moderationItem)
        .map((item) => item as ModerationItem | null)
        .mapErr((error) => {
          return new RepositoryError("Invalid moderation item data", error);
        });
    } catch (error) {
      return err(new RepositoryError("Failed to find moderation item", error));
    }
  }

  async moderate(
    params: ModerateContentParams,
  ): Promise<Result<ModerationItem, RepositoryError>> {
    try {
      const result = await this.db
        .update(moderationItems)
        .set({
          status: params.status,
          moderatedBy: params.moderatedBy,
          moderationNote: params.moderationNote || null,
          updatedAt: new Date(),
        })
        .where(eq(moderationItems.id, params.id))
        .returning();

      const moderationItem = result[0];
      if (!moderationItem) {
        return err(new RepositoryError("Moderation item not found"));
      }

      return validate(moderationItemSchema, moderationItem).mapErr((error) => {
        return new RepositoryError("Invalid moderation item data", error);
      });
    } catch (error) {
      return err(new RepositoryError("Failed to moderate content", error));
    }
  }

  async list(
    query: ListModerationItemsQuery,
  ): Promise<
    Result<{ items: ModerationItem[]; count: number }, RepositoryError>
  > {
    const { pagination, filter, sort } = query;
    const limit = pagination.limit;
    const offset = (pagination.page - 1) * pagination.limit;

    const filters = [
      filter?.status ? eq(moderationItems.status, filter.status) : undefined,
      filter?.contentType
        ? eq(moderationItems.contentType, filter.contentType)
        : undefined,
      filter?.reportedBy
        ? eq(moderationItems.reportedBy, filter.reportedBy)
        : undefined,
      filter?.moderatedBy
        ? eq(moderationItems.moderatedBy, filter.moderatedBy)
        : undefined,
    ].filter((filter) => filter !== undefined);

    // Determine sort order
    const sortField = sort?.field || "createdAt";
    const sortOrder = sort?.order || "desc";
    const orderBy =
      sortOrder === "asc"
        ? asc(moderationItems[sortField])
        : desc(moderationItems[sortField]);

    try {
      const [items, countResult] = await Promise.all([
        this.db
          .select()
          .from(moderationItems)
          .where(and(...filters))
          .orderBy(orderBy)
          .limit(limit)
          .offset(offset),
        this.db
          .select({ count: sql`count(*)` })
          .from(moderationItems)
          .where(and(...filters)),
      ]);

      return ok({
        items: items
          .map((item) => validate(moderationItemSchema, item).unwrapOr(null))
          .filter((item): item is ModerationItem => item !== null),
        count: Number(countResult[0]?.count || 0),
      });
    } catch (error) {
      return err(new RepositoryError("Failed to list moderation items", error));
    }
  }

  async countPending(): Promise<Result<number, RepositoryError>> {
    try {
      const result = await this.db
        .select({ count: sql`count(*)` })
        .from(moderationItems)
        .where(eq(moderationItems.status, "pending"));

      return ok(Number(result[0]?.count || 0));
    } catch (error) {
      return err(new RepositoryError("Failed to count pending items", error));
    }
  }

  async countOlderThan24Hours(): Promise<Result<number, RepositoryError>> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - 24);

      const result = await this.db
        .select({ count: sql`count(*)` })
        .from(moderationItems)
        .where(
          and(
            eq(moderationItems.status, "pending"),
            lt(moderationItems.createdAt, cutoffDate),
          ),
        );

      return ok(Number(result[0]?.count || 0));
    } catch (error) {
      return err(
        new RepositoryError("Failed to count old pending items", error),
      );
    }
  }
}
