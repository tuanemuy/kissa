import type { ListUsersQuery, User } from "@/core/domain/user/types";
import { listUsersQuerySchema } from "@/core/domain/user/types";
import { ApplicationError } from "@/lib/error";
import { validate } from "@/lib/validation";
import type { Result } from "neverthrow";
import { err, ok } from "neverthrow";
import type { Context } from "../context";

export async function listUsers(
  context: Context,
  query: ListUsersQuery,
): Promise<Result<{ items: User[]; count: number }, ApplicationError>> {
  const validationResult = validate(listUsersQuerySchema, query);

  if (validationResult.isErr()) {
    return err(
      new ApplicationError("Invalid query parameters", validationResult.error),
    );
  }

  const result = await context.userRepository.list(query);

  return result.mapErr(
    (error) => new ApplicationError("Failed to list users", error),
  );
}
