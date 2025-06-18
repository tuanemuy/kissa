import type { RepositoryError } from "@/lib/error";
import type { Result } from "neverthrow";
import type {
  CreateSessionParams,
  CreateUserParams,
  ListUsersQuery,
  Session,
  SessionId,
  UpdateUserParams,
  User,
  UserId,
} from "../types";

export interface UserRepository {
  // User operations
  create(
    params: CreateUserParams & { hashedPassword: string },
  ): Promise<Result<User, RepositoryError>>;
  findById(id: UserId): Promise<Result<User | null, RepositoryError>>;
  findByEmail(email: string): Promise<Result<User | null, RepositoryError>>;
  findByStripeCustomerId(
    customerId: string,
  ): Promise<Result<User | null, RepositoryError>>;
  update(params: UpdateUserParams): Promise<Result<User, RepositoryError>>;
  delete(id: UserId): Promise<Result<void, RepositoryError>>;
  list(
    query: ListUsersQuery,
  ): Promise<Result<{ items: User[]; count: number }, RepositoryError>>;

  // Password operations
  getHashedPassword(userId: UserId): Promise<Result<string, RepositoryError>>;
  updatePassword(
    userId: UserId,
    hashedPassword: string,
  ): Promise<Result<void, RepositoryError>>;

  // Session operations
  createSession(
    params: CreateSessionParams & { token: string },
  ): Promise<Result<Session, RepositoryError>>;
  findSessionById(
    id: SessionId,
  ): Promise<Result<Session | null, RepositoryError>>;
  findSessionByToken(
    token: string,
  ): Promise<Result<Session | null, RepositoryError>>;
  updateSessionActivity(
    sessionId: SessionId,
  ): Promise<Result<Session, RepositoryError>>;
  deleteSession(id: SessionId): Promise<Result<void, RepositoryError>>;
  deleteExpiredSessions(): Promise<Result<number, RepositoryError>>;
  deleteUserSessions(userId: UserId): Promise<Result<number, RepositoryError>>;
}
