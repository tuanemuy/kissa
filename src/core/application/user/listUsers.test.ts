import { MockUserRepository } from "@/core/adapters/mock/userRepository";
import type { User, UserId } from "@/core/domain/user/types";
import { ApplicationError } from "@/lib/error";
import { RepositoryError } from "@/lib/error";
import { err, ok } from "neverthrow";
import { beforeEach, describe, expect, it } from "vitest";
import type { Context } from "../context";
import { listUsers } from "./listUsers";

describe("listUsers", () => {
  let context: Context;
  let mockUserRepository: MockUserRepository;

  const testUsers: User[] = [
    {
      id: "user-1" as UserId,
      name: "Test User 1",
      email: "user1@example.com",
      role: "visitor",
      subscription: "free",
      profilePhotoUrl: null,
      isActive: true,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    },
    {
      id: "user-2" as UserId,
      name: "Test User 2",
      email: "user2@example.com",
      role: "editor",
      subscription: "basic",
      profilePhotoUrl: null,
      isActive: true,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      createdAt: new Date("2024-01-02"),
      updatedAt: new Date("2024-01-02"),
    },
    {
      id: "user-3" as UserId,
      name: "Test Admin",
      email: "admin@example.com",
      role: "admin",
      subscription: "free",
      profilePhotoUrl: null,
      isActive: true,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      createdAt: new Date("2024-01-03"),
      updatedAt: new Date("2024-01-03"),
    },
  ];

  beforeEach(() => {
    mockUserRepository = new MockUserRepository();

    // Add test users to the mock repository
    for (const user of testUsers) {
      mockUserRepository.addUser(user, `hashed_password_${user.id}`);
    }

    context = {
      userRepository: mockUserRepository,
    } as unknown as Context;
  });

  describe("SPEC: User listing from formal specifications", () => {
    it("should list all users with pagination", async () => {
      const query = {
        pagination: { page: 1, limit: 10 },
      };

      const result = await listUsers(context, query);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const { items, count } = result.value;
        expect(items).toHaveLength(3);
        expect(count).toBe(3);
        expect(items[0].id).toBe("user-1");
        expect(items[1].role).toBe("editor");
        expect(items[2].role).toBe("admin");
      }
    });

    it("should filter users by role", async () => {
      const query = {
        pagination: { page: 1, limit: 10 },
        filter: { role: "editor" as const },
      };

      const result = await listUsers(context, query);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const { items, count } = result.value;
        expect(items).toHaveLength(1);
        expect(count).toBe(1);
        expect(items[0].role).toBe("editor");
      }
    });

    it("should filter users by subscription", async () => {
      const query = {
        pagination: { page: 1, limit: 10 },
        filter: { subscription: "free" as const },
      };

      const result = await listUsers(context, query);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const { items, count } = result.value;
        expect(items).toHaveLength(2); // visitor and admin
        expect(count).toBe(2);
      }
    });
  });

  describe("TLA+ behavior validation", () => {
    it("should follow search functionality from TLA+ specification", async () => {
      // TLA+ SearchRegionsByKeyword equivalent for users
      const query = {
        pagination: { page: 1, limit: 10 },
        filter: { search: "Test" },
      };

      const result = await listUsers(context, query);

      expect(result.isOk()).toBe(true);
    });
  });

  describe("Input validation", () => {
    it("should reject invalid pagination - negative page", async () => {
      const query = {
        pagination: { page: -1, limit: 10 },
      };

      const result = await listUsers(context, query as never);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid query parameters");
      }
    });

    it("should reject invalid pagination - zero limit", async () => {
      const query = {
        pagination: { page: 1, limit: 0 },
      };

      const result = await listUsers(context, query as never);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid query parameters");
      }
    });
  });

  describe("Error handling", () => {
    it("should handle repository failure", async () => {
      mockUserRepository.setShouldFailOperations(true);

      const query = {
        pagination: { page: 1, limit: 10 },
      };

      const result = await listUsers(context, query);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to list users");
      }
    });
  });

  describe("Pagination behavior", () => {
    it("should handle empty result set", async () => {
      mockUserRepository.clear(); // Clear all users to simulate empty result set

      const query = {
        pagination: { page: 1, limit: 10 },
      };

      const result = await listUsers(context, query);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const { items, count } = result.value;
        expect(items).toHaveLength(0);
        expect(count).toBe(0);
      }
    });

    it("should handle large page numbers", async () => {
      const query = {
        pagination: { page: 100, limit: 10 },
      };

      const result = await listUsers(context, query);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const { items, count } = result.value;
        expect(items).toHaveLength(0);
        expect(count).toBe(3);
      }
    });
  });
});
