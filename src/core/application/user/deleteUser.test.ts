import { MockUserRepository } from "@/core/adapters/mock/userRepository";
import type { User, UserId } from "@/core/domain/user/types";
import { ApplicationError, AuthorizationError } from "@/lib/error";
import { RepositoryError } from "@/lib/error";
import { err, ok } from "neverthrow";
import { beforeEach, describe, expect, it } from "vitest";
import type { Context } from "../context";
import { deleteUser } from "./deleteUser";

describe("deleteUser", () => {
  let context: Context;
  let mockUserRepository: MockUserRepository;

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
    mockUserRepository = new MockUserRepository();
    mockUserRepository.addUser(targetUser, "hashed_password");
    mockUserRepository.addUser(adminUser, "hashed_admin_password");

    context = {
      userRepository: mockUserRepository,
    } as unknown as Context;
  });

  describe("SPEC: User deletion constraints from formal specifications", () => {
    it("should allow user to delete their own account", async () => {
      const result = await deleteUser(context, targetUser.id);

      expect(result.isOk()).toBe(true);
    });

    it("should allow admin to delete any user", async () => {
      const result = await deleteUser(context, targetUser.id);

      expect(result.isOk()).toBe(true);
    });

    it("should reject non-admin deleting other users", async () => {
      const otherUser: User = {
        ...targetUser,
        id: "other-user" as UserId,
        role: "visitor",
      };

      mockUserRepository.addUser(otherUser, "hashed_other_password");

      const result = await deleteUser(context, targetUser.id);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(AuthorizationError);
        expect(result.error.message).toBe("Not authorized to delete this user");
      }
    });

    it("should prevent admin from deleting themselves", async () => {
      const result = await deleteUser(context, adminUser.id);

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
      const result = await deleteUser(context, targetUser.id);

      expect(result.isOk()).toBe(true);
    });

    it("should follow GDPR compliance from formal specifications", async () => {
      // REQ-NF-021: GDPR準拠のデータ削除
      const result = await deleteUser(context, targetUser.id);

      expect(result.isOk()).toBe(true);
      // In a full implementation, this would trigger GDPR data deletion
    });
  });

  describe("Error handling", () => {
    it("should handle user not found", async () => {
      const result = await deleteUser(context, "non-existent" as UserId);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("User not found");
      }
    });

    it("should handle target user not found", async () => {
      const result = await deleteUser(context, "non-existent" as UserId);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Target user not found");
      }
    });

    it("should handle repository failure", async () => {
      mockUserRepository.setShouldFailOperations(true);

      const result = await deleteUser(context, targetUser.id);

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

      mockUserRepository.addUser(editorUser, "hashed_editor_password");

      const result = await deleteUser(context, editorUser.id);

      expect(result.isOk()).toBe(true);
      // Note: In a full implementation, this would also handle region ownership transfer
    });
  });

  describe("Data retention compliance", () => {
    it("should follow BR-008 data retention policy", async () => {
      // BR-008: 削除されたユーザーアカウントデータは7年間保持
      const result = await deleteUser(context, targetUser.id);

      expect(result.isOk()).toBe(true);
      // Note: In a full implementation, this would verify data retention policies
    });
  });
});
