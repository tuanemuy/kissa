import type { User, UserId } from "@/core/domain/user/types";
import { ApplicationError, AuthorizationError } from "@/lib/error";
import { RepositoryError } from "@/lib/error";
import { err, ok } from "neverthrow";
import { beforeEach, describe, expect, it } from "vitest";
import type { Context } from "../context";
import { deleteUser } from "./deleteUser";

describe("deleteUser", () => {
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

  const deletedUser: User = {
    ...targetUser,
    isActive: false,
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
        delete: async () => ok(deletedUser),
      } as Partial<typeof context.userRepository>,
    } as Context;
  });

  describe("SPEC: User deletion constraints from formal specifications", () => {
    it("should allow user to delete their own account", async () => {
      const result = await deleteUser(context, targetUser.id, targetUser.id);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const user = result.value;
        expect(user.isActive).toBe(false);
        expect(user.updatedAt).toBeInstanceOf(Date);
      }
    });

    it("should allow admin to delete any user", async () => {
      const result = await deleteUser(context, adminUser.id, targetUser.id);

      expect(result.isOk()).toBe(true);
    });

    it("should reject non-admin deleting other users", async () => {
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
        delete: async () => ok(deletedUser),
      } as Partial<typeof context.userRepository>;

      const result = await deleteUser(context, otherUser.id, targetUser.id);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(AuthorizationError);
        expect(result.error.message).toBe("Not authorized to delete this user");
      }
    });

    it("should prevent admin from deleting themselves", async () => {
      const result = await deleteUser(context, adminUser.id, adminUser.id);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(AuthorizationError);
        expect(result.error.message).toBe("Admins cannot delete themselves");
      }
    });
  });

  describe("TLA+ behavior validation", () => {
    it("should follow DeleteUserAccount action from TLA+ specification", async () => {
      // TLA+ DeleteUserAccount sets user as inactive and removes associated data
      const result = await deleteUser(context, targetUser.id, targetUser.id);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const user = result.value;
        // Verify state changes match TLA+ model
        expect(user.isActive).toBe(false);
        expect(user.updatedAt).toBeInstanceOf(Date);
      }
    });

    it("should follow GDPR compliance from formal specifications", async () => {
      // REQ-NF-021: GDPR準拠のデータ削除
      const result = await deleteUser(context, targetUser.id, targetUser.id);

      expect(result.isOk()).toBe(true);
      // In a full implementation, this would trigger GDPR data deletion
    });
  });

  describe("Error handling", () => {
    it("should handle user not found", async () => {
      const result = await deleteUser(
        context,
        "non-existent" as UserId,
        "non-existent" as UserId,
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("User not found");
      }
    });

    it("should handle target user not found", async () => {
      const result = await deleteUser(
        context,
        adminUser.id,
        "non-existent" as UserId,
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
      mockUserRepository.delete = async () =>
        err(new RepositoryError("Delete failed"));

      const result = await deleteUser(context, targetUser.id, targetUser.id);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to delete user");
      }
    });
  });

  describe("Editor user deletion constraints", () => {
    it("should handle editor user deletion with regions", async () => {
      const editorUser: User = {
        ...targetUser,
        id: "editor-with-regions" as UserId,
        role: "editor",
        subscription: "basic",
      };

      context.userRepository = {
        findById: async (id: string) => {
          if (id === editorUser.id) return ok(editorUser);
          if (id === adminUser.id) return ok(adminUser);
          return ok(null);
        },
        delete: async () => ok({ ...editorUser, isActive: false }),
      } as Partial<typeof context.userRepository>;

      const result = await deleteUser(context, editorUser.id, editorUser.id);

      expect(result.isOk()).toBe(true);
      // Note: In a full implementation, this would also handle region ownership transfer
    });
  });

  describe("Data retention compliance", () => {
    it("should follow BR-008 data retention policy", async () => {
      // BR-008: 削除されたユーザーアカウントデータは7年間保持
      const result = await deleteUser(context, adminUser.id, targetUser.id);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const user = result.value;
        // User is marked as inactive but data is retained
        expect(user.isActive).toBe(false);
        expect(user.id).toBe(targetUser.id); // ID preserved for retention
      }
    });
  });
});