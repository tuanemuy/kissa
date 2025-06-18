import type { User, UserId } from "@/core/domain/user/types";
import { userIdSchema } from "@/core/domain/user/types";
import { ApplicationError } from "@/lib/error";
import { validate } from "@/lib/validation";
import type { Result } from "neverthrow";
import { err, ok } from "neverthrow";
import type { Context } from "../context";

export async function getUserById(
  context: Context,
  userId: UserId,
): Promise<Result<User, ApplicationError>> {
  const validationResult = validate(userIdSchema, userId);

  if (validationResult.isErr()) {
    return err(new ApplicationError("Invalid user ID", validationResult.error));
  }

  const result = await context.userRepository.findById(userId);

  if (result.isErr()) {
    return err(new ApplicationError("Failed to get user", result.error));
  }

  if (!result.value) {
    return err(new ApplicationError("User not found"));
  }

  return ok(result.value);
}
