import type { UpdateUserParams, User } from "@/core/domain/user/types";
import { updateUserParamsSchema } from "@/core/domain/user/types";
import { ApplicationError } from "@/lib/error";
import { validate } from "@/lib/validation";
import type { Result } from "neverthrow";
import { err, ok } from "neverthrow";
import type { Context } from "../context";

export async function updateUser(
  context: Context,
  params: UpdateUserParams,
): Promise<Result<User, ApplicationError>> {
  const validationResult = validate(updateUserParamsSchema, params);

  if (validationResult.isErr()) {
    return err(
      new ApplicationError(
        "Invalid user update parameters",
        validationResult.error,
      ),
    );
  }

  const result = await context.userRepository.update(params);

  return result.mapErr(
    (error) => new ApplicationError("Failed to update user", error),
  );
}
