import type { BillingRepository } from "@/core/domain/billing/ports/billingRepository";
import type {
  BillingEvent,
  BillingEventId,
  CreateBillingEventParams,
  ListBillingEventsQuery,
  UpdateBillingEventStatusParams,
} from "@/core/domain/billing/types";
import { billingEventSchema } from "@/core/domain/billing/types";
import type { UserId } from "@/core/domain/user/types";
import { RepositoryError } from "@/lib/error";
import { validate } from "@/lib/validation";
import { and, desc, eq, gte, lte, sql, sum } from "drizzle-orm";
import { type Result, err, ok } from "neverthrow";
import { v7 as uuidv7 } from "uuid";
import type { Database } from "./client";
import { billingEvents } from "./schema";

export class DrizzleTursoBillingRepository implements BillingRepository {
  constructor(private readonly db: Database) {}

  async create(
    params: CreateBillingEventParams,
  ): Promise<Result<BillingEvent, RepositoryError>> {
    try {
      const billingEventId = uuidv7();
      const result = await this.db
        .insert(billingEvents)
        .values({
          id: billingEventId,
          userId: params.userId,
          type: params.type,
          fromPlan: params.fromPlan || null,
          toPlan: params.toPlan || null,
          amount: params.amount || null,
          currency: params.currency || "USD",
          stripePaymentId: params.stripePaymentId || null,
          status: params.status || "pending",
          createdAt: new Date(),
        })
        .returning();

      const billingEvent = result[0];
      if (!billingEvent) {
        return err(new RepositoryError("Failed to create billing event"));
      }

      return validate(billingEventSchema, billingEvent).mapErr((error) => {
        return new RepositoryError("Invalid billing event data", error);
      });
    } catch (error) {
      return err(new RepositoryError("Failed to create billing event", error));
    }
  }

  async findById(
    id: BillingEventId,
  ): Promise<Result<BillingEvent | null, RepositoryError>> {
    try {
      const result = await this.db
        .select()
        .from(billingEvents)
        .where(eq(billingEvents.id, id))
        .limit(1);

      const billingEvent = result[0];
      if (!billingEvent) {
        return ok(null);
      }

      return validate(billingEventSchema, billingEvent)
        .map((event) => event as BillingEvent | null)
        .mapErr((error) => {
          return new RepositoryError("Invalid billing event data", error);
        });
    } catch (error) {
      return err(new RepositoryError("Failed to find billing event", error));
    }
  }

  async updateStatus(
    params: UpdateBillingEventStatusParams,
  ): Promise<Result<BillingEvent, RepositoryError>> {
    try {
      const result = await this.db
        .update(billingEvents)
        .set({
          status: params.status,
          stripePaymentId: params.stripePaymentId,
        })
        .where(eq(billingEvents.id, params.id))
        .returning();

      const billingEvent = result[0];
      if (!billingEvent) {
        return err(new RepositoryError("Billing event not found"));
      }

      return validate(billingEventSchema, billingEvent).mapErr((error) => {
        return new RepositoryError("Invalid billing event data", error);
      });
    } catch (error) {
      return err(new RepositoryError("Failed to update billing event", error));
    }
  }

  async list(
    query: ListBillingEventsQuery,
  ): Promise<
    Result<{ items: BillingEvent[]; count: number }, RepositoryError>
  > {
    const { pagination, filter } = query;
    const limit = pagination.limit;
    const offset = (pagination.page - 1) * pagination.limit;

    const filters = [
      filter?.userId ? eq(billingEvents.userId, filter.userId) : undefined,
      filter?.type ? eq(billingEvents.type, filter.type) : undefined,
      filter?.status ? eq(billingEvents.status, filter.status) : undefined,
      filter?.fromDate
        ? gte(billingEvents.createdAt, filter.fromDate)
        : undefined,
      filter?.toDate ? lte(billingEvents.createdAt, filter.toDate) : undefined,
    ].filter((filter) => filter !== undefined);

    try {
      const [items, countResult] = await Promise.all([
        this.db
          .select()
          .from(billingEvents)
          .where(and(...filters))
          .orderBy(desc(billingEvents.createdAt))
          .limit(limit)
          .offset(offset),
        this.db
          .select({ count: sql`count(*)` })
          .from(billingEvents)
          .where(and(...filters)),
      ]);

      return ok({
        items: items
          .map((item) => validate(billingEventSchema, item).unwrapOr(null))
          .filter((item): item is BillingEvent => item !== null),
        count: Number(countResult[0]?.count || 0),
      });
    } catch (error) {
      return err(new RepositoryError("Failed to list billing events", error));
    }
  }

  async findLatestByUser(
    userId: UserId,
  ): Promise<Result<BillingEvent | null, RepositoryError>> {
    try {
      const result = await this.db
        .select()
        .from(billingEvents)
        .where(eq(billingEvents.userId, userId))
        .orderBy(desc(billingEvents.createdAt))
        .limit(1);

      const billingEvent = result[0];
      if (!billingEvent) {
        return ok(null);
      }

      return validate(billingEventSchema, billingEvent)
        .map((event) => event as BillingEvent | null)
        .mapErr((error) => {
          return new RepositoryError("Invalid billing event data", error);
        });
    } catch (error) {
      return err(
        new RepositoryError("Failed to find latest billing event", error),
      );
    }
  }

  async calculateTotalSpent(
    userId: UserId,
    fromDate?: Date,
    toDate?: Date,
  ): Promise<Result<number, RepositoryError>> {
    const filters = [
      eq(billingEvents.userId, userId),
      eq(billingEvents.status, "completed"),
      eq(billingEvents.type, "payment"),
      fromDate ? gte(billingEvents.createdAt, fromDate) : undefined,
      toDate ? lte(billingEvents.createdAt, toDate) : undefined,
    ].filter((filter) => filter !== undefined);

    try {
      const result = await this.db
        .select({ total: sum(billingEvents.amount) })
        .from(billingEvents)
        .where(and(...filters));

      const total = result[0]?.total || 0;
      return ok(Number(total));
    } catch (error) {
      return err(new RepositoryError("Failed to calculate total spent", error));
    }
  }
}
