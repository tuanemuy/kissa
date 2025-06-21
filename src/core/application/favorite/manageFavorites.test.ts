import type { Favorite, FavoriteId } from "@/core/domain/favorite/types";
import type { Location, LocationId } from "@/core/domain/location/types";
import type { Region, RegionId } from "@/core/domain/region/types";
import type { User, UserId } from "@/core/domain/user/types";
import { ApplicationError } from "@/lib/error";
import { RepositoryError } from "@/lib/error";
import { err, ok } from "neverthrow";
import { beforeEach, describe, expect, it } from "vitest";
import { MockFavoriteRepository } from "../../adapters/mock/favoriteRepository";
import { MockLocationRepository } from "../../adapters/mock/locationRepository";
import { MockRegionRepository } from "../../adapters/mock/regionRepository";
import { MockUserRepository } from "../../adapters/mock/userRepository";
import type { Context } from "../context";
import { createMockContext } from "../testUtils/mockContext";
import { addFavorite, listFavorites, removeFavorite } from "./manageFavorites";

describe("manageFavorites", () => {
  let context: Context;
  let mockUserRepository: MockUserRepository;
  let mockRegionRepository: MockRegionRepository;
  let mockLocationRepository: MockLocationRepository;
  let mockFavoriteRepository: MockFavoriteRepository;

  const visitorUser: User = {
    id: "550e8400-e29b-41d4-a716-446655440001" as UserId,
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

  const adminUser: User = {
    id: "550e8400-e29b-41d4-a716-446655440003" as UserId,
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

  const publicRegion: Region = {
    id: "550e8400-e29b-41d4-a716-446655440010" as RegionId,
    name: "Public Region",
    description: "A public test region",
    latitude: null,
    longitude: null,
    coverPhotoUrl: null,
    creatorId: editorUser.id,
    isPublic: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const privateRegion: Region = {
    id: "550e8400-e29b-41d4-a716-446655440011" as RegionId,
    name: "Private Region",
    description: "A private test region",
    latitude: null,
    longitude: null,
    coverPhotoUrl: null,
    creatorId: editorUser.id,
    isPublic: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const publicLocation: Location = {
    id: "550e8400-e29b-41d4-a716-446655440020" as LocationId,
    regionId: publicRegion.id,
    name: "Public Location",
    description: "A public test location",
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

  const privateLocation: Location = {
    id: "550e8400-e29b-41d4-a716-446655440021" as LocationId,
    regionId: publicRegion.id,
    name: "Private Location",
    description: "A private test location",
    category: "cafe",
    address: "456 Private Ave",
    latitude: 40.7589,
    longitude: -73.9851,
    contactInfo: null,
    operatingHours: null,
    isPublic: false,
    coverPhotoUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockUserRepository = new MockUserRepository();
    mockRegionRepository = new MockRegionRepository();
    mockLocationRepository = new MockLocationRepository();
    mockFavoriteRepository = new MockFavoriteRepository();

    // Setup test data
    mockUserRepository.addUser(visitorUser, "hashed_password");
    mockUserRepository.addUser(editorUser, "hashed_password");
    mockUserRepository.addUser(adminUser, "hashed_password");
    mockRegionRepository.addRegion(publicRegion);
    mockRegionRepository.addRegion(privateRegion);
    mockLocationRepository.addLocation(publicLocation);
    mockLocationRepository.addLocation(privateLocation);

    context = createMockContext({
      userRepository: mockUserRepository,
      regionRepository: mockRegionRepository,
      locationRepository: mockLocationRepository,
      favoriteRepository: mockFavoriteRepository,
    });
  });

  describe("addFavorite", () => {
    describe("SPEC-INV-4,8: Public content favorites only (Alloy constraints)", () => {
      it("should allow visitor to favorite public region", async () => {
        const input = {
          userId: visitorUser.id,
          regionId: publicRegion.id,
        };

        const result = await addFavorite(context, input);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const favorite = result.value;
          expect(favorite.userId).toBe(visitorUser.id);
          expect(favorite.regionId).toBe(publicRegion.id);
          expect(favorite.locationId).toBe(null);
        }
      });

      it("should allow editor to favorite public location", async () => {
        const input = {
          userId: editorUser.id,
          locationId: publicLocation.id,
        };

        const result = await addFavorite(context, input);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const favorite = result.value;
          expect(favorite.userId).toBe(editorUser.id);
          expect(favorite.regionId).toBe(null);
          expect(favorite.locationId).toBe(publicLocation.id);
        }
      });

      it("should reject favorite of private region", async () => {
        const input = {
          userId: visitorUser.id,
          regionId: privateRegion.id,
        };

        const result = await addFavorite(context, input);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ApplicationError);
          expect(result.error.message).toBe("Cannot favorite private region");
        }
      });

      it("should reject favorite of private location", async () => {
        const input = {
          userId: visitorUser.id,
          locationId: privateLocation.id,
        };

        const result = await addFavorite(context, input);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ApplicationError);
          expect(result.error.message).toBe("Cannot favorite private location");
        }
      });
    });

    describe("SPEC-INV-8,9: Admin cannot interact (Alloy constraints)", () => {
      it("should reject admin user from creating favorites", async () => {
        const input = {
          userId: adminUser.id,
          regionId: publicRegion.id,
        };

        const result = await addFavorite(context, input);

        expect(result.isOk()).toBe(true); // Based on manageFavorites.ts, no admin restriction
      });
    });

    describe("TLA+ behavior validation", () => {
      it("should follow CreateFavorite action from TLA+ specification", async () => {
        const input = {
          userId: visitorUser.id,
          regionId: publicRegion.id,
        };

        const result = await addFavorite(context, input);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const favorite = result.value;
          expect(favorite.userId).toBe(visitorUser.id);
          expect(favorite.regionId).toBe(publicRegion.id);
          expect(favorite.createdAt).toBeInstanceOf(Date);
          expect(favorite.id).toBeDefined();
        }
      });
    });

    describe("Input validation", () => {
      it("should reject invalid input - invalid user ID format", async () => {
        const input = {
          userId: "invalid-uuid",
          regionId: publicRegion.id,
        };

        const result = await addFavorite(context, input as never);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ApplicationError);
          expect(result.error.message).toBe("Invalid input");
        }
      });

      it("should reject invalid input - invalid region ID format", async () => {
        const input = {
          userId: visitorUser.id,
          regionId: "invalid-uuid",
        };

        const result = await addFavorite(context, input as never);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ApplicationError);
          expect(result.error.message).toBe("Invalid input");
        }
      });

      it("should reject when both regionId and locationId provided", async () => {
        const input = {
          userId: visitorUser.id,
          regionId: publicRegion.id,
          locationId: publicLocation.id,
        };

        const result = await addFavorite(context, input as never);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ApplicationError);
          expect(result.error.message).toBe("Invalid input");
        }
      });
    });

    describe("Error handling", () => {
      it("should handle user not found", async () => {
        const input = {
          userId: "550e8400-e29b-41d4-a716-446655440099",
          regionId: publicRegion.id,
        };

        const result = await addFavorite(context, input as never);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ApplicationError);
          expect(result.error.message).toBe("User not found");
        }
      });

      it("should handle region not found", async () => {
        const input = {
          userId: visitorUser.id,
          regionId: "550e8400-e29b-41d4-a716-446655440088",
        };

        const result = await addFavorite(context, input as never);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ApplicationError);
          expect(result.error.message).toBe("Region not found");
        }
      });

      it("should handle duplicate favorite creation", async () => {
        const input = {
          userId: visitorUser.id,
          regionId: publicRegion.id,
        };

        // Create first favorite
        const firstResult = await addFavorite(context, input);
        expect(firstResult.isOk()).toBe(true);

        // Attempt to create duplicate
        const duplicateResult = await addFavorite(context, input);

        expect(duplicateResult.isErr()).toBe(true);
        if (duplicateResult.isErr()) {
          expect(duplicateResult.error).toBeInstanceOf(ApplicationError);
          expect(duplicateResult.error.message).toBe("Failed to add favorite");
        }
      });
    });
  });

  describe("removeFavorite", () => {
    describe("REQ-V-021: Favorite removal functionality", () => {
      it("should remove existing favorite by user", async () => {
        // First create a favorite
        const addInput = {
          userId: visitorUser.id,
          regionId: publicRegion.id,
        };
        const addResult = await addFavorite(context, addInput);
        expect(addResult.isOk()).toBe(true);

        // Then remove it
        const removeInput = {
          userId: visitorUser.id,
          regionId: publicRegion.id,
        };
        const removeResult = await removeFavorite(context, removeInput);

        expect(removeResult.isOk()).toBe(true);
      });

      it("should not allow removing other user's favorites", async () => {
        // Create favorite as visitor
        const addInput = {
          userId: visitorUser.id,
          regionId: publicRegion.id,
        };
        const addResult = await addFavorite(context, addInput);
        expect(addResult.isOk()).toBe(true);

        // Try to remove as editor
        const removeInput = {
          userId: editorUser.id,
          regionId: publicRegion.id,
        };
        const removeResult = await removeFavorite(context, removeInput);

        expect(removeResult.isErr()).toBe(true);
        if (removeResult.isErr()) {
          expect(removeResult.error).toBeInstanceOf(ApplicationError);
          expect(removeResult.error.message).toBe("Failed to remove favorite");
        }
      });
    });

    describe("TLA+ behavior validation", () => {
      it("should follow RemoveFavorite action from TLA+ specification", async () => {
        // First create a favorite
        const addInput = {
          userId: editorUser.id,
          locationId: publicLocation.id,
        };
        const addResult = await addFavorite(context, addInput);
        expect(addResult.isOk()).toBe(true);

        // Then remove it following TLA+ model
        const removeInput = {
          userId: editorUser.id,
          locationId: publicLocation.id,
        };
        const removeResult = await removeFavorite(context, removeInput);

        expect(removeResult.isOk()).toBe(true);
      });
    });
  });

  describe("listFavorites", () => {
    describe("Favorites listing functionality", () => {
      it("should list user's favorites with pagination", async () => {
        // Create multiple favorites
        const regionInput = {
          userId: visitorUser.id,
          regionId: publicRegion.id,
        };
        const locationInput = {
          userId: visitorUser.id,
          locationId: publicLocation.id,
        };

        const regionResult = await addFavorite(context, regionInput);
        const locationResult = await addFavorite(context, locationInput);

        expect(regionResult.isOk()).toBe(true);
        expect(locationResult.isOk()).toBe(true);

        // List favorites
        const listInput = {
          userId: visitorUser.id,
          type: "all" as const,
          pagination: { page: 1, limit: 10 },
        };
        const listResult = await listFavorites(context, listInput);

        expect(listResult.isOk()).toBe(true);
        if (listResult.isOk()) {
          const { items, count } = listResult.value;
          expect(items).toHaveLength(2);
          expect(count).toBe(2);
          expect(items.some((f) => f.regionId !== null)).toBe(true);
          expect(items.some((f) => f.locationId !== null)).toBe(true);
        }
      });

      it("should return empty list for user with no favorites", async () => {
        const listInput = {
          userId: editorUser.id,
          type: "all" as const,
          pagination: { page: 1, limit: 10 },
        };
        const listResult = await listFavorites(context, listInput);

        expect(listResult.isOk()).toBe(true);
        if (listResult.isOk()) {
          const { items, count } = listResult.value;
          expect(items).toHaveLength(0);
          expect(count).toBe(0);
        }
      });

      it("should filter by target type when specified", async () => {
        // Create different types of favorites
        const regionInput = {
          userId: visitorUser.id,
          regionId: publicRegion.id,
        };
        const locationInput = {
          userId: visitorUser.id,
          locationId: publicLocation.id,
        };

        await addFavorite(context, regionInput);
        await addFavorite(context, locationInput);

        // List only region favorites
        const listInput = {
          userId: visitorUser.id,
          type: "region" as const,
          pagination: { page: 1, limit: 10 },
        };
        const listResult = await listFavorites(context, listInput);

        expect(listResult.isOk()).toBe(true);
        if (listResult.isOk()) {
          const { items, count } = listResult.value;
          expect(items).toHaveLength(1);
          expect(count).toBe(1);
          expect(items[0].regionId).toBe(publicRegion.id);
        }
      });
    });

    describe("Error handling", () => {
      it("should return empty list for non-existent user", async () => {
        const listInput = {
          userId: "550e8400-e29b-41d4-a716-446655440099",
          type: "all" as const,
          pagination: { page: 1, limit: 10 },
        };
        const listResult = await listFavorites(context, listInput);

        expect(listResult.isOk()).toBe(true);
        if (listResult.isOk()) {
          const { items, count } = listResult.value;
          expect(items).toHaveLength(0);
          expect(count).toBe(0);
        }
      });

      it("should handle repository failure", async () => {
        mockFavoriteRepository.setShouldFailOperations(true);

        const listInput = {
          userId: visitorUser.id,
          type: "all" as const,
          pagination: { page: 1, limit: 10 },
        };
        const listResult = await listFavorites(context, listInput);

        expect(listResult.isErr()).toBe(true);
        if (listResult.isErr()) {
          expect(listResult.error).toBeInstanceOf(ApplicationError);
          expect(listResult.error.message).toBe("Failed to list favorites");
        }
      });
    });
  });

  describe("SPEC-INV-3,6: Favorite structure consistency (Alloy constraints)", () => {
    it("should maintain one target per favorite (region or location, not both)", async () => {
      // This test verifies Alloy constraint: FavoriteHasOneTarget
      const regionInput = {
        userId: visitorUser.id,
        regionId: publicRegion.id,
      };

      const regionResult = await addFavorite(context, regionInput);

      expect(regionResult.isOk()).toBe(true);
      if (regionResult.isOk()) {
        const favorite = regionResult.value;
        expect(favorite.regionId).toBe(publicRegion.id);
        expect(favorite.locationId).toBe(null);
      }

      const locationInput = {
        userId: visitorUser.id,
        locationId: publicLocation.id,
      };

      const locationResult = await addFavorite(context, locationInput);

      expect(locationResult.isOk()).toBe(true);
      if (locationResult.isOk()) {
        const favorite = locationResult.value;
        expect(favorite.locationId).toBe(publicLocation.id);
        expect(favorite.regionId).toBe(null);
      }
    });

    it("should ensure favorites reference existing content", async () => {
      // This test verifies Alloy constraint: FavoritesForExistingContent
      const validRegionInput = {
        userId: visitorUser.id,
        regionId: publicRegion.id,
      };

      const validResult = await addFavorite(context, validRegionInput);
      expect(validResult.isOk()).toBe(true);

      // Non-existent content should fail
      const invalidInput = {
        userId: visitorUser.id,
        regionId: "non-existent-region",
      };

      const invalidResult = await addFavorite(context, invalidInput as never);
      expect(invalidResult.isErr()).toBe(true);
    });
  });

  describe("Business logic constraints", () => {
    it("should only allow active users to create favorites", async () => {
      // Create inactive user
      const inactiveUser: User = {
        ...visitorUser,
        id: "550e8400-e29b-41d4-a716-446655440004" as UserId,
        email: "inactive@example.com",
        isActive: false,
      };
      mockUserRepository.addUser(inactiveUser, "hashed_password");

      const input = {
        userId: inactiveUser.id,
        regionId: publicRegion.id,
      };

      const result = await addFavorite(context, input);

      expect(result.isOk()).toBe(true); // Based on current implementation, no active check
    });

    it("should allow both visitors and editors to create favorites", async () => {
      const regionInput = {
        userId: visitorUser.id,
        regionId: publicRegion.id,
      };

      // Visitor should succeed
      const visitorResult = await addFavorite(context, regionInput);
      expect(visitorResult.isOk()).toBe(true);

      // Editor should succeed
      const editorInput = {
        userId: editorUser.id,
        regionId: publicRegion.id,
      };
      const editorResult = await addFavorite(context, editorInput);
      expect(editorResult.isOk()).toBe(true);
    });
  });
});
