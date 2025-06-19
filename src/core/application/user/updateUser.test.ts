import type { User, UserId } from "@/core/domain/user/types";
import { ApplicationError, AuthorizationError } from "@/lib/error";
import { RepositoryError } from "@/lib/error";
import { err, ok } from "neverthrow";
import { beforeEach, describe, expect, it } from "vitest";
import type { Context } from "../context";
import { updateUser } from "./updateUser";

describe("updateUser", () => {
  let context: Context;

  const targetUser: User = {
    id: "target-user" as UserId,
    name: "Target User",
    email: "target@example.com",
    role: "visitor",
    subscription: "free",
    profilePhotoUrl: null,
    isActive: true,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const adminUser: User = {
    id: "admin-user" as UserId,
    name: "Admin User",
    email: "admin@example.com",
    role: "admin",
    subscription: "free",
    profilePhotoUrl: null,
    isActive: true,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const updatedUser: User = {
    ...targetUser,
    name: "Updated User",
    email: "updated@example.com",
    updatedAt: new Date(),
  };

  beforeEach(() => {
    context = {
      userRepository: {
        findById: async (id: string) => {
          if (id === targetUser.id) return ok(targetUser);
          if (id === adminUser.id) return ok(adminUser);
          return ok(null);
        },
        update: async () => ok(updatedUser),
      } as Partial<typeof context.userRepository>,
    } as Context;
  });

  describe("SPEC: User update constraints from formal specifications", () => {
    it("should allow user to update their own profile", async () => {
      const input = {
        name: "Updated Name",
        email: "updated@example.com",
      };

      const result = await updateUser(
        context,
        targetUser.id,
        targetUser.id,
        input,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const user = result.value;
        expect(user.name).toBe("Updated User"); // Mock returns fixed data
        expect(user.updatedAt).toBeInstanceOf(Date);
      }
    });

    it("should allow admin to update any user", async () => {
      const input = {
        name: "Admin Updated Name",
        role: "editor" as const,
      };

      const result = await updateUser(
        context,
        adminUser.id,
        targetUser.id,
        input,
      );

      expect(result.isOk()).toBe(true);
    });

    it("should reject non-admin updating other users", async () => {
      const otherUser: User = {
        ...targetUser,
        id: "other-user" as UserId,
        role: "visitor",
      };

      context.userRepository = {
        findById: async (id: string) => {
          if (id === otherUser.id) return ok(otherUser);
          if (id === targetUser.id) return ok(targetUser);
          return ok(null);
        },
        update: async () => ok(updatedUser),
      } as Partial<typeof context.userRepository>;

      const input = {
        name: "Should Fail",
      };

      const result = await updateUser(
        context,
        otherUser.id,
        targetUser.id,
        input,
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(AuthorizationError);
        expect(result.error.message).toBe("Not authorized to update this user");
      }
    });
  });

  describe("TLA+ behavior validation", () => {
    it("should follow user state updates from TLA+ specification", async () => {
      // Following UpdateUserProfile action in TLA+
      const input = {
        name: "TLA Updated Name",
        profilePhotoUrl: "https://example.com/photo.jpg",
      };

      const result = await updateUser(
        context,
        targetUser.id,
        targetUser.id,
        input,
      );

      expect(result.isOk()).toBe(true);
    });
  });

  describe("Input validation", () => {
    it("should reject invalid input - empty name", async () => {
      const input = {
        name: "",
        email: "valid@example.com",
      };

      const result = await updateUser(
        context,
        targetUser.id,
        targetUser.id,
        input as never,
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid user input");
      }
    });

    it("should reject invalid email format", async () => {
      const input = {
        name: "Valid Name",
        email: "invalid-email",
      };

      const result = await updateUser(
        context,
        targetUser.id,
        targetUser.id,
        input as never,
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid user input");
      }
    });
  });

  describe("Error handling", () => {
    it("should handle user not found", async () => {
      const input = {
        name: "Test Name",
      };

      const result = await updateUser(
        context,
        "non-existent" as UserId,
        "non-existent" as UserId,
        input,
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("User not found");
      }
    });

    it("should handle target user not found", async () => {
      const input = {
        name: "Test Name",
      };

      const result = await updateUser(
        context,
        adminUser.id,
        "non-existent" as UserId,
        input,
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Target user not found");
      }
    });

    it("should handle repository failure", async () => {
      // biome-ignore lint/suspicious/noExplicitAny: Testing error handling requires type assertion
      const mockUserRepository = context.userRepository as any;
      mockUserRepository.update = async () =>
        err(new RepositoryError("Update failed"));

      const input = {
        name: "Test Name",
      };

      const result = await updateUser(
        context,
        targetUser.id,
        targetUser.id,
        input,
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to update user");
      }
    });
  });

  describe("Role updates", () => {
    it("should allow admin to change user role", async () => {
      const input = {
        role: "editor" as const,
      };

      const result = await updateUser(
        context,
        adminUser.id,
        targetUser.id,
        input,
      );

      expect(result.isOk()).toBe(true);
    });

    it("should reject non-admin role changes", async () => {
      const input = {
        role: "admin" as const,
      };

      const result = await updateUser(
        context,
        targetUser.id,
        targetUser.id,
        input,
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(AuthorizationError);
        expect(result.error.message).toBe("Not authorized to change user role");
      }
    });
  });

  describe("Subscription updates", () => {
    it("should allow subscription changes for editors", async () => {
      const editorUser: User = {
        ...targetUser,
        role: "editor",
        subscription: "basic",
      };

      context.userRepository = {
        findById: async (id: string) => {
          if (id === editorUser.id) return ok(editorUser);
          return ok(null);
        },
        update: async () => ok({ ...editorUser, subscription: "premium" }),
      } as Partial<typeof context.userRepository>;

      const input = {
        subscription: "premium" as const,
      };

      const result = await updateUser(
        context,
        editorUser.id,
        editorUser.id,
        input,
      );

      expect(result.isOk()).toBe(true);
    });
  });
});
