import type { RepositoryError } from "@/lib/error";
import type { Result } from "neverthrow";
import type { UserId } from "../../user/types";
import type {
  BillingEvent,
  BillingEventId,
  CreateBillingEventParams,
  ListBillingEventsQuery,
  UpdateBillingEventStatusParams,
} from "../types";

export interface BillingRepository {
  create(
    params: CreateBillingEventParams,
  ): Promise<Result<BillingEvent, RepositoryError>>;
  findById(
    id: BillingEventId,
  ): Promise<Result<BillingEvent | null, RepositoryError>>;
  updateStatus(
    params: UpdateBillingEventStatusParams,
  ): Promise<Result<BillingEvent, RepositoryError>>;
  list(
    query: ListBillingEventsQuery,
  ): Promise<Result<{ items: BillingEvent[]; count: number }, RepositoryError>>;

  // User billing history
  findLatestByUser(
    userId: UserId,
  ): Promise<Result<BillingEvent | null, RepositoryError>>;
  calculateTotalSpent(
    userId: UserId,
    fromDate?: Date,
    toDate?: Date,
  ): Promise<Result<number, RepositoryError>>;
}
