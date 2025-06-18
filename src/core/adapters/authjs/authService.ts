import {
  AuthError,
  type AuthService,
} from "@/core/domain/user/ports/authService";
import type { UserRepository } from "@/core/domain/user/ports/userRepository";
import type { User, UserId } from "@/core/domain/user/types";
import { userIdSchema } from "@/core/domain/user/types";
import { auth, signIn, signOut } from "@/lib/authjs";
import { validate } from "@/lib/validation";
import { type Result, err, ok } from "neverthrow";

export class AuthJsAuthService implements AuthService {
  constructor(private readonly userRepository: UserRepository) {}

  async getCurrentUser(): Promise<Result<User | null, AuthError>> {
    try {
      const session = await auth();
      if (!session?.user?.id) {
        return ok(null);
      }

      const userIdResult = validate(userIdSchema, session.user.id);
      if (userIdResult.isErr()) {
        return err(new AuthError("Invalid user ID format"));
      }

      const userResult = await this.userRepository.findById(userIdResult.value);
      if (userResult.isErr()) {
        return err(new AuthError("Failed to fetch user", userResult.error));
      }

      return ok(userResult.value);
    } catch (error) {
      return err(new AuthError("Failed to get current user", error));
    }
  }

  async getCurrentUserId(): Promise<Result<UserId | null, AuthError>> {
    try {
      const session = await auth();
      if (!session?.user?.id) {
        return ok(null);
      }

      const userIdResult = validate(userIdSchema, session.user.id);
      if (userIdResult.isErr()) {
        return err(new AuthError("Invalid user ID format"));
      }

      return ok(userIdResult.value);
    } catch (error) {
      return err(new AuthError("Failed to get current user ID", error));
    }
  }

  async requireAuth(): Promise<Result<User, AuthError>> {
    const userResult = await this.getCurrentUser();
    if (userResult.isErr()) {
      return err(userResult.error);
    }

    if (!userResult.value) {
      return err(new AuthError("Authentication required"));
    }

    return ok(userResult.value);
  }

  async requireAuthUserId(): Promise<Result<UserId, AuthError>> {
    const userIdResult = await this.getCurrentUserId();
    if (userIdResult.isErr()) {
      return err(userIdResult.error);
    }

    if (!userIdResult.value) {
      return err(new AuthError("Authentication required"));
    }

    return ok(userIdResult.value);
  }

  async signIn(
    email: string,
    password: string,
  ): Promise<Result<User, AuthError>> {
    try {
      // Auth.js signIn with credentials
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (!result?.ok) {
        return err(new AuthError("Invalid credentials"));
      }

      // Get the user after successful sign in
      const userResult = await this.getCurrentUser();
      if (userResult.isErr()) {
        return err(userResult.error);
      }

      if (!userResult.value) {
        return err(new AuthError("Failed to get user after sign in"));
      }

      return ok(userResult.value);
    } catch (error) {
      return err(new AuthError("Sign in failed", error));
    }
  }

  async signOut(): Promise<Result<void, AuthError>> {
    try {
      await signOut({ redirect: false });
      return ok(undefined);
    } catch (error) {
      return err(new AuthError("Sign out failed", error));
    }
  }
}
