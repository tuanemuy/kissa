import type { UserRepository } from "@/core/domain/user/ports/userRepository";
import type {
  CreateSessionParams,
  CreateUserParams,
  ListUsersQuery,
  Session,
  SessionId,
  UpdateUserParams,
  User,
  UserId,
} from "@/core/domain/user/types";
import { sessionSchema, userSchema } from "@/core/domain/user/types";
import { RepositoryError } from "@/lib/error";
import { validate } from "@/lib/validation";
import { and, asc, desc, eq, like, or, sql } from "drizzle-orm";
import { type Result, err, ok } from "neverthrow";
import { v7 as uuidv7 } from "uuid";
import type { Database } from "./database";
import { sessions, users } from "./schema";

export class DrizzleTursoUserRepository implements UserRepository {
  constructor(private readonly db: Database) {}

  async create(
    params: CreateUserParams & { hashedPassword: string },
  ): Promise<Result<User, RepositoryError>> {
    try {
      const result = await this.db
        .insert(users)
        .values({
          email: params.email,
          name: params.name,
          role: params.role,
          hashedPassword: params.hashedPassword,
          subscription: params.subscription || "free",
          profilePhotoUrl: params.profilePhotoUrl || null,
          isActive: true,
        })
        .returning();

      const user = result[0];
      if (!user) {
        return err(new RepositoryError("Failed to create user"));
      }

      const { hashedPassword, ...userWithoutPassword } = user;
      return validate(userSchema, userWithoutPassword).mapErr(
        (error) => new RepositoryError("Invalid user data", error),
      );
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("UNIQUE constraint")
      ) {
        return err(
          new RepositoryError("User with this email already exists", error),
        );
      }
      return err(new RepositoryError("Failed to create user", error));
    }
  }

  async findById(id: UserId): Promise<Result<User | null, RepositoryError>> {
    try {
      const result = await this.db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          role: users.role,
          subscription: users.subscription,
          profilePhotoUrl: users.profilePhotoUrl,
          isActive: users.isActive,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        })
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      const user = result[0];
      if (!user) {
        return ok(null);
      }

      return validate(userSchema, user).mapErr(
        (error) => new RepositoryError("Invalid user data", error),
      );
    } catch (error) {
      return err(new RepositoryError("Failed to find user", error));
    }
  }

  async findByEmail(
    email: string,
  ): Promise<Result<User | null, RepositoryError>> {
    try {
      const result = await this.db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          role: users.role,
          subscription: users.subscription,
          profilePhotoUrl: users.profilePhotoUrl,
          isActive: users.isActive,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      const user = result[0];
      if (!user) {
        return ok(null);
      }

      return validate(userSchema, user).mapErr(
        (error) => new RepositoryError("Invalid user data", error),
      );
    } catch (error) {
      return err(new RepositoryError("Failed to find user", error));
    }
  }

  async update(
    params: UpdateUserParams,
  ): Promise<Result<User, RepositoryError>> {
    try {
      const { id, ...updateFields } = params;
      const updateData = Object.fromEntries(
        Object.entries(updateFields).filter(
          ([_, value]) => value !== undefined,
        ),
      );

      const result = await this.db
        .update(users)
        .set(updateData)
        .where(eq(users.id, id))
        .returning();

      const user = result[0];
      if (!user) {
        return err(new RepositoryError("User not found"));
      }

      return validate(userSchema, user).mapErr(
        (error) => new RepositoryError("Invalid user data", error),
      );
    } catch (error) {
      return err(new RepositoryError("Failed to update user", error));
    }
  }

  async delete(id: UserId): Promise<Result<void, RepositoryError>> {
    try {
      await this.db.delete(users).where(eq(users.id, id));
      return ok(undefined);
    } catch (error) {
      return err(new RepositoryError("Failed to delete user", error));
    }
  }

  async list(
    query: ListUsersQuery,
  ): Promise<Result<{ items: User[]; count: number }, RepositoryError>> {
    const { pagination, filter, sort } = query;
    const limit = pagination.limit;
    const offset = (pagination.page - 1) * pagination.limit;

    const conditions = [];
    if (filter?.role) conditions.push(eq(users.role, filter.role));
    if (filter?.subscription)
      conditions.push(eq(users.subscription, filter.subscription));
    if (filter?.isActive !== undefined)
      conditions.push(eq(users.isActive, filter.isActive));
    if (filter?.search) {
      conditions.push(
        or(
          like(users.name, `%${filter.search}%`),
          like(users.email, `%${filter.search}%`),
        ),
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const orderByClause = sort
      ? sort.order === "asc"
        ? asc(users[sort.field])
        : desc(users[sort.field])
      : desc(users.createdAt);

    try {
      const [items, countResult] = await Promise.all([
        this.db
          .select({
            id: users.id,
            email: users.email,
            name: users.name,
            role: users.role,
            subscription: users.subscription,
            profilePhotoUrl: users.profilePhotoUrl,
            isActive: users.isActive,
            createdAt: users.createdAt,
            updatedAt: users.updatedAt,
          })
          .from(users)
          .where(whereClause)
          .orderBy(orderByClause)
          .limit(limit)
          .offset(offset),
        this.db
          .select({ count: sql`count(*)`.as("count") })
          .from(users)
          .where(whereClause),
      ]);

      const validatedItems = items
        .map((item) =>
          validate(userSchema, item)
            .mapErr((error) => new RepositoryError("Invalid user data", error))
            .unwrapOr(null),
        )
        .filter((item): item is User => item !== null);

      return ok({
        items: validatedItems,
        count: Number(countResult[0]?.count || 0),
      });
    } catch (error) {
      return err(new RepositoryError("Failed to list users", error));
    }
  }

  async getHashedPassword(
    userId: UserId,
  ): Promise<Result<string, RepositoryError>> {
    try {
      const result = await this.db
        .select({ hashedPassword: users.hashedPassword })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      const user = result[0];
      if (!user) {
        return err(new RepositoryError("User not found"));
      }

      return ok(user.hashedPassword);
    } catch (error) {
      return err(new RepositoryError("Failed to get hashed password", error));
    }
  }

  async updatePassword(
    userId: UserId,
    hashedPassword: string,
  ): Promise<Result<void, RepositoryError>> {
    try {
      const result = await this.db
        .update(users)
        .set({ hashedPassword })
        .where(eq(users.id, userId));

      return ok(undefined);
    } catch (error) {
      return err(new RepositoryError("Failed to update password", error));
    }
  }

  async createSession(
    params: CreateSessionParams & { token: string },
  ): Promise<Result<Session, RepositoryError>> {
    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + (params.expiresInHours || 24));

      const result = await this.db
        .insert(sessions)
        .values({
          userId: params.userId,
          token: params.token,
          expiresAt,
          lastActivityAt: new Date(),
        })
        .returning();

      const session = result[0];
      if (!session) {
        return err(new RepositoryError("Failed to create session"));
      }

      return validate(sessionSchema, session).mapErr(
        (error) => new RepositoryError("Invalid session data", error),
      );
    } catch (error) {
      return err(new RepositoryError("Failed to create session", error));
    }
  }

  async findSessionById(
    id: SessionId,
  ): Promise<Result<Session | null, RepositoryError>> {
    try {
      const result = await this.db
        .select()
        .from(sessions)
        .where(eq(sessions.id, id))
        .limit(1);

      const session = result[0];
      if (!session) {
        return ok(null);
      }

      return validate(sessionSchema, session).mapErr(
        (error) => new RepositoryError("Invalid session data", error),
      );
    } catch (error) {
      return err(new RepositoryError("Failed to find session", error));
    }
  }

  async findSessionByToken(
    token: string,
  ): Promise<Result<Session | null, RepositoryError>> {
    try {
      const result = await this.db
        .select()
        .from(sessions)
        .where(eq(sessions.token, token))
        .limit(1);

      const session = result[0];
      if (!session) {
        return ok(null);
      }

      return validate(sessionSchema, session).mapErr(
        (error) => new RepositoryError("Invalid session data", error),
      );
    } catch (error) {
      return err(new RepositoryError("Failed to find session", error));
    }
  }

  async updateSessionActivity(
    sessionId: SessionId,
  ): Promise<Result<Session, RepositoryError>> {
    try {
      const result = await this.db
        .update(sessions)
        .set({ lastActivityAt: new Date() })
        .where(eq(sessions.id, sessionId))
        .returning();

      const session = result[0];
      if (!session) {
        return err(new RepositoryError("Session not found"));
      }

      return validate(sessionSchema, session).mapErr(
        (error) => new RepositoryError("Invalid session data", error),
      );
    } catch (error) {
      return err(
        new RepositoryError("Failed to update session activity", error),
      );
    }
  }

  async deleteSession(id: SessionId): Promise<Result<void, RepositoryError>> {
    try {
      await this.db.delete(sessions).where(eq(sessions.id, id));
      return ok(undefined);
    } catch (error) {
      return err(new RepositoryError("Failed to delete session", error));
    }
  }

  async deleteExpiredSessions(): Promise<Result<number, RepositoryError>> {
    try {
      const result = await this.db
        .delete(sessions)
        .where(sql`${sessions.expiresAt} < datetime('now')`);

      return ok(0); // SQLite doesn't return row count easily
    } catch (error) {
      return err(
        new RepositoryError("Failed to delete expired sessions", error),
      );
    }
  }

  async deleteUserSessions(
    userId: UserId,
  ): Promise<Result<number, RepositoryError>> {
    try {
      const result = await this.db
        .delete(sessions)
        .where(eq(sessions.userId, userId));

      return ok(0); // SQLite doesn't return row count easily
    } catch (error) {
      return err(new RepositoryError("Failed to delete user sessions", error));
    }
  }
}
