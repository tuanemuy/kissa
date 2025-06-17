import type { Session, User } from "@/core/domain/user/types";
import { authenticateUserParamsSchema } from "@/core/domain/user/types";
import { ApplicationError, AuthenticationError } from "@/lib/error";
import { validate } from "@/lib/validation";
import { type Result, err, ok } from "neverthrow";
import { v7 as uuidv7 } from "uuid";
import type { z } from "zod/v4";
import type { Context } from "../context";

export const authenticateUserInputSchema = authenticateUserParamsSchema;
export type AuthenticateUserInput = z.infer<typeof authenticateUserInputSchema>;

export interface AuthenticateUserResult {
  user: User;
  session: Session;
}

export async function authenticateUser(
  context: Context,
  input: AuthenticateUserInput,
): Promise<
  Result<AuthenticateUserResult, ApplicationError | AuthenticationError>
> {
  const parseResult = validate(authenticateUserInputSchema, input);
  if (parseResult.isErr()) {
    return err(
      new ApplicationError("Invalid authentication input", parseResult.error),
    );
  }

  const { email, password } = parseResult.value;

  // Find user by email
  const userResult = await context.userRepository.findByEmail(email);
  if (userResult.isErr()) {
    return err(new ApplicationError("Failed to find user", userResult.error));
  }

  const user = userResult.value;
  if (!user) {
    return err(new AuthenticationError("Invalid credentials"));
  }

  if (!user.isActive) {
    return err(new AuthenticationError("User account is inactive"));
  }

  // Get hashed password
  const hashedPasswordResult = await context.userRepository.getHashedPassword(
    user.id,
  );
  if (hashedPasswordResult.isErr()) {
    return err(
      new ApplicationError(
        "Failed to get user password",
        hashedPasswordResult.error,
      ),
    );
  }

  const hashedPassword = hashedPasswordResult.value;

  // Verify password
  const isPasswordValid = await context.passwordHasher
    .verify(password, hashedPassword)
    .catch(() => false);

  if (!isPasswordValid) {
    return err(new AuthenticationError("Invalid credentials"));
  }

  // Create session
  const sessionToken = uuidv7();
  const sessionResult = await context.userRepository.createSession({
    userId: user.id,
    token: sessionToken,
    expiresInHours: 24,
  });

  if (sessionResult.isErr()) {
    return err(
      new ApplicationError("Failed to create session", sessionResult.error),
    );
  }

  return ok({
    user,
    session: sessionResult.value,
  });
}
