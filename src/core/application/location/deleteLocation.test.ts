import type { Location, LocationId } from "@/core/domain/location/types";
import type { Region, RegionId } from "@/core/domain/region/types";
import type { User, UserId } from "@/core/domain/user/types";
import { ApplicationError, AuthorizationError } from "@/lib/error";
import { RepositoryError } from "@/lib/error";
import { err, ok } from "neverthrow";
import { beforeEach, describe, expect, it } from "vitest";
import type { Context } from "../context";
import { deleteLocation } from "./deleteLocation";

describe("deleteLocation", () => {
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
    contactEmail: "test@example.com",
    contactPhone: "+1234567890",
    website: "https://test.example.com",
    operatingHours: "9AM-5PM",
    photoUrls: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    context = {
      userRepository: {
        findById: async (id: UserId) => {
          if (id === editorUser.id) return ok(editorUser);
          if (id === otherEditorUser.id) return ok(otherEditorUser);
          if (id === visitorUser.id) return ok(visitorUser);
          return ok(null);
        },
        // biome-ignore lint/suspicious/noExplicitAny: Mock context setup requires type assertion
      } as any,
      locationRepository: {
        findById: async (id: LocationId) => {
          if (id === testLocation.id) return ok(testLocation);
          return ok(null);
        },
        delete: async () => ok(undefined),
        // biome-ignore lint/suspicious/noExplicitAny: Mock context setup requires type assertion
      } as any,
      regionRepository: {
        findById: async (id: RegionId) => {
          if (id === testRegion.id) return ok(testRegion);
          return ok(null);
        },
        // biome-ignore lint/suspicious/noExplicitAny: Mock context setup requires type assertion
      } as any,
    } as Context;
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
      context.locationRepository = {
        findById: async () =>
          ok({
            ...testLocation,
            regionId: "non-existent-region" as RegionId,
          }),
        delete: async () => ok(undefined),
        // biome-ignore lint/suspicious/noExplicitAny: Mock context setup requires type assertion
      } as any;

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
      context.userRepository = {
        findById: async () => err(new RepositoryError("Find user failed")),
        // biome-ignore lint/suspicious/noExplicitAny: Mock context setup requires type assertion
      } as any;

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
      context.locationRepository = {
        findById: async () => err(new RepositoryError("Find location failed")),
        delete: async () => ok(undefined),
        // biome-ignore lint/suspicious/noExplicitAny: Mock context setup requires type assertion
      } as any;

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
      context.regionRepository = {
        findById: async () => err(new RepositoryError("Find region failed")),
        // biome-ignore lint/suspicious/noExplicitAny: Mock context setup requires type assertion
      } as any;

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
      context.locationRepository = {
        ...context.locationRepository,
        delete: async () => err(new RepositoryError("Delete failed")),
        // biome-ignore lint/suspicious/noExplicitAny: Mock context setup requires type assertion
      } as any;

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
    });
  });

  describe("Business logic validation", () => {
    it("should enforce proper deletion workflow", async () => {
      // Verify complete deletion process
      let userChecked = false;
      let locationChecked = false;
      let regionChecked = false;
      let deleteCalled = false;

      context.userRepository = {
        findById: async (id: UserId) => {
          userChecked = true;
          if (id === editorUser.id) return ok(editorUser);
          return ok(null);
        },
        // biome-ignore lint/suspicious/noExplicitAny: Mock context setup requires type assertion
      } as any;

      context.locationRepository = {
        findById: async (id: LocationId) => {
          locationChecked = true;
          if (id === testLocation.id) return ok(testLocation);
          return ok(null);
        },
        delete: async () => {
          deleteCalled = true;
          return ok(undefined);
        },
        // biome-ignore lint/suspicious/noExplicitAny: Mock context setup requires type assertion
      } as any;

      context.regionRepository = {
        findById: async (id: RegionId) => {
          regionChecked = true;
          if (id === testRegion.id) return ok(testRegion);
          return ok(null);
        },
        // biome-ignore lint/suspicious/noExplicitAny: Mock context setup requires type assertion
      } as any;

      const result = await deleteLocation(
        context,
        editorUser.id,
        testLocation.id,
      );

      expect(result.isOk()).toBe(true);
      expect(userChecked).toBe(true);
      expect(locationChecked).toBe(true);
      expect(regionChecked).toBe(true);
      expect(deleteCalled).toBe(true);
    });

    it("should validate permissions before deletion attempt", async () => {
      // Verify all permission checks occur before deletion
      let permissionsValidated = false;

      context.locationRepository = {
        findById: async (id: LocationId) => {
          if (id === testLocation.id) return ok(testLocation);
          return ok(null);
        },
        delete: async () => {
          // This should only be called after all validations pass
          expect(permissionsValidated).toBe(true);
          return ok(undefined);
        },
        // biome-ignore lint/suspicious/noExplicitAny: Mock context setup requires type assertion
      } as any;

      context.regionRepository = {
        findById: async (id: RegionId) => {
          if (id === testRegion.id) {
            permissionsValidated = true;
            return ok(testRegion);
          }
          return ok(null);
        },
        // biome-ignore lint/suspicious/noExplicitAny: Mock context setup requires type assertion
      } as any;

      const result = await deleteLocation(
        context,
        editorUser.id,
        testLocation.id,
      );

      expect(result.isOk()).toBe(true);
      expect(permissionsValidated).toBe(true);
    });
  });
});
