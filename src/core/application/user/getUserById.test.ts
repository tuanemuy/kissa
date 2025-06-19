import type { User, UserId } from "@/core/domain/user/types";
import { ApplicationError } from "@/lib/error";
import { RepositoryError } from "@/lib/error";
import { err, ok } from "neverthrow";
import { beforeEach, describe, expect, it } from "vitest";
import type { Context } from "../context";
import { getUserById } from "./getUserById";

describe("getUserById", () => {
  let context: Context;

  const testUser: User = {
    id: "test-user-id" as UserId,
    name: "Test User",
    email: "test@example.com",
    role: "visitor",
    subscription: "free",
    profilePhotoUrl: null,
    isActive: true,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    context = {
      userRepository: {
        findById: async (id: string) => {
          if (id === testUser.id) return ok(testUser);
          return ok(null);
        },
      } as Partial<typeof context.userRepository>,
    } as Context;
  });

  describe("SPEC: User retrieval constraints from formal specifications", () => {
    it("should retrieve existing user by ID", async () => {
      const result = await getUserById(context, testUser.id);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const user = result.value;
        expect(user.id).toBe(testUser.id);
        expect(user.name).toBe(testUser.name);
        expect(user.email).toBe(testUser.email);
        expect(user.role).toBe(testUser.role);
        expect(user.isActive).toBe(true);
      }
    });

    it("should return null for non-existent user", async () => {
      const result = await getUserById(context, "non-existent" as UserId);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBeNull();
      }
    });
  });

  describe("Input validation", () => {
    it("should reject invalid user ID format", async () => {
      const result = await getUserById(context, "" as UserId);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid user ID");
      }
    });
  });

  describe("Error handling", () => {
    it("should handle repository failure", async () => {
      // biome-ignore lint/suspicious/noExplicitAny: Testing error handling requires type assertion
      const mockUserRepository = context.userRepository as any;
      mockUserRepository.findById = async () =>
        err(new RepositoryError("Database error"));

      const result = await getUserById(context, testUser.id);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to get user");
      }
    });
  });

  describe("User role validation", () => {
    it("should handle editor user", async () => {
      const editorUser: User = {
        ...testUser,
        id: "editor-user" as UserId,
        role: "editor",
        subscription: "basic",
      };

      context.userRepository = {
        findById: async (id: string) => {
          if (id === editorUser.id) return ok(editorUser);
          return ok(null);
        },
      } as Partial<typeof context.userRepository>;

      const result = await getUserById(context, editorUser.id);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const user = result.value;
        expect(user?.role).toBe("editor");
        expect(user?.subscription).toBe("basic");
      }
    });

    it("should handle admin user", async () => {
      const adminUser: User = {
        ...testUser,
        id: "admin-user" as UserId,
        role: "admin",
        subscription: "free",
      };

      context.userRepository = {
        findById: async (id: string) => {
          if (id === adminUser.id) return ok(adminUser);
          return ok(null);
        },
      } as Partial<typeof context.userRepository>;

      const result = await getUserById(context, adminUser.id);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const user = result.value;
        expect(user?.role).toBe("admin");
        expect(user?.subscription).toBe("free");
      }
    });
  });
});
