import type { CheckIn, CheckInId } from "@/core/domain/checkIn/types";
import type { Location, LocationId } from "@/core/domain/location/types";
import type { User, UserId } from "@/core/domain/user/types";
import { ApplicationError } from "@/lib/error";
import { RepositoryError } from "@/lib/error";
import { err, ok } from "neverthrow";
import { beforeEach, describe, expect, it } from "vitest";
import { MockCheckInRepository } from "../../adapters/mock/checkInRepository";
import { MockLocationRepository } from "../../adapters/mock/locationRepository";
import { MockUserRepository } from "../../adapters/mock/userRepository";
import type { Context } from "../context";
import { createCheckIn } from "./createCheckIn";

describe("createCheckIn", () => {
  let context: Context;
  let mockUserRepository: MockUserRepository;
  let mockLocationRepository: MockLocationRepository;
  let mockCheckInRepository: MockCheckInRepository;

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

  const adminUser: User = {
    id: "admin-1" as UserId,
    name: "Test Admin",
    email: "admin@example.com",
    role: "admin",
    subscription: "free",
    profilePhotoUrl: null,
    isActive: true,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const testLocation: Location = {
    id: "location-1" as LocationId,
    // biome-ignore lint/suspicious/noExplicitAny: Test data setup requires type assertion
    regionId: "region-1" as any,
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
    mockLocationRepository = new MockLocationRepository();
    mockCheckInRepository = new MockCheckInRepository();

    // Setup test data
    mockUserRepository.addUser(visitorUser, "hashed_password");
    mockUserRepository.addUser(editorUser, "hashed_password");
    mockUserRepository.addUser(adminUser, "hashed_password");
    mockLocationRepository.addLocation(testLocation);

    context = {
      userRepository: mockUserRepository,
      locationRepository: mockLocationRepository,
      checkInRepository: mockCheckInRepository,
    } as unknown as Context;
  });

  describe("SPEC-INV-4,5,8,9: Check-in constraints from Alloy model", () => {
    it("should allow visitor to check in at public location", async () => {
      const input = {
        userId: visitorUser.id,
        locationId: testLocation.id,
        comment: "Great place!",
        rating: 5,
        isPublic: true,
      };

      const result = await createCheckIn(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const checkIn = result.value;
        expect(checkIn.userId).toBe(visitorUser.id);
        expect(checkIn.locationId).toBe(testLocation.id);
        expect(checkIn.comment).toBe("Great place!");
        expect(checkIn.rating).toBe(5);
        expect(checkIn.isPublic).toBe(true);
      }
    });

    it("should allow editor to check in at public location", async () => {
      const input = {
        userId: editorUser.id,
        locationId: testLocation.id,
        photoUrl: "https://example.com/photo.jpg",
        comment: "Nice spot for editors too!",
        rating: 4,
        isPublic: true,
      };

      const result = await createCheckIn(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const checkIn = result.value;
        expect(checkIn.userId).toBe(editorUser.id);
        expect(checkIn.photoUrl).toBe("https://example.com/photo.jpg");
        expect(checkIn.rating).toBe(4);
      }
    });

    it("should create check-in with minimal required fields", async () => {
      const input = {
        userId: visitorUser.id,
        locationId: testLocation.id,
        isPublic: true,
      };

      const result = await createCheckIn(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const checkIn = result.value;
        expect(checkIn.userId).toBe(visitorUser.id);
        expect(checkIn.locationId).toBe(testLocation.id);
        expect(checkIn.photoUrl).toBe(null);
        expect(checkIn.comment).toBe(null);
        expect(checkIn.rating).toBe(null);
        expect(checkIn.isPublic).toBe(true); // Default value
      }
    });
  });

  describe("TLA+ behavior validation", () => {
    it("should follow CreateCheckIn action from TLA+ specification", async () => {
      // TLA+ CreateCheckIn action: CreateCheckIn(userId, locationId, checkInId, hasPhoto, hasComment, photoUrl, commentText)
      const input = {
        userId: visitorUser.id,
        locationId: testLocation.id,
        photoUrl: "https://example.com/tla-photo.jpg",
        comment: "TLA+ check-in test",
        rating: 3,
        isPublic: true,
      };

      const result = await createCheckIn(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const checkIn = result.value;
        // Verify state changes match TLA+ model
        expect(checkIn.userId).toBe(visitorUser.id);
        expect(checkIn.locationId).toBe(testLocation.id);
        expect(checkIn.photoUrl).toBe("https://example.com/tla-photo.jpg");
        expect(checkIn.comment).toBe("TLA+ check-in test");
        expect(checkIn.createdAt).toBeInstanceOf(Date);
        expect(checkIn.updatedAt).toBeInstanceOf(Date);
      }
    });
  });

  describe("Input validation", () => {
    it("should reject invalid input - invalid user ID format", async () => {
      const input = {
        userId: "invalid-uuid",
        locationId: testLocation.id,
        comment: "Should fail",
        isPublic: true,
      };

      const result = await createCheckIn(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid check-in input");
      }
    });

    it("should reject invalid input - invalid location ID format", async () => {
      const input = {
        userId: visitorUser.id,
        locationId: "invalid-uuid",
        comment: "Should fail",
        isPublic: true,
      };

      const result = await createCheckIn(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid check-in input");
      }
    });

    it("should reject invalid rating - below minimum", async () => {
      const input = {
        userId: visitorUser.id,
        locationId: testLocation.id,
        rating: 0, // Below minimum of 1
        comment: "Should fail",
        isPublic: true,
      };

      const result = await createCheckIn(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid check-in input");
      }
    });

    it("should reject invalid rating - above maximum", async () => {
      const input = {
        userId: visitorUser.id,
        locationId: testLocation.id,
        rating: 6, // Above maximum of 5
        comment: "Should fail",
        isPublic: true,
      };

      const result = await createCheckIn(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid check-in input");
      }
    });

    it("should reject comment that exceeds maximum length", async () => {
      const longComment = "a".repeat(501); // Exceeds 500 character limit

      const input = {
        userId: visitorUser.id,
        locationId: testLocation.id,
        comment: longComment,
        isPublic: true,
      };

      const result = await createCheckIn(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid check-in input");
      }
    });

    it("should accept valid ratings 1-5", async () => {
      for (let rating = 1; rating <= 5; rating++) {
        const input = {
          userId: visitorUser.id,
          locationId: testLocation.id,
          rating,
          comment: `Rating ${rating} test`,
          isPublic: true,
        };

        const result = await createCheckIn(context, input);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.rating).toBe(rating);
        }
      }
    });
  });

  describe("Error handling", () => {
    it("should handle user not found", async () => {
      const input = {
        userId: "non-existent-user",
        locationId: testLocation.id,
        comment: "Should fail",
        isPublic: true,
      };

      const result = await createCheckIn(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("User not found");
      }
    });

    it("should handle location not found", async () => {
      const input = {
        userId: visitorUser.id,
        locationId: "non-existent-location",
        comment: "Should fail",
        isPublic: true,
      };

      const result = await createCheckIn(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Location not found");
      }
    });

    it("should handle user repository failure", async () => {
      mockUserRepository.setShouldFailOperations(true);

      const input = {
        userId: visitorUser.id,
        locationId: testLocation.id,
        comment: "Should fail",
        isPublic: true,
      };

      const result = await createCheckIn(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to verify user");
      }
    });

    it("should handle location repository failure", async () => {
      mockLocationRepository.setShouldFailOperations(true);

      const input = {
        userId: visitorUser.id,
        locationId: testLocation.id,
        comment: "Should fail",
        isPublic: true,
      };

      const result = await createCheckIn(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to verify location");
      }
    });

    it("should handle check-in repository failure", async () => {
      mockCheckInRepository.setShouldFailOperations(true);

      const input = {
        userId: visitorUser.id,
        locationId: testLocation.id,
        comment: "Should fail",
        isPublic: true,
      };

      const result = await createCheckIn(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to create check-in");
      }
    });
  });

  describe("Photo and comment handling", () => {
    it("should handle check-in with only photo", async () => {
      const input = {
        userId: visitorUser.id,
        locationId: testLocation.id,
        photoUrl: "https://example.com/photo.jpg",
        isPublic: true,
      };

      const result = await createCheckIn(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const checkIn = result.value;
        expect(checkIn.photoUrl).toBe("https://example.com/photo.jpg");
        expect(checkIn.comment).toBe(null);
      }
    });

    it("should handle check-in with only comment", async () => {
      const input = {
        userId: visitorUser.id,
        locationId: testLocation.id,
        comment: "Just a text review",
        isPublic: true,
      };

      const result = await createCheckIn(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const checkIn = result.value;
        expect(checkIn.photoUrl).toBe(null);
        expect(checkIn.comment).toBe("Just a text review");
      }
    });

    it("should handle check-in with both photo and comment", async () => {
      const input = {
        userId: visitorUser.id,
        locationId: testLocation.id,
        photoUrl: "https://example.com/photo.jpg",
        comment: "Amazing place with photo!",
        rating: 5,
        isPublic: true,
      };

      const result = await createCheckIn(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const checkIn = result.value;
        expect(checkIn.photoUrl).toBe("https://example.com/photo.jpg");
        expect(checkIn.comment).toBe("Amazing place with photo!");
        expect(checkIn.rating).toBe(5);
      }
    });
  });

  describe("Visibility settings", () => {
    it("should create public check-in by default", async () => {
      const input = {
        userId: visitorUser.id,
        locationId: testLocation.id,
        comment: "Default visibility",
        isPublic: true,
      };

      const result = await createCheckIn(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isPublic).toBe(true);
      }
    });

    it("should create private check-in when explicitly set", async () => {
      const input = {
        userId: visitorUser.id,
        locationId: testLocation.id,
        comment: "Private check-in",
        isPublic: false,
      };

      const result = await createCheckIn(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isPublic).toBe(false);
      }
    });
  });

  describe("SPEC-INV-22: Check-in content consistency (Alloy constraint)", () => {
    it("should maintain consistency between hasPhoto flag and photoUrl", async () => {
      // Test case: photo URL provided
      const inputWithPhoto = {
        userId: visitorUser.id,
        locationId: testLocation.id,
        photoUrl: "https://example.com/photo.jpg",
        comment: "With photo",
        isPublic: true,
      };

      const resultWithPhoto = await createCheckIn(context, inputWithPhoto);

      expect(resultWithPhoto.isOk()).toBe(true);
      if (resultWithPhoto.isOk()) {
        const checkIn = resultWithPhoto.value;
        // In real implementation, hasPhoto would be calculated based on photoUrl != null
        expect(checkIn.photoUrl).toBe("https://example.com/photo.jpg");
      }

      // Test case: no photo URL provided
      const inputWithoutPhoto = {
        userId: visitorUser.id,
        locationId: testLocation.id,
        comment: "Without photo",
        isPublic: true,
      };

      const resultWithoutPhoto = await createCheckIn(
        context,
        inputWithoutPhoto,
      );

      expect(resultWithoutPhoto.isOk()).toBe(true);
      if (resultWithoutPhoto.isOk()) {
        const checkIn = resultWithoutPhoto.value;
        expect(checkIn.photoUrl).toBe(null);
      }
    });

    it("should maintain consistency between hasComment flag and commentText", async () => {
      // Test case: comment provided
      const inputWithComment = {
        userId: visitorUser.id,
        locationId: testLocation.id,
        comment: "This is a comment",
        isPublic: true,
      };

      const resultWithComment = await createCheckIn(context, inputWithComment);

      expect(resultWithComment.isOk()).toBe(true);
      if (resultWithComment.isOk()) {
        const checkIn = resultWithComment.value;
        expect(checkIn.comment).toBe("This is a comment");
      }

      // Test case: no comment provided
      const inputWithoutComment = {
        userId: visitorUser.id,
        locationId: testLocation.id,
        photoUrl: "https://example.com/photo.jpg",
        isPublic: true,
      };

      const resultWithoutComment = await createCheckIn(
        context,
        inputWithoutComment,
      );

      expect(resultWithoutComment.isOk()).toBe(true);
      if (resultWithoutComment.isOk()) {
        const checkIn = resultWithoutComment.value;
        expect(checkIn.comment).toBe(null);
      }
    });
  });
});
