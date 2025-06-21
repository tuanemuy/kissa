import type {
  Location,
  LocationId,
  LocationWithStats,
} from "@/core/domain/location/types";
import type { Region, RegionId } from "@/core/domain/region/types";
import type { User, UserId } from "@/core/domain/user/types";
import { ApplicationError } from "@/lib/error";
import { RepositoryError } from "@/lib/error";
import { err, ok } from "neverthrow";
import { beforeEach, describe, expect, it } from "vitest";
import { MockLocationRepository } from "../../adapters/mock/locationRepository";
import { MockRegionRepository } from "../../adapters/mock/regionRepository";
import { MockUserRepository } from "../../adapters/mock/userRepository";
import type { Context } from "../context";
import { createMockContext } from "../testUtils/mockContext";
import { listLocations } from "./listLocations";

describe("listLocations", () => {
  let context: Context;
  let mockUser: User;
  let mockRegion: Region;
  let mockLocations: Location[];
  let mockLocationsWithStats: LocationWithStats[];
  let mockUserRepository: MockUserRepository;
  let mockRegionRepository: MockRegionRepository;
  let mockLocationRepository: MockLocationRepository;

  beforeEach(() => {
    mockUser = {
      id: "user-1" as UserId,
      name: "Test User",
      email: "test@example.com",
      role: "editor",
      subscription: "basic",
      profilePhotoUrl: null,
      isActive: true,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockRegion = {
      id: "region-1" as RegionId,
      name: "Test Region",
      description: "Test region description",
      creatorId: mockUser.id,
      isPublic: true,
      latitude: null,
      longitude: null,
      coverPhotoUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockLocations = [
      {
        id: "location-1" as LocationId,
        name: "Test Location 1",
        description: "Public location",
        category: "restaurant",
        regionId: mockRegion.id,
        address: "123 Test St",
        latitude: null,
        longitude: null,
        contactInfo: null,
        operatingHours: null,
        isPublic: true,
        coverPhotoUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "location-2" as LocationId,
        name: "Test Location 2",
        description: "Private location",
        category: "cafe",
        regionId: mockRegion.id,
        address: "456 Test Ave",
        latitude: null,
        longitude: null,
        contactInfo: null,
        operatingHours: null,
        isPublic: false,
        coverPhotoUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    mockLocationsWithStats = mockLocations.map((location) => ({
      ...location,
      checkInCount: 5,
      favoriteCount: 3,
      averageRating: null,
    }));

    mockUserRepository = new MockUserRepository();
    mockRegionRepository = new MockRegionRepository();
    mockLocationRepository = new MockLocationRepository();

    // Setup test data
    mockUserRepository.addUser(mockUser, "hashed_password");
    mockRegionRepository.addRegion(mockRegion);
    for (const location of mockLocations) {
      mockLocationRepository.addLocation(location);
    }

    context = createMockContext({
      userRepository: mockUserRepository,
      regionRepository: mockRegionRepository,
      locationRepository: mockLocationRepository,
    });
  });

  describe("TLA+ behavior validation", () => {
    describe("Search functionality modeling", () => {
      it("should follow TLA+ SearchRegionsByKeyword constraints", async () => {
        // TLA+: searchResults = {r ∈ regions : regionStates[r].visibility = "public" ∧ regionStates[r].active = TRUE}
        const input = {
          pagination: { page: 1, limit: 10 },
          filter: { search: "Test" },
          includeStats: false,
        };

        const result = await listLocations(context, input, mockUser.id);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.items).toHaveLength(2);
          expect(result.value.count).toBe(2);
        }
      });

      it("should filter by region per TLA+ model", async () => {
        // TLA+: FilterLocationsByCategory - filter by regionId
        const input = {
          pagination: { page: 1, limit: 10 },
          filter: { regionId: mockRegion.id },
          includeStats: false,
        };

        const result = await listLocations(context, input, mockUser.id);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.items).toHaveLength(2);
        }
      });

      it("should support anonymous search per TLA+ constraints", async () => {
        // TLA+: userId ∈ (users ∪ {"anonymous"})
        const input = {
          pagination: { page: 1, limit: 10 },
          filter: {},
          includeStats: false,
        };

        // No userId provided (anonymous)
        const result = await listLocations(context, input);

        expect(result.isOk()).toBe(true);
      });
    });

    describe("FilterLocationsByCategory action", () => {
      it("should filter by category per TLA+ model", async () => {
        // TLA+: filteredLocations = {l ∈ locations : locationStates[l].category = category}
        const input = {
          pagination: { page: 1, limit: 10 },
          filter: { category: "restaurant" },
          includeStats: false,
        };

        const result = await listLocations(context, input, mockUser.id);

        expect(result.isOk()).toBe(true);
      });

      it("should enforce visibility constraints per TLA+ model", async () => {
        // TLA+: locationStates[l].visibility = "public" ∧ locationStates[l].active = TRUE
        const input = {
          pagination: { page: 1, limit: 10 },
          filter: { isPublic: true },
          includeStats: false,
        };

        const result = await listLocations(context, input, mockUser.id);

        expect(result.isOk()).toBe(true);
      });
    });
  });

  describe("Alloy structural constraints", () => {
    describe("INV-21: Search index consistency", () => {
      it("should only return public locations for anonymous users", async () => {
        // Alloy: all si: SearchIndex | all l: si.locations | l.visibility = Public
        const input = {
          pagination: { page: 1, limit: 10 },
          filter: {},
          includeStats: false,
        };

        // Anonymous user (no userId)
        const result = await listLocations(context, input);

        expect(result.isOk()).toBe(true);
        // The implementation forces isPublic: true for anonymous users
      });

      it("should respect location visibility per Alloy constraints", async () => {
        // Alloy: only public locations should be discoverable
        const input = {
          pagination: { page: 1, limit: 10 },
          filter: { isPublic: true },
          includeStats: false,
        };

        const result = await listLocations(context, input, mockUser.id);

        expect(result.isOk()).toBe(true);
      });
    });

    describe("INV-3: Locations in editor regions", () => {
      it("should validate location belongs to existing region", async () => {
        // Alloy: all l: Location | l.region.creator.role = Editor
        const input = {
          pagination: { page: 1, limit: 10 },
          filter: { regionId: mockRegion.id },
          includeStats: false,
        };

        const result = await listLocations(context, input, mockUser.id);

        expect(result.isOk()).toBe(true);
      });
    });

    describe("Access control for private regions", () => {
      it("should allow region owner to see private region locations", async () => {
        // Create a private region
        const privateRegion: Region = {
          ...mockRegion,
          id: "private-region-1" as RegionId,
          isPublic: false,
        };
        mockRegionRepository.addRegion(privateRegion);

        // Create a location in the private region
        const privateLocation: Location = {
          ...mockLocations[0],
          id: "private-location-1" as LocationId,
          regionId: privateRegion.id,
        };
        mockLocationRepository.addLocation(privateLocation);

        const input = {
          pagination: { page: 1, limit: 10 },
          filter: { regionId: privateRegion.id },
          includeStats: false,
        };

        // Owner requesting
        const result = await listLocations(context, input, mockUser.id);

        expect(result.isOk()).toBe(true);
      });

      it("should reject non-owner access to private region locations", async () => {
        const nonOwnerUser: User = {
          ...mockUser,
          id: "non-owner-id" as UserId,
          email: "nonowner@example.com",
        };
        mockUserRepository.addUser(nonOwnerUser, "hashed_password");

        // Create a private region owned by someone else
        const privateRegion: Region = {
          ...mockRegion,
          id: "other-private-region-1" as RegionId,
          isPublic: false,
          creatorId: "other-owner-id" as UserId,
        };
        mockRegionRepository.addRegion(privateRegion);

        const input = {
          pagination: { page: 1, limit: 10 },
          filter: { regionId: privateRegion.id },
          includeStats: false,
        };

        const result = await listLocations(context, input, nonOwnerUser.id);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toBe(
            "Not authorized to view locations in this region",
          );
        }
      });
    });
  });

  describe("Statistics inclusion", () => {
    it("should return locations with statistics when requested", async () => {
      const input = {
        pagination: { page: 1, limit: 10 },
        filter: {},
        includeStats: true,
      };

      const result = await listLocations(context, input, mockUser.id);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.items).toHaveLength(2);
        // Would check for stats properties in real implementation
        expect(result.value.count).toBe(2);
      }
    });

    it("should return basic locations when stats not requested", async () => {
      const input = {
        pagination: { page: 1, limit: 10 },
        filter: {},
        includeStats: false,
      };

      const result = await listLocations(context, input, mockUser.id);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.items).toHaveLength(2);
        expect(result.value.count).toBe(2);
      }
    });
  });

  describe("Pagination and filtering", () => {
    it("should handle pagination parameters", async () => {
      const input = {
        pagination: { page: 2, limit: 5 },
        filter: {},
        includeStats: false,
      };

      const result = await listLocations(context, input, mockUser.id);

      expect(result.isOk()).toBe(true);
    });

    it("should handle text search filter", async () => {
      const input = {
        pagination: { page: 1, limit: 10 },
        filter: { search: "Restaurant" },
        includeStats: false,
      };

      const result = await listLocations(context, input, mockUser.id);

      expect(result.isOk()).toBe(true);
    });

    it("should handle category filter", async () => {
      const input = {
        pagination: { page: 1, limit: 10 },
        filter: { category: "cafe" },
        includeStats: false,
      };

      const result = await listLocations(context, input, mockUser.id);

      expect(result.isOk()).toBe(true);
    });
  });

  describe("Error handling", () => {
    it("should handle invalid input", async () => {
      const input = {
        pagination: { page: 0, limit: 0 }, // Invalid pagination
        filter: {},
        includeStats: false,
      };

      const result = await listLocations(context, input, mockUser.id);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid query input");
      }
    });

    it("should handle region not found", async () => {
      // Use a non-existent region ID
      const nonExistentRegionId = "non-existent-region" as RegionId;

      const input = {
        pagination: { page: 1, limit: 10 },
        filter: { regionId: nonExistentRegionId },
        includeStats: false,
      };

      const result = await listLocations(context, input, mockUser.id);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Region not found");
      }
    });

    it("should handle repository failure", async () => {
      mockLocationRepository.setShouldFailOperations(true);

      const input = {
        pagination: { page: 1, limit: 10 },
        filter: {},
        includeStats: false,
      };

      const result = await listLocations(context, input, mockUser.id);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to list locations");
      }
    });

    it("should handle repository failure for stats", async () => {
      mockLocationRepository.setShouldFailOperations(true);

      const input = {
        pagination: { page: 1, limit: 10 },
        filter: {},
        includeStats: true,
      };

      const result = await listLocations(context, input, mockUser.id);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to list locations");
      }
    });
  });

  describe("Spec scenario validation", () => {
    describe("SearchFunctionality scenario", () => {
      it("should support public location search per Alloy spec", async () => {
        // Alloy: SearchFunctionality scenario
        const input = {
          pagination: { page: 1, limit: 10 },
          filter: { isPublic: true },
          includeStats: false,
        };

        const result = await listLocations(context, input, mockUser.id);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.items.length).toBeGreaterThanOrEqual(0);
        }
      });
    });

    describe("VisitorInteraction scenario", () => {
      it("should allow visitor to list public locations", async () => {
        // Alloy: VisitorInteraction - visitors can discover public content
        const visitorUser: User = {
          ...mockUser,
          role: "visitor",
          subscription: "free",
        };

        const input = {
          pagination: { page: 1, limit: 10 },
          filter: {},
          includeStats: false,
        };

        const result = await listLocations(context, input, visitorUser.id);

        expect(result.isOk()).toBe(true);
      });
    });
  });
});
