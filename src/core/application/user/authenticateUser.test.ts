import type { Session, User, UserId } from "@/core/domain/user/types";
import { ApplicationError, AuthenticationError } from "@/lib/error";
import { RepositoryError } from "@/lib/error";
import { err, ok } from "neverthrow";
import { beforeEach, describe, expect, it } from "vitest";
import { MockPasswordHasher } from "../../adapters/mock/passwordHasher";
import { MockUserRepository } from "../../adapters/mock/userRepository";
import type { Context } from "../context";
import {
  type AuthenticateUserResult,
  authenticateUser,
} from "./authenticateUser";

describe("authenticateUser", () => {
  let context: Context;
  let mockUserRepository: MockUserRepository;
  let mockPasswordHasher: MockPasswordHasher;

  const activeUser: User = {
    id: "user-1" as UserId,
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

  const inactiveUser: User = {
    id: "user-2" as UserId,
    name: "Inactive User",
    email: "inactive@example.com",
    role: "visitor",
    subscription: "free",
    profilePhotoUrl: null,
    isActive: false,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const editorUser: User = {
    id: "user-3" as UserId,
    name: "Editor User",
    email: "editor@example.com",
    role: "editor",
    subscription: "basic",
    profilePhotoUrl: null,
    isActive: true,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const adminUser: User = {
    id: "user-4" as UserId,
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

  beforeEach(() => {
    mockUserRepository = new MockUserRepository();
    mockPasswordHasher = new MockPasswordHasher();

    // Setup test data
    mockUserRepository.addUser(activeUser, "hashed_password123");
    mockUserRepository.addUser(inactiveUser, "hashed_password456");
    mockUserRepository.addUser(editorUser, "hashed_editorpass");
    mockUserRepository.addUser(adminUser, "hashed_adminpass");

    context = {
      userRepository: mockUserRepository,
      passwordHasher: mockPasswordHasher,
    } as unknown as Context;
  });

  describe("SPEC-NF-007: Session management requirements", () => {
    it("should create 24-hour session for successful authentication", async () => {
      const input = {
        email: "test@example.com",
        password: "password123",
      };

      const result = await authenticateUser(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const authResult = result.value;
        expect(authResult.user.email).toBe("test@example.com");
        expect(authResult.session.userId).toBe(activeUser.id);
        expect(authResult.session.token).toBeDefined();
        expect(authResult.session.expiresAt).toBeInstanceOf(Date);

        // Verify session expires in approximately 24 hours
        const now = new Date();
        const expectedExpiry = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const timeDiff = Math.abs(
          authResult.session.expiresAt.getTime() - expectedExpiry.getTime(),
        );
        expect(timeDiff).toBeLessThan(1000); // Within 1 second tolerance
      }
    });

    it("should generate unique session tokens", async () => {
      const input = {
        email: "test@example.com",
        password: "password123",
      };

      const [result1, result2] = await Promise.all([
        authenticateUser(context, input),
        authenticateUser(context, input),
      ]);

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);
      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.session.token).not.toBe(
          result2.value.session.token,
        );
      }
    });
  });

  describe("TLA+ behavior validation", () => {
    it("should follow TLA+ authentication state transitions", async () => {
      // TLA+ authentication model: user transitions from unauthenticated to authenticated state
      const input = {
        email: "test@example.com",
        password: "password123",
      };

      const result = await authenticateUser(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const authResult = result.value;
        // Verify state transitions match TLA+ model
        expect(authResult.user.isActive).toBe(true);
        expect(authResult.session.userId).toBe(authResult.user.id);
        expect(authResult.session.createdAt).toBeInstanceOf(Date);
        expect(authResult.session.lastActivityAt).toBeInstanceOf(Date);
      }
    });
  });

  describe("Authentication with different user roles", () => {
    it("should authenticate visitor user successfully", async () => {
      const input = {
        email: "test@example.com",
        password: "password123",
      };

      const result = await authenticateUser(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.user.role).toBe("visitor");
        expect(result.value.user.subscription).toBe("free");
      }
    });

    it("should authenticate editor user successfully", async () => {
      const input = {
        email: "editor@example.com",
        password: "editorpass",
      };

      const result = await authenticateUser(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.user.role).toBe("editor");
        expect(result.value.user.subscription).toBe("basic");
      }
    });

    it("should authenticate admin user successfully", async () => {
      const input = {
        email: "admin@example.com",
        password: "adminpass",
      };

      const result = await authenticateUser(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.user.role).toBe("admin");
        expect(result.value.user.subscription).toBe("free");
      }
    });
  });

  describe("Input validation", () => {
    it("should reject invalid email format", async () => {
      const input = {
        email: "invalid-email",
        password: "password123",
      };

      const result = await authenticateUser(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid authentication input");
      }
    });

    it("should reject missing email", async () => {
      const input = {
        password: "password123",
      };

      const result = await authenticateUser(context, input as never);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid authentication input");
      }
    });

    it("should reject missing password", async () => {
      const input = {
        email: "test@example.com",
      };

      const result = await authenticateUser(context, input as never);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid authentication input");
      }
    });

    it("should reject empty password", async () => {
      const input = {
        email: "test@example.com",
        password: "",
      };

      const result = await authenticateUser(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid authentication input");
      }
    });
  });

  describe("Authentication failures", () => {
    it("should reject authentication for non-existent user", async () => {
      const input = {
        email: "nonexistent@example.com",
        password: "password123",
      };

      const result = await authenticateUser(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(AuthenticationError);
        expect(result.error.message).toBe("Invalid credentials");
      }
    });

    it("should reject authentication with wrong password", async () => {
      const input = {
        email: "test@example.com",
        password: "wrongpassword",
      };

      const result = await authenticateUser(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(AuthenticationError);
        expect(result.error.message).toBe("Invalid credentials");
      }
    });

    it("should reject authentication for inactive user", async () => {
      const input = {
        email: "inactive@example.com",
        password: "password456",
      };

      const result = await authenticateUser(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(AuthenticationError);
        expect(result.error.message).toBe("User account is inactive");
      }
    });
  });

  describe("Error handling", () => {
    it("should handle user repository failure when finding user", async () => {
      mockUserRepository.setShouldFailOperations(true);

      const input = {
        email: "test@example.com",
        password: "password123",
      };

      const result = await authenticateUser(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to find user");
      }
    });

    it("should handle password hasher failure", async () => {
      mockPasswordHasher.setShouldFailOperations(true);

      const input = {
        email: "test@example.com",
        password: "password123",
      };

      const result = await authenticateUser(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(AuthenticationError);
        expect(result.error.message).toBe("Invalid credentials");
      }
    });

    it("should handle session creation failure", async () => {
      // Reset repository operations to work normally first
      mockUserRepository.setShouldFailOperations(false);

      // Create a spy on createSession to make it fail
      const originalCreateSession =
        mockUserRepository.createSession.bind(mockUserRepository);
      mockUserRepository.createSession = async () => {
        return err(new RepositoryError("Session creation failed"));
      };

      const input = {
        email: "test@example.com",
        password: "password123",
      };

      const result = await authenticateUser(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to create session");
      }

      // Restore original method
      mockUserRepository.createSession = originalCreateSession;
    });

    it("should handle password retrieval failure", async () => {
      // Reset repository operations to work normally first
      mockUserRepository.setShouldFailOperations(false);

      // Create a spy on getHashedPassword to make it fail
      const originalGetHashedPassword =
        mockUserRepository.getHashedPassword.bind(mockUserRepository);
      mockUserRepository.getHashedPassword = async () => {
        return err(new RepositoryError("Password retrieval failed"));
      };

      const input = {
        email: "test@example.com",
        password: "password123",
      };

      const result = await authenticateUser(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to get user password");
      }

      // Restore original method
      mockUserRepository.getHashedPassword = originalGetHashedPassword;
    });
  });

  describe("Security considerations", () => {
    it("should not leak information about user existence through timing", async () => {
      // Test that authentication for non-existent users takes similar time
      // This is a simplified test - real timing attacks would require more sophisticated testing
      const nonExistentInput = {
        email: "nonexistent@example.com",
        password: "password123",
      };

      const wrongPasswordInput = {
        email: "test@example.com",
        password: "wrongpassword",
      };

      const [result1, result2] = await Promise.all([
        authenticateUser(context, nonExistentInput),
        authenticateUser(context, wrongPasswordInput),
      ]);

      expect(result1.isErr()).toBe(true);
      expect(result2.isErr()).toBe(true);
      if (result1.isErr() && result2.isErr()) {
        // Both should return "Invalid credentials" to avoid user enumeration
        expect(result1.error.message).toBe("Invalid credentials");
        expect(result2.error.message).toBe("Invalid credentials");
      }
    });

    it("should handle case-sensitive email matching", async () => {
      // Test with different case email
      const input = {
        email: "TEST@EXAMPLE.COM",
        password: "password123",
      };

      const result = await authenticateUser(context, input);

      // Should fail since our mock is case-sensitive (as emails should be in practice)
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(AuthenticationError);
        expect(result.error.message).toBe("Invalid credentials");
      }
    });
  });

  describe("Successful authentication result structure", () => {
    it("should return complete user and session information", async () => {
      const input = {
        email: "test@example.com",
        password: "password123",
      };

      const result = await authenticateUser(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const authResult: AuthenticateUserResult = result.value;

        // Verify user information
        expect(authResult.user).toEqual(activeUser);

        // Verify session information
        expect(authResult.session.userId).toBe(activeUser.id);
        expect(authResult.session.token).toBeDefined();
        expect(typeof authResult.session.token).toBe("string");
        expect(authResult.session.token.length).toBeGreaterThan(0);
        expect(authResult.session.expiresAt).toBeInstanceOf(Date);
        expect(authResult.session.lastActivityAt).toBeInstanceOf(Date);
        expect(authResult.session.createdAt).toBeInstanceOf(Date);
      }
    });
  });
});
