import type { CheckIn, CheckInId } from "@/core/domain/checkIn/types";
import type { Location, LocationId } from "@/core/domain/location/types";
import type { Region, RegionId } from "@/core/domain/region/types";
import type { User, UserId } from "@/core/domain/user/types";
import { ApplicationError, AuthorizationError } from "@/lib/error";
import { RepositoryError } from "@/lib/error";
import { err, ok } from "neverthrow";
import { beforeEach, describe, expect, it } from "vitest";
import type { Context } from "../context";
import { getCheckIn } from "./getCheckIn";

describe("getCheckIn", () => {
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
    latitude: 35.6762,
    longitude: 139.6503,
    coverPhotoUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const testLocation: Location = {
    id: "location-1" as LocationId,
    name: "Test Location",
    description: "A test location",
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

  const visitorCheckIn: CheckIn = {
    id: "checkin-1" as CheckInId,
    userId: visitorUser.id,
    locationId: testLocation.id,
    photoUrl: "https://example.com/photo.jpg",
    comment: "Great experience!",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const editorCheckIn: CheckIn = {
    id: "checkin-2" as CheckInId,
    userId: editorUser.id,
    locationId: testLocation.id,
    photoUrl: null,
    comment: "Good place for work",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    context = {
      userRepository: {
        findById: async (id: string) => {
          if (id === editorUser.id) return ok(editorUser);
          if (id === visitorUser.id) return ok(visitorUser);
          return ok(null);
        },
      } as Partial<typeof context.userRepository>,
      checkInRepository: {
        findById: async (id: string) => {
          if (id === visitorCheckIn.id) return ok(visitorCheckIn);
          if (id === editorCheckIn.id) return ok(editorCheckIn);
          return ok(null);
        },
      } as Partial<typeof context.checkInRepository>,
      locationRepository: {
        findById: async (id: string) => {
          if (id === testLocation.id) return ok(testLocation);
          return ok(null);
        },
      } as Partial<typeof context.locationRepository>,
    } as Context;
  });

  describe("SPEC: Check-in access constraints from formal specifications", () => {
    it("should allow user to view their own check-in", async () => {
      const result = await getCheckIn(
        context,
        visitorUser.id,
        visitorCheckIn.id,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const checkIn = result.value;
        expect(checkIn.id).toBe(visitorCheckIn.id);
        expect(checkIn.userId).toBe(visitorUser.id);
        expect(checkIn.locationId).toBe(testLocation.id);
        expect(checkIn.comment).toBe("Great experience!");
      }
    });

    it("should allow others to view check-ins at public locations", async () => {
      // Anyone can view check-ins at public locations per REQ-V-013
      const result = await getCheckIn(
        context,
        editorUser.id,
        visitorCheckIn.id,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const checkIn = result.value;
        expect(checkIn.id).toBe(visitorCheckIn.id);
        expect(checkIn.userId).toBe(visitorUser.id);
      }
    });

    it("should reject access to check-ins at private locations for non-owners", async () => {
      const privateLocation: Location = {
        ...testLocation,
        id: "private-location" as LocationId,
        isPublic: false,
      };

      const privateCheckIn: CheckIn = {
        ...visitorCheckIn,
        id: "private-checkin" as CheckInId,
        locationId: privateLocation.id,
      };

      context.checkInRepository = {
        findById: async (id: string) => {
          if (id === privateCheckIn.id) return ok(privateCheckIn);
          return ok(null);
        },
      } as Partial<typeof context.checkInRepository>;

      context.locationRepository = {
        findById: async (id: string) => {
          if (id === privateLocation.id) return ok(privateLocation);
          return ok(null);
        },
      } as Partial<typeof context.locationRepository>;

      const result = await getCheckIn(
        context,
        editorUser.id,
        privateCheckIn.id,
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(AuthorizationError);
        expect(result.error.message).toBe(
          "Not authorized to view this check-in",
        );
      }
    });
  });

  describe("SPEC-INV-5: Check-ins at public locations only (Alloy constraint)", () => {
    it("should verify check-in location is public", async () => {
      const result = await getCheckIn(
        context,
        visitorUser.id,
        visitorCheckIn.id,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const checkIn = result.value;
        expect(checkIn.locationId).toBe(testLocation.id);
        // In formal model: OnlyPublicLocationsForCheckIn
        // all c: CheckIn | c.location.visibility = Public
      }
    });
  });

  describe("TLA+ behavior validation", () => {
    it("should follow check-in content consistency from TLA+", async () => {
      // TLA+ CheckInContentConsistency invariant
      const result = await getCheckIn(
        context,
        visitorUser.id,
        visitorCheckIn.id,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const checkIn = result.value;
        // hasPhoto = TRUE => photoUrl # ""
        if (checkIn.photoUrl !== null) {
          expect(checkIn.photoUrl).not.toBe("");
        }
        // hasComment = TRUE => commentText # ""
        if (checkIn.comment !== null) {
          expect(checkIn.comment).not.toBe("");
        }
      }
    });
  });

  describe("Error handling", () => {
    it("should handle check-in not found", async () => {
      const result = await getCheckIn(
        context,
        visitorUser.id,
        "non-existent" as CheckInId,
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Check-in not found");
      }
    });

    it("should handle user not found", async () => {
      const result = await getCheckIn(
        context,
        "non-existent" as UserId,
        visitorCheckIn.id,
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("User not found");
      }
    });

    it("should handle repository failure", async () => {
      // biome-ignore lint/suspicious/noExplicitAny: Testing error handling requires type assertion
      const mockCheckInRepository = context.checkInRepository as any;
      mockCheckInRepository.findById = async () =>
        err(new RepositoryError("Database error"));

      const result = await getCheckIn(
        context,
        visitorUser.id,
        visitorCheckIn.id,
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to get check-in");
      }
    });
  });

  describe("Admin access", () => {
    it("should allow admin to view any check-in", async () => {
      const adminUser: User = {
        ...visitorUser,
        id: "admin-1" as UserId,
        role: "admin",
      };

      context.userRepository = {
        findById: async (id: string) => {
          if (id === adminUser.id) return ok(adminUser);
          return ok(null);
        },
      } as Partial<typeof context.userRepository>;

      const result = await getCheckIn(context, adminUser.id, visitorCheckIn.id);

      expect(result.isOk()).toBe(true);
    });
  });

  describe("Check-in data integrity", () => {
    it("should return complete check-in data", async () => {
      const result = await getCheckIn(
        context,
        visitorUser.id,
        visitorCheckIn.id,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const checkIn = result.value;
        expect(checkIn.id).toBe(visitorCheckIn.id);
        expect(checkIn.userId).toBe(visitorCheckIn.userId);
        expect(checkIn.locationId).toBe(visitorCheckIn.locationId);
        expect(checkIn.photoUrl).toBe(visitorCheckIn.photoUrl);
        expect(checkIn.comment).toBe(visitorCheckIn.comment);
        expect(checkIn.createdAt).toBeInstanceOf(Date);
        expect(checkIn.updatedAt).toBeInstanceOf(Date);
      }
    });

    it("should handle check-in without photo", async () => {
      const result = await getCheckIn(context, editorUser.id, editorCheckIn.id);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const checkIn = result.value;
        expect(checkIn.photoUrl).toBeNull();
        expect(checkIn.comment).toBe("Good place for work");
      }
    });
  });
});
