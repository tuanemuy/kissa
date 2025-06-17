import type { RepositoryError } from "@/lib/error";
import type { Result } from "neverthrow";
import type {
  CreateModerationItemParams,
  ListModerationItemsQuery,
  ModerateContentParams,
  ModerationItem,
  ModerationItemId,
} from "../types";

export interface ModerationRepository {
  create(
    params: CreateModerationItemParams,
  ): Promise<Result<ModerationItem, RepositoryError>>;
  findById(
    id: ModerationItemId,
  ): Promise<Result<ModerationItem | null, RepositoryError>>;
  findByContent(
    contentType: string,
    contentId: string,
  ): Promise<Result<ModerationItem | null, RepositoryError>>;
  moderate(
    params: ModerateContentParams,
  ): Promise<Result<ModerationItem, RepositoryError>>;
  list(
    query: ListModerationItemsQuery,
  ): Promise<
    Result<{ items: ModerationItem[]; count: number }, RepositoryError>
  >;

  // Statistics
  countPending(): Promise<Result<number, RepositoryError>>;
  countOlderThan24Hours(): Promise<Result<number, RepositoryError>>;
}
