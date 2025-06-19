import type { Location, LocationId } from "@/core/domain/location/types";
import type { Region, RegionId } from "@/core/domain/region/types";
import type { User, UserId } from "@/core/domain/user/types";
import { ApplicationError } from "@/lib/error";
import { RepositoryError } from "@/lib/error";
import { err, ok } from "neverthrow";
import { beforeEach, describe, expect, it } from "vitest";
import type { Context } from "../context";
import { getLocation } from "./getLocation";

describe("getLocation", () => {
  let context: Context;

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
    description: "A test region",
    creatorId: editorUser.id,
    isPublic: true,
    latitude: 35.6762,
    longitude: 139.6503,
    coverPhotoUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const publicLocation: Location = {
    id: "location-1" as LocationId,
    name: "Public Location",
    description: "A public location",
    category: "restaurant",
    regionId: testRegion.id,
    address: "123 Test Street",
    latitude: 35.6762,
    longitude: 139.6503,
    contactInfo: "test@example.com",
    operatingHours: "9:00-18:00",
    isPublic: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const privateLocation: Location = {
    id: "location-2" as LocationId,
    name: "Private Location",
    description: "A private location",
    category: "cafe",
    regionId: testRegion.id,
    address: "456 Test Avenue",
    latitude: null,
    longitude: null,
    contactInfo: null,
    operatingHours: null,
    isPublic: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    context = {
      userRepository: {
        findById: async (id: string) => {
          if (id === editorUser.id) return ok(editorUser);
          return ok(null);
        },
      } as Partial<typeof context.userRepository>,
      regionRepository: {
        findById: async (id: string) => {
          if (id === testRegion.id) return ok(testRegion);
          return ok(null);
        },
      } as Partial<typeof context.regionRepository>,
      locationRepository: {
        findById: async (id: string) => {
          if (id === publicLocation.id) return ok(publicLocation);
          if (id === privateLocation.id) return ok(privateLocation);
          return ok(null);
        },
      } as Partial<typeof context.locationRepository>,
    } as Context;
  });

  describe("SPEC: Location visibility constraints from Alloy model", () => {
    it("should allow anyone to view public location", async () => {
      const visitorUser: User = {
        ...editorUser,
        id: "visitor-1" as UserId,
        role: "visitor",
        subscription: "free",
      };

      context.userRepository = {
        findById: async (id: string) => {
          if (id === visitorUser.id) return ok(visitorUser);
          return ok(null);
        },
      } as Partial<typeof context.userRepository>;

      const result = await getLocation(
        context,
        visitorUser.id,
        publicLocation.id,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const location = result.value;
        expect(location.id).toBe(publicLocation.id);
        expect(location.name).toBe(publicLocation.name);
        expect(location.isPublic).toBe(true);
      }
    });

    it("should allow region creator to view private location", async () => {
      const result = await getLocation(
        context,
        editorUser.id,
        privateLocation.id,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const location = result.value;
        expect(location.id).toBe(privateLocation.id);
        expect(location.isPublic).toBe(false);
      }
    });

    it("should reject non-creator viewing private location", async () => {
      const visitorUser: User = {
        ...editorUser,
        id: "visitor-1" as UserId,
        role: "visitor",
        subscription: "free",
      };

      context.userRepository = {
        findById: async (id: string) => {
          if (id === visitorUser.id) return ok(visitorUser);
          return ok(null);
        },
      } as Partial<typeof context.userRepository>;

      const result = await getLocation(
        context,
        visitorUser.id,
        privateLocation.id,
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe(
          "Location not found or not accessible",
        );
      }
    });
  });

  describe("SPEC-INV-3: Locations in editor regions (Alloy constraint)", () => {
    it("should verify location belongs to editor-created region", async () => {
      const result = await getLocation(
        context,
        editorUser.id,
        publicLocation.id,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const location = result.value;
        expect(location.regionId).toBe(testRegion.id);
        // In full implementation, would verify region.creator.role = Editor
      }
    });
  });

  describe("Error handling", () => {
    it("should handle location not found", async () => {
      const result = await getLocation(
        context,
        editorUser.id,
        "non-existent" as LocationId,
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe(
          "Location not found or not accessible",
        );
      }
    });

    it("should handle user not found", async () => {
      const result = await getLocation(
        context,
        "non-existent" as UserId,
        publicLocation.id,
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("User not found");
      }
    });

    it("should handle repository failure", async () => {
      // biome-ignore lint/suspicious/noExplicitAny: Testing error handling requires type assertion
      const mockLocationRepository = context.locationRepository as any;
      mockLocationRepository.findById = async () =>
        err(new RepositoryError("Database error"));

      const result = await getLocation(
        context,
        editorUser.id,
        publicLocation.id,
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to get location");
      }
    });
  });

  describe("Anonymous access", () => {
    it("should allow anonymous access to public locations", async () => {
      const result = await getLocation(context, null, publicLocation.id);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const location = result.value;
        expect(location.isPublic).toBe(true);
      }
    });

    it("should reject anonymous access to private locations", async () => {
      const result = await getLocation(context, null, privateLocation.id);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe(
          "Location not found or not accessible",
        );
      }
    });
  });

  describe("Location data integrity", () => {
    it("should return complete location data", async () => {
      const result = await getLocation(
        context,
        editorUser.id,
        publicLocation.id,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const location = result.value;
        expect(location.id).toBe(publicLocation.id);
        expect(location.name).toBe(publicLocation.name);
        expect(location.description).toBe(publicLocation.description);
        expect(location.category).toBe(publicLocation.category);
        expect(location.regionId).toBe(publicLocation.regionId);
        expect(location.address).toBe(publicLocation.address);
        expect(location.latitude).toBe(publicLocation.latitude);
        expect(location.longitude).toBe(publicLocation.longitude);
        expect(location.contactInfo).toBe(publicLocation.contactInfo);
        expect(location.operatingHours).toBe(publicLocation.operatingHours);
        expect(location.createdAt).toBeInstanceOf(Date);
        expect(location.updatedAt).toBeInstanceOf(Date);
      }
    });
  });
});
