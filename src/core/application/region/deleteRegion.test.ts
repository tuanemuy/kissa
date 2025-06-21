import { MockLocationRepository } from "@/core/adapters/mock/locationRepository";
import { MockRegionRepository } from "@/core/adapters/mock/regionRepository";
import type { LocationId } from "@/core/domain/location/types";
import type { Region, RegionId } from "@/core/domain/region/types";
import type { User, UserId } from "@/core/domain/user/types";
import { ApplicationError } from "@/lib/error";
import { ok } from "neverthrow";
import { beforeEach, describe, expect, it } from "vitest";
import type { Context } from "../context";
import { createMockContext } from "../testUtils/mockContext";
import { deleteRegion } from "./deleteRegion";

describe("deleteRegion", () => {
  let context: Context;
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

  const testRegion: Region = {
    id: "region-1" as RegionId,
    name: "Test Region",
    description: "Test region for deletion",
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
    mockLocationRepository = new MockLocationRepository();
    mockRegionRepository.addRegion(testRegion);

    context = createMockContext({
      regionRepository: mockRegionRepository,
      locationRepository: mockLocationRepository,
    });
  });

  describe("Basic delete functionality", () => {
    it("should delete region successfully", async () => {
      const input = {
        id: testRegion.id,
        userId: editorUser.id,
      };

      const result = await deleteRegion(context, input);

      expect(result.isOk()).toBe(true);

      // Verify region is deleted
      const findResult = await mockRegionRepository.findById(testRegion.id);
      expect(findResult.isOk()).toBe(true);
      if (findResult.isOk()) {
        expect(findResult.value).toBe(null);
      }
    });
  });

  describe("Authorization", () => {
    it("should reject deletion by non-owner", async () => {
      const input = {
        id: testRegion.id,
        userId: "other-user" as UserId,
      };

      const result = await deleteRegion(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Unauthorized to delete this region");
      }
    });
  });

  describe("Input validation", () => {
    it("should reject invalid region ID", async () => {
      const input = {
        id: "invalid-id",
        userId: editorUser.id,
      };

      const result = await deleteRegion(context, input as never);

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
      };

      const result = await deleteRegion(context, input as never);

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
      };

      const result = await deleteRegion(context, input);

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
      };

      const result = await deleteRegion(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to find region");
      }
    });
  });

  describe("Location dependency check", () => {
    it("should prevent deletion when region has locations", async () => {
      // Add a location to the region to simulate dependency
      const location = {
        id: "location-1" as LocationId,
        name: "Test Location",
        description: "Test location",
        category: "restaurant",
        regionId: testRegion.id,
        address: "123 Test St",
        latitude: null,
        longitude: null,
        contactInfo: null,
        operatingHours: null,
        coverPhotoUrl: null,
        isPublic: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockLocationRepository.addLocation(location);

      const input = {
        id: testRegion.id,
        userId: editorUser.id,
      };

      const result = await deleteRegion(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toContain(
          "Cannot delete region with existing locations",
        );
      }
    });
  });
});
