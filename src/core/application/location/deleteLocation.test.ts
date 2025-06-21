import type { Location, LocationId } from "@/core/domain/location/types";
import type { Region, RegionId } from "@/core/domain/region/types";
import type { User, UserId } from "@/core/domain/user/types";
import { ApplicationError, AuthorizationError } from "@/lib/error";
import { RepositoryError } from "@/lib/error";
import { err, ok } from "neverthrow";
import { beforeEach, describe, expect, it } from "vitest";
import { MockLocationRepository } from "../../adapters/mock/locationRepository";
import { MockRegionRepository } from "../../adapters/mock/regionRepository";
import { MockUserRepository } from "../../adapters/mock/userRepository";
import type { Context } from "../context";
import { createMockContext } from "../testUtils/mockContext";
import { deleteLocation } from "./deleteLocation";

describe("deleteLocation", () => {
  let context: Context;
  let mockUserRepository: MockUserRepository;
  let mockRegionRepository: MockRegionRepository;
  let mockLocationRepository: MockLocationRepository;

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

  const otherEditorUser: User = {
    id: "other-editor" as UserId,
    name: "Other Editor",
    email: "other@example.com",
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

  const testRegion: Region = {
    id: "region-1" as RegionId,
    name: "Test Region",
    description: "A test region",
    creatorId: editorUser.id,
    isPublic: true,
    latitude: null,
    longitude: null,
    coverPhotoUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const testLocation: Location = {
    id: "location-1" as LocationId,
    name: "Test Location",
    description: "A test location",
    regionId: testRegion.id,
    category: "restaurant",
    address: "123 Test St",
    latitude: 35.6762,
    longitude: 139.6503,
    contactInfo: {
      phone: "+1234567890",
      email: "test@example.com",
      website: "https://test.example.com",
    },
    operatingHours: {
      monday: "9AM-5PM",
      tuesday: "9AM-5PM",
      wednesday: "9AM-5PM",
      thursday: "9AM-5PM",
      friday: "9AM-5PM",
      saturday: "10AM-4PM",
      sunday: "Closed",
    },
    isPublic: true,
    coverPhotoUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockUserRepository = new MockUserRepository();
    mockRegionRepository = new MockRegionRepository();
    mockLocationRepository = new MockLocationRepository();

    // Setup test data
    mockUserRepository.addUser(editorUser, "hashed_password");
    mockUserRepository.addUser(otherEditorUser, "hashed_password");
    mockUserRepository.addUser(visitorUser, "hashed_password");
    mockRegionRepository.addRegion(testRegion);
    mockLocationRepository.addLocation(testLocation);

    context = createMockContext({
      userRepository: mockUserRepository,
      regionRepository: mockRegionRepository,
      locationRepository: mockLocationRepository,
    });
  });

  describe("SPEC-INV-6: Editor role validation (Alloy constraint)", () => {
    it("should allow editor to delete location", async () => {
      const result = await deleteLocation(
        context,
        editorUser.id,
        testLocation.id,
      );

      expect(result.isOk()).toBe(true);
    });

    it("should reject deletion by visitor", async () => {
      const result = await deleteLocation(
        context,
        visitorUser.id,
        testLocation.id,
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(AuthorizationError);
        expect(result.error.message).toBe("Only editors can delete locations");
      }
    });
  });

  describe("SPEC-INV-7: Region ownership validation (Alloy constraint)", () => {
    it("should allow region owner to delete location", async () => {
      const result = await deleteLocation(
        context,
        editorUser.id,
        testLocation.id,
      );

      expect(result.isOk()).toBe(true);
    });

    it("should reject deletion by non-region-owner", async () => {
      const result = await deleteLocation(
        context,
        otherEditorUser.id,
        testLocation.id,
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(AuthorizationError);
        expect(result.error.message).toBe(
          "Only region owner can delete locations",
        );
      }
    });
  });

  describe("TLA+ behavior validation", () => {
    it("should follow DeleteLocation action from TLA+ specification", async () => {
      // TLA+ DeleteLocation action: DeleteLocation(userId, locationId)
      const result = await deleteLocation(
        context,
        editorUser.id,
        testLocation.id,
      );

      expect(result.isOk()).toBe(true);
      // Verify state transition: location should be removed from system
    });
  });

  describe("Error handling", () => {
    it("should handle user not found", async () => {
      const result = await deleteLocation(
        context,
        "non-existent-user" as UserId,
        testLocation.id,
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("User not found");
      }
    });

    it("should handle location not found", async () => {
      const result = await deleteLocation(
        context,
        editorUser.id,
        "non-existent-location" as LocationId,
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Location not found");
      }
    });

    it("should handle region not found", async () => {
      // Mock location with non-existent region
      const locationWithBadRegion: Location = {
        ...testLocation,
        regionId: "non-existent-region" as RegionId,
      };
      mockLocationRepository.clear();
      mockLocationRepository.addLocation(locationWithBadRegion);

      const result = await deleteLocation(
        context,
        editorUser.id,
        testLocation.id,
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Region not found");
      }
    });

    it("should handle repository findUser failure", async () => {
      mockUserRepository.setShouldFailOperations(true);

      const result = await deleteLocation(
        context,
        editorUser.id,
        testLocation.id,
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to find user");
      }
    });

    it("should handle repository findLocation failure", async () => {
      mockLocationRepository.setShouldFailOperations(true);

      const result = await deleteLocation(
        context,
        editorUser.id,
        testLocation.id,
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to find location");
      }
    });

    it("should handle repository findRegion failure", async () => {
      mockRegionRepository.setShouldFailOperations(true);

      const result = await deleteLocation(
        context,
        editorUser.id,
        testLocation.id,
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to find region");
      }
    });

    it("should handle repository delete failure", async () => {
      // Override delete method to fail
      const originalDelete = mockLocationRepository.delete.bind(
        mockLocationRepository,
      );
      mockLocationRepository.delete = async () =>
        err(new RepositoryError("Delete failed"));

      const result = await deleteLocation(
        context,
        editorUser.id,
        testLocation.id,
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to delete location");
      }

      // Restore original method
      mockLocationRepository.delete = originalDelete;
    });
  });

  describe("Business logic validation", () => {
    it("should enforce proper deletion workflow", async () => {
      // The delete should complete successfully with all repositories
      const result = await deleteLocation(
        context,
        editorUser.id,
        testLocation.id,
      );

      expect(result.isOk()).toBe(true);

      // Verify the location was deleted
      const locationAfterDelete = await mockLocationRepository.findById(
        testLocation.id,
      );
      expect(locationAfterDelete.isOk()).toBe(true);
      if (locationAfterDelete.isOk()) {
        expect(locationAfterDelete.value).toBe(null);
      }
    });

    it("should validate permissions before deletion attempt", async () => {
      // Test that non-owner cannot delete
      const result = await deleteLocation(
        context,
        otherEditorUser.id,
        testLocation.id,
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(AuthorizationError);
      }

      // Verify the location still exists (deletion was prevented)
      const locationAfterAttempt = await mockLocationRepository.findById(
        testLocation.id,
      );
      expect(locationAfterAttempt.isOk()).toBe(true);
      if (locationAfterAttempt.isOk()) {
        expect(locationAfterAttempt.value).not.toBe(null);
      }
    });
  });
});
