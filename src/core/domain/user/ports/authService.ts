import type { Result } from "neverthrow";
import type { User, UserId } from "../types";

export interface AuthService {
  /**
   * Get the current authenticated user
   */
  getCurrentUser(): Promise<Result<User | null, AuthError>>;

  /**
   * Get the current authenticated user ID
   */
  getCurrentUserId(): Promise<Result<UserId | null, AuthError>>;

  /**
   * Require authentication and return the current user
   * Throws an error if not authenticated
   */
  requireAuth(): Promise<Result<User, AuthError>>;

  /**
   * Require authentication and return the current user ID
   * Throws an error if not authenticated
   */
  requireAuthUserId(): Promise<Result<UserId, AuthError>>;

  /**
   * Sign in a user
   */
  signIn(email: string, password: string): Promise<Result<User, AuthError>>;

  /**
   * Sign out the current user
   */
  signOut(): Promise<Result<void, AuthError>>;
}

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "AuthError";
  }
}
