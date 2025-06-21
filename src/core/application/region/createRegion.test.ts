import { MockRegionRepository } from "@/core/adapters/mock/regionRepository";
import type { Region, RegionId } from "@/core/domain/region/types";
import type { User, UserId } from "@/core/domain/user/types";
import { ApplicationError, AuthorizationError } from "@/lib/error";
import { ok } from "neverthrow";
import { beforeEach, describe, expect, it } from "vitest";
import type { Context } from "../context";
import { createMockContext } from "../testUtils/mockContext";
import { createRegion } from "./createRegion";

describe("createRegion", () => {
  let context: Context;
  let mockRegionRepository: MockRegionRepository;

  const editorUser: User = {
    id: "editor-1" as UserId,
    name: "Test Editor",
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

  const visitorUser: User = {
    id: "visitor-1" as UserId,
    name: "Test Visitor",
    email: "visitor@example.com",
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
    mockRegionRepository = new MockRegionRepository();

    context = createMockContext({
      regionRepository: mockRegionRepository,
    });
  });

  describe("SPEC-INV-1: Only editors can create regions (Alloy constraint)", () => {
    it("should allow editor to create region", async () => {
      const input = {
        name: "Test Region",
        description: "A test region created by editor",
        isPublic: true,
      };

      const result = await createRegion(context, editorUser.id, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const region = result.value;
        expect(region.name).toBe("Test Region");
        expect(region.creatorId).toBe(editorUser.id);
        expect(region.isPublic).toBe(true);
      }
    });

    it("should reject region creation by visitor", async () => {
      const input = {
        name: "Visitor Region",
        description: "Should fail",
        isPublic: true,
      };

      const result = await createRegion(context, visitorUser.id, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(AuthorizationError);
        expect(result.error.message).toBe("Only editors can create regions");
      }
    });
  });

  describe("SPEC-INV-16,17,18: Subscription plan limits (Alloy constraints)", () => {
    it("should enforce free plan region limit (1 region)", async () => {
      const freeEditorUser: User = {
        ...editorUser,
        id: "free-editor" as UserId,
        subscription: "free",
      };

      // Add a region to reach the limit
      const existingRegion: Region = {
        id: "existing-region" as RegionId,
        name: "Existing Region",
        description: "Existing region",
        creatorId: freeEditorUser.id,
        isPublic: true,
        latitude: null,
        longitude: null,
        coverPhotoUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRegionRepository.addRegion(existingRegion);

      // Update context to return free editor
      context = createMockContext({
        regionRepository: mockRegionRepository,
        userRepository: {
          ...context.userRepository,
          findById: async (id: string) => {
            if (id === freeEditorUser.id) return ok(freeEditorUser);
            if (id === editorUser.id) return ok(editorUser);
            if (id === visitorUser.id) return ok(visitorUser);
            return ok(null);
          },
        },
      });

      const input = {
        name: "Exceeding Free Plan",
        description: "Should fail",
        isPublic: true,
      };

      const result = await createRegion(context, freeEditorUser.id, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(AuthorizationError);
        expect(result.error.message).toContain("Region limit exceeded");
      }
    });

    it("should allow creation within basic plan limits", async () => {
      // Basic plan allows up to 5 regions - add 4 regions
      for (let i = 1; i <= 4; i++) {
        const region: Region = {
          id: `region-${i}` as RegionId,
          name: `Region ${i}`,
          description: "Existing region",
          creatorId: editorUser.id,
          isPublic: true,
          latitude: null,
          longitude: null,
          coverPhotoUrl: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        mockRegionRepository.addRegion(region);
      }

      const input = {
        name: "Basic Plan Region",
        description: "Should succeed",
        isPublic: true,
      };

      const result = await createRegion(context, editorUser.id, input);

      expect(result.isOk()).toBe(true);
    });
  });

  describe("TLA+ behavior validation", () => {
    it("should follow CreateRegion action from TLA+ specification", async () => {
      // TLA+ CreateRegion action: CreateRegion(userId, newRegionId, name, visibility)
      const input = {
        name: "TLA Region",
        description: "Following TLA+ spec",
        isPublic: true,
      };

      const result = await createRegion(context, editorUser.id, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const region = result.value;
        // Verify state changes match TLA+ model
        expect(region.creatorId).toBe(editorUser.id);
        expect(region.isPublic).toBe(true);
        expect(region.createdAt).toBeInstanceOf(Date);
      }
    });
  });

  describe("Input validation", () => {
    it("should reject invalid input - missing name", async () => {
      const input = {
        description: "Missing name",
        isPublic: true,
      };

      const result = await createRegion(context, editorUser.id, input as never);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid region input");
      }
    });
  });

  describe("Error handling", () => {
    it("should handle creator not found", async () => {
      const input = {
        name: "Test Region",
        description: "Should fail",
        isPublic: true,
      };

      const result = await createRegion(
        context,
        "non-existent-user" as UserId,
        input,
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Creator not found");
      }
    });

    it("should handle repository failure", async () => {
      mockRegionRepository.setShouldFailOperations(true);

      const input = {
        name: "Test Region",
        description: "Should fail",
        isPublic: true,
      };

      const result = await createRegion(context, editorUser.id, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to create region");
      }
    });
  });

  describe("Visibility settings", () => {
    it("should create public region", async () => {
      const input = {
        name: "Public Region",
        description: "A public region",
        isPublic: true,
      };

      const result = await createRegion(context, editorUser.id, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isPublic).toBe(true);
      }
    });

    it("should create private region", async () => {
      const input = {
        name: "Private Region",
        description: "A private region",
        isPublic: false,
      };

      const result = await createRegion(context, editorUser.id, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isPublic).toBe(false);
      }
    });
  });
});
