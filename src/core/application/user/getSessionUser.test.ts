import type {
  Session,
  SessionId,
  User,
  UserId,
} from "@/core/domain/user/types";
import {
  ApplicationError,
  AuthenticationError,
  RepositoryError,
} from "@/lib/error";
import { err, ok } from "neverthrow";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Context } from "../context";
import { createMockContext } from "../testUtils/mockContext";
import { getSessionUser } from "./getSessionUser";

describe("getSessionUser", () => {
  let context: Context;

  const activeUser: User = {
    id: "user-1" as UserId,
    name: "Test User",
    email: "test@example.com",
    role: "editor",
    subscription: "basic",
    profilePhotoUrl: null,
    isActive: true,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  };

  const inactiveUser: User = {
    ...activeUser,
    id: "inactive-user" as UserId,
    isActive: false,
  };

  const validSession: Session = {
    id: "session-1" as SessionId,
    userId: activeUser.id,
    token: "valid-token",
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    lastActivityAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
    createdAt: new Date(),
  };

  const expiredSession: Session = {
    ...validSession,
    id: "expired-session" as SessionId,
    token: "expired-token",
    expiresAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
  };

  const oldActivitySession: Session = {
    ...validSession,
    id: "old-activity-session" as SessionId,
    token: "old-activity-token",
    lastActivityAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
  };

  beforeEach(() => {
    vi.clearAllMocks();

    context = createMockContext({
      userRepository: {
        findSessionByToken: async (token: string) => {
          if (token === "valid-token") return ok(validSession);
          if (token === "expired-token") return ok(expiredSession);
          if (token === "old-activity-token") return ok(oldActivitySession);
          return ok(null);
        },
        findById: async (id: UserId) => {
          if (id === activeUser.id) return ok(activeUser);
          if (id === inactiveUser.id) return ok(inactiveUser);
          return ok(null);
        },
        deleteSession: async () => ok(undefined),
        updateSessionActivity: async () => ok(undefined),
        // biome-ignore lint/suspicious/noExplicitAny: Mock context service for testing
      } as any,
    });
  });

  describe("Valid session handling", () => {
    it("should return user and session for valid token", async () => {
      const input = { sessionToken: "valid-token" };

      const result = await getSessionUser(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.user).toEqual(activeUser);
        expect(result.value.session).toEqual(validSession);
      }
    });

    it("should update session activity for old activity", async () => {
      let updateActivityCalled = false;

      context.userRepository = {
        ...context.userRepository,
        updateSessionActivity: async (sessionId: SessionId) => {
          updateActivityCalled = true;
          expect(sessionId).toBe(oldActivitySession.id);
          return ok(undefined);
        },
        // biome-ignore lint/suspicious/noExplicitAny: Mock context service for testing
      } as any;

      const input = { sessionToken: "old-activity-token" };

      const result = await getSessionUser(context, input);

      expect(result.isOk()).toBe(true);
      expect(updateActivityCalled).toBe(true);
    });

    it("should not update session activity for recent activity", async () => {
      let updateActivityCalled = false;

      context.userRepository = {
        ...context.userRepository,
        updateSessionActivity: async () => {
          updateActivityCalled = true;
          return ok(undefined);
        },
        // biome-ignore lint/suspicious/noExplicitAny: Mock context service for testing
      } as any;

      const input = { sessionToken: "valid-token" };

      const result = await getSessionUser(context, input);

      expect(result.isOk()).toBe(true);
      expect(updateActivityCalled).toBe(false);
    });
  });

  describe("Session validation", () => {
    it("should reject invalid session token", async () => {
      const input = { sessionToken: "invalid-token" };

      const result = await getSessionUser(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(AuthenticationError);
        expect(result.error.message).toBe("Invalid session token");
      }
    });

    it("should reject expired session and clean it up", async () => {
      let deleteSessionCalled = false;

      context.userRepository = {
        ...context.userRepository,
        deleteSession: async (sessionId: SessionId) => {
          deleteSessionCalled = true;
          expect(sessionId).toBe(expiredSession.id);
          return ok(undefined);
        },
        // biome-ignore lint/suspicious/noExplicitAny: Mock context service for testing
      } as any;

      const input = { sessionToken: "expired-token" };

      const result = await getSessionUser(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(AuthenticationError);
        expect(result.error.message).toBe("Session has expired");
      }
      expect(deleteSessionCalled).toBe(true);
    });
  });

  describe("User validation", () => {
    it("should reject inactive user", async () => {
      const inactiveUserSession: Session = {
        ...validSession,
        userId: inactiveUser.id,
        token: "inactive-user-token",
      };

      context.userRepository = {
        ...context.userRepository,
        findSessionByToken: async (token: string) => {
          if (token === "inactive-user-token") return ok(inactiveUserSession);
          return ok(null);
        },
        // biome-ignore lint/suspicious/noExplicitAny: Mock context service for testing
      } as any;

      const input = { sessionToken: "inactive-user-token" };

      const result = await getSessionUser(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(AuthenticationError);
        expect(result.error.message).toBe("User account is inactive");
      }
    });

    it("should handle user not found", async () => {
      const nonExistentUserSession: Session = {
        ...validSession,
        userId: "non-existent-user" as UserId,
        token: "non-existent-user-token",
      };

      context.userRepository = {
        ...context.userRepository,
        findSessionByToken: async (token: string) => {
          if (token === "non-existent-user-token")
            return ok(nonExistentUserSession);
          return ok(null);
        },
        // biome-ignore lint/suspicious/noExplicitAny: Mock context service for testing
      } as any;

      const input = { sessionToken: "non-existent-user-token" };

      const result = await getSessionUser(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(AuthenticationError);
        expect(result.error.message).toBe("User not found");
      }
    });
  });

  describe("Input validation", () => {
    it("should reject empty session token", async () => {
      const input = { sessionToken: "" };

      const result = await getSessionUser(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid session token input");
      }
    });

    it("should reject missing session token", async () => {
      // biome-ignore lint/suspicious/noExplicitAny: Testing invalid input requires type assertion
      const input = {} as any;

      const result = await getSessionUser(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid session token input");
      }
    });
  });

  describe("Error handling", () => {
    it("should handle session lookup failure", async () => {
      context.userRepository = {
        ...context.userRepository,
        findSessionByToken: async () =>
          err(new RepositoryError("Session lookup failed")),
        // biome-ignore lint/suspicious/noExplicitAny: Mock context service for testing
      } as any;

      const input = { sessionToken: "valid-token" };

      const result = await getSessionUser(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to find session");
      }
    });

    it("should handle user lookup failure", async () => {
      context.userRepository = {
        ...context.userRepository,
        findById: async () => err(new RepositoryError("User lookup failed")),
        // biome-ignore lint/suspicious/noExplicitAny: Mock context service for testing
      } as any;

      const input = { sessionToken: "valid-token" };

      const result = await getSessionUser(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to find user");
      }
    });

    it("should continue authentication if session activity update fails", async () => {
      // Mock console.warn to capture warning
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      context.userRepository = {
        ...context.userRepository,
        updateSessionActivity: async () =>
          err(new RepositoryError("Update failed")),
        // biome-ignore lint/suspicious/noExplicitAny: Mock context service for testing
      } as any;

      const input = { sessionToken: "old-activity-token" };

      const result = await getSessionUser(context, input);

      expect(result.isOk()).toBe(true);
      expect(warnSpy).toHaveBeenCalledWith(
        "Failed to update session activity:",
        expect.any(RepositoryError),
      );

      warnSpy.mockRestore();
    });

    it("should handle session deletion failure gracefully", async () => {
      context.userRepository = {
        ...context.userRepository,
        deleteSession: async () => err(new RepositoryError("Delete failed")),
        // biome-ignore lint/suspicious/noExplicitAny: Mock context service for testing
      } as any;

      const input = { sessionToken: "expired-token" };

      const result = await getSessionUser(context, input);

      // Should still reject expired session even if deletion fails
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(AuthenticationError);
        expect(result.error.message).toBe("Session has expired");
      }
    });
  });

  describe("Business logic validation", () => {
    it("should enforce complete authentication workflow", async () => {
      let sessionChecked = false;
      let userChecked = false;

      context.userRepository = {
        findSessionByToken: async (token: string) => {
          sessionChecked = true;
          if (token === "valid-token") return ok(validSession);
          return ok(null);
        },
        findById: async (id: UserId) => {
          userChecked = true;
          if (id === activeUser.id) return ok(activeUser);
          return ok(null);
        },
        deleteSession: async () => ok(undefined),
        updateSessionActivity: async () => ok(undefined),
        // biome-ignore lint/suspicious/noExplicitAny: Mock context service for testing
      } as any;

      const input = { sessionToken: "valid-token" };

      const result = await getSessionUser(context, input);

      expect(result.isOk()).toBe(true);
      expect(sessionChecked).toBe(true);
      expect(userChecked).toBe(true);
    });

    it("should validate session before accessing user", async () => {
      let sessionValidated = false;

      context.userRepository = {
        findSessionByToken: async (token: string) => {
          if (token === "expired-token") {
            sessionValidated = true;
            return ok(expiredSession);
          }
          return ok(null);
        },
        findById: async () => {
          // This should not be called for expired session
          throw new Error(
            "User lookup should not be called for expired session",
          );
        },
        deleteSession: async () => ok(undefined),
        updateSessionActivity: async () => ok(undefined),
        // biome-ignore lint/suspicious/noExplicitAny: Mock context service for testing
      } as any;

      const input = { sessionToken: "expired-token" };

      const result = await getSessionUser(context, input);

      expect(result.isErr()).toBe(true);
      expect(sessionValidated).toBe(true);
    });
  });
});
