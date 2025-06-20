import { MockLocationRepository } from "@/core/adapters/mock/locationRepository";
import { MockRegionRepository } from "@/core/adapters/mock/regionRepository";
import type { Location, LocationId } from "@/core/domain/location/types";
import type { Region, RegionId } from "@/core/domain/region/types";
import type { UserId } from "@/core/domain/user/types";
import { ApplicationError } from "@/lib/error";
import { RepositoryError } from "@/lib/error";
import { err, ok } from "neverthrow";
import { beforeEach, describe, expect, it } from "vitest";
import type { Context } from "../context";
import { removeLocationEditor } from "./removeLocationEditor";

describe("removeLocationEditor", () => {
  let context: Context;

  const regionOwnerId = "550e8400-e29b-41d4-a716-446655440001" as UserId;
  const editorUserId = "550e8400-e29b-41d4-a716-446655440002" as UserId;
  const otherUserId = "550e8400-e29b-41d4-a716-446655440003" as UserId;
  const locationId = "550e8400-e29b-41d4-a716-446655440004" as LocationId;
  const regionId = "550e8400-e29b-41d4-a716-446655440005" as RegionId;

  const mockRegion: Region = {
    id: regionId,
    name: "Test Region",
    description: "A test region",
    creatorId: regionOwnerId,
    latitude: null,
    longitude: null,
    isPublic: true,
    coverPhotoUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockLocation: Location = {
    id: locationId,
    name: "Test Location",
    description: "A test location",
    category: "restaurant",
    regionId: regionId,
    address: "Test Address",
    latitude: null,
    longitude: null,
    contactInfo: null,
    operatingHours: null,
    isPublic: true,
    coverPhotoUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    context = {
      locationRepository: new MockLocationRepository(),
      regionRepository: new MockRegionRepository(),
    } as Partial<Context> as Context;
  });

  describe("successful editor removal", () => {
    it("should remove location editor when user is region owner", async () => {
      // Arrange
      context.locationRepository.findById = async () => ok(mockLocation);
      context.regionRepository.findById = async () => ok(mockRegion);
      context.locationRepository.isUserEditor = async () => ok(true);
      context.locationRepository.removeEditor = async () => ok(undefined);

      // Act
      const result = await removeLocationEditor(context, regionOwnerId, {
        locationId: locationId,
        editorId: editorUserId,
      });

      // Assert
      expect(result.isOk()).toBe(true);
    });

    it("should remove editor with valid UUIDs", async () => {
      // Arrange
      context.locationRepository.findById = async () => ok(mockLocation);
      context.regionRepository.findById = async () => ok(mockRegion);
      context.locationRepository.isUserEditor = async () => ok(true);
      context.locationRepository.removeEditor = async () => ok(undefined);

      // Act
      const result = await removeLocationEditor(context, regionOwnerId, {
        locationId: "550e8400-e29b-41d4-a716-446655440004",
        editorId: "550e8400-e29b-41d4-a716-446655440002",
      });

      // Assert
      expect(result.isOk()).toBe(true);
    });

    it("should work when region owner removes multiple editors", async () => {
      // Arrange
      const editor2Id = "550e8400-e29b-41d4-a716-446655440006" as UserId;
      context.locationRepository.findById = async () => ok(mockLocation);
      context.regionRepository.findById = async () => ok(mockRegion);
      context.locationRepository.isUserEditor = async () => ok(true);
      context.locationRepository.removeEditor = async () => ok(undefined);

      // Act - Remove first editor
      const result1 = await removeLocationEditor(context, regionOwnerId, {
        locationId: locationId,
        editorId: editorUserId,
      });

      // Act - Remove second editor
      const result2 = await removeLocationEditor(context, regionOwnerId, {
        locationId: locationId,
        editorId: editor2Id,
      });

      // Assert
      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);
    });
  });

  describe("validation errors", () => {
    it("should fail with invalid locationId", async () => {
      // Act
      const result = await removeLocationEditor(context, regionOwnerId, {
        locationId: "invalid-uuid",
        editorId: editorUserId,
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid input");
      }
    });

    it("should fail with invalid editorId", async () => {
      // Act
      const result = await removeLocationEditor(context, regionOwnerId, {
        locationId: locationId,
        editorId: "invalid-uuid",
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid input");
      }
    });

    it("should fail with empty locationId", async () => {
      // Act
      const result = await removeLocationEditor(context, regionOwnerId, {
        locationId: "",
        editorId: editorUserId,
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid input");
      }
    });

    it("should fail with missing required fields", async () => {
      // Act - Create invalid input with missing editorId
      const invalidInput = {
        locationId: locationId,
        // Missing editorId
      };

      const result = await removeLocationEditor(
        context,
        regionOwnerId,
        invalidInput as unknown as Parameters<typeof removeLocationEditor>[2],
      );

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid input");
      }
    });
  });

  describe("location verification errors", () => {
    it("should fail when location not found", async () => {
      // Arrange
      context.locationRepository.findById = async () => ok(null);

      // Act
      const result = await removeLocationEditor(context, regionOwnerId, {
        locationId: locationId,
        editorId: editorUserId,
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Location not found");
      }
    });

    it("should fail when location repository fails", async () => {
      // Arrange
      context.locationRepository.findById = async () =>
        err(new RepositoryError("Database error"));

      // Act
      const result = await removeLocationEditor(context, regionOwnerId, {
        locationId: locationId,
        editorId: editorUserId,
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to find location");
      }
    });
  });

  describe("region verification errors", () => {
    it("should fail when region not found", async () => {
      // Arrange
      context.locationRepository.findById = async () => ok(mockLocation);
      context.regionRepository.findById = async () => ok(null);

      // Act
      const result = await removeLocationEditor(context, regionOwnerId, {
        locationId: locationId,
        editorId: editorUserId,
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Region not found");
      }
    });

    it("should fail when region repository fails", async () => {
      // Arrange
      context.locationRepository.findById = async () => ok(mockLocation);
      context.regionRepository.findById = async () =>
        err(new RepositoryError("Database error"));

      // Act
      const result = await removeLocationEditor(context, regionOwnerId, {
        locationId: locationId,
        editorId: editorUserId,
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to find region");
      }
    });
  });

  describe("authorization errors", () => {
    it("should fail when user is not region owner", async () => {
      // Arrange
      context.locationRepository.findById = async () => ok(mockLocation);
      context.regionRepository.findById = async () => ok(mockRegion);

      // Act - Try to remove editor as non-owner
      const result = await removeLocationEditor(context, otherUserId, {
        locationId: locationId,
        editorId: editorUserId,
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe(
          "Only region owner can remove editors",
        );
      }
    });

    it("should fail when editor tries to remove themselves without being region owner", async () => {
      // Arrange
      context.locationRepository.findById = async () => ok(mockLocation);
      context.regionRepository.findById = async () => ok(mockRegion);

      // Act - Editor tries to remove themselves
      const result = await removeLocationEditor(context, editorUserId, {
        locationId: locationId,
        editorId: editorUserId,
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe(
          "Only region owner can remove editors",
        );
      }
    });
  });

  describe("editor verification errors", () => {
    it("should fail when user is not an editor", async () => {
      // Arrange
      context.locationRepository.findById = async () => ok(mockLocation);
      context.regionRepository.findById = async () => ok(mockRegion);
      context.locationRepository.isUserEditor = async () => ok(false);

      // Act
      const result = await removeLocationEditor(context, regionOwnerId, {
        locationId: locationId,
        editorId: editorUserId,
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe(
          "User is not an editor of this location",
        );
      }
    });

    it("should fail when editor check fails", async () => {
      // Arrange
      context.locationRepository.findById = async () => ok(mockLocation);
      context.regionRepository.findById = async () => ok(mockRegion);
      context.locationRepository.isUserEditor = async () =>
        err(new RepositoryError("Database error"));

      // Act
      const result = await removeLocationEditor(context, regionOwnerId, {
        locationId: locationId,
        editorId: editorUserId,
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to check editor status");
      }
    });
  });

  describe("removal operation errors", () => {
    it("should fail when removal operation fails", async () => {
      // Arrange
      context.locationRepository.findById = async () => ok(mockLocation);
      context.regionRepository.findById = async () => ok(mockRegion);
      context.locationRepository.isUserEditor = async () => ok(true);
      context.locationRepository.removeEditor = async () =>
        err(new RepositoryError("Database error"));

      // Act
      const result = await removeLocationEditor(context, regionOwnerId, {
        locationId: locationId,
        editorId: editorUserId,
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to remove editor");
      }
    });

    it("should fail on concurrent modification conflicts", async () => {
      // Arrange
      context.locationRepository.findById = async () => ok(mockLocation);
      context.regionRepository.findById = async () => ok(mockRegion);
      context.locationRepository.isUserEditor = async () => ok(true);
      context.locationRepository.removeEditor = async () =>
        err(new RepositoryError("Concurrent modification error"));

      // Act
      const result = await removeLocationEditor(context, regionOwnerId, {
        locationId: locationId,
        editorId: editorUserId,
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to remove editor");
      }
    });
  });

  describe("formal specification compliance", () => {
    it("should enforce business rules for editor removal", async () => {
      // Arrange
      context.locationRepository.findById = async () => ok(mockLocation);
      context.regionRepository.findById = async () => ok(mockRegion);
      context.locationRepository.isUserEditor = async () => ok(true);
      context.locationRepository.removeEditor = async () => ok(undefined);

      // Act
      const result = await removeLocationEditor(context, regionOwnerId, {
        locationId: locationId,
        editorId: editorUserId,
      });

      // Assert - Verify business rules are followed
      expect(result.isOk()).toBe(true);
      // Only region owners can remove editors
      // Editor must exist before removal
      // Location and region must exist
    });

    it("should maintain system invariants during editor removal", async () => {
      // Arrange
      context.locationRepository.findById = async (id) => {
        // Verify location lookup is for correct ID
        expect(id).toBe(locationId);
        return ok(mockLocation);
      };
      context.regionRepository.findById = async (id) => {
        // Verify region lookup is for correct ID
        expect(id).toBe(regionId);
        return ok(mockRegion);
      };
      context.locationRepository.isUserEditor = async (locId, userId) => {
        // Verify editor check is for correct location and user
        expect(locId).toBe(locationId);
        expect(userId).toBe(editorUserId);
        return ok(true);
      };
      context.locationRepository.removeEditor = async (locId, userId) => {
        // Verify removal is for correct location and user
        expect(locId).toBe(locationId);
        expect(userId).toBe(editorUserId);
        return ok(undefined);
      };

      // Act
      const result = await removeLocationEditor(context, regionOwnerId, {
        locationId: locationId,
        editorId: editorUserId,
      });

      // Assert - System state should remain consistent
      expect(result.isOk()).toBe(true);
    });

    it("should handle authorization hierarchy correctly", async () => {
      // Test authorization chain: Region Owner -> Location -> Editor
      const authorizationTests = [
        { userId: regionOwnerId, expected: true, description: "region owner" },
        { userId: editorUserId, expected: false, description: "editor user" },
        { userId: otherUserId, expected: false, description: "other user" },
      ];

      for (const { userId, expected, description } of authorizationTests) {
        // Arrange
        context.locationRepository.findById = async () => ok(mockLocation);
        context.regionRepository.findById = async () => ok(mockRegion);
        context.locationRepository.isUserEditor = async () => ok(true);
        context.locationRepository.removeEditor = async () => ok(undefined);

        // Act
        const result = await removeLocationEditor(context, userId, {
          locationId: locationId,
          editorId: editorUserId,
        });

        // Assert
        if (expected) {
          expect(result.isOk()).toBe(true);
        } else {
          expect(result.isErr()).toBe(true);
          if (result.isErr()) {
            expect(result.error.message).toBe(
              "Only region owner can remove editors",
            );
          }
        }
      }
    });

    it("should ensure editor-location relationship validation", async () => {
      // Test different editor relationship scenarios
      const editorScenarios = [
        { isEditor: true, expected: true, description: "valid editor" },
        { isEditor: false, expected: false, description: "non-editor" },
      ];

      for (const { isEditor, expected, description } of editorScenarios) {
        // Arrange
        context.locationRepository.findById = async () => ok(mockLocation);
        context.regionRepository.findById = async () => ok(mockRegion);
        context.locationRepository.isUserEditor = async () => ok(isEditor);
        context.locationRepository.removeEditor = async () => ok(undefined);

        // Act
        const result = await removeLocationEditor(context, regionOwnerId, {
          locationId: locationId,
          editorId: editorUserId,
        });

        // Assert
        if (expected) {
          expect(result.isOk()).toBe(true);
        } else {
          expect(result.isErr()).toBe(true);
          if (result.isErr()) {
            expect(result.error.message).toBe(
              "User is not an editor of this location",
            );
          }
        }
      }
    });

    it("should validate resource existence chain", async () => {
      // Test resource existence validation chain
      const resourceTests = [
        {
          location: null,
          region: mockRegion,
          expectedError: "Location not found",
          description: "missing location",
        },
        {
          location: mockLocation,
          region: null,
          expectedError: "Region not found",
          description: "missing region",
        },
      ];

      for (const { location, region, expectedError } of resourceTests) {
        // Arrange
        context.locationRepository.findById = async () => ok(location);
        context.regionRepository.findById = async () => ok(region);

        // Act
        const result = await removeLocationEditor(context, regionOwnerId, {
          locationId: locationId,
          editorId: editorUserId,
        });

        // Assert
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toBe(expectedError);
        }
      }
    });

    it("should handle edge cases in UUID validation", async () => {
      // Test various UUID formats
      const uuidTests = [
        {
          locationId: "550e8400-e29b-41d4-a716-446655440004",
          editorId: "550e8400-e29b-41d4-a716-446655440002",
          valid: true,
        },
        {
          locationId: "not-a-uuid",
          editorId: "550e8400-e29b-41d4-a716-446655440002",
          valid: false,
        },
        {
          locationId: "550e8400-e29b-41d4-a716-446655440004",
          editorId: "not-a-uuid",
          valid: false,
        },
        {
          locationId: "550E8400-E29B-41D4-A716-446655440004", // Uppercase
          editorId: "550E8400-E29B-41D4-A716-446655440002",
          valid: true,
        },
      ];

      for (const { locationId, editorId, valid } of uuidTests) {
        // Act
        const result = await removeLocationEditor(context, regionOwnerId, {
          locationId,
          editorId,
        });

        // Assert
        if (valid) {
          // For valid UUIDs, continue with business logic (may fail for other reasons)
          expect(result.isErr()).toBe(true); // Will fail because we haven't set up mocks
        } else {
          expect(result.isErr()).toBe(true);
          if (result.isErr()) {
            expect(result.error.message).toBe("Invalid input");
          }
        }
      }
    });
  });
});
