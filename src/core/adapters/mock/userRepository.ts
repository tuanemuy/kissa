import type { RepositoryError } from "@/lib/error";
import { RepositoryError as RepositoryErrorClass } from "@/lib/error";
import type { Result } from "neverthrow";
import { err, ok } from "neverthrow";
import type { UserRepository } from "../../domain/user/ports/userRepository";
import type {
  CreateSessionParams,
  CreateUserParams,
  ListUsersQuery,
  Session,
  SessionId,
  UpdateUserParams,
  User,
  UserId,
} from "../../domain/user/types";

export class MockUserRepository implements UserRepository {
  private users = new Map<UserId, User>();
  private hashedPasswords = new Map<UserId, string>();
  private sessions = new Map<SessionId, Session>();
  private shouldFailOperations = false;

  setShouldFailOperations(shouldFail: boolean): void {
    this.shouldFailOperations = shouldFail;
  }

  addUser(user: User, hashedPassword: string): void {
    this.users.set(user.id, user);
    this.hashedPasswords.set(user.id, hashedPassword);
  }

  addSession(session: Session): void {
    this.sessions.set(session.id, session);
  }

  clear(): void {
    this.users.clear();
    this.hashedPasswords.clear();
    this.sessions.clear();
  }

  async create(
    params: CreateUserParams & { hashedPassword: string },
  ): Promise<Result<User, RepositoryError>> {
    if (this.shouldFailOperations) {
      return err(new RepositoryErrorClass("Mock create failure"));
    }

    // Check for email conflicts
    for (const user of this.users.values()) {
      if (user.email === params.email) {
        return err(new RepositoryErrorClass("Email already exists"));
      }
    }

    const user: User = {
      id: `user-${Date.now()}` as UserId,
      name: params.name,
      email: params.email,
      role: params.role,
      subscription: params.subscription ?? "free",
      profilePhotoUrl: params.profilePhotoUrl ?? null,
      isActive: true,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.users.set(user.id, user);
    this.hashedPasswords.set(user.id, params.hashedPassword);

    return ok(user);
  }

  async findById(id: UserId): Promise<Result<User | null, RepositoryError>> {
    if (this.shouldFailOperations) {
      return err(new RepositoryErrorClass("Mock findById failure"));
    }

    return ok(this.users.get(id) ?? null);
  }

  async findByEmail(
    email: string,
  ): Promise<Result<User | null, RepositoryError>> {
    if (this.shouldFailOperations) {
      return err(new RepositoryErrorClass("Mock findByEmail failure"));
    }

    for (const user of this.users.values()) {
      if (user.email === email) {
        return ok(user);
      }
    }
    return ok(null);
  }

  async findByStripeCustomerId(
    customerId: string,
  ): Promise<Result<User | null, RepositoryError>> {
    if (this.shouldFailOperations) {
      return err(
        new RepositoryErrorClass("Mock findByStripeCustomerId failure"),
      );
    }

    for (const user of this.users.values()) {
      if (user.stripeCustomerId === customerId) {
        return ok(user);
      }
    }
    return ok(null);
  }

  async update(
    params: UpdateUserParams,
  ): Promise<Result<User, RepositoryError>> {
    if (this.shouldFailOperations) {
      return err(new RepositoryErrorClass("Mock update failure"));
    }

    const user = this.users.get(params.id);
    if (!user) {
      return err(new RepositoryErrorClass("User not found"));
    }

    const updatedUser: User = {
      ...user,
      ...(params.email && { email: params.email }),
      ...(params.name && { name: params.name }),
      ...(params.profilePhotoUrl !== undefined && {
        profilePhotoUrl: params.profilePhotoUrl,
      }),
      ...(params.subscription && { subscription: params.subscription }),
      ...(params.isActive !== undefined && { isActive: params.isActive }),
      ...(params.stripeCustomerId !== undefined && {
        stripeCustomerId: params.stripeCustomerId,
      }),
      ...(params.stripeSubscriptionId !== undefined && {
        stripeSubscriptionId: params.stripeSubscriptionId,
      }),
      updatedAt: new Date(),
    };

    this.users.set(params.id, updatedUser);
    return ok(updatedUser);
  }

  async delete(id: UserId): Promise<Result<void, RepositoryError>> {
    if (this.shouldFailOperations) {
      return err(new RepositoryErrorClass("Mock delete failure"));
    }

    this.users.delete(id);
    this.hashedPasswords.delete(id);

    // Delete all user sessions
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.userId === id) {
        this.sessions.delete(sessionId);
      }
    }

