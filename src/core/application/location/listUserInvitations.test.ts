import { MockLocationRepository } from "@/core/adapters/mock/locationRepository";
import { MockRegionRepository } from "@/core/adapters/mock/regionRepository";
import type {
  Location,
  LocationEditor,
  LocationEditorId,
  LocationId,
} from "@/core/domain/location/types";
import type { Region, RegionId } from "@/core/domain/region/types";
import type { UserId } from "@/core/domain/user/types";
import { ApplicationError } from "@/lib/error";
import { RepositoryError } from "@/lib/error";
import { err, ok } from "neverthrow";
import { beforeEach, describe, expect, it } from "vitest";
import type { Context } from "../context";
import { listUserInvitations } from "./listUserInvitations";

describe("listUserInvitations", () => {
  let context: Context;

  const userId = "550e8400-e29b-41d4-a716-446655440001" as UserId;
  const otherUserId = "550e8400-e29b-41d4-a716-446655440002" as UserId;
  const locationId1 = "550e8400-e29b-41d4-a716-446655440003" as LocationId;
  const locationId2 = "550e8400-e29b-41d4-a716-446655440004" as LocationId;
  const regionId1 = "550e8400-e29b-41d4-a716-446655440005" as RegionId;
  const regionId2 = "550e8400-e29b-41d4-a716-446655440006" as RegionId;

  const mockRegion1: Region = {
    id: regionId1,
    name: "Tokyo",
    description: "Tokyo region",
    creatorId: otherUserId,
    latitude: null,
    longitude: null,
    isPublic: true,
    coverPhotoUrl: null,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  };

  const mockRegion2: Region = {
    id: regionId2,
    name: "Osaka",
    description: "Osaka region",
    creatorId: otherUserId,
    latitude: null,
    longitude: null,
    isPublic: true,
    coverPhotoUrl: null,
    createdAt: new Date("2024-01-02"),
    updatedAt: new Date("2024-01-02"),
  };

  const mockLocation1: Location = {
    id: locationId1,
    name: "Tokyo Restaurant",
    description: "A restaurant in Tokyo",
    category: "restaurant",
    regionId: regionId1,
    address: "Tokyo Address",
    latitude: null,
    longitude: null,
    contactInfo: null,
    operatingHours: null,
    isPublic: true,
    coverPhotoUrl: null,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  };

  const mockLocation2: Location = {
    id: locationId2,
    name: "Osaka Cafe",
    description: "A cafe in Osaka",
    category: "cafe",
    regionId: regionId2,
    address: "Osaka Address",
    latitude: null,
    longitude: null,
    contactInfo: null,
    operatingHours: null,
    isPublic: true,
    coverPhotoUrl: null,
    createdAt: new Date("2024-01-02"),
    updatedAt: new Date("2024-01-02"),
  };

  const mockLocationEditor1: LocationEditor = {
    id: "550e8400-e29b-41d4-a716-446655440007" as LocationEditorId,
    locationId: locationId1,
    editorId: userId,
    invitedBy: otherUserId,
    invitedAt: new Date("2024-01-01T10:00:00Z"),
    acceptedAt: null, // Pending invitation
  };

  const mockLocationEditor2: LocationEditor = {
    id: "550e8400-e29b-41d4-a716-446655440008" as LocationEditorId,
    locationId: locationId2,
    editorId: userId,
    invitedBy: otherUserId,
    invitedAt: new Date("2024-01-02T10:00:00Z"),
    acceptedAt: new Date("2024-01-02T11:00:00Z"), // Accepted invitation
  };

  beforeEach(() => {
    context = {
      locationRepository: new MockLocationRepository(),
      regionRepository: new MockRegionRepository(),
    } as Partial<Context> as Context;
  });

  describe("successful invitation listing", () => {
    it("should list user invitations with location and region details", async () => {
      // Arrange
      context.locationRepository.findEditorsByUser = async () =>
        ok([mockLocationEditor1, mockLocationEditor2]);
      context.locationRepository.findById = async (id) => {
        if (id === locationId1) return ok(mockLocation1);
        if (id === locationId2) return ok(mockLocation2);
        return ok(null);
      };
      context.regionRepository.findById = async (id) => {
        if (id === regionId1) return ok(mockRegion1);
        if (id === regionId2) return ok(mockRegion2);
        return ok(null);
      };

      // Act
      const result = await listUserInvitations(context, userId);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(2);

        // Should be sorted by invitation date (newest first)
        expect(result.value[0].locationName).toBe("Osaka Cafe");
        expect(result.value[1].locationName).toBe("Tokyo Restaurant");

        // Check first invitation details
        expect(result.value[0].locationName).toBe("Osaka Cafe");
        expect(result.value[0].regionName).toBe("Osaka");
        expect(result.value[0].isPending).toBe(false); // Accepted
        expect(result.value[0].editorId).toBeDefined();

        // Check second invitation details
        expect(result.value[1].locationName).toBe("Tokyo Restaurant");
        expect(result.value[1].regionName).toBe("Tokyo");
        expect(result.value[1].isPending).toBe(true); // Pending
        expect(result.value[1].editorId).toBeDefined();
      }
    });

    it("should return empty array when user has no invitations", async () => {
      // Arrange
      context.locationRepository.findEditorsByUser = async () => ok([]);

      // Act
      const result = await listUserInvitations(context, userId);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(0);
      }
    });

    it("should filter out invitations with missing location data", async () => {
      // Arrange
      context.locationRepository.findEditorsByUser = async () =>
        ok([mockLocationEditor1, mockLocationEditor2]);
      context.locationRepository.findById = async (id) => {
        if (id === locationId1) return ok(null); // Missing location
        if (id === locationId2) return ok(mockLocation2);
        return ok(null);
      };
      context.regionRepository.findById = async (id) => {
        if (id === regionId2) return ok(mockRegion2);
        return ok(null);
      };

      // Act
      const result = await listUserInvitations(context, userId);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0].locationName).toBe("Osaka Cafe");
      }
    });

    it("should filter out invitations with missing region data", async () => {
      // Arrange
      context.locationRepository.findEditorsByUser = async () =>
        ok([mockLocationEditor1, mockLocationEditor2]);
      context.locationRepository.findById = async (id) => {
        if (id === locationId1) return ok(mockLocation1);
        if (id === locationId2) return ok(mockLocation2);
        return ok(null);
      };
      context.regionRepository.findById = async (id) => {
        if (id === regionId1) return ok(null); // Missing region
        if (id === regionId2) return ok(mockRegion2);
        return ok(null);
      };

      // Act
      const result = await listUserInvitations(context, userId);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0].locationName).toBe("Osaka Cafe");
        expect(result.value[0].regionName).toBe("Osaka");
      }
    });

    it("should correctly identify pending vs accepted invitations", async () => {
      // Arrange
      const pendingInvitation = { ...mockLocationEditor1, acceptedAt: null };
      const acceptedInvitation = {
        ...mockLocationEditor2,
        acceptedAt: new Date(),
      };

      context.locationRepository.findEditorsByUser = async () =>
        ok([pendingInvitation, acceptedInvitation]);
      context.locationRepository.findById = async (id) => {
        if (id === locationId1) return ok(mockLocation1);
        if (id === locationId2) return ok(mockLocation2);
        return ok(null);
      };
      context.regionRepository.findById = async (id) => {
        if (id === regionId1) return ok(mockRegion1);
        if (id === regionId2) return ok(mockRegion2);
        return ok(null);
      };

      // Act
      const result = await listUserInvitations(context, userId);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(2);

        const tokyoInvitation = result.value.find(
          (inv) => inv.locationName === "Tokyo Restaurant",
        );
        const osakaInvitation = result.value.find(
          (inv) => inv.locationName === "Osaka Cafe",
        );

        expect(tokyoInvitation?.isPending).toBe(true);
        expect(osakaInvitation?.isPending).toBe(false);
      }
    });

    it("should sort invitations by date (newest first)", async () => {
      // Arrange
      const oldInvitation = {
        ...mockLocationEditor1,
        invitedAt: new Date("2024-01-01T10:00:00Z"),
      };
      const newInvitation = {
        ...mockLocationEditor2,
        invitedAt: new Date("2024-01-03T10:00:00Z"),
      };

      context.locationRepository.findEditorsByUser = async () =>
        ok([oldInvitation, newInvitation]);
      context.locationRepository.findById = async (id) => {
        if (id === locationId1) return ok(mockLocation1);
        if (id === locationId2) return ok(mockLocation2);
        return ok(null);
      };
      context.regionRepository.findById = async (id) => {
        if (id === regionId1) return ok(mockRegion1);
        if (id === regionId2) return ok(mockRegion2);
        return ok(null);
      };

      // Act
      const result = await listUserInvitations(context, userId);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(2);
        // Newer invitation should be first
        expect(result.value[0].locationName).toBe("Osaka Cafe");
        expect(result.value[1].locationName).toBe("Tokyo Restaurant");
      }
    });
  });

  describe("repository errors", () => {
    it("should fail when finding editors by user fails", async () => {
      // Arrange
      context.locationRepository.findEditorsByUser = async () =>
        err(new RepositoryError("Database error"));

      // Act
      const result = await listUserInvitations(context, userId);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to list user invitations");
      }
    });

    it("should handle location repository failures gracefully", async () => {
      // Arrange
      context.locationRepository.findEditorsByUser = async () =>
        ok([mockLocationEditor1]);
      context.locationRepository.findById = async () =>
        err(new RepositoryError("Location not found"));

      // Act
      const result = await listUserInvitations(context, userId);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // Should filter out invitations with failed location lookups
        expect(result.value).toHaveLength(0);
      }
    });

    it("should handle region repository failures gracefully", async () => {
      // Arrange
      context.locationRepository.findEditorsByUser = async () =>
        ok([mockLocationEditor1]);
      context.locationRepository.findById = async () => ok(mockLocation1);
      context.regionRepository.findById = async () =>
        err(new RepositoryError("Region not found"));

      // Act
      const result = await listUserInvitations(context, userId);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // Should filter out invitations with failed region lookups
        expect(result.value).toHaveLength(0);
      }
    });
  });

  describe("edge cases", () => {
    it("should handle user with many invitations", async () => {
      // Arrange - Create many invitations
      const manyEditors = Array.from({ length: 50 }, (_, i) => ({
        ...mockLocationEditor1,
        id: `editor-${i}` as LocationEditorId,
        locationId: `location-${i}` as LocationId,
        invitedAt: new Date(
          `2024-01-${String(i + 1).padStart(2, "0")}T10:00:00Z`,
        ),
      }));

      context.locationRepository.findEditorsByUser = async () =>
        ok(manyEditors);
      context.locationRepository.findById = async (id) => {
        const index = id.replace("location-", "");
        return ok({
          ...mockLocation1,
          id,
          name: `Location ${index}`,
        });
      };
      context.regionRepository.findById = async () => ok(mockRegion1);

      // Act
      const result = await listUserInvitations(context, userId);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(50);
        // Should be sorted by date (newest first)
        expect(result.value[0].locationName).toBe("Location 49");
        expect(result.value[49].locationName).toBe("Location 0");
      }
    });

    it("should handle mixed valid and invalid invitations", async () => {
      // Arrange - Mix of valid and invalid invitations
      const mixedEditors = [
        mockLocationEditor1, // Valid
        {
          ...mockLocationEditor2,
          locationId: "invalid-location" as LocationId,
        }, // Invalid location
        mockLocationEditor2, // Valid
      ];

      context.locationRepository.findEditorsByUser = async () =>
        ok(mixedEditors);
      context.locationRepository.findById = async (id) => {
        if (id === locationId1) return ok(mockLocation1);
        if (id === locationId2) return ok(mockLocation2);
        if (id === "invalid-location") return ok(null);
        return ok(null);
      };
      context.regionRepository.findById = async (id) => {
        if (id === regionId1) return ok(mockRegion1);
        if (id === regionId2) return ok(mockRegion2);
        return ok(null);
      };

      // Act
      const result = await listUserInvitations(context, userId);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(2); // Only valid invitations
        expect(
          result.value.every((inv) => inv.locationName && inv.regionName),
        ).toBe(true);
      }
    });
  });

  describe("formal specification compliance", () => {
    it("should enforce business rules for invitation listing", async () => {
      // Arrange
      context.locationRepository.findEditorsByUser = async () =>
        ok([mockLocationEditor1, mockLocationEditor2]);
      context.locationRepository.findById = async (id) => {
        if (id === locationId1) return ok(mockLocation1);
        if (id === locationId2) return ok(mockLocation2);
        return ok(null);
      };
      context.regionRepository.findById = async (id) => {
        if (id === regionId1) return ok(mockRegion1);
        if (id === regionId2) return ok(mockRegion2);
        return ok(null);
      };

      // Act
      const result = await listUserInvitations(context, userId);

      // Assert - Verify business rules are followed
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        for (const invitation of result.value) {
          // All invitations should have required fields
          expect(invitation.id).toBeDefined();
          expect(invitation.locationId).toBeDefined();
          expect(invitation.editorId).toBe(userId);
          expect(invitation.invitedBy).toBeDefined();
          expect(invitation.editorId).toBeDefined();
          expect(invitation.invitedAt).toBeInstanceOf(Date);
          expect(invitation.locationName).toBeTruthy();
          expect(invitation.regionName).toBeTruthy();
          expect(typeof invitation.isPending).toBe("boolean");
        }
      }
    });

    it("should maintain system invariants during invitation aggregation", async () => {
      // Arrange
      context.locationRepository.findEditorsByUser = async (userId) => {
        // Verify user ID is properly passed
        expect(userId).toBeDefined();
        return ok([mockLocationEditor1]);
      };
      context.locationRepository.findById = async (locationId) => {
        // Verify location lookup is for correct ID
        expect(locationId).toBe(mockLocationEditor1.locationId);
        return ok(mockLocation1);
      };
      context.regionRepository.findById = async (regionId) => {
        // Verify region lookup is for correct ID
        expect(regionId).toBe(mockLocation1.regionId);
        return ok(mockRegion1);
      };

      // Act
      const result = await listUserInvitations(context, userId);

      // Assert - System state should remain consistent
      expect(result.isOk()).toBe(true);
    });

    it("should handle invitation status transitions correctly", async () => {
      // Test different invitation states
      const invitationStates = [
        { ...mockLocationEditor1, acceptedAt: null, description: "pending" },
        {
          ...mockLocationEditor1,
          acceptedAt: new Date(),
          description: "accepted",
        },
      ];

      for (const state of invitationStates) {
        // Arrange
        context.locationRepository.findEditorsByUser = async () => ok([state]);
        context.locationRepository.findById = async () => ok(mockLocation1);
        context.regionRepository.findById = async () => ok(mockRegion1);

        // Act
        const result = await listUserInvitations(context, userId);

        // Assert
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toHaveLength(1);
          expect(result.value[0].isPending).toBe(state.acceptedAt === null);
        }
      }
    });

    it("should preserve data relationships during aggregation", async () => {
      // Arrange
      context.locationRepository.findEditorsByUser = async () =>
        ok([mockLocationEditor1, mockLocationEditor2]);
      context.locationRepository.findById = async (id) => {
        if (id === locationId1) return ok(mockLocation1);
        if (id === locationId2) return ok(mockLocation2);
        return ok(null);
      };
      context.regionRepository.findById = async (id) => {
        if (id === regionId1) return ok(mockRegion1);
        if (id === regionId2) return ok(mockRegion2);
        return ok(null);
      };

      // Act
      const result = await listUserInvitations(context, userId);

      // Assert - Data relationships should be preserved
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        for (const invitation of result.value) {
          // Location should belong to the correct region
          if (invitation.locationName === "Tokyo Restaurant") {
            expect(invitation.regionName).toBe("Tokyo");
          }
          if (invitation.locationName === "Osaka Cafe") {
            expect(invitation.regionName).toBe("Osaka");
          }

          // User ID should match the requested user
          expect(invitation.editorId).toBe(userId);
        }
      }
    });
  });
});
