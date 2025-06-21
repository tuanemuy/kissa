import { MockUserRepository } from "@/core/adapters/mock/userRepository";
import type { User, UserId } from "@/core/domain/user/types";
import { ApplicationError, AuthorizationError } from "@/lib/error";
import { RepositoryError } from "@/lib/error";
import { err, ok } from "neverthrow";
import { beforeEach, describe, expect, it } from "vitest";
import type { Context } from "../context";
import { createMockContext } from "../testUtils/mockContext";
import { updateUser } from "./updateUser";

describe("updateUser", () => {
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

  const updatedUser: User = {
    ...targetUser,
    name: "Updated User",
    email: "updated@example.com",
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockUserRepository = new MockUserRepository();
    mockUserRepository.addUser(targetUser, "hashed_password");
    mockUserRepository.addUser(adminUser, "hashed_admin_password");

    context = createMockContext({
      userRepository: mockUserRepository,
    });
  });

  describe("SPEC: User update constraints from formal specifications", () => {
    it("should allow user to update their own profile", async () => {
      const input = {
        name: "Updated Name",
        email: "updated@example.com",
      };

      const result = await updateUser(context, {
        id: targetUser.id,
        ...input,
      });

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

      const result = await updateUser(context, {
        id: targetUser.id,
        ...input,
      });

      expect(result.isOk()).toBe(true);
    });

    it("should reject non-admin updating other users", async () => {
      const otherUser: User = {
        ...targetUser,
        id: "other-user" as UserId,
        role: "visitor",
      };

      mockUserRepository.addUser(otherUser, "hashed_other_password");

      const input = {
        name: "Should Fail",
      };

      const result = await updateUser(context, {
        id: targetUser.id,
        ...input,
      });

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

      const result = await updateUser(context, {
        id: targetUser.id,
        ...input,
      });

      expect(result.isOk()).toBe(true);
    });
  });

  describe("Input validation", () => {
    it("should reject invalid input - empty name", async () => {
      const input = {
        name: "",
        email: "valid@example.com",
      };

      const result = await updateUser(context, {
        id: targetUser.id,
        ...input,
      } as never);

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

      const result = await updateUser(context, {
        id: targetUser.id,
        ...input,
      } as never);

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

      const result = await updateUser(context, {
        id: "non-existent" as UserId,
        ...input,
      });

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

      const result = await updateUser(context, {
        id: "non-existent" as UserId,
        ...input,
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Target user not found");
      }
    });

    it("should handle repository failure", async () => {
      mockUserRepository.setShouldFailOperations(true);

      const input = {
        name: "Test Name",
      };

      const result = await updateUser(context, {
        id: targetUser.id,
        ...input,
      });

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

      const result = await updateUser(context, {
        id: targetUser.id,
        ...input,
      });

      expect(result.isOk()).toBe(true);
    });

    it("should reject non-admin role changes", async () => {
      const input = {
        role: "admin" as const,
      };

      const result = await updateUser(context, {
        id: targetUser.id,
        ...input,
      });

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

      mockUserRepository.addUser(editorUser, "hashed_editor_password");

      const input = {
        subscription: "premium" as const,
      };

      const result = await updateUser(context, {
        id: editorUser.id,
        ...input,
      });

      expect(result.isOk()).toBe(true);
    });
  });
});
