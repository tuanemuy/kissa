import type { CheckIn, CheckInId } from "@/core/domain/checkIn/types";
import type { Location, LocationId } from "@/core/domain/location/types";
import type { Region, RegionId } from "@/core/domain/region/types";
import type { User, UserId } from "@/core/domain/user/types";
import { ApplicationError, AuthorizationError } from "@/lib/error";
import { RepositoryError } from "@/lib/error";
import { err, ok } from "neverthrow";
import { beforeEach, describe, expect, it } from "vitest";
import { MockCheckInRepository } from "../../adapters/mock/checkInRepository";
import { MockLocationRepository } from "../../adapters/mock/locationRepository";
import { MockUserRepository } from "../../adapters/mock/userRepository";
import type { Context } from "../context";
import { getCheckIn } from "./getCheckIn";

describe("getCheckIn", () => {
  let context: Context;

  const editorUser: User = {
    id: "12345678-1234-4123-8123-123456789013" as UserId,
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
    id: "12345678-1234-4123-8123-123456789012" as UserId,
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
    id: "12345678-1234-4123-8123-123456789016" as RegionId,
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

  const testLocation: Location = {
    id: "12345678-1234-4123-8123-123456789015" as LocationId,
    name: "Test Location",
    description: "A test location",
    category: "restaurant",
    regionId: testRegion.id,
    address: "123 Test Street",
    latitude: 35.6762,
    longitude: 139.6503,
    contactInfo: {
      email: "test@example.com",
      phone: "123-456-7890",
    },
    operatingHours: {
      monday: "9:00-18:00",
      tuesday: "9:00-18:00",
    },
    isPublic: true,
    coverPhotoUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const visitorCheckIn: CheckIn = {
    id: "12345678-1234-4123-8123-123456789020" as CheckInId,
    userId: visitorUser.id,
    locationId: testLocation.id,
    photoUrl: "https://example.com/photo.jpg",
    comment: "Great experience!",
    rating: 5,
    isPublic: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const editorCheckIn: CheckIn = {
    id: "12345678-1234-4123-8123-123456789021" as CheckInId,
    userId: editorUser.id,
    locationId: testLocation.id,
    photoUrl: null,
    comment: "Good place for work",
    rating: 4,
    isPublic: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    const mockUserRepository = new MockUserRepository();
    const mockCheckInRepository = new MockCheckInRepository();
    const mockLocationRepository = new MockLocationRepository();

    // Setup test data
    mockUserRepository.addUser(editorUser, "hashed_password");
    mockUserRepository.addUser(visitorUser, "hashed_password");
    mockCheckInRepository.addCheckIn(visitorCheckIn);
    mockCheckInRepository.addCheckIn(editorCheckIn);
    mockLocationRepository.addLocation(testLocation);

    context = {
      userRepository: mockUserRepository,
      checkInRepository: mockCheckInRepository,
      locationRepository: mockLocationRepository,
      // Add minimal required services to satisfy Context interface
      // biome-ignore lint/suspicious/noExplicitAny: Mock context service for testing
      passwordHasher: {} as any,
      // biome-ignore lint/suspicious/noExplicitAny: Mock context service for testing
      authService: {} as any,
      // biome-ignore lint/suspicious/noExplicitAny: Mock context service for testing
      regionRepository: {} as any,
      // biome-ignore lint/suspicious/noExplicitAny: Mock context service for testing
      favoriteRepository: {} as any,
      // biome-ignore lint/suspicious/noExplicitAny: Mock context service for testing
      moderationRepository: {} as any,
      // biome-ignore lint/suspicious/noExplicitAny: Mock context service for testing
      notificationRepository: {} as any,
      // biome-ignore lint/suspicious/noExplicitAny: Mock context service for testing
      notificationService: {} as any,
      // biome-ignore lint/suspicious/noExplicitAny: Mock context service for testing
      pushNotificationService: {} as any,
      // biome-ignore lint/suspicious/noExplicitAny: Mock context service for testing
      billingRepository: {} as any,
      // biome-ignore lint/suspicious/noExplicitAny: Mock context service for testing
      paymentGateway: {} as any,
      // biome-ignore lint/suspicious/noExplicitAny: Mock context service for testing
      mapsService: {} as any,
      // biome-ignore lint/suspicious/noExplicitAny: Mock context service for testing
      fileStorageService: {} as any,
      // biome-ignore lint/suspicious/noExplicitAny: Mock context service for testing
      metricsCollector: {} as any,
      // biome-ignore lint/suspicious/noExplicitAny: Mock context service for testing
      alertManager: {} as any,
      // biome-ignore lint/suspicious/noExplicitAny: Mock context service for testing
      backupService: {} as any,
      // biome-ignore lint/suspicious/noExplicitAny: Mock context service for testing
      privacyService: {} as any,
    } satisfies Context;
  });

  describe("Basic check-in retrieval", () => {
    it("should retrieve a check-in by ID", async () => {
      const result = await getCheckIn(context, { id: visitorCheckIn.id });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const checkIn = result.value;
        expect(checkIn?.id).toBe(visitorCheckIn.id);
        expect(checkIn?.userId).toBe(visitorUser.id);
        expect(checkIn?.locationId).toBe(testLocation.id);
        expect(checkIn?.comment).toBe("Great experience!");
        expect(checkIn?.rating).toBe(5);
        expect(checkIn?.isPublic).toBe(true);
      }
    });

    it("should retrieve another check-in by ID", async () => {
      const result = await getCheckIn(context, { id: editorCheckIn.id });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const checkIn = result.value;
        expect(checkIn?.id).toBe(editorCheckIn.id);
        expect(checkIn?.userId).toBe(editorUser.id);
      }
    });
  });

  describe("Check-in data validation", () => {
    it("should return complete check-in data", async () => {
      const result = await getCheckIn(context, { id: visitorCheckIn.id });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const checkIn = result.value;
        expect(checkIn?.locationId).toBe(testLocation.id);
        expect(checkIn?.photoUrl).toBe("https://example.com/photo.jpg");
        expect(checkIn?.comment).toBe("Great experience!");
        expect(checkIn?.rating).toBe(5);
        expect(checkIn?.isPublic).toBe(true);
      }
    });
  });

  describe("TLA+ behavior validation", () => {
    it("should follow check-in content consistency from TLA+", async () => {
      // TLA+ CheckInContentConsistency invariant
      const result = await getCheckIn(context, { id: visitorCheckIn.id });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const checkIn = result.value;
        // hasPhoto = TRUE => photoUrl # ""
        if (checkIn?.photoUrl !== null) {
          expect(checkIn?.photoUrl).not.toBe("");
        }
        // hasComment = TRUE => commentText # ""
        if (checkIn?.comment !== null) {
          expect(checkIn?.comment).not.toBe("");
        }
      }
    });
  });

  describe("Error handling", () => {
    it("should handle check-in not found", async () => {
      const result = await getCheckIn(
        context,
        { id: "87654321-1234-4123-8321-210987654321" }, // Valid UUID but non-existent check-in
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(null);
      }
    });

    it("should handle invalid check-in ID format", async () => {
      const result = await getCheckIn(context, { id: "invalid-uuid-format" });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid input");
      }
    });

    it("should handle repository failure", async () => {
      const mockRepository = context.checkInRepository as MockCheckInRepository;
      mockRepository.setShouldFailOperations(true);

      const result = await getCheckIn(context, { id: visitorCheckIn.id });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to get check-in");
      }
    });
  });

  describe("Check-in data integrity", () => {
    it("should return complete check-in data", async () => {
      const result = await getCheckIn(context, { id: visitorCheckIn.id });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const checkIn = result.value;
        expect(checkIn?.id).toBe(visitorCheckIn.id);
        expect(checkIn?.userId).toBe(visitorCheckIn.userId);
        expect(checkIn?.locationId).toBe(visitorCheckIn.locationId);
        expect(checkIn?.photoUrl).toBe(visitorCheckIn.photoUrl);
        expect(checkIn?.comment).toBe(visitorCheckIn.comment);
        expect(checkIn?.createdAt).toBeInstanceOf(Date);
        expect(checkIn?.updatedAt).toBeInstanceOf(Date);
      }
    });

    it("should handle check-in without photo", async () => {
      const result = await getCheckIn(context, { id: editorCheckIn.id });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const checkIn = result.value;
        expect(checkIn?.photoUrl).toBeNull();
        expect(checkIn?.comment).toBe("Good place for work");
      }
    });
  });
});
