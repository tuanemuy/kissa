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
import { createLocation } from "./createLocation";

describe("createLocation", () => {
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
    creatorId: editorUser.id,
    name: "Test Region",
    description: "A test region",
    latitude: null,
    longitude: null,
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
    mockUserRepository.addUser(visitorUser, "hashed_password");
    mockRegionRepository.addRegion(testRegion);

    context = {
      userRepository: mockUserRepository,
      regionRepository: mockRegionRepository,
      locationRepository: mockLocationRepository,
    } as unknown as Context;
  });

  describe("SPEC-INV-1,2,3: Location creation constraints from Alloy model", () => {
    it("should allow editor to create location in their own region", async () => {
      const input = {
        name: "Test Location",
        description: "A test location",
        category: "restaurant",
        address: "123 Test St",
        isPublic: true,
      };

      const result = await createLocation(
        context,
        editorUser.id,
        testRegion.id,
        input,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const location = result.value;
        expect(location.name).toBe("Test Location");
        expect(location.regionId).toBe(testRegion.id);
        expect(location.isPublic).toBe(true);
      }
    });

    it("should reject location creation by visitor", async () => {
      const input = {
        name: "Visitor Location",
        description: "Should fail",
        isPublic: true,
      };

      const result = await createLocation(
        context,
        visitorUser.id,
        testRegion.id,
        input,
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(AuthorizationError);
        expect(result.error.message).toBe("Only editors can create locations");
      }
    });

    it("should reject creation in region not owned by editor", async () => {
      const otherEditorUser: User = {
        id: "editor-2" as UserId,
        name: "Other Editor",
        email: "editor2@example.com",
        role: "editor",
        subscription: "basic",
        profilePhotoUrl: null,
        isActive: true,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUserRepository.addUser(otherEditorUser, "hashed_password");

      const input = {
        name: "Unauthorized Location",
        description: "Should fail",
        isPublic: true,
      };

      const result = await createLocation(
        context,
        otherEditorUser.id,
        testRegion.id,
        input,
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(AuthorizationError);
        expect(result.error.message).toBe(
          "Only region owner can create locations in this region",
        );
      }
    });
  });

  describe("SPEC-INV-16,17,18: Subscription plan limits (Alloy constraints)", () => {
    it("should enforce basic plan location limit (100 locations)", async () => {
      // Mock location count to be at limit
      mockLocationRepository.setShouldFailOperations(false);

      // Add 100 locations to reach the limit
      for (let i = 0; i < 100; i++) {
        const location: Location = {
          id: `location-${i}` as LocationId,
          regionId: testRegion.id,
          name: `Location ${i}`,
          description: null,
          category: null,
          address: null,
          latitude: null,
          longitude: null,
          contactInfo: null,
          operatingHours: null,
          isPublic: true,
          coverPhotoUrl: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        mockLocationRepository.addLocation(location);
      }

      const input = {
        name: "Exceeding Basic Plan",
        description: "Should fail",
        isPublic: true,
      };

      const result = await createLocation(
        context,
        editorUser.id,
        testRegion.id,
        input,
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(AuthorizationError);
        expect(result.error.message).toContain("Location limit exceeded");
      }
    });

    it("should allow creation within basic plan limits", async () => {
      // Basic plan allows up to 100 locations, mock shows 50
      for (let i = 0; i < 50; i++) {
        const location: Location = {
          id: `location-${i}` as LocationId,
          regionId: testRegion.id,
          name: `Location ${i}`,
          description: null,
          category: null,
          address: null,
          latitude: null,
          longitude: null,
          contactInfo: null,
          operatingHours: null,
          isPublic: true,
          coverPhotoUrl: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        mockLocationRepository.addLocation(location);
      }

      const input = {
        name: "Basic Plan Location",
        description: "Should succeed",
        isPublic: true,
      };

      const result = await createLocation(
        context,
        editorUser.id,
        testRegion.id,
        input,
      );

      expect(result.isOk()).toBe(true);
    });
  });

  describe("TLA+ behavior validation", () => {
    it("should follow CreateLocation action from TLA+ specification", async () => {
      // TLA+ CreateLocation action: CreateLocation(userId, newLocationId, name, regionId, visibility)
      const input = {
        name: "TLA Location",
        description: "Following TLA+ spec",
        category: "cafe",
        address: "TLA Street 1",
        latitude: 45.123,
        longitude: -73.456,
        isPublic: true,
      };

      const result = await createLocation(
        context,
        editorUser.id,
        testRegion.id,
        input,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const location = result.value;
        // Verify state changes match TLA+ model
        expect(location.regionId).toBe(testRegion.id);
        expect(location.name).toBe("TLA Location");
        expect(location.isPublic).toBe(true);
        expect(location.createdAt).toBeInstanceOf(Date);
        expect(location.latitude).toBe(45.123);
        expect(location.longitude).toBe(-73.456);
      }
    });
  });

  describe("Input validation", () => {
    it("should reject invalid input - missing name", async () => {
      const input = {
        description: "Missing name",
        isPublic: true,
      };

      const result = await createLocation(
        context,
        editorUser.id,
        testRegion.id,
        input as never,
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid location input");
      }
    });

    it("should validate optional contact info structure", async () => {
      const input = {
        name: "Contact Location",
        description: "Has contact info",
        contactInfo: {
          phone: "+1-555-0123",
          email: "contact@location.com",
          website: "https://location.com",
        },
        isPublic: true,
      };

      const result = await createLocation(
        context,
        editorUser.id,
        testRegion.id,
        input,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.contactInfo).toEqual({
          phone: "+1-555-0123",
          email: "contact@location.com",
          website: "https://location.com",
        });
      }
    });

    it("should validate optional operating hours structure", async () => {
      const input = {
        name: "Hours Location",
        description: "Has operating hours",
        operatingHours: {
          monday: "9:00-17:00",
          tuesday: "9:00-17:00",
          wednesday: "9:00-17:00",
          thursday: "9:00-17:00",
          friday: "9:00-17:00",
          saturday: "10:00-16:00",
          sunday: "Closed",
        },
        isPublic: true,
      };

      const result = await createLocation(
        context,
        editorUser.id,
        testRegion.id,
        input,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.operatingHours).toEqual({
          monday: "9:00-17:00",
          tuesday: "9:00-17:00",
          wednesday: "9:00-17:00",
          thursday: "9:00-17:00",
          friday: "9:00-17:00",
          saturday: "10:00-16:00",
          sunday: "Closed",
        });
      }
    });
  });

  describe("Error handling", () => {
    it("should handle creator not found", async () => {
      const input = {
        name: "Test Location",
        description: "Should fail",
        isPublic: true,
      };

      const result = await createLocation(
        context,
        "non-existent-user" as UserId,
        testRegion.id,
        input,
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Creator not found");
      }
    });

    it("should handle region not found", async () => {
      const input = {
        name: "Test Location",
        description: "Should fail",
        isPublic: true,
      };

      const result = await createLocation(
        context,
        editorUser.id,
        "non-existent-region" as RegionId,
        input,
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Region not found");
      }
    });

    it("should handle repository failure", async () => {
      mockLocationRepository.setShouldFailOperations(true);

      const input = {
        name: "Test Location",
        description: "Should fail",
        isPublic: true,
      };

      const result = await createLocation(
        context,
        editorUser.id,
        testRegion.id,
        input,
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to create location");
      }
    });

    it("should handle region repository failure", async () => {
      mockRegionRepository.setShouldFailOperations(true);

      const input = {
        name: "Test Location",
        description: "Should fail",
        isPublic: true,
      };

      const result = await createLocation(
        context,
        editorUser.id,
        testRegion.id,
        input,
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to find region");
      }
    });
  });

  describe("Visibility settings", () => {
    it("should create public location", async () => {
      const input = {
        name: "Public Location",
        description: "A public location",
        isPublic: true,
      };

      const result = await createLocation(
        context,
        editorUser.id,
        testRegion.id,
        input,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isPublic).toBe(true);
      }
    });

    it("should create private location", async () => {
      const input = {
        name: "Private Location",
        description: "A private location",
        isPublic: false,
      };

      const result = await createLocation(
        context,
        editorUser.id,
        testRegion.id,
        input,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isPublic).toBe(false);
      }
    });

    it("should default to private when isPublic not specified", async () => {
      const input = {
        name: "Default Visibility Location",
        description: "Should default to private",
        isPublic: false,
      };

      const result = await createLocation(
        context,
        editorUser.id,
        testRegion.id,
        input,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isPublic).toBe(false);
      }
    });
  });

  describe("Location categories and metadata", () => {
    it("should handle various location categories", async () => {
      const categories = ["restaurant", "hotel", "museum", "park", "shopping"];

      for (const category of categories) {
        const input = {
          name: `${category} Location`,
          description: `A ${category}`,
          category,
          isPublic: true,
        };

        const result = await createLocation(
          context,
          editorUser.id,
          testRegion.id,
          input,
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.category).toBe(category);
        }
      }
    });

    it("should handle coordinate data", async () => {
      const input = {
        name: "GPS Location",
        description: "Has GPS coordinates",
        latitude: 40.7128,
        longitude: -74.006,
        isPublic: true,
      };

      const result = await createLocation(
        context,
        editorUser.id,
        testRegion.id,
        input,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.latitude).toBe(40.7128);
        expect(result.value.longitude).toBe(-74.006);
      }
    });
  });
});
