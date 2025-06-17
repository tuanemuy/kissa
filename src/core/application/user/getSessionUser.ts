import type { Session, User } from "@/core/domain/user/types";
import { ApplicationError, AuthenticationError } from "@/lib/error";
import { validate } from "@/lib/validation";
import { type Result, err, ok } from "neverthrow";
import { z } from "zod";
import type { Context } from "../context";

export const getSessionUserInputSchema = z.object({
  sessionToken: z.string(),
});
export type GetSessionUserInput = z.infer<typeof getSessionUserInputSchema>;

export interface GetSessionUserResult {
  user: User;
  session: Session;
}

export async function getSessionUser(
  context: Context,
  input: GetSessionUserInput,
): Promise<
  Result<GetSessionUserResult, ApplicationError | AuthenticationError>
> {
  const parseResult = validate(getSessionUserInputSchema, input);
  if (parseResult.isErr()) {
    return err(
      new ApplicationError("Invalid session token input", parseResult.error),
    );
  }

  const { sessionToken } = parseResult.value;

  // Find session by token
  const sessionResult =
    await context.userRepository.findSessionByToken(sessionToken);
  if (sessionResult.isErr()) {
    return err(
      new ApplicationError("Failed to find session", sessionResult.error),
    );
  }

  const session = sessionResult.value;
  if (!session) {
    return err(new AuthenticationError("Invalid session token"));
  }

  // Check if session has expired
  if (session.expiresAt < new Date()) {
    // Clean up expired session
    await context.userRepository.deleteSession(session.id);
    return err(new AuthenticationError("Session has expired"));
  }

  // Check if session needs activity update (more than 1 hour since last activity)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  if (session.lastActivityAt < oneHourAgo) {
    // Update session activity
    const updateResult = await context.userRepository.updateSessionActivity(
      session.id,
    );
    if (updateResult.isErr()) {
      // Log warning but don't fail authentication
      console.warn("Failed to update session activity:", updateResult.error);
    }
  }

  // Get user
  const userResult = await context.userRepository.findById(session.userId);
  if (userResult.isErr()) {
    return err(new ApplicationError("Failed to find user", userResult.error));
  }

  const user = userResult.value;
  if (!user) {
    return err(new AuthenticationError("User not found"));
  }

  if (!user.isActive) {
    return err(new AuthenticationError("User account is inactive"));
  }

  return ok({
    user,
    session,
  });
}
