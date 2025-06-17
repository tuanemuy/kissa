import type { User } from "@/core/domain/user/types";
import { createUserParamsSchema } from "@/core/domain/user/types";
import { ApplicationError } from "@/lib/error";
import { validate } from "@/lib/validation";
import { type Result, err, ok } from "neverthrow";
import type { z } from "zod";
import type { Context } from "../context";

export const createUserInputSchema = createUserParamsSchema;
export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export async function createUser(
  context: Context,
  input: CreateUserInput,
): Promise<Result<User, ApplicationError>> {
  const parseResult = validate(createUserInputSchema, input);
  if (parseResult.isErr()) {
    return err(new ApplicationError("Invalid user input", parseResult.error));
  }

  const params = parseResult.value;

  // Hash the password
  let hashedPassword: string;
  try {
    hashedPassword = await context.passwordHasher.hash(params.password);
  } catch (error) {
    return err(new ApplicationError("Failed to hash password", error));
  }

  // Create user
  const createResult = await context.userRepository.create({
    name: params.name,
    email: params.email,
    role: params.role,
    subscription: params.subscription ?? "free",
    password: params.password, // Still needed for interface compatibility
    profilePhotoUrl: params.profilePhotoUrl,
    hashedPassword,
  });

  return createResult.mapErr(
    (error) => new ApplicationError("Failed to create user", error),
  );
}
