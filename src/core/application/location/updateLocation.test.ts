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
import { updateLocation } from "./updateLocation";

describe("updateLocation", () => {
  let context: Context;
  let mockUserRepository: MockUserRepository;
  let mockRegionRepository: MockRegionRepository;
  let mockLocationRepository: MockLocationRepository;

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

  const testLocation: Location = {
    id: "550e8400-e29b-41d4-a716-446655440020" as LocationId,
    regionId: testRegion.id,
    name: "Test Location",
    description: "A test location",
    category: "restaurant",
    address: "123 Test St",
    latitude: 40.7128,
    longitude: -74.006,
    contactInfo: null,
    operatingHours: null,
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
    mockUserRepository.addUser(otherEditor, "hashed_password");
    mockRegionRepository.addRegion(testRegion);
    mockLocationRepository.addLocation(testLocation);

    context = {
      userRepository: mockUserRepository,
      regionRepository: mockRegionRepository,
      locationRepository: mockLocationRepository,
    } as unknown as Context;
  });

  describe("REQ-E-025: Location detail update functionality from spec", () => {
    it("should update location name and description when user is region owner", async () => {
      const input = {
        name: "Updated Location Name",
        description: "Updated description",
        category: "cafe",
        address: "456 New St",
        latitude: 40.7589,
        longitude: -73.9851,
        contactInfo: { phone: "Updated contact" },
        operatingHours: { monday: "9AM-6PM" },
        isPublic: false,
      };

      const result = await updateLocation(
        context,
        editorUser.id,
        testLocation.id,
        input,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const updatedLocation = result.value;
        expect(updatedLocation.name).toBe("Updated Location Name");
        expect(updatedLocation.description).toBe("Updated description");
        expect(updatedLocation.category).toBe("cafe");
        expect(updatedLocation.address).toBe("456 New St");
        expect(updatedLocation.latitude).toBe(40.7589);
        expect(updatedLocation.longitude).toBe(-73.9851);
        expect(updatedLocation.contactInfo).toEqual({
          phone: "Updated contact",
        });
        expect(updatedLocation.operatingHours).toEqual({ monday: "9AM-6PM" });
        expect(updatedLocation.isPublic).toBe(false);
        expect(updatedLocation.id).toBe(testLocation.id);
        expect(updatedLocation.regionId).toBe(testLocation.regionId);
      }
    });

    it("should update only location name when other fields not provided", async () => {
      const input = {
        name: "Just Name Update",
      };

      const result = await updateLocation(
        context,
        editorUser.id,
        testLocation.id,
        input,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const updatedLocation = result.value;
        expect(updatedLocation.name).toBe("Just Name Update");
        expect(updatedLocation.description).toBe(testLocation.description);
        expect(updatedLocation.category).toBe(testLocation.category);
        expect(updatedLocation.address).toBe(testLocation.address);
      }
    });

    it("should update coordinates independently", async () => {
      const input = {
        latitude: 35.6762,
        longitude: 139.6503,
      };

      const result = await updateLocation(
        context,
        editorUser.id,
        testLocation.id,
        input,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const updatedLocation = result.value;
        expect(updatedLocation.latitude).toBe(35.6762);
        expect(updatedLocation.longitude).toBe(139.6503);
        expect(updatedLocation.name).toBe(testLocation.name);
      }
    });

    it("should update cover photo URL", async () => {
      const input = {
        coverPhotoUrl: "https://example.com/location-cover.jpg",
      };

      const result = await updateLocation(
        context,
        editorUser.id,
        testLocation.id,
        input,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const updatedLocation = result.value;
        expect(updatedLocation.coverPhotoUrl).toBe(
          "https://example.com/location-cover.jpg",
        );
      }
    });

    it("should handle multiple field updates simultaneously", async () => {
      const input = {
        name: "Multi Update Location",
        description: "Updated with multiple fields",
        category: "museum",
        address: "789 Museum Ave",
        latitude: 40.7829,
        longitude: -73.9654,
        contactInfo: { phone: "(555) 123-4567" },
        operatingHours: { monday: "10AM-8PM" },
        coverPhotoUrl: "https://example.com/multi-cover.jpg",
        isPublic: true,
      };

      const result = await updateLocation(
        context,
        editorUser.id,
        testLocation.id,
        input,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const updatedLocation = result.value;
        expect(updatedLocation.name).toBe("Multi Update Location");
        expect(updatedLocation.description).toBe(
          "Updated with multiple fields",
        );
        expect(updatedLocation.category).toBe("museum");
        expect(updatedLocation.address).toBe("789 Museum Ave");
        expect(updatedLocation.latitude).toBe(40.7829);
        expect(updatedLocation.longitude).toBe(-73.9654);
        expect(updatedLocation.contactInfo).toEqual({
          phone: "(555) 123-4567",
        });
        expect(updatedLocation.operatingHours).toEqual({ monday: "10AM-8PM" });
        expect(updatedLocation.coverPhotoUrl).toBe(
          "https://example.com/multi-cover.jpg",
        );
        expect(updatedLocation.isPublic).toBe(true);
      }
    });
  });

  describe("TLA+ behavior validation", () => {
    it("should follow UpdateLocation action from TLA+ specification", async () => {
      const input = {
        name: "TLA+ Updated Location",
        description: "TLA+ specification compliant update",
        category: "tla_category",
        address: "TLA+ Address",
        latitude: 41.8781,
        longitude: -87.6298,
        contactInfo: { phone: "TLA+ Contact" },
        operatingHours: { monday: "TLA+ Hours" },
        coverPhotoUrl: "https://example.com/tla-location.jpg",
      };

      const result = await updateLocation(
        context,
        editorUser.id,
        testLocation.id,
        input,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const updatedLocation = result.value;
        expect(updatedLocation.name).toBe("TLA+ Updated Location");
        expect(updatedLocation.description).toBe(
          "TLA+ specification compliant update",
        );
        expect(updatedLocation.category).toBe("tla_category");
        expect(updatedLocation.address).toBe("TLA+ Address");
        expect(updatedLocation.latitude).toBe(41.8781);
        expect(updatedLocation.longitude).toBe(-87.6298);
        expect(updatedLocation.contactInfo).toEqual({ phone: "TLA+ Contact" });
        expect(updatedLocation.operatingHours).toEqual({
          monday: "TLA+ Hours",
        });
        expect(updatedLocation.coverPhotoUrl).toBe(
          "https://example.com/tla-location.jpg",
        );
        expect(updatedLocation.updatedAt).toBeInstanceOf(Date);
      }
    });
  });

  describe("SPEC-INV-1,17,18: Owner-only edit constraints from Alloy model", () => {
    it("should reject update from non-owner editor", async () => {
      const input = {
        name: "Unauthorized Update",
        description: "Should fail",
      };

      const result = await updateLocation(
        context,
        otherEditor.id,
        testLocation.id,
        input,
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(AuthorizationError);
        expect(result.error.message).toBe(
          "Only location owner or editors can update this location",
        );
      }
    });

    it("should reject update from non-existent user", async () => {
      const input = {
        name: "Invalid User Update",
      };

      const result = await updateLocation(
        context,
        "550e8400-e29b-41d4-a716-446655440099" as UserId,
        testLocation.id,
        input,
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("User not found");
      }
    });

    it("should reject update for non-existent location", async () => {
      const input = {
        name: "Should Fail",
      };

      const result = await updateLocation(
        context,
        editorUser.id,
        "550e8400-e29b-41d4-a716-446655440088" as LocationId,
        input,
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Location not found");
      }
    });
  });

  describe("Input validation", () => {
    it("should reject name that exceeds maximum length", async () => {
      const longName = "a".repeat(101); // Exceeds 100 character limit

      const input = {
        name: longName,
      };

      const result = await updateLocation(
        context,
        editorUser.id,
        testLocation.id,
        input,
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid location input");
      }
    });

    it("should reject description that exceeds maximum length", async () => {
      const longDescription = "a".repeat(1001); // Exceeds 1000 character limit

      const input = {
        description: longDescription,
      };

      const result = await updateLocation(
        context,
        editorUser.id,
        testLocation.id,
        input,
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid location input");
      }
    });

    it("should reject empty name when provided", async () => {
      const input = {
        name: "",
      };

      const result = await updateLocation(
        context,
        editorUser.id,
        testLocation.id,
        input,
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid location input");
      }
    });

    it("should reject invalid latitude values", async () => {
      const inputs = [
        { latitude: 91 }, // Above max
        { latitude: -91 }, // Below min
      ];

      for (const input of inputs) {
        const result = await updateLocation(
          context,
          editorUser.id,
          testLocation.id,
          input,
        );
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ApplicationError);
          expect(result.error.message).toBe("Invalid location input");
        }
      }
    });

    it("should reject invalid longitude values", async () => {
      const inputs = [
        { longitude: 181 }, // Above max
        { longitude: -181 }, // Below min
      ];

      for (const input of inputs) {
        const result = await updateLocation(
          context,
          editorUser.id,
          testLocation.id,
          input,
        );
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ApplicationError);
          expect(result.error.message).toBe("Invalid location input");
        }
      }
    });

    it("should accept valid latitude and longitude ranges", async () => {
      const inputs = [
        { latitude: 90, longitude: 180 },
        { latitude: -90, longitude: -180 },
        { latitude: 0, longitude: 0 },
      ];

      for (const input of inputs) {
        const result = await updateLocation(
          context,
          editorUser.id,
          testLocation.id,
          input,
        );
        expect(result.isOk()).toBe(true);
      }
    });

    it("should accept update with no fields (no-op)", async () => {
      const input = {};

      const result = await updateLocation(
        context,
        editorUser.id,
        testLocation.id,
        input,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const updatedLocation = result.value;
        // All fields should remain the same
        expect(updatedLocation.name).toBe(testLocation.name);
        expect(updatedLocation.description).toBe(testLocation.description);
        expect(updatedLocation.category).toBe(testLocation.category);
        expect(updatedLocation.address).toBe(testLocation.address);
        expect(updatedLocation.latitude).toBe(testLocation.latitude);
        expect(updatedLocation.longitude).toBe(testLocation.longitude);
        expect(updatedLocation.isPublic).toBe(testLocation.isPublic);
      }
    });
  });

  describe("Error handling", () => {
    it("should handle user repository failure", async () => {
      mockUserRepository.setShouldFailOperations(true);

      const input = {
        name: "Should fail",
      };

      const result = await updateLocation(
        context,
        editorUser.id,
        testLocation.id,
        input,
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to find user");
      }
    });

    it("should handle location repository failure on get", async () => {
      mockLocationRepository.setShouldFailOperations(true);

      const input = {
        name: "Should fail",
      };

      const result = await updateLocation(
        context,
        editorUser.id,
        testLocation.id,
        input,
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to find location");
      }
    });

    it("should handle region repository failure", async () => {
      mockRegionRepository.setShouldFailOperations(true);

      const input = {
        name: "Should fail",
      };

      const result = await updateLocation(
        context,
        editorUser.id,
        testLocation.id,
        input,
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to find region");
      }
    });

    it("should handle location repository failure on update", async () => {
      // Setup repository to fail only on update operation
      const originalUpdate = mockLocationRepository.update.bind(
        mockLocationRepository,
      );
      mockLocationRepository.update = async () => {
        return err(new RepositoryError("Update failed"));
      };

      const input = {
        name: "Should fail on update",
      };

      const result = await updateLocation(
        context,
        editorUser.id,
        testLocation.id,
        input,
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to update location");
      }

      // Restore original method
      mockLocationRepository.update = originalUpdate;
    });
  });

  describe("Ownership verification", () => {
    it("should verify region ownership before allowing location update", async () => {
      const input = {
        name: "Ownership verification test",
      };

      // Should succeed for region owner
      const ownerResult = await updateLocation(
        context,
        editorUser.id,
        testLocation.id,
        input,
      );
      expect(ownerResult.isOk()).toBe(true);

      // Should fail for non-owner
      const nonOwnerResult = await updateLocation(
        context,
        otherEditor.id,
        testLocation.id,
        input,
      );
      expect(nonOwnerResult.isErr()).toBe(true);
      if (nonOwnerResult.isErr()) {
        expect(nonOwnerResult.error).toBeInstanceOf(AuthorizationError);
        expect(nonOwnerResult.error.message).toBe(
          "Only location owner or editors can update this location",
        );
      }
    });
  });

  describe("SPEC-INV-30: Location field consistency (Alloy constraints)", () => {
    it("should handle address consistency", async () => {
      // Test setting address
      const inputWithAddress = {
        address: "123 New Address St",
      };

      const resultWithAddress = await updateLocation(
        context,
        editorUser.id,
        testLocation.id,
        inputWithAddress,
      );

      expect(resultWithAddress.isOk()).toBe(true);
      if (resultWithAddress.isOk()) {
        expect(resultWithAddress.value.address).toBe("123 New Address St");
      }

      // Test clearing address
      const inputWithoutAddress = {
        address: null,
      };

      const resultWithoutAddress = await updateLocation(
        context,
        editorUser.id,
        testLocation.id,
        inputWithoutAddress,
      );

      expect(resultWithoutAddress.isOk()).toBe(true);
      if (resultWithoutAddress.isOk()) {
        expect(resultWithoutAddress.value.address).toBe(null);
      }
    });

    it("should handle contact info consistency", async () => {
      // Test setting contact info
      const inputWithContact = {
        contactInfo: { phone: "(555) 123-4567" },
      };

      const resultWithContact = await updateLocation(
        context,
        editorUser.id,
        testLocation.id,
        inputWithContact,
      );

      expect(resultWithContact.isOk()).toBe(true);
      if (resultWithContact.isOk()) {
        expect(resultWithContact.value.contactInfo).toEqual({
          phone: "(555) 123-4567",
        });
      }

      // Test clearing contact info
      const inputWithoutContact = {
        contactInfo: null,
      };

      const resultWithoutContact = await updateLocation(
        context,
        editorUser.id,
        testLocation.id,
        inputWithoutContact,
      );

      expect(resultWithoutContact.isOk()).toBe(true);
      if (resultWithoutContact.isOk()) {
        expect(resultWithoutContact.value.contactInfo).toBe(null);
      }
    });

    it("should handle operating hours consistency", async () => {
      // Test setting operating hours
      const inputWithHours = {
        operatingHours: { monday: "9AM-6PM", friday: "9AM-6PM" },
      };

      const resultWithHours = await updateLocation(
        context,
        editorUser.id,
        testLocation.id,
        inputWithHours,
      );

      expect(resultWithHours.isOk()).toBe(true);
      if (resultWithHours.isOk()) {
        expect(resultWithHours.value.operatingHours).toEqual({
          monday: "9AM-6PM",
          friday: "9AM-6PM",
        });
      }

      // Test clearing operating hours
      const inputWithoutHours = {
        operatingHours: null,
      };

      const resultWithoutHours = await updateLocation(
        context,
        editorUser.id,
        testLocation.id,
        inputWithoutHours,
      );

      expect(resultWithoutHours.isOk()).toBe(true);
      if (resultWithoutHours.isOk()) {
        expect(resultWithoutHours.value.operatingHours).toBe(null);
      }
    });

    it("should handle coordinates consistency", async () => {
      // Test setting coordinates
      const inputWithCoords = {
        latitude: 35.6762,
        longitude: 139.6503,
      };

      const resultWithCoords = await updateLocation(
        context,
        editorUser.id,
        testLocation.id,
        inputWithCoords,
      );

      expect(resultWithCoords.isOk()).toBe(true);
      if (resultWithCoords.isOk()) {
        expect(resultWithCoords.value.latitude).toBe(35.6762);
        expect(resultWithCoords.value.longitude).toBe(139.6503);
      }

      // Test updating only one coordinate
      const inputPartialCoord = {
        latitude: 40.7128,
      };

      const resultPartialCoord = await updateLocation(
        context,
        editorUser.id,
        testLocation.id,
        inputPartialCoord,
      );

      expect(resultPartialCoord.isOk()).toBe(true);
      if (resultPartialCoord.isOk()) {
        expect(resultPartialCoord.value.latitude).toBe(40.7128);
        // Longitude should retain previous value
        expect(resultPartialCoord.value.longitude).toBe(139.6503);
      }
    });

    it("should handle cover photo URL consistency", async () => {
      // Test setting cover photo
      const inputWithPhoto = {
        coverPhotoUrl: "https://example.com/location-cover.jpg",
      };

      const resultWithPhoto = await updateLocation(
        context,
        editorUser.id,
        testLocation.id,
        inputWithPhoto,
      );

      expect(resultWithPhoto.isOk()).toBe(true);
      if (resultWithPhoto.isOk()) {
        expect(resultWithPhoto.value.coverPhotoUrl).toBe(
          "https://example.com/location-cover.jpg",
        );
      }

      // Test removing cover photo
      const inputWithoutPhoto = {
        coverPhotoUrl: null,
      };

      const resultWithoutPhoto = await updateLocation(
        context,
        editorUser.id,
        testLocation.id,
        inputWithoutPhoto,
      );

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
        name: "Name Only Update",
      };

      const nameOnlyResult = await updateLocation(
        context,
        editorUser.id,
        testLocation.id,
        nameOnlyInput,
      );

      expect(nameOnlyResult.isOk()).toBe(true);
      if (nameOnlyResult.isOk()) {
        expect(nameOnlyResult.value.name).toBe("Name Only Update");
        expect(nameOnlyResult.value.description).toBe(testLocation.description);
        expect(nameOnlyResult.value.category).toBe(testLocation.category);
      }

      // Update only category
      const categoryOnlyInput = {
        category: "shopping",
      };

      const categoryOnlyResult = await updateLocation(
        context,
        editorUser.id,
        testLocation.id,
        categoryOnlyInput,
      );

      expect(categoryOnlyResult.isOk()).toBe(true);
      if (categoryOnlyResult.isOk()) {
        expect(categoryOnlyResult.value.category).toBe("shopping");
        // Name should retain the previous update
        expect(categoryOnlyResult.value.name).toBe("Name Only Update");
        expect(categoryOnlyResult.value.description).toBe(
          testLocation.description,
        );
      }
    });
  });
});
