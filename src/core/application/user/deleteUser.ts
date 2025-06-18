import type { UserId } from "@/core/domain/user/types";
import { userIdSchema } from "@/core/domain/user/types";
import { ApplicationError } from "@/lib/error";
import { validate } from "@/lib/validation";
import type { Result } from "neverthrow";
import { err, ok } from "neverthrow";
import type { Context } from "../context";

export async function deleteUser(
  context: Context,
  userId: UserId,
): Promise<Result<void, ApplicationError>> {
  const validationResult = validate(userIdSchema, userId);

  if (validationResult.isErr()) {
    return err(new ApplicationError("Invalid user ID", validationResult.error));
  }

  const result = await context.userRepository.delete(userId);

  return result.mapErr(
    (error) => new ApplicationError("Failed to delete user", error),
  );
}