    return ok(undefined);
  }

  async list(
    query: ListUsersQuery,
  ): Promise<Result<{ items: User[]; count: number }, RepositoryError>> {
    if (this.shouldFailOperations) {
      return err(new RepositoryErrorClass("Mock list failure"));
    }

    let filteredUsers = Array.from(this.users.values());

    // Apply filters
    if (query.filter) {
      if (query.filter.role) {
        filteredUsers = filteredUsers.filter(
          (user) => user.role === query.filter?.role,
        );
      }
      if (query.filter.subscription) {
        filteredUsers = filteredUsers.filter(
          (user) => user.subscription === query.filter?.subscription,
        );
      }
      if (query.filter.isActive !== undefined) {
        filteredUsers = filteredUsers.filter(
          (user) => user.isActive === query.filter?.isActive,
        );
      }
      if (query.filter.search) {
        const searchTerm = query.filter.search.toLowerCase();
        filteredUsers = filteredUsers.filter(
          (user) =>
            user.name.toLowerCase().includes(searchTerm) ||
            user.email.toLowerCase().includes(searchTerm),
        );
      }
    }

    const totalCount = filteredUsers.length;

    // Apply pagination
    const offset = (query.pagination.page - 1) * query.pagination.limit;
    const paginatedUsers = filteredUsers.slice(
      offset,
      offset + query.pagination.limit,
    );

    return ok({ items: paginatedUsers, count: totalCount });
  }

  async getHashedPassword(
    userId: UserId,
  ): Promise<Result<string, RepositoryError>> {
    if (this.shouldFailOperations) {
      return err(new RepositoryErrorClass("Mock getHashedPassword failure"));
    }

    const hashedPassword = this.hashedPasswords.get(userId);
    if (!hashedPassword) {
      return err(new RepositoryErrorClass("Password not found"));
    }

    return ok(hashedPassword);
  }

  async updatePassword(
    userId: UserId,
    hashedPassword: string,
  ): Promise<Result<void, RepositoryError>> {
    if (this.shouldFailOperations) {
      return err(new RepositoryErrorClass("Mock updatePassword failure"));
    }

    if (!this.users.has(userId)) {
      return err(new RepositoryErrorClass("User not found"));
    }

    this.hashedPasswords.set(userId, hashedPassword);
    return ok(undefined);
  }

  async createSession(
    params: CreateSessionParams & { token: string },
  ): Promise<Result<Session, RepositoryError>> {
    if (this.shouldFailOperations) {
      return err(new RepositoryErrorClass("Mock createSession failure"));
    }

    if (!this.users.has(params.userId)) {
      return err(new RepositoryErrorClass("User not found"));
    }

    const session: Session = {
      id: `session-${Date.now()}` as SessionId,
      userId: params.userId,
      token: params.token,
      expiresAt: new Date(Date.now() + params.expiresInHours * 60 * 60 * 1000),
      lastActivityAt: new Date(),
      createdAt: new Date(),
    };

    this.sessions.set(session.id, session);
    return ok(session);
  }

  async findSessionById(
    id: SessionId,
  ): Promise<Result<Session | null, RepositoryError>> {
    if (this.shouldFailOperations) {
      return err(new RepositoryErrorClass("Mock findSessionById failure"));
    }

    return ok(this.sessions.get(id) ?? null);
  }

  async findSessionByToken(
    token: string,
  ): Promise<Result<Session | null, RepositoryError>> {
    if (this.shouldFailOperations) {
      return err(new RepositoryErrorClass("Mock findSessionByToken failure"));
    }

    for (const session of this.sessions.values()) {
      if (session.token === token) {
        return ok(session);
      }
    }
    return ok(null);
  }

  async updateSessionActivity(
    sessionId: SessionId,
  ): Promise<Result<Session, RepositoryError>> {
    if (this.shouldFailOperations) {
      return err(
        new RepositoryErrorClass("Mock updateSessionActivity failure"),
      );
    }

    const session = this.sessions.get(sessionId);
    if (!session) {
      return err(new RepositoryErrorClass("Session not found"));
    }

    const updatedSession: Session = {
      ...session,
      lastActivityAt: new Date(),
    };

    this.sessions.set(sessionId, updatedSession);
    return ok(updatedSession);
  }

  async deleteSession(id: SessionId): Promise<Result<void, RepositoryError>> {
    if (this.shouldFailOperations) {
      return err(new RepositoryErrorClass("Mock deleteSession failure"));
    }

    this.sessions.delete(id);
    return ok(undefined);
  }

  async deleteExpiredSessions(): Promise<Result<number, RepositoryError>> {
    if (this.shouldFailOperations) {
      return err(
        new RepositoryErrorClass("Mock deleteExpiredSessions failure"),
      );
    }

    const now = new Date();
    let deletedCount = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.expiresAt < now) {
        this.sessions.delete(sessionId);
        deletedCount++;
      }
    }

    return ok(deletedCount);
  }

  async deleteUserSessions(
    userId: UserId,
  ): Promise<Result<number, RepositoryError>> {
    if (this.shouldFailOperations) {
      return err(new RepositoryErrorClass("Mock deleteUserSessions failure"));
    }

    let deletedCount = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.userId === userId) {
        this.sessions.delete(sessionId);
        deletedCount++;
      }
    }

    return ok(deletedCount);
  }
}
