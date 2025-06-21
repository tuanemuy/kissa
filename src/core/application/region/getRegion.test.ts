import { MockRegionRepository } from "@/core/adapters/mock/regionRepository";
import type { Region, RegionId } from "@/core/domain/region/types";
import type { User, UserId } from "@/core/domain/user/types";
import { ApplicationError } from "@/lib/error";
import { ok } from "neverthrow";
import { beforeEach, describe, expect, it } from "vitest";
import type { Context } from "../context";
import { createMockContext } from "../testUtils/mockContext";
import { getRegion, getRegionWithStats } from "./getRegion";

describe("getRegion", () => {
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
    name: "Test Region",
    description: "Test region for retrieval",
    creatorId: editorUser.id,
    isPublic: true,
    latitude: 35.6762,
    longitude: 139.6503,
    coverPhotoUrl: "https://example.com/cover.jpg",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockRegionRepository = new MockRegionRepository();
    mockRegionRepository.addRegion(testRegion);

    context = createMockContext({
      regionRepository: mockRegionRepository,
    });
  });

  describe("Basic get functionality", () => {
    it("should get region by ID", async () => {
      const input = {
        id: testRegion.id,
      };

      const result = await getRegion(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const region = result.value;
        expect(region).not.toBe(null);
        if (region) {
          expect(region.id).toBe(testRegion.id);
          expect(region.name).toBe(testRegion.name);
          expect(region.description).toBe(testRegion.description);
          expect(region.creatorId).toBe(testRegion.creatorId);
          expect(region.isPublic).toBe(testRegion.isPublic);
          expect(region.latitude).toBe(testRegion.latitude);
          expect(region.longitude).toBe(testRegion.longitude);
          expect(region.coverPhotoUrl).toBe(testRegion.coverPhotoUrl);
        }
      }
    });

    it("should return null for non-existent region", async () => {
      const input = {
        id: "non-existent-region" as RegionId,
      };

      const result = await getRegion(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(null);
      }
    });
  });

  describe("Get region with stats", () => {
    it("should get region with stats by ID", async () => {
      const input = {
        id: testRegion.id,
      };

      const result = await getRegionWithStats(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const regionWithStats = result.value;
        expect(regionWithStats).not.toBe(null);
        if (regionWithStats) {
          expect(regionWithStats.id).toBe(testRegion.id);
          expect(regionWithStats.name).toBe(testRegion.name);
          expect(regionWithStats.description).toBe(testRegion.description);
          expect(regionWithStats.creatorId).toBe(testRegion.creatorId);
          expect(regionWithStats.isPublic).toBe(testRegion.isPublic);

          // Check stats fields
          expect(typeof regionWithStats.locationCount).toBe("number");
          expect(typeof regionWithStats.favoriteCount).toBe("number");
          expect(typeof regionWithStats.checkInCount).toBe("number");
          expect(regionWithStats.locationCount).toBeGreaterThanOrEqual(0);
          expect(regionWithStats.favoriteCount).toBeGreaterThanOrEqual(0);
          expect(regionWithStats.checkInCount).toBeGreaterThanOrEqual(0);
        }
      }
    });

    it("should return null for non-existent region with stats", async () => {
      const input = {
        id: "non-existent-region" as RegionId,
      };

      const result = await getRegionWithStats(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(null);
      }
    });
  });

  describe("Input validation", () => {
    it("should reject invalid region ID", async () => {
      const input = {
        id: "invalid-id",
      };

      const result = await getRegion(context, input as never);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid input");
      }
    });

    it("should reject invalid region ID for getRegionWithStats", async () => {
      const input = {
        id: "invalid-id",
      };

      const result = await getRegionWithStats(context, input as never);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid input");
      }
    });
  });

  describe("Error handling", () => {
    it("should handle repository failure", async () => {
      mockRegionRepository.setShouldFailOperations(true);

      const input = {
        id: testRegion.id,
      };

      const result = await getRegion(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to get region");
      }
    });

    it("should handle repository failure for getRegionWithStats", async () => {
      mockRegionRepository.setShouldFailOperations(true);

      const input = {
        id: testRegion.id,
      };

      const result = await getRegionWithStats(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to get region with stats");
      }
    });
  });

  describe("Region data integrity", () => {
    it("should preserve all region fields", async () => {
      const input = {
        id: testRegion.id,
      };

      const result = await getRegion(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk() && result.value) {
        const region = result.value;

        // Check all fields are preserved
        expect(region.id).toBe(testRegion.id);
        expect(region.name).toBe(testRegion.name);
        expect(region.description).toBe(testRegion.description);
        expect(region.creatorId).toBe(testRegion.creatorId);
        expect(region.isPublic).toBe(testRegion.isPublic);
        expect(region.latitude).toBe(testRegion.latitude);
        expect(region.longitude).toBe(testRegion.longitude);
        expect(region.coverPhotoUrl).toBe(testRegion.coverPhotoUrl);
        expect(region.createdAt).toEqual(testRegion.createdAt);
        expect(region.updatedAt).toEqual(testRegion.updatedAt);
      }
    });

    it("should handle regions with null values", async () => {
      const regionWithNulls: Region = {
        id: "region-null" as RegionId,
        name: "Region with Nulls",
        description: null,
        creatorId: editorUser.id,
        isPublic: false,
        latitude: null,
        longitude: null,
        coverPhotoUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRegionRepository.addRegion(regionWithNulls);

      const input = {
        id: regionWithNulls.id,
      };

      const result = await getRegion(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk() && result.value) {
        const region = result.value;
        expect(region.description).toBe(null);
        expect(region.latitude).toBe(null);
        expect(region.longitude).toBe(null);
        expect(region.coverPhotoUrl).toBe(null);
      }
    });
  });
});
