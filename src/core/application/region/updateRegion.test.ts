import type { Region, RegionId } from "@/core/domain/region/types";
import type { User, UserId } from "@/core/domain/user/types";
import { ApplicationError } from "@/lib/error";
import { RepositoryError } from "@/lib/error";
import { err, ok } from "neverthrow";
import { beforeEach, describe, expect, it } from "vitest";
import { MockRegionRepository } from "../../adapters/mock/regionRepository";
import { MockUserRepository } from "../../adapters/mock/userRepository";
import type { Context } from "../context";
import { updateRegion } from "./updateRegion";

describe("updateRegion", () => {
  let context: Context;
  let mockUserRepository: MockUserRepository;
  let mockRegionRepository: MockRegionRepository;

  const editorUser: User = {
    id: "550e8400-e29b-41d4-a716-446655440002" as UserId,
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

  const otherEditor: User = {
    id: "550e8400-e29b-41d4-a716-446655440005" as UserId,
    name: "Other Editor",
    email: "other@example.com",
    role: "editor",
    subscription: "premium",
    profilePhotoUrl: null,
    isActive: true,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const testRegion: Region = {
    id: "550e8400-e29b-41d4-a716-446655440010" as RegionId,
    name: "Test Region",
    description: "A test region",
    latitude: null,
    longitude: null,
    coverPhotoUrl: null,
    creatorId: editorUser.id,
    isPublic: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockUserRepository = new MockUserRepository();
    mockRegionRepository = new MockRegionRepository();

    // Setup test data
    mockUserRepository.addUser(editorUser, "hashed_password");
    mockUserRepository.addUser(otherEditor, "hashed_password");
    mockRegionRepository.addRegion(testRegion);

    context = {
      userRepository: mockUserRepository,
      regionRepository: mockRegionRepository,
    } as unknown as Context;
  });

  describe("REQ-E-024: Region detail update functionality from spec", () => {
    it("should update region name and description when user is owner", async () => {
      const input = {
        id: testRegion.id,
        userId: editorUser.id,
        name: "Updated Region Name",
        description: "Updated description",
        isPublic: true,
      };

      const result = await updateRegion(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const updatedRegion = result.value;
        expect(updatedRegion.name).toBe("Updated Region Name");
        expect(updatedRegion.description).toBe("Updated description");
        expect(updatedRegion.id).toBe(testRegion.id);
        expect(updatedRegion.creatorId).toBe(editorUser.id);
      }
    });

    it("should update only region name when description not provided", async () => {
      const input = {
        id: testRegion.id,
        userId: editorUser.id,
        name: "Just Name Update",
      };

      const result = await updateRegion(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const updatedRegion = result.value;
        expect(updatedRegion.name).toBe("Just Name Update");
        expect(updatedRegion.description).toBe(testRegion.description);
      }
    });

    it("should update visibility setting", async () => {
      const input = {
        id: testRegion.id,
        userId: editorUser.id,
        isPublic: false,
      };

      const result = await updateRegion(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const updatedRegion = result.value;
        expect(updatedRegion.isPublic).toBe(false);
        expect(updatedRegion.name).toBe(testRegion.name);
      }
    });

    it("should update cover photo URL", async () => {
      const input = {
        id: testRegion.id,
        userId: editorUser.id,
        coverPhotoUrl: "https://example.com/new-cover.jpg",
      };

      const result = await updateRegion(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const updatedRegion = result.value;
        expect(updatedRegion.coverPhotoUrl).toBe(
          "https://example.com/new-cover.jpg",
        );
      }
    });

    it("should handle multiple field updates simultaneously", async () => {
      const input = {
        id: testRegion.id,
        userId: editorUser.id,
        name: "Multi Update Region",
        description: "Updated with multiple fields",
        coverPhotoUrl: "https://example.com/multi-cover.jpg",
        isPublic: false,
      };

      const result = await updateRegion(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const updatedRegion = result.value;
        expect(updatedRegion.name).toBe("Multi Update Region");
        expect(updatedRegion.description).toBe("Updated with multiple fields");
        expect(updatedRegion.coverPhotoUrl).toBe(
          "https://example.com/multi-cover.jpg",
        );
        expect(updatedRegion.isPublic).toBe(false);
      }
    });
  });

  describe("TLA+ behavior validation", () => {
    it("should follow UpdateRegion action from TLA+ specification", async () => {
      const input = {
        id: testRegion.id,
        userId: editorUser.id,
        name: "TLA+ Updated Region",
        description: "TLA+ specification compliant update",
        coverPhotoUrl: "https://example.com/tla-cover.jpg",
      };

      const result = await updateRegion(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const updatedRegion = result.value;
        expect(updatedRegion.name).toBe("TLA+ Updated Region");
        expect(updatedRegion.description).toBe(
          "TLA+ specification compliant update",
        );
        expect(updatedRegion.coverPhotoUrl).toBe(
          "https://example.com/tla-cover.jpg",
        );
        expect(updatedRegion.updatedAt).toBeInstanceOf(Date);
      }
    });
  });

  describe("SPEC-INV-1,17,18: Owner-only edit constraints from Alloy model", () => {
    it("should reject update from non-owner editor", async () => {
      const input = {
        id: testRegion.id,
        userId: otherEditor.id,
        name: "Unauthorized Update",
        description: "Should fail",
      };

      const result = await updateRegion(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Unauthorized to update this region");
      }
    });

    it("should reject update from non-existent user", async () => {
      const input = {
        id: testRegion.id,
        userId: "550e8400-e29b-41d4-a716-446655440099" as UserId,
        name: "Invalid User Update",
      };

      const result = await updateRegion(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Unauthorized to update this region");
      }
    });

    it("should reject update for non-existent region", async () => {
      const input = {
        id: "550e8400-e29b-41d4-a716-446655440088" as RegionId,
        userId: editorUser.id,
        name: "Should Fail",
      };

      const result = await updateRegion(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Region not found");
      }
    });
  });

  describe("Input validation", () => {
    it("should reject invalid input - invalid region ID format", async () => {
      const input = {
        id: "invalid-uuid",
        userId: editorUser.id,
        name: "Should fail",
      };

      const result = await updateRegion(context, input as never);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid region input");
      }
    });

    it("should reject invalid input - invalid user ID format", async () => {
      const input = {
        id: testRegion.id,
        userId: "invalid-uuid",
        name: "Should fail",
      };

      const result = await updateRegion(context, input as never);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid region input");
      }
    });

    it("should reject name that exceeds maximum length", async () => {
      const longName = "a".repeat(101); // Exceeds 100 character limit

      const input = {
        id: testRegion.id,
        userId: editorUser.id,
        name: longName,
      };

      const result = await updateRegion(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid region input");
      }
    });

    it("should reject description that exceeds maximum length", async () => {
      const longDescription = "a".repeat(1001); // Exceeds 1000 character limit

      const input = {
        id: testRegion.id,
        userId: editorUser.id,
        description: longDescription,
      };

      const result = await updateRegion(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid region input");
      }
    });

    it("should reject empty name when provided", async () => {
      const input = {
        id: testRegion.id,
        userId: editorUser.id,
        name: "",
      };

      const result = await updateRegion(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid region input");
      }
    });

    it("should accept update with no fields (no-op)", async () => {
      const input = {
        id: testRegion.id,
        userId: editorUser.id,
      };

      const result = await updateRegion(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const updatedRegion = result.value;
        // All fields should remain the same
        expect(updatedRegion.name).toBe(testRegion.name);
        expect(updatedRegion.description).toBe(testRegion.description);
        expect(updatedRegion.isPublic).toBe(testRegion.isPublic);
        expect(updatedRegion.coverPhotoUrl).toBe(testRegion.coverPhotoUrl);
      }
    });
  });

  describe("Error handling", () => {
    it("should handle region repository failure on get", async () => {
      mockRegionRepository.setShouldFailOperations(true);

      const input = {
        id: testRegion.id,
        userId: editorUser.id,
        name: "Should fail",
      };

      const result = await updateRegion(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to find region");
      }
    });

    it("should handle region repository failure on update", async () => {
      // Setup repository to fail only on update operation
      const originalUpdate =
        mockRegionRepository.update.bind(mockRegionRepository);
      mockRegionRepository.update = async () => {
        return err(new RepositoryError("Update failed"));
      };

      const input = {
        id: testRegion.id,
        userId: editorUser.id,
        name: "Should fail on update",
      };

      const result = await updateRegion(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to update region");
      }

      // Restore original method
      mockRegionRepository.update = originalUpdate;
    });
  });

  describe("Ownership verification", () => {
    it("should verify ownership before allowing update", async () => {
      const input = {
        id: testRegion.id,
        userId: editorUser.id,
        name: "Owner verification test",
      };

      // Should succeed for owner
      const ownerResult = await updateRegion(context, input);
      expect(ownerResult.isOk()).toBe(true);

      // Should fail for non-owner
      const nonOwnerInput = {
        ...input,
        userId: otherEditor.id,
      };
      const nonOwnerResult = await updateRegion(context, nonOwnerInput);
      expect(nonOwnerResult.isErr()).toBe(true);
      if (nonOwnerResult.isErr()) {
        expect(nonOwnerResult.error.message).toBe(
          "Unauthorized to update this region",
        );
      }
    });
  });

  describe("SPEC-INV-30,31: Image and coordinates consistency (Alloy constraints)", () => {
    it("should handle cover photo URL consistency", async () => {
      // Test setting cover photo
      const inputWithPhoto = {
        id: testRegion.id,
        userId: editorUser.id,
        coverPhotoUrl: "https://example.com/cover.jpg",
      };

      const resultWithPhoto = await updateRegion(context, inputWithPhoto);

      expect(resultWithPhoto.isOk()).toBe(true);
      if (resultWithPhoto.isOk()) {
        expect(resultWithPhoto.value.coverPhotoUrl).toBe(
          "https://example.com/cover.jpg",
        );
      }

      // Test removing cover photo
      const inputWithoutPhoto = {
        id: testRegion.id,
        userId: editorUser.id,
        coverPhotoUrl: null,
      };

      const resultWithoutPhoto = await updateRegion(context, inputWithoutPhoto);

      expect(resultWithoutPhoto.isOk()).toBe(true);
      if (resultWithoutPhoto.isOk()) {
        expect(resultWithoutPhoto.value.coverPhotoUrl).toBe(null);
      }
    });
  });

  describe("Partial updates", () => {
    it("should handle partial field updates correctly", async () => {
      // Update only name
      const nameOnlyInput = {
        id: testRegion.id,
        userId: editorUser.id,
        name: "Name Only Update",
      };

      const nameOnlyResult = await updateRegion(context, nameOnlyInput);

      expect(nameOnlyResult.isOk()).toBe(true);
      if (nameOnlyResult.isOk()) {
        expect(nameOnlyResult.value.name).toBe("Name Only Update");
        expect(nameOnlyResult.value.description).toBe(testRegion.description);
        expect(nameOnlyResult.value.isPublic).toBe(testRegion.isPublic);
      }

      // Update only description
      const descriptionOnlyInput = {
        id: testRegion.id,
        userId: editorUser.id,
        description: "Description Only Update",
      };

      const descriptionOnlyResult = await updateRegion(
        context,
        descriptionOnlyInput,
      );

      expect(descriptionOnlyResult.isOk()).toBe(true);
      if (descriptionOnlyResult.isOk()) {
        expect(descriptionOnlyResult.value.description).toBe(
          "Description Only Update",
        );
        // Name should retain the previous update
        expect(descriptionOnlyResult.value.name).toBe("Name Only Update");
      }
    });
  });
});
