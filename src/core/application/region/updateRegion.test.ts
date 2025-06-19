import { MockRegionRepository } from "@/core/adapters/mock/regionRepository";
import type { Region, RegionId } from "@/core/domain/region/types";
import type { User, UserId } from "@/core/domain/user/types";
import { ApplicationError } from "@/lib/error";
import { ok } from "neverthrow";
import { beforeEach, describe, expect, it } from "vitest";
import type { Context } from "../context";
import { updateRegion } from "./updateRegion";

describe("updateRegion", () => {
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

  const testRegion: Region = {
    id: "region-1" as RegionId,
    name: "Original Region",
    description: "Original description",
    creatorId: editorUser.id,
    isPublic: false,
    latitude: null,
    longitude: null,
    coverPhotoUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockRegionRepository = new MockRegionRepository();
    mockRegionRepository.addRegion(testRegion);

    context = {
      userRepository: {
        findById: async (id: string) => {
          if (id === editorUser.id) return ok(editorUser);
          return ok(null);
        },
      },
      regionRepository: mockRegionRepository,
    } as unknown as Context;
  });

  describe("Basic update functionality", () => {
    it("should update region name", async () => {
      const input = {
        id: testRegion.id,
        userId: editorUser.id,
        name: "Updated Region Name",
      };

      const result = await updateRegion(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const updatedRegion = result.value;
        expect(updatedRegion.name).toBe("Updated Region Name");
        expect(updatedRegion.id).toBe(testRegion.id);
        expect(updatedRegion.creatorId).toBe(editorUser.id);
      }
    });

    it("should update region description", async () => {
      const input = {
        id: testRegion.id,
        userId: editorUser.id,
        description: "Updated description",
      };

      const result = await updateRegion(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const updatedRegion = result.value;
        expect(updatedRegion.description).toBe("Updated description");
      }
    });

    it("should update region visibility", async () => {
      const input = {
        id: testRegion.id,
        userId: editorUser.id,
        isPublic: true,
      };

      const result = await updateRegion(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const updatedRegion = result.value;
        expect(updatedRegion.isPublic).toBe(true);
      }
    });

    it("should update region cover photo URL", async () => {
      const input = {
        id: testRegion.id,
        userId: editorUser.id,
        coverPhotoUrl: "https://example.com/photo.jpg",
      };

      const result = await updateRegion(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const updatedRegion = result.value;
        expect(updatedRegion.coverPhotoUrl).toBe(
          "https://example.com/photo.jpg",
        );
      }
    });

    it("should update multiple fields at once", async () => {
      const input = {
        id: testRegion.id,
        userId: editorUser.id,
        name: "Multi-Update Region",
        description: "Multi-update description",
        isPublic: true,
        coverPhotoUrl: "https://example.com/multi.jpg",
      };

      const result = await updateRegion(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const updatedRegion = result.value;
        expect(updatedRegion.name).toBe("Multi-Update Region");
        expect(updatedRegion.description).toBe("Multi-update description");
        expect(updatedRegion.isPublic).toBe(true);
        expect(updatedRegion.coverPhotoUrl).toBe(
          "https://example.com/multi.jpg",
        );
      }
    });
  });

  describe("Authorization", () => {
    it("should reject update by non-owner", async () => {
      const input = {
        id: testRegion.id,
        userId: "other-user" as UserId,
        name: "Unauthorized Update",
      };

      const result = await updateRegion(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Unauthorized to update this region");
      }
    });
  });

  describe("Input validation", () => {
    it("should reject invalid region ID", async () => {
      const input = {
        id: "invalid-id",
        userId: editorUser.id,
        name: "Updated Name",
      };

      const result = await updateRegion(context, input as never);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid region input");
      }
    });

    it("should reject invalid user ID", async () => {
      const input = {
        id: testRegion.id,
        userId: "invalid-user-id",
        name: "Updated Name",
      };

      const result = await updateRegion(context, input as never);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid region input");
      }
    });

    it("should reject empty name", async () => {
      const input = {
        id: testRegion.id,
        userId: editorUser.id,
        name: "",
      };

      const result = await updateRegion(context, input as never);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid region input");
      }
    });

    it("should reject invalid cover photo URL", async () => {
      const input = {
        id: testRegion.id,
        userId: editorUser.id,
        coverPhotoUrl: "not-a-url",
      };

      const result = await updateRegion(context, input as never);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid region input");
      }
    });
  });

  describe("Error handling", () => {
    it("should handle region not found", async () => {
      const input = {
        id: "non-existent-region" as RegionId,
        userId: editorUser.id,
        name: "Updated Name",
      };

      const result = await updateRegion(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Region not found");
      }
    });

    it("should handle repository failure", async () => {
      mockRegionRepository.setShouldFailOperations(true);

      const input = {
        id: testRegion.id,
        userId: editorUser.id,
        name: "Updated Name",
      };

      const result = await updateRegion(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to find region");
      }
    });
  });

  describe("Partial updates", () => {
    it("should allow updating only name", async () => {
      const input = {
        id: testRegion.id,
        userId: editorUser.id,
        name: "Name Only Update",
      };

      const result = await updateRegion(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const updatedRegion = result.value;
        expect(updatedRegion.name).toBe("Name Only Update");
        // Other fields should remain unchanged
        expect(updatedRegion.description).toBe(testRegion.description);
        expect(updatedRegion.isPublic).toBe(testRegion.isPublic);
        expect(updatedRegion.coverPhotoUrl).toBe(testRegion.coverPhotoUrl);
      }
    });

    it("should allow updating only visibility", async () => {
      const input = {
        id: testRegion.id,
        userId: editorUser.id,
        isPublic: true,
      };

      const result = await updateRegion(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const updatedRegion = result.value;
        expect(updatedRegion.isPublic).toBe(true);
        // Other fields should remain unchanged
        expect(updatedRegion.name).toBe(testRegion.name);
        expect(updatedRegion.description).toBe(testRegion.description);
      }
    });
  });

  describe("Null/undefined handling", () => {
    it("should allow setting description to null", async () => {
      const input = {
        id: testRegion.id,
        userId: editorUser.id,
        description: null,
      };

      const result = await updateRegion(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const updatedRegion = result.value;
        expect(updatedRegion.description).toBe(null);
      }
    });

    it("should allow setting cover photo URL to null", async () => {
      const input = {
        id: testRegion.id,
        userId: editorUser.id,
        coverPhotoUrl: null,
      };

      const result = await updateRegion(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const updatedRegion = result.value;
        expect(updatedRegion.coverPhotoUrl).toBe(null);
      }
    });
  });
});
